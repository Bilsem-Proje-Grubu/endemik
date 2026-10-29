// Rozetler. Hepsi ÇABAYA bağlıdır (sonuca/başarıya değil). Adlar ve ipuçları tr.json -> badges.
import { daysBetween, weekKey, weekdayIndex } from './dates.js';
import { subjectOf } from './stats.js';

/** Rozet bağlamı: tüm kontrollerin kullandığı özet sayılar. */
export function buildContext(state, themes = {}) {
  const done = state.sessions.filter((s) => s.status === 'completed');
  const days = [...new Set(done.map((s) => s.day))].sort();
  const perWeek = {};
  for (const s of done) {
    const wk = weekKey(new Date(`${s.day}T12:00:00`).getTime());
    perWeek[wk] = (perWeek[wk] || 0) + 1;
  }
  let comeback = false;
  for (let i = 1; i < days.length; i++) if (daysBetween(days[i - 1], days[i]) >= 3) comeback = true;
  const themeStates = Object.entries(state.themes);
  let owned = 0;
  let legends = 0;
  let themesPlayed = 0;
  let events = 0;
  for (const [id, ts] of themeStates) {
    owned += ts.owned.length;
    if (ts.owned.length > 0) themesPlayed += 1;
    events += ts.events.length;
    const theme = themes[id];
    if (theme) legends += theme.items.filter((i) => ts.owned.includes(i.id) && i.tier === 'legend').length;
  }
  const dailyValues = Object.values(state.daily);
  return {
    count: done.length,
    minutes: done.reduce((a, s) => a + s.actualMin, 0),
    streakBest: state.streak.best,
    morning: done.some((s) => s.hour >= 5 && s.hour < 9),
    weekend: done.some((s) => weekdayIndex(s.day) >= 5),
    levelMax: Math.max(1, ...themeStates.map(([, ts]) => ts.levelSeen)),
    owned,
    legends,
    spent: state.wallet.spentTotal,
    setDone: dailyValues.some((d) => d.completed >= 4),
    goalDone: dailyValues.some((d) => d.completed >= state.settings.dailyGoal),
    withTask: done.filter((s) => s.task && s.task.trim()).length,
    subjects: new Set(done.map((s) => subjectOf(s.task)).filter(Boolean)).size,
    weekMax: Math.max(0, ...Object.values(perWeek)),
    themesPlayed,
    long45: done.some((s) => s.plannedMin >= 45),
    events,
    frozen: state.streak.frozenDays.length,
    comeback,
  };
}

const num = (key, target, icon) => ({ icon, target, value: (c) => c[key] });
const flag = (key, icon) => ({ icon, target: 1, value: (c) => (c[key] ? 1 : 0) });

/** Rozet tanımları (30+). value/target ile ilerleme çubuğu da gösterilebilir. */
export const BADGES = {
  first: num('count', 1, '🌱'),
  p10: num('count', 10, '⭐'),
  p50: num('count', 50, '🌟'),
  p100: num('count', 100, '💯'),
  p500: num('count', 500, '🏆'),
  streak3: num('streakBest', 3, '🔥'),
  streak7: num('streakBest', 7, '🔥'),
  streak30: num('streakBest', 30, '🌋'),
  morning: flag('morning', '🌅'),
  weekend: flag('weekend', '📚'),
  level2: num('levelMax', 2, '🚀'),
  level3: num('levelMax', 3, '🚀'),
  level4: num('levelMax', 4, '🚀'),
  level5: num('levelMax', 5, '👑'),
  legend: num('legends', 1, '💎'),
  firstBuy: num('spent', 1, '🛍️'),
  items10: num('owned', 10, '🧺'),
  items25: num('owned', 25, '🎁'),
  set: flag('setDone', '🧩'),
  goalDay: flag('goalDone', '🎯'),
  tasks10: num('withTask', 10, '📝'),
  subjects5: num('subjects', 5, '🗂️'),
  hours5: { icon: '⏱️', target: 5, value: (c) => Math.floor(c.minutes / 60) },
  hours25: { icon: '⏳', target: 25, value: (c) => Math.floor(c.minutes / 60) },
  hours100: { icon: '🕰️', target: 100, value: (c) => Math.floor(c.minutes / 60) },
  week20: num('weekMax', 20, '📅'),
  themes4: num('themesPlayed', 4, '🎨'),
  long45: flag('long45', '🧠'),
  firstEvent: num('events', 1, '🎉'),
  events3: num('events', 3, '🥳'),
  freeze: flag('frozen', '🧊'),
  comeback: flag('comeback', '🤝'),
};

export const BADGE_IDS = Object.keys(BADGES);

/** Kazanılan yeni rozetleri kaydeder ve kimliklerini döndürür (durumu değiştirir). */
export function evaluate(state, themes, now) {
  const ctx = buildContext(state, themes);
  const fresh = [];
  for (const id of BADGE_IDS) {
    if (state.achievements[id]) continue;
    const b = BADGES[id];
    if (b.value(ctx) >= b.target) {
      state.achievements[id] = now;
      fresh.push(id);
    }
  }
  return fresh;
}

/** Arayüz için: her rozetin ilerleme durumu. */
export function progressList(state, themes) {
  const ctx = buildContext(state, themes);
  return BADGE_IDS.map((id) => {
    const b = BADGES[id];
    const value = Math.min(b.value(ctx), b.target);
    return { id, icon: b.icon, target: b.target, value, unlockedAt: state.achievements[id] || null };
  });
}
