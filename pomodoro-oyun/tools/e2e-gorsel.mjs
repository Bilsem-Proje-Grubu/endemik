// Görsel kontrol: dolu bir kayıtla dört temayı, karanlık modu ve geniş ekranı gezer, ekran görüntüsü alır.
// Kullanım: `node tools/e2e-gorsel.mjs [çıktı-klasörü]` (önce `npm run build` ve `npx vite preview --port 4173`).
import { createRequire } from 'node:module';
import { defaultState, defaultThemeState } from '../src/core/storage.js';
import { readFileSync } from 'node:fs';
import { dayKey, addDays } from '../src/core/dates.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const THEMES = Object.fromEntries(['football', 'cafe', 'fashion', 'shelter'].map((id) => [id, JSON.parse(readFileSync(new URL(`../src/themes/${id}.json`, import.meta.url), 'utf8'))]));
const OUT = process.argv[2] || '/tmp/shots';
const BASE = process.env.URL || 'http://localhost:4173/';
const NOW = new Date(2025, 0, 8, 15, 0, 0).getTime(); // Çarşamba

function seed(themeId) {
  const s = defaultState(NOW - 40 * 86400000);
  s.profile = { consentAt: NOW, onboarded: true, theme: themeId, participantCode: 'K07' };
  s.wallet = { coins: 1450, earnedTotal: 9000, spentTotal: 7550 };
  const th = THEMES[themeId];
  const ts = defaultThemeState(NOW - 40 * 86400000);
  const pick = (tier, n) => th.items.filter((i) => i.tier === tier).slice(0, n).map((i) => i.id);
  ts.owned = [...pick('bronze', 9), ...pick('silver', 5), ...pick('gold', 2)];
  ts.levelSeen = 3;
  ts.goalItem = th.items.find((i) => i.tier === 'gold' && !ts.owned.includes(i.id)).id;
  s.themes[themeId] = ts;
  const subjects = ['Matematik - türev', 'Fizik - kuvvet', 'Türkçe - paragraf', 'Kimya - mol', ''];
  const today = dayKey(NOW);
  for (let d = 30; d >= 0; d--) {
    const day = addDays(today, -d);
    const n = d % 6 === 0 ? 0 : 1 + ((d * 7) % 5);
    for (let k = 0; k < n; k++) {
      const hour = [8, 11, 15, 18, 21][(d + k) % 5];
      s.sessions.push({ id: `${day}-${k}`, day, start: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).getTime(), end: 0, hour, plannedMin: 25, actualMin: 25, status: k === 3 && d % 4 === 0 ? 'interrupted' : 'completed', reason: null, theme: themeId, task: subjects[(d + k) % 5], coins: 100, mode: 'game' });
    }
    s.daily[day] = { rewarded: n, completed: n, minutes: n * 25 };
  }
  s.streak = { current: 5, best: 12, lastDay: today, freezeWeeks: {}, frozenDays: [], lostFrom: 0 };
  s.achievements = { first: NOW, p10: NOW, p50: NOW, streak3: NOW, morning: NOW };
  s.research = { unlocked: true, controlMode: false, controlStartedAt: null, surveySnoozedDay: today, surveys: [
    { id: 'a_baseline', phase: 'baseline', takenAt: NOW - 20 * 86400000, day: addDays(today, -20), answers: [2, 3, 2] },
    { id: 'a_followup', phase: 'followup', takenAt: NOW - 2 * 86400000, day: addDays(today, -2), answers: [4, 4, 3] } ] };
  s.themes[themeId].lastEventWeek = '2024-12-30'; // O haftanın olayı zaten gösterilmiş
  return s;
}

const browser = await chromium.launch();
const errors = [];

async function session({ themeId, width, height, scheme = 'light', hashes, tag, event = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1.5, locale: 'tr-TR', colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  const state = seed(themeId);
  if (event) {
    state.pendingEvents.push({ themeId, week: '2024-12-30', result: 'win', score: 140, opp: 101, coins: 150, power: 110, minutes: 500, at: NOW, day: '2025-01-06' });
  }
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, ['pomodoroOyun.kayit', JSON.stringify(state)]);
  await page.clock.install({ time: NOW });
  await page.goto(BASE);
  for (const h of hashes) {
    await page.evaluate((x) => { location.hash = `#/${x}`; }, h);
    await page.waitForTimeout(250);
    await page.clock.runFor(1200);
    await page.screenshot({ path: `${OUT}/${tag}-${h.replace('?cat=', '-')}.png`, fullPage: h === 'stats' || h === 'research' });
  }
  await ctx.close();
}

for (const id of ['football', 'cafe', 'fashion', 'shelter']) {
  await session({ themeId: id, width: 360, height: 760, hashes: ['focus', 'world', 'shop'], tag: `m-${id}` });
}
await session({ themeId: 'cafe', width: 360, height: 760, scheme: 'dark', hashes: ['focus', 'world', 'stats', 'settings'], tag: 'dark-cafe' });
await session({ themeId: 'shelter', width: 1280, height: 800, hashes: ['focus', 'world', 'shop'], tag: 'desk-shelter' });
await session({ themeId: 'football', width: 360, height: 760, hashes: ['stats', 'research'], tag: 'full-football' });
await session({ themeId: 'football', width: 360, height: 760, hashes: ['focus'], tag: 'event-football', event: true });
await browser.close();
console.log(errors.length ? `HATALAR:\n${errors.join('\n')}` : 'Konsol temiz.');
