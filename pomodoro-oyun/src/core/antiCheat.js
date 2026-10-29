// Hile önleme. Kullanıcıyı suçlamaz: sadece oturumun sayılmayacağı durumları saptar.
import { CONFIG } from '../config.js';

/** Sekme gizli kaldı: 'ok' | 'warn' | 'invalid'. */
export function hiddenVerdict(hiddenMs, maxMs = CONFIG.timer.hiddenMaxMs) {
  if (hiddenMs > maxMs) return 'invalid';
  if (hiddenMs > 0) return 'warn';
  return 'ok';
}

/** Duvar saati ile performance.now() arasındaki fark (ms). Normalde ~0. */
export function clockDrift(prev, cur) {
  return cur.wall - prev.wall - (cur.perf - prev.perf);
}

/** Saat geri/ileri alındı mı? */
export function clockTampered(prev, cur, tol = CONFIG.timer.clockToleranceMs) {
  return Math.abs(clockDrift(prev, cur)) > tol;
}

/** Oturum geleceğe ait bir başlangıçla mı kayıtlı (saat geri alınmış)? */
export function startedInFuture(session, now, tol = CONFIG.timer.clockToleranceMs) {
  return session.startedAt - now > tol;
}

/** Uygulama kapalı/arka planda kaldığı süre sınırı aştı mı? */
export function gapTooLong(lastSeen, now, maxMs = CONFIG.timer.hiddenMaxMs) {
  return lastSeen != null && now - lastSeen > maxMs;
}

/**
 * Sekmeler arası tek sayaç kilidi. backend: get/set/remove.
 * Kilit kaydı { id, ts } biçimindedir ve aynı zamanda "son görülme" kalp atışıdır.
 */
export function createLock(backend, tabId, staleMs = CONFIG.timer.lockStaleMs) {
  const key = CONFIG.lockKey;
  const read = () => {
    try {
      return JSON.parse(backend.get(key) || 'null');
    } catch {
      return null;
    }
  };
  return {
    read,
    /** Başka bir sekme (taze kilitle) çalışıyor mu? */
    heldByOther(now) {
      const l = read();
      return !!l && l.id !== tabId && now - l.ts < staleMs;
    },
    /** Kilidi almayı dener. Başkasındaysa false. */
    acquire(now) {
      if (this.heldByOther(now)) return false;
      backend.set(key, JSON.stringify({ id: tabId, ts: now }));
      return true;
    },
    /** Kalp atışı: kilidi tazeler. */
    refresh(now) {
      const l = read();
      if (l && l.id !== tabId && now - l.ts < staleMs) return false;
      backend.set(key, JSON.stringify({ id: tabId, ts: now }));
      return true;
    },
    /** Son kalp atışı zamanı (hangi sekmeden olursa olsun). */
    lastSeen() {
      const l = read();
      return l ? l.ts : null;
    },
    release() {
      const l = read();
      if (l && l.id === tabId) backend.remove(key);
    },
  };
}
