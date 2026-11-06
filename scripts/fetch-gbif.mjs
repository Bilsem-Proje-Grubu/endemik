// GBIF'ten her türün Türkiye gözlem noktalarını çeker; nadir türlerin tam konumunu vermemek için 0.1° (~10 km) karelere yuvarlar.
// Kullanım: node scripts/fetch-gbif.mjs  → src/data/gbif.json  { türId: [[lat, lng, sayı], ...] }
import fs from 'fs';
import { execFileSync } from 'child_process';
const get = (u) => JSON.parse(execFileSync('curl', ['-s', '-m', '40', u], { maxBuffer: 1e8 }).toString());  // curl proxy ayarını kendiliğinden kullanır
const species = JSON.parse(fs.readFileSync('src/data/species.json', 'utf8'));
const R = (v) => Math.round(v * 10) / 10;
const out = {}; let total = 0;
for (const s of species) {
  const name = s.sci.replace(/\s+(subsp|ssp|var)\.?.*$/i, '').split(' ').slice(0, 2).join(' ');
  const cells = new Map();
  for (let off = 0; off < 600; off += 300) {
    const u = `https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(name)}&country=TR&hasCoordinate=true&hasGeospatialIssue=false&limit=300&offset=${off}`;
    let d; try { d = get(u); } catch { break; }
    for (const r of d.results || []) {
      const k = R(r.decimalLatitude) + ',' + R(r.decimalLongitude);
      cells.set(k, (cells.get(k) || 0) + 1);
    }
    if (d.endOfRecords) break;
  }
  if (cells.size) out[s.id] = [...cells].map(([k, n]) => [...k.split(',').map(Number), n]);
  total += cells.size;
  console.log(s.id.padEnd(32), name.padEnd(30), cells.size);
}
fs.writeFileSync('src/data/gbif.json', JSON.stringify(out));
console.log(Object.keys(out).length, 'türde veri,', total, 'kare');
