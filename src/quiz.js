// Bilgi yarışması soru üretici. Sorular 94 türün verisinden üretilir; cevaplar kesin (tahmin gerektirmez).
import { floweringMonths } from './chatlogic.js';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fold = (s) => s.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

// Tanımda türün adı ya da bilimsel adı geçiyorsa gizlenir ("▢▢▢")
function mask(text, s) {
  const words = new Set([...s.name.split(/\s+/), ...s.sci.split(/\s+/)].map(fold).filter((w) => w.length >= 4));
  return text.replace(/[\p{L}\p{N}'’-]+/gu, (w) => {
    const f = fold(w);
    for (const k of words) if (f === k || (f.length >= 4 && (f.startsWith(k.slice(0, Math.max(4, k.length - 2))) || k.startsWith(f.slice(0, Math.max(4, f.length - 2)))))) return '▢▢▢';
    return w;
  });
}
const firstSentences = (t, max) => { const m = t.match(/^.{40,}?[.!?](?=\s|$)/s); let o = m ? m[0] : t; if (o.length > max) o = o.slice(0, max).replace(/\s+\S*$/, '') + '…'; return o; };

export function makeQuiz(species, n = 10) {
  const photo = species.filter((s) => s.image && s.imageCredit?.type !== 'specimen');
  const withLoc = species.filter((s) => s.localities.length);
  const flora = species.filter((s) => s.group === 'flora');
  const months = new Map(flora.map((s) => [s.id, floweringMonths(s.flowering)]).filter(([, m]) => m));
  const used = new Set();
  // aynı bilimsel adı taşıyan türler (iki Akdeniz foku kaydı) birbirinin çeldiricisi olamaz
  const names = (s, k) => shuffle(species.filter((x) => x.id !== s.id && x.group === s.group && x.sci !== s.sci)).slice(0, k);
  const build = (q) => { const opts = shuffle(q.options); return { ...q, options: opts, answer: opts.findIndex((o) => o === q.correct) }; };

  const makers = {
    resim() {
      const s = pick(photo.filter((x) => !used.has(x.id))); if (!s) return null;
      return build({ type: 'resim', sid: s.id, img: s.image, q: 'Bu fotoğraf hangi türe ait?', correct: s.name, options: [s.name, ...names(s, 3).map((x) => x.name)], explain: `${s.name} (${s.sci})` });
    },
    bilimsel() {
      const s = pick(species.filter((x) => !used.has(x.id)));
      return build({ type: 'bilimsel', sid: s.id, q: `«${s.name}» türünün bilimsel adı hangisi?`, correct: s.sci, options: [s.sci, ...shuffle([...new Set(species.filter((x) => x.group === s.group).map((x) => x.sci))].filter((c) => c !== s.sci)).slice(0, 3)], explain: `${s.name}: ${s.sci}` });
    },
    yer() {
      const s = pick(withLoc.filter((x) => !used.has(x.id)));
      const GEN = new Set(['cevresi', 'civari', 'koyu', 'koyleri', 'yoresi', 'dagi', 'daglari', 'golu', 'vadisi', 'adasi', 'mevkii', 'mahallesi', 'kasabasi', 'ilcesi', 'belediyesi', 'milli', 'parki', 'merkez', 'bolgesi', 'arasinda']);
      const tok = (n) => fold(n).replace(/[ıİ]/g, 'i').split(' ').filter((w) => w.length >= 4 && !GEN.has(w));
      const mine = new Set(s.localities.flatMap((l) => tok(l.name))); const right = pick(s.localities).name;
      // çeldirici yer, doğru türün yerleriyle aynı il/yer adını taşımamalı (ör. "Pötürge (Malatya)" ve "Malatya çevresi" ikisi de doğru sayılırdı)
      const pool = [...new Set(species.filter((x) => x.id !== s.id).flatMap((x) => x.localities.map((l) => l.name)))].filter((n) => !tok(n).some((w) => mine.has(w)));
      return build({ type: 'yer', sid: s.id, q: `«${s.name}» hangi yerde bilinir?`, correct: right, options: [right, ...shuffle(pool).slice(0, 3)], explain: `${s.name}: ${s.localities.map((l) => l.name).join(', ')}` });
    },
    cicek() {
      const ms = shuffle([...Array(12).keys()]);
      for (const m of ms) {
        const yes = flora.filter((s) => !used.has(s.id) && months.get(s.id)?.has(m));
        const no = flora.filter((s) => months.has(s.id) && ![m - 1, m, m + 1].map((k) => (k + 12) % 12).some((k) => months.get(s.id).has(k)));
        if (!yes.length || no.length < 3) continue;
        const s = pick(yes);
        return build({ type: 'cicek', sid: s.id, q: `Hangi bitki ${AYLAR[m]} ayında çiçek açar?`, correct: s.name, options: [s.name, ...shuffle(no).slice(0, 3).map((x) => x.name)], explain: `${s.name}: çiçeklenme ${s.flowering}` });
      }
      return null;
    },
    tanim() {
      const c = species.filter((x) => !used.has(x.id) && (x.description || '').length >= 70);
      const s = pick(c); const t = firstSentences(mask(s.description, s), 240);
      if ((t.match(/▢▢▢/g) || []).length > 3) return null;
      return build({ type: 'tanim', sid: s.id, q: 'Bu tanım hangi türe ait?', text: t, correct: s.name, options: [s.name, ...names(s, 3).map((x) => x.name)], explain: `${s.name} (${s.sci})` });
    },
    gorunum() {
      const c = species.filter((x) => !used.has(x.id) && (x.morphology || '').length >= 70);
      const s = pick(c); const t = firstSentences(mask(s.morphology, s), 220);
      return build({ type: 'gorunum', sid: s.id, q: 'Bu görünüş tarifi hangi türe ait?', text: t, correct: s.name, options: [s.name, ...names(s, 3).map((x) => x.name)], explain: `${s.name} (${s.sci})` });
    },
  };
  // 10 soruda tür dengesi: en az bir resim sorusu
  const plan = shuffle(['resim', 'resim', 'bilimsel', 'yer', 'yer', 'cicek', 'tanim', 'tanim', 'gorunum', 'bilimsel']).slice(0, n);
  const out = [];
  for (const type of plan) {
    let q = null;
    for (let k = 0; k < 20 && !q; k++) q = makers[type]();
    if (!q) for (let k = 0; k < 20 && !q; k++) q = makers.bilimsel();
    used.add(q.sid); out.push(q);
  }
  return out;
}
