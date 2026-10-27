// İnternetten (Türkçe Vikipedi) canlı maddesi arama. Yalnızca kullanıcı izin verdiyse çalışır; aranan ad tr.wikipedia.org'a gönderilir.
// Bulunan metin Vikipedi'den (CC BY-SA 4.0) birebir alınır; cevapta kaynak bağlantısı gösterilir.
import { fold } from './chatmodel.js';

const KEY = 'endemik.online';
export const onlineAsked = () => { try { return localStorage.getItem(KEY) !== null; } catch { return false; } };
export const onlineEnabled = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export const setOnline = (on) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* yoksay */ } };

const Q_STOP = new Set(['nedir', 'ne', 'nerede', 'yasar', 'yasiyor', 'neye', 'benzer', 'benziyor', 'hakkinda', 'bilgi', 'ver', 'verir', 'misin', 'mi', 'mu', 'anlat', 'anlatir', 'kimdir', 'kim', 'nasil', 'bir', 'acaba', 'lutfen',
  'peki', 'hangi', 'turu', 'tur', 'canli', 'ozellikleri', 'gorunur', 'bulunur', 'ogren', 'soyle', 'soyler', 'musun', 'var', 'nerelerde', 'demek', 'beslenir', 'yer', 'cevap', 'soru', 'hakkinda', 'ilgili', 'bana', 'biraz', 'bu', 'su', 'o', 've', 'ya', 'da', 'de']);
// "Anadolu leoparı nedir?" → "Anadolu leoparı"; çok uzun ya da boş kalırsa arama yapılmaz
export function extractQuery(q) {
  const words = q.replace(/['’][\p{L}]+/gu, '').replace(/[?!.,;:()"“”]/g, ' ').split(/\s+/).filter(Boolean);
  const keep = words.filter((w) => !Q_STOP.has(fold(w)));
  if (!keep.length || keep.length > 4) return '';
  const s = keep.join(' ');
  return s.length >= 4 ? s : '';
}

const same = (a, b) => { if (a === b) return true; if (Math.abs(a.length - b.length) > 5) return false; let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i >= 4 && i >= Math.min(a.length, b.length) - 2; };
const toks = (s) => fold(s).split(' ').filter((w) => w.length >= 2);
const NATURE = /\b(tür|türü|türüdür|cins|cinsi|familya|familyası|alttür|takım|bitki|hayvan|kuş|balık|memeli|sürüngen|böcek|amfibi|kurbağa|yılan|kertenkele|ağaç|çiçek|mantar|kemirgen|yarasa|örümcek|endemik|nesli)\b/i;
const NOT_NATURE = /(\(\d{1,2} \p{L}+ \d{4}|\b(doğdu|futbolcu|oyuncu|şarkıcı|yönetmen|film|dizi|albüm|milletvekili|şirket|kulübü)\b)/iu;

// Madde metni: giriş paragrafının ilk cümleleri, en çok ~430 karakter
function firstSentences(t) {
  const clean = t.replace(/\s+/g, ' ').trim(); let out = '';
  for (const s of clean.split(/(?<=[.!?])\s+/)) { if (out && (out + ' ' + s).length > 430) break; out += (out ? ' ' : '') + s; if (out.length >= 220) break; }
  return out.length >= 60 && /[.!?]$/.test(out) ? out : '';
}

export async function lookupWikipedia(query) {
  const ck = 'endemik.wq.' + fold(query);
  try { const c = sessionStorage.getItem(ck); if (c) return JSON.parse(c); } catch { /* yoksay */ }
  const u = 'https://tr.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: query, gsrlimit: '3', prop: 'extracts|pageterms', wbptterms: 'description', exintro: '1', explaintext: '1', exchars: '1200', redirects: '1' });
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 7000);
  let j;
  try { const r = await fetch(u, { signal: ctl.signal }); if (!r.ok) return null; j = await r.json(); } catch { return null; } finally { clearTimeout(timer); }
  const pages = Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index);
  const qt = toks(query).filter((w) => w.length >= 3);
  let found = null;
  for (const p of pages) {
    const title = p.title.replace(/\s*\([^)]*\)\s*$/, ''), tt = toks(title), ex = p.extract || '';
    const desc = p.terms?.description?.[0] || '';
    if (!NATURE.test(desc + ' ' + ex.slice(0, 300)) || NOT_NATURE.test(ex.slice(0, 300))) continue;
    const complete = tt.length > 0 && tt.every((t) => qt.some((q) => same(q, t)));   // başlığın tüm sözcükleri soruda geçiyor
    const exTok = toks(ex);
    const inText = p.index === 1 && qt.length > 0 && qt.every((q) => tt.some((t) => same(q, t)) || exTok.some((t) => same(q, t)));  // ilk sonuç ve soru sözcüklerinin hepsi maddede geçiyor
    if (!complete && !inText) continue;
    const text = firstSentences(ex);
    if (text) { found = { title: p.title, text, url: 'https://tr.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_')) }; break; }
  }
  try { sessionStorage.setItem(ck, JSON.stringify(found)); } catch { /* yoksay */ }
  return found;
}
