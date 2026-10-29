import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { createBackend, createStorage, defaultState, migrate } from '../src/core/storage.js';

describe('kayıt ve migrasyon', () => {
  it('v0 (sürümsüz) kayıt güncel sürüme çevrilir, veri kaybolmaz', () => {
    const old = { coins: 420, theme: 'cafe', sessions: [{ at: 1700000000000, minutes: 25, done: true, day: '2023-11-14' }] };
    const s = migrate(old);
    expect(s.schemaVersion).toBe(CONFIG.schemaVersion);
    expect(s.wallet.coins).toBe(420);
    expect(s.profile.theme).toBe('cafe');
    expect(s.sessions).toHaveLength(1);
    expect(s.settings.focusMin).toBe(25); // eksik alanlar varsayılanla dolar
  });

  it('eksik alanlar tamamlanır, bozuk tipler düzelir', () => {
    const s = migrate({ schemaVersion: 1, wallet: { coins: 'abc' }, settings: { sound: 'evet' } });
    expect(s.wallet.coins).toBe(0);
    expect(s.settings.sound).toBe(true);
    expect(Array.isArray(s.sessions)).toBe(true);
  });

  it('gelecekteki sürümden gelen kayıt reddedilir (bozulmasın)', () => {
    expect(migrate({ schemaVersion: 999 })).toBeNull();
  });

  it('çöp veri boş duruma düşer', () => {
    const be = createBackend(null);
    be.set(CONFIG.storageKey, '{bozuk json');
    expect(createStorage(be).load().schemaVersion).toBe(CONFIG.schemaVersion);
  });

  it('kaydet-yükle gidiş dönüşü', () => {
    const storage = createStorage(createBackend(null));
    const s = defaultState();
    s.wallet.coins = 77;
    storage.save(s);
    expect(storage.load().wallet.coins).toBe(77);
  });

  it('dışa aktar / içe aktar', () => {
    const storage = createStorage(createBackend(null));
    const s = defaultState();
    s.wallet.coins = 123;
    const text = storage.exportJSON(s);
    expect(storage.parseImport(text).wallet.coins).toBe(123);
    expect(storage.parseImport('merhaba')).toBeNull();
    expect(storage.parseImport('[1,2]')).toBeNull();
  });

  it('localStorage yoksa bellekte çalışır', () => {
    const be = createBackend(null);
    expect(be.persistent).toBe(false);
    expect(be.set('a', '1')).toBe(false);
    expect(be.get('a')).toBe('1');
  });

  it('localStorage dolu (kota) olduğunda çökmez, false döner', () => {
    const fake = {
      localStorage: {
        n: 0,
        setItem(k) {
          if (k !== '__pomodoro_probe__') throw new Error('QuotaExceededError');
        },
        getItem: () => null,
        removeItem() {},
      },
    };
    const be = createBackend(fake);
    expect(be.persistent).toBe(true);
    const storage = createStorage(be);
    expect(storage.save(defaultState())).toBe(false);
    expect(storage.lastSaveOk).toBe(false);
  });
});
