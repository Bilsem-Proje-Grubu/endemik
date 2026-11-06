// Fotoğraftan tür tanıma: MobileNetV3 gövdesinin tarayıcıda çalışan, sıfırdan yazılmış çıkarım kodu (kitaplık yok).
// Ağırlıklar ml/vision/export_graph.py ile dışa aktarılır (public/model/vision.json + vision.bin, 16 bit).
// Veri düzeni: kanallar son (HWC). Fotoğraf cihazdan çıkmaz.
const h2f = (h) => { const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, f = h & 1023; if (e === 0) return s * 5.960464477539063e-8 * f; if (e === 31) return f ? NaN : s * Infinity; return s * Math.pow(2, e - 15) * (1 + f / 1024); };
const hs = (x) => x * Math.min(6, Math.max(0, x + 3)) / 6;     // hardswish
const hsig = (x) => Math.min(6, Math.max(0, x + 3)) / 6;       // hardsigmoid
const wait = () => new Promise((r) => setTimeout(r));

let V = null, loading = null, metaP = null;
const base = () => import.meta.env?.BASE_URL || './';
// Küçük dosya: sınıf listesi ve ölçüm sonuçları (sayfa açılırken); ağırlıklar (~6 MB) yalnızca ilk tanımada indirilir
export const visionMeta = () => (metaP ||= fetch(base() + 'model/vision.json').then((r) => { if (!r.ok) throw new Error('model yok'); return r.json(); }).catch((e) => { metaP = null; throw e; }));
export async function loadVision(onDownload) {
  if (V) return V;
  if (!loading) loading = (async () => {
    const [meta, r] = await Promise.all([visionMeta(), fetch(base() + 'model/vision.bin')]);
    if (!r.ok) throw new Error('model yok');
    const buf = await r.arrayBuffer(); if (onDownload) onDownload();
    const u = new Uint16Array(buf), W = new Float32Array(u.length);
    for (let i = 0; i < u.length; i++) W[i] = h2f(u[i]);
    V = { ...meta, W };
    return V;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

function conv(x, H, Wd, C, op, W) {
  const { o, k, s, p, g } = op, oh = Math.floor((H + 2 * p - k) / s) + 1, ow = Math.floor((Wd + 2 * p - k) / s) + 1;
  const out = new Float32Array(oh * ow * o), wb = op.w, bb = op.b;
  if (g === 1 && k === 1) { // noktasal (1x1): her piksel için kanal karışımı
    for (let pix = 0; pix < H * Wd; pix++) { const xi = pix * C, oi = pix * o; for (let oc = 0; oc < o; oc++) { let a = W[bb + oc]; const wi = wb + oc * C; for (let i = 0; i < C; i++) a += x[xi + i] * W[wi + i]; out[oi + oc] = a; } }
  } else if (g === 1) { // normal k×k (ilk katman)
    for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) { const oi = (oy * ow + ox) * o;
      for (let oc = 0; oc < o; oc++) { let a = W[bb + oc];
        for (let ky = 0; ky < k; ky++) { const iy = oy * s - p + ky; if (iy < 0 || iy >= H) continue;
          for (let kx = 0; kx < k; kx++) { const ix = ox * s - p + kx; if (ix < 0 || ix >= Wd) continue; const xi = (iy * Wd + ix) * C, wi = wb + ((oc * k + ky) * k + kx) * C; for (let i = 0; i < C; i++) a += x[xi + i] * W[wi + i]; } }
        out[oi + oc] = a; } }
  } else { // derinlemesine (her kanal kendi filtresiyle)
    for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) { const oi = (oy * ow + ox) * o;
      for (let c = 0; c < o; c++) out[oi + c] = W[bb + c];
      for (let ky = 0; ky < k; ky++) { const iy = oy * s - p + ky; if (iy < 0 || iy >= H) continue;
        for (let kx = 0; kx < k; kx++) { const ix = ox * s - p + kx; if (ix < 0 || ix >= Wd) continue; const xi = (iy * Wd + ix) * C, wi = wb + (ky * k + kx) * o; for (let c = 0; c < o; c++) out[oi + c] += x[xi + c] * W[wi + c]; } } }
  }
  if (op.act === 'hs') for (let i = 0; i < out.length; i++) out[i] = hs(out[i]);
  else if (op.act === 'relu') for (let i = 0; i < out.length; i++) if (out[i] < 0) out[i] = 0;
  return { x: out, H: oh, W: ow, C: o };
}

// x: Float32Array (HWC, normalize edilmiş 224×224×3). Döner: öznitelik vektörü.
export async function features(m, x, H = 224, Wd = 224, onProgress) {
  let cur = { x, H, W: Wd, C: 3 }, saved = null;
  for (let n = 0; n < m.ops.length; n++) {
    const op = m.ops[n];
    if (op.op === 'conv') cur = conv(cur.x, cur.H, cur.W, cur.C, op, m.W);
    else if (op.op === 'save') saved = cur.x;
    else if (op.op === 'add') { for (let i = 0; i < cur.x.length; i++) cur.x[i] += saved[i]; saved = null; }
    else if (op.op === 'se') {
      const { c, q } = op, W = m.W, pix = cur.H * cur.W, sq = new Float32Array(c), h = new Float32Array(q);
      for (let p = 0; p < pix; p++) for (let i = 0; i < c; i++) sq[i] += cur.x[p * c + i];
      for (let i = 0; i < c; i++) sq[i] /= pix;
      for (let j = 0; j < q; j++) { let a = W[op.b1 + j]; for (let i = 0; i < c; i++) a += sq[i] * W[op.w1 + j * c + i]; h[j] = a > 0 ? a : 0; }
      const sc = new Float32Array(c);
      for (let i = 0; i < c; i++) { let a = W[op.b2 + i]; for (let j = 0; j < q; j++) a += h[j] * W[op.w2 + i * q + j]; sc[i] = hsig(a); }
      for (let p = 0; p < pix; p++) for (let i = 0; i < c; i++) cur.x[p * c + i] *= sc[i];
    } else if (op.op === 'gap') {
      const { C } = cur, pix = cur.H * cur.W, out = new Float32Array(C);
      for (let p = 0; p < pix; p++) for (let i = 0; i < C; i++) out[i] += cur.x[p * C + i];
      for (let i = 0; i < C; i++) out[i] /= pix;
      return out;
    }
    if (n % 4 === 3) { if (onProgress) onProgress(n / m.ops.length); await wait(); }
  }
}

// Bizim eğittiğimiz sınıflandırıcı başlık: standartlaştırma + doğrusal katman + sıcaklıkla yumuşatılmış softmax
export function classify(m, feat) {
  const { mu, sd, w, b, T, classes } = m.head, K = classes.length, D = feat.length, z = new Float32Array(K);
  for (let c = 0; c < K; c++) { let a = b[c]; for (let i = 0; i < D; i++) a += ((feat[i] - mu[i]) / sd[i]) * w[c][i]; z[c] = a / T; }
  const mx = Math.max(...z); let s = 0; const p = Array.from(z, (v) => { const e = Math.exp(v - mx); s += e; return e; }).map((e) => e / s);
  return classes.map((name, i) => ({ name, p: p[i] })).sort((a, b) => b.p - a.p);
}

// Tarayıcıda bir "görünüm" hazırlar: kısa kenarı `size`'a ölçekle, ortadan 224×224 kes, (isteğe bağlı) yatay çevir, ImageNet ortalama/sapmasıyla normalleştir (HWC)
export function preprocess(img, view = { size: 256, flip: false }) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, sc = view.size / Math.min(w, h), rw = Math.max(224, Math.round(w * sc)), rh = Math.max(224, Math.round(h * sc));
  const c = document.createElement('canvas'); c.width = rw; c.height = rh; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, rw, rh);
  const ox = Math.round((rw - 224) / 2), oy = Math.round((rh - 224) / 2), d = g.getImageData(ox, oy, 224, 224).data, x = new Float32Array(224 * 224 * 3);
  const M = [0.485, 0.456, 0.406], S = [0.229, 0.224, 0.225];
  for (let yy = 0; yy < 224; yy++) for (let xx = 0; xx < 224; xx++) { const sx = view.flip ? 223 - xx : xx, si = (yy * 224 + sx) * 4, di = (yy * 224 + xx) * 3; for (let k = 0; k < 3; k++) x[di + k] = (d[si + k] / 255 - M[k]) / S[k]; }
  return x;
}

// Karar: fotoğrafın birkaç görünümü sırayla incelenir; hepsi aynı türü eşiğin üstünde bir güvenle söylerse cevap verilir.
// İlk görünüm yetersizse hemen "tanıyamadım" denir (gereksiz hesap yapılmaz). Az fotoğrafı olan (güvenilirliği ölçülemeyen) türler asla cevap olarak verilmez.
export async function recognize(m, img, onProgress) {
  const views = m.views, off = new Set(m.disabled || []); let first = null, name = null;
  for (let i = 0; i < views.length; i++) {
    if (onProgress) onProgress(i, views.length);
    const feat = await features(m, preprocess(img, views[i])), top = classify(m, feat), best = top[0];
    if (i === 0) first = top;
    if (best.name === 'diger' || off.has(best.name) || best.p < m.tau || (name && best.name !== name)) return { ok: false, top: first, best, viewsUsed: i + 1 };
    name = best.name;
  }
  return { ok: true, top: first, best: first[0], viewsUsed: views.length };
}
