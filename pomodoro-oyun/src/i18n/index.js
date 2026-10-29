// Metinler tr.json içinde. t('anahtar.yol', { ad: 'değer' }) ile alınır.
import tr from './tr.json';

const dict = tr;

function lookup(key) {
  let cur = dict;
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Metin al; {ad} yer tutucularını doldurur. Eksik anahtarda anahtarı döndürür. */
export function t(key, vars) {
  const v = lookup(key);
  if (typeof v !== 'string') {
    if (typeof console !== 'undefined') console.warn('Eksik metin:', key);
    return key;
  }
  return vars ? v.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : v;
}

/** Dizi tipindeki metinleri (ör. cesaret mesajları) döndürür. */
export function tList(key) {
  const v = lookup(key);
  return Array.isArray(v) ? v : [];
}

/** Dizilerden/sözlüklerden rastgele biri. */
export function pick(list, rnd = Math.random) {
  return list[Math.floor(rnd() * list.length)];
}

/** Dakikayı "1 sa 25 dk" biçiminde yazar. */
export function fmtMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return t('fmt.min', { n: m });
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? t('fmt.hourMin', { h, m: r }) : t('fmt.hour', { h });
}

/** Sayıyı binlik ayraçlı yazar. */
export const fmtNumber = (n) => Math.round(n).toLocaleString('tr-TR');
