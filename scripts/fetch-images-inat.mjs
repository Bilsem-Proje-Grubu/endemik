// Resmi olmayan türler için iNaturalist'ten CC lisanslı gözlem fotoğraflarını bulur.
// Yalnızca tür adı birebir eşleşirse kullanılır (yanlış tür fotoğrafı koymaktansa boş bırakır).
// Kullanım: node scripts/fetch-images-inat.mjs  → src/data/images.json
import { readFileSync, writeFileSync } from 'node:fs';

const species = JSON.parse(readFileSync(new URL('../src/data/species.json', import.meta.url)));
const outPath = new URL('../src/data/images.json', import.meta.url);
const out = JSON.parse(readFileSync(outPath));
const UA = { 'User-Agent': 'EndemikApp/0.1 (educational project)' };
const OK = /^(cc0|cc-by|cc-by-sa)$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); if (r.status !== 429) return null; } catch { /* tekrar dene */ }
    await sleep(2000 * (i + 1));
  }
  return null;
};
const label = (c) => ({ cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA' }[c]);
const med = (u) => u.replace(/\/(square|small|medium|original)\.(\w+)/, '/medium.$2');

const sci = (s) => s.sci.replace(/ (subsp|var)\..*$/, '').trim().toLowerCase();
const todo = species.filter((s) => !out[s.id] && s.sci);
let found = 0;
for (const s of todo) {
  const q = sci(s);
  const t = await get(`https://api.inaturalist.org/v1/taxa?rank=species&per_page=5&q=${encodeURIComponent(q)}`);
  await sleep(1100);
  const hit = t?.results?.find((r) => r.name.toLowerCase() === q); // eş anlamlı birleştirmeleri yanlış tür fotoğrafı getirebilir
  if (!hit) { console.log('✗ taksonda yok:', s.name, q); continue; }
  let pick = null;
  const full = await get(`https://api.inaturalist.org/v1/taxa/${hit.id}`);
  await sleep(1100);
  for (const tp of full?.results?.[0]?.taxon_photos || []) {
    const p = tp.photo;
    if (p && OK.test(p.license_code || '')) { pick = { id: p.id, url: p.url, code: p.license_code, attr: p.attribution }; break; }
  }
  if (!pick) {
    const o = await get(`https://api.inaturalist.org/v1/observations?taxon_id=${hit.id}&photo_license=cc0,cc-by,cc-by-sa&order_by=votes&per_page=5&photos=true`);
    await sleep(1100);
    for (const ob of o?.results || []) for (const p of ob.photos || []) {
      if (!pick && OK.test(p.license_code || '')) pick = { id: p.id, url: p.url, code: p.license_code, attr: p.attribution };
    }
  }
  if (!pick) { console.log('✗ CC fotoğraf yok:', s.name, `(${hit.name}, taxon ${hit.id})`); continue; }
  out[s.id] = {
    url: med(pick.url), license: label(pick.code),
    author: (pick.attr || '').replace(/^\(c\)\s*/i, '').replace(/,\s*some rights reserved.*$/i, '').replace(/,\s*no rights reserved.*$/i, ''),
    source: `https://www.inaturalist.org/photos/${pick.id}`, page: `https://www.inaturalist.org/taxa/${hit.id}`,
  };
  found++;
  console.log('✓', s.name, '←', hit.name, label(pick.code), out[s.id].author);
}
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\n${found}/${todo.length} yeni resim bulundu.`);
