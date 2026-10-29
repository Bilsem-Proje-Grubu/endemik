import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/core/storage.js';
import { dueWeek, resolvePending, simulate, minutesInWeek } from '../src/core/weekly.js';
import { themeState } from '../src/core/economy.js';
import { THEMES } from '../src/themes/index.js';

const theme = THEMES.football;
const T = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();

describe('haftalık olay', () => {
  it('Pazar 18:00\'den önce geçen hafta, sonra bu hafta sonuçlanır', () => {
    expect(dueWeek(T(2025, 1, 8))).toBe('2024-12-30'); // Çarşamba -> önceki hafta
    expect(dueWeek(T(2025, 1, 12, 17))).toBe('2024-12-30'); // Pazar 17:00
    expect(dueWeek(T(2025, 1, 12, 18))).toBe('2025-01-06'); // Pazar 18:00
    expect(dueWeek(T(2025, 1, 13, 9))).toBe('2025-01-06'); // Pazartesi
  });

  it('aynı hafta için sonuç her zaman aynıdır (yeniden deneme hilesi yok)', () => {
    const a = simulate({ theme, power: 120, minutes: 400, week: '2025-01-06' });
    const b = simulate({ theme, power: 120, minutes: 400, week: '2025-01-06' });
    expect(a).toEqual(b);
  });

  it('çalışma süresi sonucu doğrudan etkiler', () => {
    const lazy = simulate({ theme, power: 60, minutes: 0, week: '2025-01-06' });
    const busy = simulate({ theme, power: 60, minutes: 900, week: '2025-01-06' });
    expect(busy.score).toBeGreaterThan(lazy.score);
  });

  it('çok güçlü takım kazanır, çok zayıf kaybeder; kaybetmek de para verir', () => {
    expect(simulate({ theme, power: 700, minutes: 500, week: '2025-01-06' }).result).toBe('win');
    const lose = simulate({ theme, power: 65, minutes: 0, week: '2025-01-06' });
    expect(['lose', 'draw']).toContain(lose.result);
    expect(lose.coins).toBeGreaterThan(0);
  });

  it('bir kez çözülür ve para eklenir; ilerleme yoksa sessiz geçer', () => {
    const st = defaultState(T(2025, 1, 1));
    const ts = themeState(st, 'football', T(2025, 1, 1));
    ts.owned = ['p01', 'p05'];
    const now = T(2025, 1, 13, 9);
    const ev = resolvePending(st, theme, now);
    expect(ev).not.toBeNull();
    expect(st.wallet.coins).toBe(ev.coins);
    expect(st.pendingEvents).toHaveLength(1);
    expect(resolvePending(st, theme, now)).toBeNull(); // ikinci kez çözülmez

    const empty = defaultState(T(2025, 1, 1));
    expect(resolvePending(empty, theme, now)).toBeNull();
    expect(empty.wallet.coins).toBe(0);
  });

  it('tema başlamadan önceki hafta çözülmez', () => {
    const st = defaultState(T(2025, 1, 20));
    themeState(st, 'football', T(2025, 1, 20)).owned = ['p01'];
    expect(resolvePending(st, theme, T(2025, 1, 21))).toBeNull(); // geçen hafta tema yoktu
  });

  it('haftalık dakika sadece o haftayı sayar', () => {
    const sessions = [
      { status: 'completed', day: '2025-01-06', actualMin: 25 },
      { status: 'completed', day: '2025-01-12', actualMin: 25 },
      { status: 'completed', day: '2025-01-13', actualMin: 25 },
      { status: 'interrupted', day: '2025-01-07', actualMin: 10 },
    ];
    expect(minutesInWeek(sessions, '2025-01-06')).toBe(50);
  });
});
