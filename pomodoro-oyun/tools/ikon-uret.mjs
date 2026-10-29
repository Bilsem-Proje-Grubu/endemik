// Uygulama simgelerini (PNG) üretir: `node tools/ikon-uret.mjs`. Tarayıcı olarak Playwright'ın Chromium'unu kullanır.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { appIconSVG } from '../src/assets/art.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const svg = appIconSVG();
writeFileSync(new URL('../public/icons/icon.svg', import.meta.url), svg);

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(size, file, { pad = 0 } = {}) {
  const inner = size - pad * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:#17692f"><div style="padding:${pad}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`);
  await page.screenshot({ path: new URL(`../public/icons/${file}`, import.meta.url).pathname, omitBackground: pad === 0 });
}
await png(192, 'icon-192.png');
await png(512, 'icon-512.png');
await png(512, 'icon-maskable-512.png', { pad: 64 }); // Maskable: güvenli alan için kenar boşluğu
await browser.close();
console.log('Simgeler üretildi.');
