// Küçük dil modelinin tarayıcıda çalışan hali (sıfırdan yazılmış çıkarım kodu; kitaplık kullanılmaz).
// Eğitim: ml/ klasörü (PyTorch). Ağırlıklar: public/model/lm.bin (16 bit), ayarlar ve sözcük listesi: public/model/lm.json
import { fold } from './chatmodel.js';

let M = null, loading = null;

const h2f = (h) => { // 16 bit kayan nokta → 32 bit
  const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
  if (e === 0) return s * 5.960464477539063e-8 * f;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * Math.pow(2, e - 15) * (1 + f / 1024);
};
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const gelu = (x) => 0.5 * x * (1 + erf(x * Math.SQRT1_2));

export async function loadLM() {
  if (M) return M;
  if (!loading) loading = (async () => {
    const base = import.meta.env?.BASE_URL || './';
    const [meta, buf] = await Promise.all([fetch(base + 'model/lm.json').then((r) => { if (!r.ok) throw new Error('model yok'); return r.json(); }),
      fetch(base + 'model/lm.bin').then((r) => { if (!r.ok) throw new Error('model yok'); return r.arrayBuffer(); })]);
    const u = new Uint16Array(buf), W = {};
    for (const t of meta.layout) {
      const n = t.shape.reduce((a, b) => a * b, 1), a = new Float32Array(n);
      for (let i = 0; i < n; i++) a[i] = h2f(u[t.off + i]);
      W[t.n] = a;
    }
    const rank = new Map(meta.merges.map((m, i) => [m[0] + '\u0001' + m[1], i]));
    M = { cfg: meta.cfg, W, vocab: meta.vocab, id: new Map(meta.vocab.map((t, i) => [t, i])), rank, template: new Set(meta.template), cache: new Map() };
    return M;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

// ---- sözcük parçalayıcı (ml/tok.py ile aynı) ----
function bpeWord(m, w) {
  if (m.cache.has(w)) return m.cache.get(w);
  let s = Array.from(w);
  while (s.length > 1) {
    let best = 1e9, bi = -1;
    for (let i = 0; i < s.length - 1; i++) { const r = m.rank.get(s[i] + '\u0001' + s[i + 1]); if (r !== undefined && r < best) { best = r; bi = i; } }
    if (bi < 0) break;
    s = [...s.slice(0, bi), s[bi] + s[bi + 1], ...s.slice(bi + 2)];
  }
  m.cache.set(w, s);
  return s;
}
const SPECIAL = ['<bilgi>', '<soru>', '<cevap>', '<son>'];
export function encode(m, text) {
  const ids = [];
  for (const part of text.split(/(<bilgi>|<soru>|<cevap>|<son>)/)) {
    if (SPECIAL.includes(part)) { ids.push(m.id.get(part)); continue; }
    for (const w of part.split(/\s+/).filter(Boolean)) for (const t of bpeWord(m, '▁' + w)) ids.push(m.id.has(t) ? m.id.get(t) : m.id.get('<unk>'));
  }
  return ids;
}
const decode = (m, ids) => ids.map((i) => m.vocab[i]).join('').replace(/▁/g, ' ').trim();

// ---- ileri hesaplama (anahtar/değer önbellekli) ----
function ln(x, w, b) {
  const n = x.length; let mu = 0; for (let i = 0; i < n; i++) mu += x[i]; mu /= n;
  let v = 0; for (let i = 0; i < n; i++) { const d = x[i] - mu; v += d * d; } v = 1 / Math.sqrt(v / n + 1e-5);
  const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = (x[i] - mu) * v * w[i] + b[i]; return o;
}
function lin(x, W, b, outN) { // W: [outN, inN]
  const inN = x.length, o = new Float32Array(outN);
  for (let j = 0; j < outN; j++) { let s = b ? b[j] : 0; const r = j * inN; for (let i = 0; i < inN; i++) s += W[r + i] * x[i]; o[j] = s; }
  return o;
}
function step(m, id, pos, kv) {
  const { d, h, layers, ff } = m.cfg, W = m.W, dh = d / h;
  let x = new Float32Array(d);
  for (let i = 0; i < d; i++) x[i] = W['tok.weight'][id * d + i] + W['pos.weight'][pos * d + i];
  for (let l = 0; l < layers; l++) {
    const p = `blocks.${l}.`;
    const qkv = lin(ln(x, W[p + 'ln1.weight'], W[p + 'ln1.bias']), W[p + 'qkv.weight'], W[p + 'qkv.bias'], 3 * d);
    kv.k[l].set(qkv.subarray(d, 2 * d), pos * d); kv.v[l].set(qkv.subarray(2 * d, 3 * d), pos * d);
    const att = new Float32Array(d), sc = new Float32Array(pos + 1);
    for (let hh = 0; hh < h; hh++) {
      const o = hh * dh; let mx = -1e9;
      for (let t = 0; t <= pos; t++) { let s = 0; for (let i = 0; i < dh; i++) s += qkv[o + i] * kv.k[l][t * d + o + i]; s /= Math.sqrt(dh); sc[t] = s; if (s > mx) mx = s; }
      let z = 0; for (let t = 0; t <= pos; t++) { sc[t] = Math.exp(sc[t] - mx); z += sc[t]; }
      for (let t = 0; t <= pos; t++) { const a = sc[t] / z; for (let i = 0; i < dh; i++) att[o + i] += a * kv.v[l][t * d + o + i]; }
    }
    const pr = lin(att, W[p + 'proj.weight'], W[p + 'proj.bias'], d); for (let i = 0; i < d; i++) x[i] += pr[i];
    const f1 = lin(ln(x, W[p + 'ln2.weight'], W[p + 'ln2.bias']), W[p + 'f1.weight'], W[p + 'f1.bias'], ff); for (let i = 0; i < ff; i++) f1[i] = gelu(f1[i]);
    const f2 = lin(f1, W[p + 'f2.weight'], W[p + 'f2.bias'], d); for (let i = 0; i < d; i++) x[i] += f2[i];
  }
  const y = ln(x, W['ln.weight'], W['ln.bias']);
  return lin(y, W['tok.weight'], null, m.cfg.vocab); // giriş ve çıkış gömmesi paylaşılır
}

// Bilgi parçası + soru verilir, cevap üretilir. temp=0 ise en olası sözcük (kararlı), >0 ise çeşitli.
export async function generate(m, prompt, { temp = 0.7, topk = 6, maxNew = 200 } = {}) {
  const ids = encode(m, prompt), { block, layers, d } = m.cfg, stop = m.id.get('<son>');
  if (ids.length + 8 > block) return null; // bilgi parçası modele sığmıyor
  const kv = { k: Array.from({ length: layers }, () => new Float32Array(block * d)), v: Array.from({ length: layers }, () => new Float32Array(block * d)) };
  let lg = null;
  for (let i = 0; i < ids.length; i++) lg = step(m, ids[i], i, kv);
  const out = []; let done = false;
  for (let n = 0; n < maxNew && ids.length + out.length < block - 1; n++) {
    let nxt;
    if (temp <= 0) { nxt = 0; for (let i = 1; i < lg.length; i++) if (lg[i] > lg[nxt]) nxt = i; }
    else {
      const idx = Array.from(lg.keys()).sort((a, b) => lg[b] - lg[a]).slice(0, topk), mx = lg[idx[0]];
      const p = idx.map((i) => Math.exp((lg[i] - mx) / temp)), z = p.reduce((a, b) => a + b, 0);
      let r = Math.random() * z; nxt = idx[0]; for (let i = 0; i < idx.length; i++) { r -= p[i]; if (r <= 0) { nxt = idx[i]; break; } }
    }
    if (nxt === stop) { done = true; break; }
    out.push(nxt); lg = step(m, nxt, ids.length + out.length - 1, kv);
    if (n % 8 === 7) await new Promise((r) => setTimeout(r)); // ekranın donmaması için arada nefes ver
  }
  return done ? decode(m, out) : null; // yarım kalan cevap kabul edilmez
}

// Uydurma kontrolü: cevaptaki her sözcük ya şablon sözcüğü olmalı ya da bilgi parçasında geçmeli.
export function unsupportedWords(m, prompt, answer) {
  const src = new Set(fold(prompt.replace(/<bilgi>|<soru>|<cevap>/g, ' ')).split(' '));
  return fold(answer).split(' ').filter((w) => w && !m.template.has(w) && !src.has(w));
}

// Onarım: model uzun bir metni kopyalarken harf bozarsa ("kabuklı", "horum") bilgi parçasındaki en yakın sözcükle düzeltilir.
// Yakın sözcük yoksa (kopya yoldan çıkmışsa) cevap reddedilir; sohbet hazır kalıba döner.
const lev = (a, b) => {
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
};
export function repair(m, prompt, answer) {
  const src = [...new Set(prompt.replace(/<bilgi>|<soru>|<cevap>/g, ' ').match(/[\p{L}\p{N}'’-]+/gu) || [])].map((w) => [w, fold(w)]);
  const srcSet = new Set(src.map((x) => x[1]));
  return answer.replace(/[\p{L}\p{N}'’-]+/gu, (w) => {
    const f = fold(w);
    if (!f || m.template.has(f) || srcSet.has(f)) return w;
    let best = null, bd = 1e9;
    for (const [o, of] of src) { const d = lev(f, of); if (d < bd) { bd = d; best = o; } }
    const lim = f.length <= 5 ? 1 : 2;
    return best && bd <= lim ? best : w;
  });
}

// Cevap kabul kriteri: (1) her sözcük şablondan ya da bilgiden gelmeli, (2) bilginin kendisi cevapta eksiksiz geçmeli.
export function accept(m, prompt, answer, facts = []) {
  if (!answer || unsupportedWords(m, prompt, answer).length) return false;
  const a = fold(answer);
  return facts.filter(Boolean).every((f) => a.includes(fold(f)));
}
