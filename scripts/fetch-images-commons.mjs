// Wikimedia Commons'ta tür kategorisi (Category:Cins_tür) olan türlerin CC / kamu malı resimlerini bulur.
// İstek sınırına takılmamak için yavaş çalışır ve Retry-After süresini bekler.
// Kullanım: node scripts/fetch-images-commons.mjs  → src/data/images.json
import { readFileSync, writeFileSync } from 'node:fs';

const species = JSON.parse(readFileSync(new URL('../src/data/species.json', import.meta.url)));
const outPath = new URL('../src/data/images.json', import.meta.url);
const out = JSON.parse(readFileSync(outPath));
const UA = { 'User-Agent': 'EndemikApp/0.1 (educational project; bilsemprojegrubu@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (params) => {
  const u = 'https://commons.wikimedia.org/w/api.php?format=json&' + new URLSearchParams(params);
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    try {
      const r = await fetch(u, { headers: UA });
      if (r.ok) return r.json();
      if (r.status === 429) { await sleep((+r.headers.get('retry-after') || 30) * 1000 + 2000); continue; }
      return null;
    } catch { /* tekrar dene */ }
  }
  return null;
};
const strip = (s) => (s?.value || '').replace(/<[^>]*>/g, '').trim();
const OK = /^(CC0|CC BY|CC BY-SA|Public domain|PD)/i;

const todo = species.filter((s) => !out[s.id] && s.sci);
let found = 0;
for (const s of todo) {
  const bin = s.sci.replace(/ (subsp|var)\..*$/, '').trim();
  const cat = await api({ action: 'query', list: 'categorymembers', cmtitle: 'Category:' + bin, cmtype: 'file', cmlimit: 20 });
  let files = (cat?.query?.categorymembers || []).map((m) => m.title);
  if (!files.length) {
    const sr = await api({ action: 'query', list: 'search', srnamespace: 6, srlimit: 10, srsearch: `"${bin}"` });
    // Yalnızca dosya adında tam tür adı geçenler (yanlış tür riskine karşı).
    files = (sr?.query?.search || []).map((m) => m.title).filter((t) => t.toLowerCase().includes(bin.toLowerCase()));
  }
  // Harita, dağılım şeması, simge gibi fotoğraf olmayan dosyalar alınmaz.
  files = files.filter((t) => /\.(jpe?g|png)$/i.test(t) && !/map|distribution|range|harita|locator|diagram|logo|icon|chart|poster|banner|flyer|brosür|afiş/i.test(t));
  if (!files.length) { console.log('✗ Commons\'ta yok:', s.name, bin); continue; }
  const info = await api({ action: 'query', titles: files.slice(0, 8).join('|'), prop: 'imageinfo', iiprop: 'extmetadata|url', iiurlwidth: 640 });
  let pick = null;
  for (const p of Object.values(info?.query?.pages || {})) {
    const ii = p.imageinfo?.[0], m = ii?.extmetadata;
    if (!ii || !m || !OK.test(strip(m.LicenseShortName))) continue;
    pick = { url: ii.thumburl || ii.url, license: strip(m.LicenseShortName), author: strip(m.Artist), source: ii.descriptionurl };
    break;
  }
  if (!pick) { console.log('✗ Açık lisanslı dosya yok:', s.name, `(${files.length} dosya)`); continue; }
  out[s.id] = { ...pick, page: pick.source };
  found++;
  console.log('✓', s.name, '←', pick.license, pick.author.slice(0, 40), pick.source);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
}
console.log(`\n${found}/${todo.length} yeni resim bulundu.`);
