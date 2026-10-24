// Resmi olmayan bitki türleri için GBIF'teki herbaryum örnek taramalarını (CC0 / CC BY) indirir.
// Tür adı birebir eşleşmeli. Resim 800 px'e küçültülüp public/species-img/ altına yazılır.
// Gereken: python3 + Pillow (küçültme için). Kullanım: node scripts/fetch-images-herbarium.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const species = JSON.parse(readFileSync(new URL('../src/data/species.json', import.meta.url)));
const outPath = new URL('../src/data/images.json', import.meta.url);
const out = JSON.parse(readFileSync(outPath));
const dir = new URL('../public/species-img/', import.meta.url);
mkdirSync(dir, { recursive: true });
const UA = { 'User-Agent': 'EndemikApp/0.1 (educational project; bilsemprojegrubu@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = async (u) => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); } catch { /* tekrar */ } await sleep(1500); } return null; };
const OK = /(publicdomain\/zero|licenses\/by\/)/; // CC0 ve CC BY (NC / SA dışı)
const label = (l) => (/zero/.test(l) ? 'CC0' : 'CC BY');

const todo = species.filter((s) => s.group === 'flora' && s.sci && !out[s.id]);
let found = 0;
for (const s of todo) {
  const bin = s.sci.replace(/ (subsp|var)\..*$/, '').trim();
  const m = await json('https://api.gbif.org/v1/species/match?name=' + encodeURIComponent(bin));
  if (!m || m.matchType !== 'EXACT' || m.rank !== 'SPECIES') continue;
  const o = await json(`https://api.gbif.org/v1/occurrence/search?taxonKey=${m.usageKey}&mediaType=StillImage&limit=50`);
  let pick = null;
  for (const r of o?.results || []) {
    if (!(r.scientificName || '').toLowerCase().startsWith(bin.toLowerCase())) continue; // eş anlamlı/başka tür kayıtları alınmaz
    for (const x of r.media || []) {
      const lic = x.license || r.license || '';
      if (x.type !== 'StillImage' || !OK.test(lic) || !/^https?:\/\/.+\.(jpe?g|png)(\?|$)/i.test(x.identifier || '') && !/iiif|mediaphoto|cloudfront|jacq|bgbm|herbarium/.test(x.identifier || '')) continue;
      if (!pick) pick = { r, x, lic };
    }
    if (pick) break;
  }
  if (!pick) continue;
  const src = pick.x.identifier.replace(/\/full\/1600,\//, '/full/900,/');
  const tmp = new URL(`${s.id}.tmp`, dir).pathname, dst = new URL(`${s.id}.jpg`, dir).pathname;
  try {
    let res = await fetch(src, { headers: UA });
    if (!res.ok && src !== pick.x.identifier) res = await fetch(pick.x.identifier, { headers: UA }); // küçük boyut istenemediyse özgün adres
    if (!res.ok || !/image\//.test(res.headers.get('content-type') || '')) { console.log('✗ indirilemedi:', s.name, res.status); continue; }
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.MAX_IMAGE_PIXELS=None;i=Image.open(sys.argv[1]).convert("RGB");i.thumbnail((800,800));i.save(sys.argv[2],"JPEG",quality=80)', tmp, dst]);
    execFileSync('rm', ['-f', tmp]);
  } catch (e) { console.log('✗ işlenemedi:', s.name, String(e).slice(0, 80)); continue; }
  const who = pick.x.creator || pick.x.rightsHolder || pick.r.rightsHolder || pick.r.institutionCode || pick.r.datasetName || 'Herbaryum';
  out[s.id] = { url: `./species-img/${s.id}.jpg`, type: 'specimen', license: label(pick.lic), author: String(who).slice(0, 80), source: `https://www.gbif.org/occurrence/${pick.r.key}`, page: `https://www.gbif.org/occurrence/${pick.r.key}` };
  found++;
  console.log('✓', s.name, '←', out[s.id].author, label(pick.lic));
  writeFileSync(outPath, JSON.stringify(out, null, 2));
}
console.log(`\n${found}/${todo.length} herbaryum örneği eklendi.`);
