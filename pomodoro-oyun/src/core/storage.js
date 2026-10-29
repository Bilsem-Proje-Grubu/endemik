// Kayıt + sürüm göçü (migrasyon). Veri sadece cihazda, localStorage içinde durur.
import { CONFIG } from '../config.js';

/** Boş (ilk açılış) durumu döndürür. */
export function defaultState(now = Date.now()) {
  return {
    schemaVersion: CONFIG.schemaVersion,
    createdAt: now,
    profile: { consentAt: null, onboarded: false, theme: null, participantCode: '' },
    settings: {
      focusMin: CONFIG.timer.defaultFocus,
      shortBreakMin: CONFIG.timer.defaultShortBreak,
      dailyGoal: CONFIG.defaultDailyGoal,
      sound: true,
      vibration: true,
      notifications: false,
      reduceMotion: false,
      sleepReminder: true,
      autoBreak: true,
      colorMode: 'auto', // auto | light | dark
      fontScale: 1,
    },
    wallet: { coins: 0, earnedTotal: 0, spentTotal: 0 },
    themes: {},
    sessions: [],
    daily: {},
    cycle: { count: 0, day: null, nextBreak: null },
    active: null,
    streak: { current: 0, best: 0, lastDay: null, freezeWeeks: {}, frozenDays: [], lostFrom: 0 },
    achievements: {},
    pendingEvents: [],
    research: {
      unlocked: false,
      controlMode: false,
      controlStartedAt: null,
      surveys: [],
      surveySnoozedDay: null,
    },
  };
}

/** Bir temanın boş ilerleme kaydı. */
export function defaultThemeState(now = Date.now()) {
  return { startedAt: now, owned: [], goalItem: null, lastEventWeek: null, events: [], levelSeen: 1 };
}

// Sürüm göçleri: anahtar = ESKİ sürüm numarası, değer = bir üst sürüme çeviren fonksiyon.
export const MIGRATIONS = {
  // v0 (sürümsüz, düz yapı) -> v1
  0(old) {
    const s = defaultState(old.createdAt || Date.now());
    s.wallet.coins = Number(old.coins) || 0;
    s.wallet.earnedTotal = s.wallet.coins;
    s.profile.theme = old.theme || null;
    s.sessions = (Array.isArray(old.sessions) ? old.sessions : []).map((x, i) => ({
      id: `m${i}`,
      day: x.day || '',
      start: x.at || 0,
      end: x.at || 0,
      hour: 12,
      plannedMin: x.minutes || 25,
      actualMin: x.minutes || 25,
      status: x.done === false ? 'interrupted' : 'completed',
      reason: null,
      theme: old.theme || null,
      task: x.task || '',
      coins: 0,
      mode: 'game',
    }));
    return s;
  },
};

/** Eksik alanları varsayılanlarla doldurur (derin birleştirme). Bozuk tipleri düzeltir. */
export function fillDefaults(raw, base) {
  if (Array.isArray(base)) return Array.isArray(raw) ? raw : base;
  if (base && typeof base === 'object') {
    const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const out = {};
    for (const k of Object.keys(base)) out[k] = fillDefaults(src[k], base[k]);
    // Sözlük gibi kullanılan (anahtarı serbest) alanlar için fazladan anahtarları koru.
    for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  if (base === null) return raw === undefined ? null : raw;
  return typeof raw === typeof base ? raw : base;
}

/** Eski kaydı güncel sürüme getirir. Bozuksa null döner. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  let state = raw;
  let v = Number.isInteger(state.schemaVersion) ? state.schemaVersion : 0;
  if (v > CONFIG.schemaVersion) return null; // Daha yeni bir sürümden geliyor; bozmamak için reddet.
  while (v < CONFIG.schemaVersion) {
    const step = MIGRATIONS[v];
    if (!step) return null;
    state = step(state);
    v = state.schemaVersion;
  }
  const merged = fillDefaults(state, defaultState(state.createdAt));
  // Tema ilerlemeleri ve günlük kayıtlar serbest anahtarlı sözlüklerdir; içlerini de tamamla.
  for (const id of Object.keys(merged.themes)) {
    merged.themes[id] = fillDefaults(merged.themes[id], defaultThemeState());
  }
  return merged;
}

/** Tarayıcı depolamasına güvenli erişim. Yoksa ya da doluysa bellekte çalışır. */
export function createBackend(win = typeof window !== 'undefined' ? window : null) {
  const mem = new Map();
  let ls = null;
  try {
    ls = win && win.localStorage;
    const probe = '__pomodoro_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch {
    ls = null;
  }
  return {
    persistent: !!ls,
    get(key) {
      try {
        return ls ? ls.getItem(key) : mem.get(key) ?? null;
      } catch {
        return mem.get(key) ?? null;
      }
    },
    set(key, value) {
      mem.set(key, value);
      if (!ls) return false;
      try {
        ls.setItem(key, value);
        return true;
      } catch {
        return false; // Depolama dolu
      }
    },
    remove(key) {
      mem.delete(key);
      try {
        if (ls) ls.removeItem(key);
      } catch {
        /* yoksay */
      }
    },
  };
}

/** Kayıt yöneticisi. backend: createBackend() sonucu. */
export function createStorage(backend = createBackend()) {
  const key = CONFIG.storageKey;
  return {
    backend,
    lastSaveOk: true,
    /** Kaydı okur; yoksa ya da bozuksa boş durum döndürür. */
    load() {
      const text = backend.get(key);
      if (!text) return defaultState();
      try {
        return migrate(JSON.parse(text)) || defaultState();
      } catch {
        return defaultState();
      }
    },
    /** Kaydeder. Başarısızsa (dolu/kapalı) false döner. */
    save(state) {
      this.lastSaveOk = backend.set(key, JSON.stringify(state));
      return this.lastSaveOk;
    },
    wipe() {
      backend.remove(key);
      backend.remove(CONFIG.lockKey);
    },
    /** Dışa aktarma metni (JSON). */
    exportJSON(state) {
      return JSON.stringify({ app: 'pomodoro-oyun', exportedAt: Date.now(), data: state }, null, 2);
    },
    /** İçe aktarma: geçerliyse durumu, değilse null döner. */
    parseImport(text) {
      try {
        const obj = JSON.parse(text);
        const data = obj && obj.app === 'pomodoro-oyun' ? obj.data : obj;
        return migrate(data);
      } catch {
        return null;
      }
    },
  };
}
