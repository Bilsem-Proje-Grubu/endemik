import { describe, it, expect } from 'vitest';
import * as timer from '../src/core/timer.js';
import { setup } from './helpers.js';

const MIN = 60000;

describe('zamanlayıcı hesabı', () => {
  it('kalan süre Date.now() farkından hesaplanır (sekme arka plandayken de şaşmaz)', () => {
    const s = timer.newSession({ phase: 'focus', plannedMs: 25 * MIN, now: 1000, perf: 0 });
    expect(timer.remainingMs(s, 1000)).toBe(25 * MIN);
    expect(timer.remainingMs(s, 1000 + 10 * MIN)).toBe(15 * MIN);
    expect(timer.remainingMs(s, 1000 + 99 * MIN)).toBe(0);
    expect(timer.isDone(s, 1000 + 25 * MIN)).toBe(true);
  });

  it('duraklatma: tek hak, süre donar, devam edince kaldığı yerden sürer', () => {
    const s = timer.newSession({ phase: 'focus', plannedMs: 25 * MIN, now: 0, perf: 0 });
    expect(timer.pause(s, 5 * MIN)).toBe(true);
    expect(timer.remainingMs(s, 9 * MIN)).toBe(20 * MIN);
    expect(timer.resume(s, 6 * MIN, 0)).toBe(true);
    expect(timer.remainingMs(s, 6 * MIN)).toBe(20 * MIN);
    expect(timer.pause(s, 7 * MIN)).toBe(false); // ikinci hak yok
  });

  it('molada duraklatma yok', () => {
    const s = timer.newSession({ phase: 'short', plannedMs: 5 * MIN, now: 0, perf: 0 });
    expect(timer.pause(s, 1000)).toBe(false);
  });

  it('süre biçimi', () => {
    expect(timer.formatClock(25 * MIN)).toBe('25:00');
    expect(timer.formatClock(1)).toBe('00:01');
    expect(timer.formatClock(0)).toBe('00:00');
    expect(timer.formatClock(61000)).toBe('01:01');
  });
});

describe('denetleyici: odak akışı', () => {
  it('tam süre sonunda tamamlanır, para verilir, mola başlar', () => {
    const { ctrl, clock, store, events } = setup();
    expect(ctrl.start('Matematik - türev').ok).toBe(true);
    clock.advance(24 * MIN);
    ctrl.tick();
    expect(events.complete).toHaveLength(0);
    clock.advance(MIN);
    ctrl.tick();
    expect(events.complete).toHaveLength(1);
    const st = store.get();
    expect(st.wallet.coins).toBe(100 + 20 + 5); // temel + günün ilki + görev adı
    expect(st.sessions[0].status).toBe('completed');
    expect(st.active.phase).toBe('short');
  });

  it('sayfa yenilenince sayaç kaldığı yerden devam eder', () => {
    const { be, clock, ctrl } = setup();
    ctrl.start('');
    clock.advance(10 * MIN);
    ctrl.tick();
    clock.advance(5000); // yenileme sırasında kısa boşluk
    const again = setup({ backend: be, clock });
    again.ctrl.restore();
    const snap = again.ctrl.snapshot();
    expect(snap.phase).toBe('focus');
    expect(Math.round(snap.remainingMs / MIN)).toBe(15);
  });

  it('gece yarısını geçen oturum bitiş gününe yazılır', () => {
    const { clock, ctrl, store } = setup({ clock: undefined });
    clock.t = new Date(2025, 0, 6, 23, 50, 0).getTime();
    ctrl.start('');
    clock.advance(25 * MIN);
    ctrl.tick();
    expect(store.get().sessions[0].day).toBe('2025-01-07');
  });
});

describe('denetleyici: yarım kalan oturum', () => {
  it('bırakılınca para verilmez ve hiçbir şey kaybedilmez', () => {
    const { ctrl, clock, store } = setup();
    store.update((s) => {
      s.wallet.coins = 500;
      s.themes.football = { startedAt: 0, owned: ['p01', 'p02'], goalItem: null, lastEventWeek: null, events: [], levelSeen: 1 };
    });
    ctrl.start('');
    clock.advance(10 * MIN);
    ctrl.abandon();
    const st = store.get();
    expect(st.wallet.coins).toBe(500);
    expect(st.themes.football.owned).toEqual(['p01', 'p02']);
    expect(st.sessions[0]).toMatchObject({ status: 'interrupted', reason: 'user', actualMin: 10 });
    expect(st.active).toBeNull();
  });

  it('1 dakikadan kısa denemeler kaydedilmez', () => {
    const { ctrl, clock, store } = setup();
    ctrl.start('');
    clock.advance(20000);
    ctrl.abandon();
    expect(store.get().sessions).toHaveLength(0);
  });

  it('2 dakikadan uzun duraklatma yarım kalmış sayılır', () => {
    const { ctrl, clock, store, events } = setup();
    ctrl.start('');
    clock.advance(5 * MIN);
    expect(ctrl.pause()).toBe(true);
    clock.advance(2 * MIN + 1000);
    ctrl.tick();
    expect(events.interrupt[0].reason).toBe('pauseTimeout');
    expect(store.get().wallet.coins).toBe(0);
  });
});
