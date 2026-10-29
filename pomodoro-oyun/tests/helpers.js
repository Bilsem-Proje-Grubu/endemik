// Testler için ortak yardımcılar.
import { createStorage, createBackend, defaultState } from '../src/core/storage.js';
import { createStore } from '../src/core/store.js';
import { createLock } from '../src/core/antiCheat.js';
import { createController } from '../src/core/controller.js';
import { THEMES } from '../src/themes/index.js';

/** Sahte saat: elle ilerletilir. */
export function fakeClock(start = new Date(2025, 0, 6, 10, 0, 0).getTime()) {
  const c = {
    t: start,
    p: 1000,
    now: () => c.t,
    perf: () => c.p,
    /** Hem duvar hem performans saatini ilerletir. */
    advance(ms) {
      c.t += ms;
      c.p += ms;
    },
    /** Sadece duvar saatini oynatır (saat hilesi). */
    jumpWall(ms) {
      c.t += ms;
    },
  };
  return c;
}

/** Bellek içi depolu, sahte saatli denetleyici kurar. */
export function setup({ tabId = 'tab1', backend, clock = fakeClock(), hooks = {} } = {}) {
  const be = backend || createBackend(null);
  const storage = createStorage(be);
  const store = createStore(storage);
  const lock = createLock(be, tabId);
  const events = { complete: [], interrupt: [], warn: 0, breakEnd: 0 };
  const ctrl = createController({
    store,
    lock,
    clock,
    getThemes: () => THEMES,
    hooks: {
      onComplete: (o) => events.complete.push(o),
      onInterrupt: (o) => events.interrupt.push(o),
      onWarn: () => events.warn++,
      onBreakEnd: () => events.breakEnd++,
      ...hooks,
    },
  });
  store.update((s) => {
    s.profile.onboarded = true;
    s.profile.theme = 'football';
  });
  return { be, storage, store, lock, ctrl, clock, events };
}

export { defaultState };
