// Yerel saate göre gün/hafta anahtarları. Hepsi saf fonksiyon; test etmesi kolay.

const pad = (n) => String(n).padStart(2, '0');

/** Zaman damgasını yerel "YYYY-AA-GG" anahtarına çevirir. */
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Gün anahtarını öğlen 12:00 zaman damgasına çevirir (yaz saati kaymasından korunmak için). */
export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

/** Gün anahtarına n gün ekler (negatif olabilir). */
export function addDays(key, n) {
  const d = new Date(parseDayKey(key));
  d.setDate(d.getDate() + n);
  return dayKey(d.getTime());
}

/** İki gün anahtarı arasındaki gün farkı (b - a). */
export function daysBetween(a, b) {
  return Math.round((parseDayKey(b) - parseDayKey(a)) / 86400000);
}

/** Haftanın günü: 0 = Pazartesi ... 6 = Pazar. */
export function weekdayIndex(key) {
  return (new Date(parseDayKey(key)).getDay() + 6) % 7;
}

/** Zaman damgasının ait olduğu haftanın Pazartesi gününün anahtarı. */
export function weekKey(ts) {
  const k = dayKey(ts);
  return addDays(k, -weekdayIndex(k));
}

/** Bir gün anahtarının ait olduğu haftanın anahtarı. */
export function weekKeyOfDay(key) {
  return addDays(key, -weekdayIndex(key));
}

/** Gün anahtarı için kısa Türkçe gün adı. */
export function shortDayName(key) {
  return ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][weekdayIndex(key)];
}

/** Basit sayı üreteci (tohumlu). Aynı tohum her zaman aynı diziyi verir. */
export function seededRandom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
