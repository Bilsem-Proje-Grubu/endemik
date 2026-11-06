// Dış sitelerdeki (Wikimedia, iNaturalist vb.) tür resimlerini indirip 800 px'e küçülterek
// public/species-img/ altına kopyalar ve images.json'daki adresi yerel dosyaya çevirir.
// Lisans ve kaynak bilgisi (author, license, source) olduğu gibi korunur.
// Gereken: python3 + Pillow. Kullanım: node scripts/localize-images.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const outPath = new URL('../src/data/images.json', import.meta.url);
const out = JSON.parse(readFileSync(outPath));
const dir = new URL('../public/species-img/', import.meta.url);
mkdirSync(dir, { recursive: true });
const UA = { 'User-Agent': 'EndemikApp/0.1 (educational project; bilsemprojegrubu@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) return Buffer.from(await r.arrayBuffer());
      if (r.status === 429) { await sleep(((+r.headers.get('retry-after') || 20) + 2) * 1000); continue; }
      if (r.status >= 400 && r.status < 500) return null;
    } catch { /* tekrar dene */ }
    await sleep(2000 * (i + 1));
  }
  return null;
}

let ok = 0; const fail = [];
for (const [id, v] of Object.entries(out)) {
  if (!/^https?:\/\//.test(v.url)) continue;
  const buf = await download(v.url);
  if (!buf) { fail.push(id); continue; }
  const tmp = new URL(`${id}.tmp`, dir).pathname, dst = new URL(`${id}.jpg`, dir).pathname;
  try {
    writeFileSync(tmp, buf);
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.MAX_IMAGE_PIXELS=None;i=Image.open(sys.argv[1]).convert("RGB");i.thumbnail((800,800));i.save(sys.argv[2],"JPEG",quality=80,optimize=True)', tmp, dst]);
    rmSync(tmp, { force: true });
  } catch (e) { fail.push(id + ' (işlenemedi)'); rmSync(tmp, { force: true }); continue; }
  out[id] = { ...v, url: `./species-img/${id}.jpg` };
  ok++;
  console.log('✓', id);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  await sleep(700);
}
console.log(`\n${ok} resim yerel kopyaya alındı. Alınamayan (${fail.length}): ${fail.join(', ')}`);
