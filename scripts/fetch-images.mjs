// Wikipedia/Wikimedia Commons'tan tür resimlerini ve lisans bilgisini çeker.
// Kullanım: node scripts/fetch-images.mjs  → src/data/images.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const species = JSON.parse(readFileSync(new URL('../src/data/species.json', import.meta.url)));
const outPath = new URL('../src/data/images.json', import.meta.url);
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath)) : {};

const api = async (host, params) => {
  const u = `https://${host}/w/api.php?format=json&origin=*&` + new URLSearchParams(params);
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'EndemikApp/0.1 (educational project)' } }); if (r.ok) return r.json(); } catch { /* tekrar dene */ }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return null;
};

async function pageImage(host, title) {
  const j = await api(host, { action: 'query', redirects: 1, titles: title, prop: 'pageimages|info', piprop: 'thumbnail|name', pithumbsize: 640, inprop: 'url' });
  const p = j && Object.values(j.query?.pages || {})[0];
  if (!p || p.missing !== undefined || !p.thumbnail) return null;
  return { thumb: p.thumbnail.source, file: p.pageimage, page: p.fullurl };
}

async function license(file) {
  const j = await api('commons.wikimedia.org', { action: 'query', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'extmetadata|url' });
  const p = j && Object.values(j.query?.pages || {})[0];
  const m = p?.imageinfo?.[0]?.extmetadata;
  if (!m) return null;
  const strip = (s) => (s?.value || '').replace(/<[^>]*>/g, '').trim();
  return { license: strip(m.LicenseShortName), author: strip(m.Artist), source: p.imageinfo[0].descriptionurl };
}

// Yedek kaynak: iNaturalist (yalnızca CC lisanslı fotoğraflar).
async function inat(sci) {
  try {
    const r = await fetch('https://api.inaturalist.org/v1/taxa?rank=species,subspecies,variety&per_page=1&q=' + encodeURIComponent(sci), { headers: { 'User-Agent': 'EndemikApp/0.1 (educational project)' } });
    const t = (await r.json()).results?.[0];
    const ph = t?.default_photo;
    if (!ph || !/^(cc0|cc-by|cc-by-sa)$/i.test(ph.license_code || '') || t.name.split(' ')[0] !== sci.split(' ')[0]) return null;
    return { url: ph.medium_url, license: 'CC ' + ph.license_code.replace(/^cc-?/i, '').toUpperCase(), author: (ph.attribution || '').replace(/^\(c\)\s*/i, ''), source: 'https://www.inaturalist.org/taxa/' + t.id, page: 'https://www.inaturalist.org/taxa/' + t.id };
  } catch { return null; }
}

const clean = (s) => s.replace(/ (subsp|var)\..*$/, '').trim();
let ok = 0, miss = [];
for (const s of species) {
  if (out[s.id]) { ok++; continue; }
  const cands = [];
  if (s.sci) cands.push(['en.wikipedia.org', clean(s.sci)], ['tr.wikipedia.org', clean(s.sci)]);
  cands.push(['tr.wikipedia.org', s.name]);
  let hit = null;
  for (const [host, t] of cands) { hit = await pageImage(host, t); if (hit) { hit.host = host; break; } }
  if (!hit) {
    const alt = s.sci ? await inat(clean(s.sci)) : null;
    if (alt) { out[s.id] = alt; ok++; console.log('✓', s.name, '← iNaturalist', alt.license); } else miss.push(s.name);
    continue;
  }
  const lic = await license(hit.file);
  // Yalnızca açık lisanslı (CC / kamu malı) resimleri kullan.
  if (!lic || !/^(CC|Public domain|PD)/i.test(lic.license)) { miss.push(s.name + ' (lisans)'); continue; }
  out[s.id] = { url: hit.thumb, ...lic, page: hit.page };
  ok++;
  console.log('✓', s.name, '←', hit.host, lic.license);
}
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\n${ok}/${species.length} resim bulundu. Bulunamayan (${miss.length}):\n` + miss.join(', '));
