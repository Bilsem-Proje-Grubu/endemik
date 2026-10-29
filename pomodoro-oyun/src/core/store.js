// Tek durum nesnesi + abonelik. Her değişiklikte kaydedilir.
import { createStorage } from './storage.js';

/** Uygulama durumunu tutan basit depo. */
export function createStore(storage = createStorage()) {
  let state = storage.load();
  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn(state);
  }

  return {
    storage,
    get: () => state,
    /** fn(state) durumu doğrudan değiştirir; ardından kaydedilir ve dinleyenlere haber verilir. */
    update(fn, { silent = false } = {}) {
      const result = fn(state);
      storage.save(state);
      if (!silent) notify();
      return result;
    },
    /** Tüm durumu değiştirir (içe aktarma, sıfırlama, başka sekmeden gelen kayıt). */
    replace(next, { save = true } = {}) {
      state = next;
      if (save) storage.save(state);
      notify();
    },
    /** Depodan yeniden okur (başka sekme yazdığında). */
    reload() {
      state = storage.load();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
