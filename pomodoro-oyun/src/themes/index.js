// Temaları yükler. Yeni tema: bir JSON dosyası ekle, burada içe aktar, THEME_IDS'e yaz (config.js).
import football from './football.json';
import cafe from './cafe.json';
import fashion from './fashion.json';
import shelter from './shelter.json';

export const THEMES = { football, cafe, fashion, shelter };

/** Tema kimliğinden tema nesnesi (bilinmiyorsa null). */
export const getTheme = (id) => THEMES[id] || null;

/** Tema şemasını denetler; hata mesajlarının listesini döndürür (boşsa geçerli). */
export function validateTheme(t) {
  const errors = [];
  const need = (cond, msg) => {
    if (!cond) errors.push(`${t && t.id}: ${msg}`);
  };
  need(t && t.id && t.name, 'id/name eksik');
  need(t.currency && t.currency.name && t.currency.icon, 'para birimi eksik');
  need(t.palette && t.palette.light && t.palette.dark, 'palet eksik');
  need(Array.isArray(t.levels) && t.levels.length >= 3, 'en az 3 seviye gerekli');
  need(Array.isArray(t.categories) && t.categories.length >= 1, 'kategori yok');
  need(Array.isArray(t.items) && t.items.length >= 40, 'en az 40 ürün gerekli');
  const ids = new Set();
  const cats = new Set((t.categories || []).map((c) => c.id));
  for (const i of t.items || []) {
    need(!ids.has(i.id), `yinelenen ürün kimliği ${i.id}`);
    ids.add(i.id);
    need(cats.has(i.category), `${i.id}: bilinmeyen kategori`);
    need(['bronze', 'silver', 'gold', 'legend'].includes(i.tier), `${i.id}: kademe geçersiz`);
    need(i.price > 0 && i.power > 0 && i.minLevel >= 1, `${i.id}: fiyat/güç/seviye geçersiz`);
    need(i.name && i.art, `${i.id}: ad/görsel eksik`);
  }
  return errors;
}
