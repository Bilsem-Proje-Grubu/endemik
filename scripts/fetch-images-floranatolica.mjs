// Floranatolica'dan (CC BY-SA 4.0, kaynak ve gözlemci belirtilerek) tür fotoğraflarını indirir
// ve public/species-img/ altına kaydeder. Tür sayfası birebir tür adıyla bulunamazsa atlanır.
// Kullanım: node scripts/fetch-images-floranatolica.mjs  → src/data/images.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const species = JSON.parse(readFileSync(new URL('../src/data/species.json', import.meta.url)));
const outPath = new URL('../src/data/images.json', import.meta.url);
const out = JSON.parse(readFileSync(outPath));
const dir = new URL('../public/species-img/', import.meta.url);
mkdirSync(dir, { recursive: true });
const BASE = 'https://www.floranatolica.com/eukaria';
const UA = { 'User-Agent': 'EndemikApp/0.1 (educational project; bilsemprojegrubu@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = async (u) => { await sleep(1500); const r = await fetch(u, { headers: UA }); return r.ok ? new TextDecoder('windows-1254').decode(await r.arrayBuffer()) : null; };

// Daha önce doğrudan bağlantı verilen Floranatolica resimlerini de yerel kopyaya taşır.
const todo = species.filter((s) => s.sci && (!out[s.id] || /floranatolica\.com/.test(out[s.id].url)));
let found = 0;
for (const s of todo) {
  const bin = s.sci.replace(/ (subsp|var)\..*$/, '').trim();
  const page = await text(`${BASE}/gui/species.php?ID=${bin.replace(' ', '-')}`);
  const xid = page && [...page.matchAll(/observation\.php\?XID=(\d+)/g)].map((m) => m[1])[0];
  if (!xid) continue;
  const obs = await text(`${BASE}/gui/observation.php?XID=${xid}`);
  const [genus, epithet] = bin.split(' ');
  const flat = obs ? obs.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '|').replace(/\|[\s|]*\|/g, '|') : '';
  // Gözlemin tanımlanan türü birebir bizim türümüz olmalı.
  if (!new RegExp(`\\|${genus}\\|${epithet}\\|`).test(flat)) { console.log('✗ tür eşleşmedi:', s.name); continue; }
  const img = obs.match(/images\/640X480\/[\w/]+\.jpg/)?.[0];
  const who = [...flat.matchAll(/\|([^|]+?) gözlemleri\|/g)].map((m) => m[1].trim()).filter((x) => !x.includes(' / ') && x.toLowerCase() !== bin.toLowerCase());
  const author = who[0];
  if (!img || !author) { console.log('✗ resim/gözlemci yok:', s.name); continue; }
  await sleep(1500);
  const r = await fetch(`${BASE}/${img}`, { headers: UA });
  if (!r.ok) continue;
  writeFileSync(new URL(`${s.id}.jpg`, dir), Buffer.from(await r.arrayBuffer()));
  const src = `${BASE}/gui/observation.php?XID=${xid}`;
  out[s.id] = { url: `./species-img/${s.id}.jpg`, license: 'CC BY-SA 4.0', author, source: src, page: src };
  found++;
  console.log('✓', s.name, '←', author, src);
}
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\n${found} resim Floranatolica'dan alındı.`);
