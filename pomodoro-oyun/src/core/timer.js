// Zamanlayıcı mantığı (saf fonksiyonlar). Sayaç "saymaz": başlangıç zamanından hesaplanır.

export const PHASES = { FOCUS: 'focus', SHORT: 'short', LONG: 'long' };

/** Yeni bir oturum nesnesi oluşturur. now = Date.now(), perf = performance.now(). */
export function newSession({ phase, plannedMs, now, perf, task = '' }) {
  return {
    id: `s${now.toString(36)}`,
    phase,
    plannedMs,
    startedAt: now,
    anchorWall: now, // Saat tutarlılığı kontrolü için son duvar saati
    anchorPerf: perf, // ve o andaki performance.now() değeri
    pausedAt: null,
    pausedTotalMs: 0,
    pauseUsed: false,
    hiddenSince: null,
    task,
  };
}

/** Geçen (duraklatma hariç) süre, ms. */
export function elapsedMs(s, now) {
  const end = s.pausedAt != null ? s.pausedAt : now;
  return Math.max(0, end - s.startedAt - s.pausedTotalMs);
}

/** Kalan süre, ms. Her zaman Date.now() farkından hesaplanır. */
export function remainingMs(s, now) {
  return Math.max(0, s.plannedMs - elapsedMs(s, now));
}

/** Süre doldu mu? */
export function isDone(s, now) {
  return remainingMs(s, now) <= 0;
}

/** Duraklatır. Sadece odak oturumunda ve tek kez. Başarılıysa true. */
export function pause(s, now) {
  if (s.phase !== PHASES.FOCUS || s.pausedAt != null || s.pauseUsed) return false;
  s.pausedAt = now;
  s.pauseUsed = true;
  return true;
}

/** Duraklatma süresi aşıldı mı? */
export function pauseExpired(s, now, maxMs) {
  return s.pausedAt != null && now - s.pausedAt > maxMs;
}

/** Devam ettirir; duraklatma süresi toplam durmadan düşülür. */
export function resume(s, now, perf) {
  if (s.pausedAt == null) return false;
  s.pausedTotalMs += now - s.pausedAt;
  s.pausedAt = null;
  s.anchorWall = now;
  s.anchorPerf = perf;
  return true;
}

/** Kalan süreyi "DD:SS" biçimine çevirir (yukarı yuvarlar, 00:00 sadece bitince görünür). */
export function formatClock(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** İlerleme oranı 0..1. */
export function progress(s, now) {
  if (!s.plannedMs) return 0;
  return Math.min(1, elapsedMs(s, now) / s.plannedMs);
}
