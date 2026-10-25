// Sohbet botu istemcisi. Cevaplar sunucudaki yapay zekâdan gelir (supabase/functions/chat); hazır cevap yoktur.
// Burada yalnızca soruda hangi türlerin geçtiği bulunur ve sunucuya gönderilir.
import species from './data/species.json';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const chatAvailable = !!(url && key);

const norm = (s) => s.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter((w) => w.length >= 3);
const SKIP = new Set(['dağ', 'kara', 'yer', 'ada', 'göl', 'çay', 'taş', 'bir', 'için', 'nasıl', 'nerede', 'nedir', 'hangi', 'mı', 'mi']);
// Türkçe ekler yüzünden "kelaynağı" ile "kelaynak" eşleşsin: ortak başlangıç yeterince uzunsa eşleşir.
const same = (a, b) => {
  if (a === b) return true;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 4 && i >= Math.min(a.length, b.length) - 2;
};
const index = species.map((s) => ({ id: s.id, nameW: words(s.name).filter((w) => !SKIP.has(w)), sciW: words(s.sci) }));
// Birçok türün adında geçen sözcük ("kertenkelesi", "kardeleni") ayırt edici değildir; az geçen sözcük daha değerlidir.
const df = new Map();
for (const e of index) for (const w of new Set(e.nameW)) df.set(w, (df.get(w) || 0) + 1);

export function findSpecies(question) {
  const qw = words(question);
  const hits = [];
  for (const e of index) {
    let score = 0;
    for (const w of e.nameW) if (qw.some((q) => same(q, w))) score += w.length / df.get(w);
    for (const w of e.sciW) if (qw.some((q) => q === w)) score += w.length;
    if (score >= 2.5) hits.push([score, e.id]);
  }
  return hits.sort((a, b) => b[0] - a[0]).slice(0, 3).map((h) => h[1]);
}

const ERR = {
  404: 'Sohbet botu henüz sunucuda etkinleştirilmemiş. Yöneticiye haber verin.',
  429: 'Çok hızlı soruyorsunuz ya da bugünkü soru hakkınız doldu. Biraz bekleyip tekrar deneyin.',
  503: 'Bugünlük sohbet sınırına ulaşıldı. Yarın tekrar deneyin.',
};

// history: [{role:'user'|'assistant', text}], dönen: { answer, ids }
export async function ask(question, ids, history) {
  if (navigator.onLine === false) throw new Error('İnternet yok. Sohbet için bağlantı gerekir.');
  let r;
  try {
    r = await fetch(`${url}/functions/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ q: question, ids, history }),
    });
  } catch { throw new Error('Bağlantı kurulamadı. İnterneti kontrol edin.'); }
  if (!r.ok) throw new Error(ERR[r.status] || 'Şu an cevap veremiyorum, biraz sonra tekrar deneyin.');
  const j = await r.json();
  return j.answer;
}
