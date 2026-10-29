import { describe, it, expect } from 'vitest';
import * as cheat from '../src/core/antiCheat.js';
import { createBackend } from '../src/core/storage.js';
import { setup, fakeClock } from './helpers.js';

const MIN = 60000;

describe('hile önleme (saf kurallar)', () => {
  it('gizli kalma kararı', () => {
    expect(cheat.hiddenVerdict(0)).toBe('ok');
    expect(cheat.hiddenVerdict(5000)).toBe('warn');
    expect(cheat.hiddenVerdict(30000)).toBe('warn');
    expect(cheat.hiddenVerdict(30001)).toBe('invalid');
  });

  it('saat farkı toleransı', () => {
    const prev = { wall: 1000, perf: 100 };
    expect(cheat.clockTampered(prev, { wall: 2000, perf: 1100 })).toBe(false);
    expect(cheat.clockTampered(prev, { wall: 2000 + 3000, perf: 1100 })).toBe(false);
    expect(cheat.clockTampered(prev, { wall: 2000 + 4000, perf: 1100 })).toBe(true); // ileri alındı
    expect(cheat.clockTampered(prev, { wall: 2000 - 4000, perf: 1100 })).toBe(true); // geri alındı
  });

  it('kilit: aynı anda tek sayaç', () => {
    const be = createBackend(null);
    const a = cheat.createLock(be, 'A');
    const b = cheat.createLock(be, 'B');
    expect(a.acquire(1000)).toBe(true);
    expect(b.acquire(2000)).toBe(false);
    expect(b.heldByOther(2000)).toBe(true);
    expect(b.acquire(1000 + 6000)).toBe(true); // A ölmüş (kalp atışı yok)
    a.release(); // B'nin kilidini silmemeli
    expect(a.lastSeen()).not.toBeNull();
  });
});

describe('hile önleme (denetleyicide)', () => {
  it('30 sn\'den uzun gizli kalma oturumu geçersiz kılar', () => {
    const { ctrl, clock, store, events } = setup();
    ctrl.start('');
    clock.advance(MIN);
    ctrl.handleVisibility(true);
    clock.advance(31000);
    ctrl.handleVisibility(false);
    expect(events.interrupt[0].reason).toBe('hidden');
    expect(store.get().sessions[0].status).toBe('interrupted');
  });

  it('kısa gizli kalma sadece uyarı verir, oturum sürer', () => {
    const { ctrl, clock, events } = setup();
    ctrl.start('');
    clock.advance(MIN);
    ctrl.handleVisibility(true);
    clock.advance(10000);
    ctrl.handleVisibility(false);
    expect(events.warn).toBe(1);
    expect(ctrl.snapshot()).not.toBeNull();
    expect(events.interrupt).toHaveLength(0);
  });

  it('saat ileri alınırsa oturum geçersiz sayılır', () => {
    const { ctrl, clock, events, store } = setup();
    ctrl.start('');
    clock.advance(MIN);
    ctrl.tick();
    clock.jumpWall(20 * MIN); // kullanıcı saati 20 dk ileri aldı
    ctrl.tick();
    expect(events.interrupt[0].reason).toBe('clock');
    expect(store.get().wallet.coins).toBe(0);
  });

  it('saat geri alınırsa (kayıt geleceğe ait kalır) oturum geçersiz sayılır', () => {
    const { be, clock, ctrl } = setup();
    ctrl.start('');
    clock.advance(10 * MIN);
    ctrl.tick();
    clock.jumpWall(-60 * MIN);
    const again = setup({ backend: be, clock });
    again.ctrl.restore();
    expect(again.events.interrupt[0].reason).toBe('clock');
  });

  it('sayfa 30 sn\'den uzun kapalı kalırsa sayılmaz', () => {
    const { be, clock, ctrl } = setup();
    ctrl.start('');
    clock.advance(5 * MIN);
    ctrl.tick();
    clock.advance(10 * MIN);
    const again = setup({ backend: be, clock });
    again.ctrl.restore();
    expect(again.events.interrupt[0].reason).toBe('hidden');
  });

  it('iki sekmede aynı anda sayaç çalışmaz', () => {
    const be = createBackend(null);
    const clock = fakeClock();
    const a = setup({ backend: be, clock, tabId: 'A' });
    const b = setup({ backend: be, clock, tabId: 'B' });
    expect(a.ctrl.start('').ok).toBe(true);
    // B, A'nın yazdığı durumu başlangıçta okumuş olsun
    b.store.reload();
    expect(b.ctrl.start('')).toEqual({ ok: false, reason: 'busy' });
    b.store.update((s) => {
      s.active = null;
    });
    expect(b.ctrl.start('')).toEqual({ ok: false, reason: 'otherTab' });
    expect(b.ctrl.isViewer()).toBe(true);
  });
});
