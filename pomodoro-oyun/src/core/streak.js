// Esnek seri: haftada 1 "seri dondurma" hakkı. Kopunca ceza yok, sadece nazik mesaj.
import { CONFIG } from '../config.js';
import { addDays, daysBetween, weekKeyOfDay } from './dates.js';

/** Atlanan gün için o haftanın dondurma hakkı var mı? */
function freezeAvailable(streak, missedDay) {
  const wk = weekKeyOfDay(missedDay);
  return (streak.freezeWeeks[wk] || 0) < CONFIG.streak.freezePerWeek;
}

/**
 * Bir gün çalışıldığında seriyi günceller (durumu değiştirir).
 * Döndürür: { current, froze, lostFrom } — lostFrom > 0 ise önceki seri koptu.
 */
export function recordStudyDay(streak, day) {
  const info = { froze: false, lostFrom: 0 };
  if (streak.lastDay === day) return { current: streak.current, ...info };
  if (!streak.lastDay) {
    streak.current = 1;
  } else {
    const gap = daysBetween(streak.lastDay, day);
    if (gap <= 0) {
      return { current: streak.current, ...info }; // Saat geri alınmış olabilir; seriye dokunma.
    } else if (gap === 1) {
      streak.current += 1;
    } else if (gap === 2 && freezeAvailable(streak, addDays(streak.lastDay, 1))) {
      const missed = addDays(streak.lastDay, 1);
      const wk = weekKeyOfDay(missed);
      streak.freezeWeeks[wk] = (streak.freezeWeeks[wk] || 0) + 1;
      streak.frozenDays.push(missed);
      streak.current += 1;
      info.froze = true;
    } else {
      info.lostFrom = streak.current;
      streak.current = 1;
    }
  }
  streak.lastDay = day;
  streak.best = Math.max(streak.best, streak.current);
  streak.lostFrom = info.lostFrom;
  return { current: streak.current, ...info };
}

/** Bugün itibarıyla görünen seri (bugün ya da dün çalışıldıysa sürer). */
export function effectiveStreak(streak, today) {
  if (!streak.lastDay) return 0;
  const gap = daysBetween(streak.lastDay, today);
  if (gap <= 1) return streak.current;
  if (gap === 2 && freezeAvailable(streak, addDays(streak.lastDay, 1))) return streak.current;
  return 0;
}

/** Bu hafta kalan dondurma hakkı. */
export function freezeLeft(streak, today) {
  return CONFIG.streak.freezePerWeek - (streak.freezeWeeks[weekKeyOfDay(today)] || 0);
}
