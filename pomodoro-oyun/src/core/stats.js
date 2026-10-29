// İstatistikler (saf fonksiyonlar). Sadece tamamlanan odak oturumları dakikaya sayılır.
import { CONFIG } from '../config.js';
import { addDays, dayKey, shortDayName, weekKey, weekdayIndex } from './dates.js';

/** "Matematik - türev" -> "Matematik". Boşsa boş döner. */
export function subjectOf(task) {
  if (!task) return '';
  return task.split(/\s*[-–—:]\s*/)[0].trim();
}

export const completed = (sessions) => sessions.filter((s) => s.status === 'completed');

/** Belirli gündeki dakika. */
export function minutesOnDay(sessions, day) {
  let sum = 0;
  for (const s of sessions) if (s.status === 'completed' && s.day === day) sum += s.actualMin;
  return sum;
}

/** [from, to] gün aralığındaki dakika (dahil). */
export function minutesInRange(sessions, from, to) {
  let sum = 0;
  for (const s of sessions) if (s.status === 'completed' && s.day >= from && s.day <= to) sum += s.actualMin;
  return sum;
}

/** Bugün / bu hafta / bu ay dakikası. */
export function totals(sessions, today) {
  const wk = weekKey(new Date(`${today}T12:00:00`).getTime());
  return {
    today: minutesOnDay(sessions, today),
    week: minutesInRange(sessions, wk, addDays(wk, 6)),
    month: minutesInRange(sessions, `${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`),
  };
}

/** Bu haftanın (Pzt-Paz) günlük çubukları. */
export function weekBars(sessions, today) {
  const wk = addDays(today, -weekdayIndex(today));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(wk, i);
    out.push({ day, label: shortDayName(day), minutes: minutesOnDay(sessions, day), future: day > today, isToday: day === today });
  }
  return out;
}

/** Derse göre dağılım (büyükten küçüğe). Etiketsizler subject = '' ile gelir. */
export function subjectBreakdown(sessions) {
  const map = new Map();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = subjectOf(s.task);
    const cur = map.get(key) || { subject: key, minutes: 0, count: 0 };
    cur.minutes += s.actualMin;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes);
}

export const HOUR_BUCKETS = [
  { id: 'morning', from: 5, to: 11 },
  { id: 'noon', from: 12, to: 16 },
  { id: 'evening', from: 17, to: 21 },
  { id: 'night', from: 22, to: 4 },
];

function bucketOf(hour) {
  for (const b of HOUR_BUCKETS) {
    if (b.from <= b.to ? hour >= b.from && hour <= b.to : hour >= b.from || hour <= b.to) return b.id;
  }
  return 'night';
}

/** En verimli saat dilimi (en çok dakika). Veri yoksa null. */
export function bestBucket(sessions) {
  const sums = { morning: 0, noon: 0, evening: 0, night: 0 };
  let any = false;
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    sums[bucketOf(s.hour)] += s.actualMin;
    any = true;
  }
  if (!any) return null;
  const id = Object.keys(sums).sort((a, b) => sums[b] - sums[a])[0];
  return { id, minutes: sums[id], sums };
}

/** Bugünün dünle kıyası (sadece kişinin kendisiyle). */
export function compareYesterday(sessions, today) {
  const t = minutesOnDay(sessions, today);
  const y = minutesOnDay(sessions, addDays(today, -1));
  return { today: t, yesterday: y, diff: t - y };
}

/** Isı haritası: haftalar x 7 gün. Son sütun içinde bulunulan hafta. */
export function heatmap(sessions, today, weeks = CONFIG.stats.heatmapWeeks) {
  const byDay = new Map();
  for (const s of sessions) if (s.status === 'completed') byDay.set(s.day, (byDay.get(s.day) || 0) + s.actualMin);
  const start = addDays(addDays(today, -weekdayIndex(today)), -7 * (weeks - 1));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      const minutes = byDay.get(day) || 0;
      const level = minutes === 0 ? 0 : minutes < 25 ? 1 : minutes < 75 ? 2 : minutes < 150 ? 3 : 4;
      col.push({ day, minutes, level, future: day > today });
    }
    cols.push(col);
  }
  return cols;
}

/** Tamamlama oranı 0..1 (kayıt yoksa null). */
export function completionRate(sessions) {
  const done = sessions.filter((s) => s.status === 'completed').length;
  const total = sessions.length;
  return total ? done / total : null;
}

/** Bugünün anahtarı (kolaylık). */
export const todayKey = (now = Date.now()) => dayKey(now);
