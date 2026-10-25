// Sohbet botunun "dil anlama" modeli: soru neyle ilgili? (niyet sınıflandırma)
// Model, scripts/train-chat.mjs ile bu projede eğitilir; ağırlıklar src/data/chat-model.json'dadır.
// Girdi: soru metni → harf/kelime özellikleri (karma, 4096 boyut) → softmax (çok sınıflı lojistik regresyon).
export const DIM = 4096;

// Türkçe karakterleri sadeleştirir; böylece "kertenkele" ve "kertenkele" aynı sayılır, "ş/s", "ı/i" yazım farkı sorun olmaz.
export const fold = (s) => s.toLocaleLowerCase('tr')
  .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
  .replace(/[^a-z0-9<>\s]/g, ' ').replace(/\s+/g, ' ').trim();

const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % DIM; };

// Soru → seyrek vektör {index: değer}
export function features(text) {
  const ws = fold(text).replace(/[<>]/g, '').split(' ').filter(Boolean);
  const f = new Map();
  const add = (k) => { const i = hash(k); f.set(i, 1); };
  ws.forEach((w, i) => {
    add('w:' + w);
    if (i) add('b:' + ws[i - 1] + '_' + w);
    const p = ' ' + w + ' ';
    for (const n of [3, 4]) for (let j = 0; j + n <= p.length; j++) add('c:' + p.slice(j, j + n));
  });
  const norm = Math.sqrt(f.size) || 1;
  return [...f.keys()].map((i) => [i, 1 / norm]);
}

// model: { intents: [...], idx: [kullanılan sütunlar], w: [[...]], b: [...] }
export function predict(model, text) {
  const pos = new Map(model.idx.map((c, k) => [c, k]));
  const z = model.b.slice();
  for (const [i, v] of features(text)) {
    const k = pos.get(i);
    if (k === undefined) continue;
    for (let c = 0; c < z.length; c++) z[c] += model.w[c][k] * v;
  }
  const m = Math.max(...z);
  const e = z.map((x) => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  const p = e.map((x) => x / sum);
  const best = p.indexOf(Math.max(...p));
  return { intent: model.intents[best], prob: p[best], probs: p };
}
