// Oturum denetleyicisi: zamanlayıcıyı, hile önlemeyi, ekonomiyi ve rozetleri birbirine bağlar.
// DOM'a dokunmaz; saat ve kilit dışarıdan verilir, böylece test edilebilir.
import { CONFIG } from '../config.js';
import { dayKey } from './dates.js';
import * as timer from './timer.js';
import * as cheat from './antiCheat.js';
import { applyCompletion } from './economy.js';
import { recordStudyDay } from './streak.js';
import { evaluate } from './achievements.js';
import { controlActive } from './research.js';

const T = CONFIG.timer;
const { PHASES } = timer;

export const realClock = { now: () => Date.now(), perf: () => performance.now() };

/** Görev adını temizler (uzunluk sınırı, kontrol karakterleri). */
export function cleanTask(text) {
  return String(text || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, T.maxLabelLength);
}

/**
 * deps: { store, lock, clock?, getThemes?, hooks? }
 * hooks: onComplete, onInterrupt, onBreakEnd, onWarn, onHidden, onTick
 */
export function createController({ store, lock, clock = realClock, getThemes = () => ({}), hooks = {} }) {
  let viewer = false; // Sayaç başka sekmede çalışıyorsa true
  const call = (name, arg) => hooks[name] && hooks[name](arg);

  const active = () => store.get().active;
  const isControl = (now) => controlActive(store.get(), now);

  /** Oturumu yarım kalmış olarak kapatır. Hiçbir şey kaybedilmez; sadece para verilmez. */
  function interrupt(reason, now = clock.now()) {
    const s = active();
    if (!s) return;
    const elapsed = timer.elapsedMs(s, now);
    const record = s.phase === PHASES.FOCUS && elapsed >= 60 * 1000; // 1 dakikadan kısa denemeler kaydedilmez
    store.update((st) => {
      if (record) {
        st.sessions.push({
          id: s.id, day: dayKey(now), start: s.startedAt, end: now, hour: new Date(s.startedAt).getHours(),
          plannedMin: Math.round(s.plannedMs / 60000), actualMin: Math.floor(elapsed / 60000),
          status: 'interrupted', reason, theme: st.profile.theme, task: s.task, coins: 0,
          mode: isControl(now) ? 'control' : 'game',
        });
      }
      st.active = null;
    });
    lock.release();
    call('onInterrupt', { reason, recorded: record, phase: s.phase });
  }

  /** Odak tamamlandı: ödül, seri, rozet, sonra mola. */
  function completeFocus(s, now) {
    const control = isControl(now);
    let outcome;
    store.update((st) => {
      const plannedMin = Math.round(s.plannedMs / 60000);
      const eco = applyCompletion(st, { plannedMin, actualMin: plannedMin, task: s.task, now, control });
      const streak = recordStudyDay(st.streak, eco.day);
      const rec = {
        id: s.id, day: eco.day, start: s.startedAt, end: now, hour: new Date(s.startedAt).getHours(),
        plannedMin, actualMin: plannedMin, status: 'completed', reason: null, theme: st.profile.theme,
        task: s.task, coins: eco.reward.total, mode: control ? 'control' : 'game',
      };
      st.sessions.push(rec);
      const badges = control ? [] : evaluate(st, getThemes(), now);
      const breakKind = eco.setCompleted ? PHASES.LONG : PHASES.SHORT;
      st.cycle.nextBreak = breakKind;
      st.active = null;
      if (st.settings.autoBreak) st.active = makeBreak(st, breakKind, now);
      outcome = { rec, reward: eco.reward, setCompleted: eco.setCompleted, streak, badges, breakKind, control };
    });
    lock.refresh(now);
    if (!active()) lock.release();
    call('onComplete', outcome);
  }

  function makeBreak(st, kind, now) {
    const min = kind === PHASES.LONG ? T.longBreak : st.settings.shortBreakMin;
    return timer.newSession({ phase: kind, plannedMs: min * 60000, now, perf: clock.perf() });
  }

  function endBreak() {
    store.update((st) => {
      st.active = null;
      st.cycle.nextBreak = null;
    });
    lock.release();
    call('onBreakEnd');
  }

  return {
    /** Başka sekme sayacı çalıştırıyorsa true. */
    isViewer: () => viewer,

    /** Odak oturumunu başlatır. { ok, reason } döndürür. */
    start(task = '') {
      const now = clock.now();
      if (active()) return { ok: false, reason: 'busy' };
      if (!lock.acquire(now)) {
        viewer = true;
        return { ok: false, reason: 'otherTab' };
      }
      viewer = false;
      const s = timer.newSession({
        phase: PHASES.FOCUS,
        plannedMs: store.get().settings.focusMin * 60000,
        now,
        perf: clock.perf(),
        task: cleanTask(task),
      });
      store.update((st) => {
        st.active = s;
        st.cycle.nextBreak = null;
      });
      return { ok: true };
    },

    /** Molayı elle başlatır (otomatik mola kapalıysa). */
    startBreak() {
      const now = clock.now();
      if (active() || !lock.acquire(now)) return { ok: false };
      const kind = store.get().cycle.nextBreak || PHASES.SHORT;
      store.update((st) => {
        st.active = makeBreak(st, kind, now);
      });
      return { ok: true };
    },

    /** Duraklatır (tek hak, en çok 2 dk). */
    pause() {
      const s = active();
      if (!s || viewer) return false;
      const ok = timer.pause(s, clock.now());
      if (ok) store.update(() => {});
      return ok;
    },

    resume() {
      const s = active();
      if (!s || viewer) return false;
      const now = clock.now();
      if (timer.pauseExpired(s, now, T.pauseMaxMs)) {
        interrupt('pauseTimeout', now);
        return false;
      }
      const ok = timer.resume(s, now, clock.perf());
      if (ok) store.update(() => {});
      return ok;
    },

    /** Kullanıcı bırakır. Mola ise sadece kapatır. */
    abandon() {
      const s = active();
      if (!s) return;
      if (s.phase === PHASES.FOCUS) interrupt('user');
      else endBreak();
    },

    /** Zamanlayıcıyı ilerletir; sık sık çağrılır (ekran yenileme, kalp atışı). */
    tick() {
      const s = active();
      if (!s) {
        if (viewer && !lock.heldByOther(clock.now())) viewer = false;
        return;
      }
      const now = clock.now();
      const perf = clock.perf();
      if (viewer) {
        if (!lock.heldByOther(now)) viewer = false; // Diğer sekme kapandı; devralabiliriz.
        else return;
      }
      if (!lock.refresh(now)) {
        viewer = true;
        return;
      }
      if (s.phase === PHASES.FOCUS) {
        if (cheat.startedInFuture(s, now)) return interrupt('clock', now);
        if (s.pausedAt != null) {
          if (timer.pauseExpired(s, now, T.pauseMaxMs)) return interrupt('pauseTimeout', now);
        } else if (s.hiddenSince != null) {
          if (cheat.hiddenVerdict(now - s.hiddenSince) === 'invalid') return interrupt('hidden', now);
        } else if (cheat.clockTampered({ wall: s.anchorWall, perf: s.anchorPerf }, { wall: now, perf })) {
          return interrupt('clock', now);
        }
        s.anchorWall = now;
        s.anchorPerf = perf;
        if (timer.isDone(s, now) && s.pausedAt == null) return completeFocus(s, now);
      } else if (timer.isDone(s, now)) {
        return endBreak();
      }
      call('onTick', s);
    },

    /** Sekme görünürlüğü değişti (Page Visibility API). */
    handleVisibility(hidden) {
      const s = active();
      const now = clock.now();
      if (!s || viewer || s.phase !== PHASES.FOCUS || s.pausedAt != null) return;
      if (hidden) {
        s.hiddenSince = now;
        store.update(() => {}, { silent: true });
        call('onHidden');
        return;
      }
      if (s.hiddenSince == null) return;
      const hiddenMs = now - s.hiddenSince;
      s.hiddenSince = null;
      s.anchorWall = now;
      s.anchorPerf = clock.perf();
      if (cheat.hiddenVerdict(hiddenMs) === 'invalid') return interrupt('hidden', now);
      store.update(() => {}, { silent: true });
      if (hiddenMs > 0) call('onWarn', hiddenMs);
    },

    /** Sayfa açılırken: kayıtlı oturum varsa geçerliliğini denetler, geçerliyse sürdürür. */
    restore() {
      const s = active();
      if (!s) return;
      const now = clock.now();
      const perf = clock.perf();
      if (lock.heldByOther(now)) {
        viewer = true;
        return;
      }
      if (s.phase === PHASES.FOCUS) {
        if (cheat.startedInFuture(s, now)) return interrupt('clock', now);
        if (s.pausedAt != null) {
          if (timer.pauseExpired(s, now, T.pauseMaxMs)) return interrupt('pauseTimeout', now);
        } else if (cheat.gapTooLong(lock.lastSeen() ?? s.startedAt, now)) {
          return interrupt('hidden', now);
        }
      } else if (timer.isDone(s, now)) {
        return endBreak();
      }
      s.hiddenSince = null;
      s.anchorWall = now;
      s.anchorPerf = perf;
      lock.acquire(now);
      store.update(() => {}, { silent: true });
    },

    /** Arayüz için anlık görünüm. */
    snapshot() {
      const s = active();
      const now = clock.now();
      if (!s) return null;
      return {
        phase: s.phase,
        task: s.task,
        plannedMs: s.plannedMs,
        remainingMs: timer.remainingMs(s, now),
        progress: timer.progress(s, now),
        paused: s.pausedAt != null,
        pauseUsed: s.pauseUsed,
        pauseLeftMs: s.pausedAt != null ? Math.max(0, T.pauseMaxMs - (now - s.pausedAt)) : T.pauseMaxMs,
        viewer,
      };
    },
  };
}
