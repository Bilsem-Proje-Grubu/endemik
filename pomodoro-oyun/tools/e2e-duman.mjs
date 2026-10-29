// Tarayıcıda duman testi: ilk açılış akışı, Pomodoro, mağaza, ekran görüntüleri.
// Kullanım: önce `npm run build && npx vite preview --port 4173`, sonra `node tools/e2e-duman.mjs [çıktı-klasörü]`.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/tmp/shots';
const BASE = process.env.URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, locale: 'tr-TR' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.clock.install({ time: new Date(2025, 0, 6, 10, 0, 0) });
await page.goto(BASE);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await shot('01-consent');
await page.getByRole('button', { name: /Anladım/ }).click();
await page.locator('[data-theme-id="football"]').click();
await shot('02-theme');
await page.getByRole('button', { name: 'Bu temayla başla' }).click();
await page.getByRole('button', { name: 'Devam' }).click();
await page.getByRole('button', { name: 'Devam' }).click();
await page.getByRole('button', { name: '4 Pomodoro' }).first().click();
await page.getByRole('button', { name: 'Devam' }).click();
await shot('03-survey');
await page.getByRole('button', { name: 'Şimdi değil' }).click();
await shot('04-focus-idle');

await page.locator('#task').fill('Matematik - türev');
await page.getByRole('button', { name: /Başlat/ }).click();
await page.clock.runFor(60 * 1000);
await shot('05-focus-running');
await page.clock.fastForward(25 * 60 * 1000);
await page.clock.runFor(1500);
await page.waitForSelector('.celebrate');
await shot('06-completed');
await page.getByRole('button', { name: 'Harika!' }).click();
await shot('07-break');
await page.getByRole('button', { name: 'Molayı atla' }).click();
for (let i = 0; i < 2; i++) { // Mağazadan alışveriş için biraz daha para
  await page.getByRole('button', { name: /Başlat/ }).click();
  await page.clock.fastForward(25 * 60 * 1000 + 2000);
  await page.clock.runFor(1500);
  await page.waitForSelector('.celebrate');
  await page.getByRole('button', { name: 'Harika!' }).click();
  await page.getByRole('button', { name: 'Molayı atla' }).click();
}

for (const [hash, name] of [['world', '08-world'], ['shop', '09-shop'], ['stats', '10-stats'], ['settings', '11-settings'], ['research', '12-research']]) {
  await page.evaluate((h) => { location.hash = `#/${h}`; }, hash);
  await page.waitForTimeout(100);
  await shot(name);
}
// Satın alma
await page.evaluate(() => { location.hash = '#/shop'; });
await page.getByRole('button', { name: 'Transfer et' }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Transfer et' }).click();
await page.evaluate(() => { location.hash = '#/world'; });
await page.waitForTimeout(800);
await shot('13-world-after-buy');

console.log(errors.length ? `HATALAR:\n${errors.join('\n')}` : 'Konsol temiz.');
await browser.close();
