import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { defaultState } from '../src/core/storage.js';
import * as eco from '../src/core/economy.js';
import { THEMES } from '../src/themes/index.js';
import { recordStudyDay, effectiveStreak } from '../src/core/streak.js';
import { setup } from './helpers.js';

const MIN = 60000;
const T = (y, m, d, h = 10) => new Date(y, m - 1, d, h, 0, 0).getTime();

describe('ekonomi: ödül hesabı', () => {
  it('süreye orantılı: 25 dk = 100, 45 dk = 180', () => {
    expect(eco.baseReward(25)).toBe(100);
    expect(eco.baseReward(45)).toBe(180);
    expect(eco.baseReward(15)).toBe(60);
  });

  it('bonuslar: günün ilki +20, set +50, görev adı +5', () => {
    const r = eco.computeReward({ plannedMin: 25, task: 'Fizik', rewardedToday: 0, setCompleted: true });
    expect(r.total).toBe(100 + 20 + 50 + 5);
    const plain = eco.computeReward({ plannedMin: 25, task: '  ', rewardedToday: 3, setCompleted: false });
    expect(plain.total).toBe(100);
  });

  it('günlük tavan: 8 Pomodoro para verir, sonrası vermez ama sayılır', () => {
    const st = defaultState();
    const now = T(2025, 1, 6);
    let last;
    for (let i = 0; i < 10; i++) last = eco.applyCompletion(st, { plannedMin: 25, actualMin: 25, task: '', now });
    expect(last.reward.capped).toBe(true);
    expect(st.daily['2025-01-06'].rewarded).toBe(8);
    expect(st.daily['2025-01-06'].completed).toBe(10);
    // 8 Pomodoro: 800 temel + ilk gün 20 + 2 set (4. ve 8.) 100 = 920
    expect(st.wallet.coins).toBe(920);
  });

  it('ertesi gün tavan sıfırlanır', () => {
    const st = defaultState();
    for (let i = 0; i < 8; i++) eco.applyCompletion(st, { plannedMin: 25, actualMin: 25, task: '', now: T(2025, 1, 6) });
    const r = eco.applyCompletion(st, { plannedMin: 25, actualMin: 25, task: '', now: T(2025, 1, 7) });
    expect(r.reward.capped).toBe(false);
    expect(r.reward.bonuses.map((b) => b.id)).toContain('first');
  });

  it('kontrol modunda para verilmez', () => {
    const st = defaultState();
    const r = eco.applyCompletion(st, { plannedMin: 25, actualMin: 25, task: '', now: T(2025, 1, 6), control: true });
    expect(r.reward.total).toBe(0);
    expect(st.wallet.coins).toBe(0);
  });
});

describe('ekonomi: mağaza ve seviye', () => {
  const theme = THEMES.football;

  it('yeterli para yoksa alınamaz, para negatife düşmez', () => {
    const st = defaultState();
    st.wallet.coins = 299;
    expect(eco.buyItem(st, theme, 'p01').reason).toBe('coins');
    expect(st.wallet.coins).toBe(299);
  });

  it('satın alma parayı düşer, ürünü ekler; ikinci kez alınamaz', () => {
    const st = defaultState();
    st.wallet.coins = 1000;
    const r = eco.buyItem(st, theme, 'p01');
    expect(r.ok).toBe(true);
    expect(st.wallet.coins).toBe(700);
    expect(eco.buyItem(st, theme, 'p01').reason).toBe('owned');
  });

  it('seviye kilidi: gümüş ürün Seviye 2 ister', () => {
    const st = defaultState();
    st.wallet.coins = 5000;
    const silver = theme.items.find((i) => i.tier === 'silver');
    expect(eco.buyItem(st, theme, silver.id).reason).toBe('locked');
  });

  it('slot sınırı: gücü sadece en iyi N ürün belirler', () => {
    const gks = theme.items.filter((i) => i.role === 'Kaleci').map((i) => i.id);
    const players = theme.items.filter((i) => i.category === 'players').map((i) => i.id);
    expect(eco.equippedIds(theme, players).players).toHaveLength(11);
    const all = eco.totalPower(theme, players);
    const q = theme.categories.find((c) => c.id === 'players').roleSlots;
    const expected = Object.entries(q).reduce((sum, [role, n]) => sum + theme.items.filter((i) => i.role === role).map((i) => i.power).sort((x, y) => y - x).slice(0, n).reduce((x, y) => x + y, 0), 0);
    expect(all).toBe(expected);
    expect(eco.totalPower(theme, gks)).toBeGreaterThan(0);
  });

  it('mevki kotası: 2. kaleci kadroya girmez, forvet kotası ayrı dolar', () => {
    const gks = theme.items.filter((i) => i.role === 'Kaleci').map((i) => i.id);
    const eq = eco.equippedIds(theme, gks);
    expect(eq.players).toHaveLength(1); // sadece 1 kaleci kotası var
  });

  it('seviye atlama saptanır', () => {
    const st = defaultState();
    st.wallet.coins = 99999;
    let leveled = false;
    for (const i of theme.items.filter((x) => x.tier === 'bronze' && x.category === 'players')) {
      const r = eco.buyItem(st, theme, i.id);
      if (r.leveledUp) leveled = true;
    }
    expect(leveled).toBe(true);
    expect(st.themes.football.levelSeen).toBeGreaterThanOrEqual(2);
  });

  it('"kaç Pomodoro kaldı" hesabı', () => {
    expect(eco.pomodorosNeeded(800, 450)).toBe(4);
    expect(eco.pomodorosNeeded(300, 300)).toBe(0);
    expect(eco.pomodorosNeeded(300, 1000)).toBe(0);
  });
});

describe('ekonomi: denge simülasyonu', () => {
  it('haftada 5 gün x 4 Pomodoro = yaklaşık 1 gümüş + birkaç bronz', () => {
    const st = defaultState();
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < 4; i++) {
        eco.applyCompletion(st, { plannedMin: 25, actualMin: 25, task: i % 2 ? 'Ders' : '', now: T(2025, 1, 6 + d) });
      }
    }
    expect(st.wallet.coins).toBeGreaterThan(2000);
    expect(st.wallet.coins).toBeLessThan(2900);
    const silver = CONFIG.tiers.silver.price;
    const bronze = CONFIG.tiers.bronze.price;
    expect(st.wallet.coins).toBeGreaterThanOrEqual(silver + 3 * bronze);
  });
});

describe('seri', () => {
  const fresh = () => defaultState().streak;

  it('ardışık günler seriyi artırır', () => {
    const s = fresh();
    recordStudyDay(s, '2025-01-06');
    recordStudyDay(s, '2025-01-07');
    expect(recordStudyDay(s, '2025-01-08').current).toBe(3);
    expect(s.best).toBe(3);
  });

  it('haftada 1 gün atlama dondurma hakkıyla seriyi korur', () => {
    const s = fresh();
    recordStudyDay(s, '2025-01-06');
    const r = recordStudyDay(s, '2025-01-08'); // 7 atlandı
    expect(r.froze).toBe(true);
    expect(r.current).toBe(2);
  });

  it('aynı hafta ikinci atlama seriyi sıfırlar, mesaj için lostFrom döner', () => {
    const s = fresh();
    recordStudyDay(s, '2025-01-06');
    recordStudyDay(s, '2025-01-08'); // dondurma kullanıldı (hafta: 6-12 Ocak)
    const r = recordStudyDay(s, '2025-01-10'); // 9 atlandı, hak yok
    expect(r.lostFrom).toBe(2);
    expect(r.current).toBe(1);
  });

  it('görünen seri: uzun aradan sonra 0', () => {
    const s = fresh();
    recordStudyDay(s, '2025-01-06');
    expect(effectiveStreak(s, '2025-01-07')).toBe(1);
    expect(effectiveStreak(s, '2025-01-20')).toBe(0);
  });
});

describe('uç durumlar', () => {
  it('set bonusu 4. Pomodoro\'da gelir ve uzun mola önerilir', () => {
    const { ctrl, clock, events } = setup();
    for (let i = 0; i < 4; i++) {
      ctrl.start('');
      clock.advance(25 * MIN);
      ctrl.tick();
      ctrl.abandon(); // molayı kapat
    }
    expect(events.complete[3].setCompleted).toBe(true);
    expect(events.complete[3].breakKind).toBe('long');
    expect(events.complete[2].breakKind).toBe('short');
  });
});
