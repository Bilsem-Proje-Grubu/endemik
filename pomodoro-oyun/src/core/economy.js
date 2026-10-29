// Para kazanma/harcama, güç ve seviye hesapları.
import { CONFIG } from '../config.js';
import { dayKey } from './dates.js';
import { defaultThemeState } from './storage.js';

const E = CONFIG.economy;

/** Odak süresine orantılı temel ödül (25 dk = 100, 45 dk = 180). */
export function baseReward(minutes) {
  return Math.round(minutes * E.coinsPerMinute);
}

/** Bir Pomodoro'nun ödülünü hesaplar (saf fonksiyon). */
export function computeReward({ plannedMin, task, rewardedToday, setCompleted }) {
  if (rewardedToday >= E.dailyRewardedCap) {
    return { capped: true, base: 0, bonuses: [], total: 0 };
  }
  const base = baseReward(plannedMin);
  const bonuses = [];
  if (rewardedToday === 0) bonuses.push({ id: 'first', coins: E.firstOfDayBonus });
  if (setCompleted) bonuses.push({ id: 'set', coins: E.setBonus });
  if (task && task.trim()) bonuses.push({ id: 'task', coins: E.taskBonus });
  const total = base + bonuses.reduce((a, b) => a + b.coins, 0);
  return { capped: false, base, bonuses, total };
}

/** Günlük kaydı (yoksa oluşturur). */
export function dailyRecord(state, day) {
  if (!state.daily[day]) state.daily[day] = { rewarded: 0, completed: 0, minutes: 0 };
  return state.daily[day];
}

/**
 * Tamamlanan odak oturumunu ekonomiye işler: set sayacı, günlük tavan, para.
 * Durumu değiştirir ve { reward, setCompleted, day } döndürür.
 * control = true ise (araştırma kontrol modu) para verilmez.
 */
export function applyCompletion(state, { plannedMin, actualMin, task, now, control = false }) {
  const day = dayKey(now);
  if (state.cycle.day !== day) state.cycle = { count: 0, day, nextBreak: null };
  state.cycle.count += 1;
  const setCompleted = state.cycle.count >= CONFIG.timer.setSize;
  if (setCompleted) state.cycle.count = 0;

  const rec = dailyRecord(state, day);
  let reward = { capped: false, base: 0, bonuses: [], total: 0 };
  if (!control) {
    reward = computeReward({ plannedMin, task, rewardedToday: rec.rewarded, setCompleted });
    if (reward.total > 0) {
      rec.rewarded += 1;
      state.wallet.coins += reward.total;
      state.wallet.earnedTotal += reward.total;
    }
  }
  rec.completed += 1;
  rec.minutes += actualMin;
  return { reward, setCompleted, day };
}

/** Bir ürünün ait olduğu slot grubu: mevkili kategoride rolü, değilse "*". */
export function slotGroup(cat, item) {
  return cat.roleSlots ? item.role : '*';
}

/** Slot grubunun kapasitesi. */
export function slotCapacity(cat, group) {
  return cat.roleSlots ? cat.roleSlots[group] || 0 : cat.slotLimit;
}

/** Temanın her kategorisinde slotlara giren en güçlü ürünler (mevkili kategoride her mevkinin kotası ayrı). */
export function equippedIds(theme, ownedIds) {
  const owned = new Set(ownedIds);
  const out = {};
  for (const cat of theme.categories) {
    const mine = theme.items.filter((i) => i.category === cat.id && owned.has(i.id));
    const groups = cat.roleSlots ? Object.keys(cat.roleSlots) : ['*'];
    out[cat.id] = groups.flatMap((g) =>
      mine
        .filter((i) => slotGroup(cat, i) === g)
        .sort((a, b) => b.power - a.power || a.id.localeCompare(b.id))
        .slice(0, slotCapacity(cat, g))
        .map((i) => i.id));
  }
  return out;
}

/** Toplam güç: her kategoride sadece slotlara giren ürünler sayılır. */
export function totalPower(theme, ownedIds) {
  const eq = equippedIds(theme, ownedIds);
  const byId = new Map(theme.items.map((i) => [i.id, i]));
  let sum = 0;
  for (const ids of Object.values(eq)) for (const id of ids) sum += byId.get(id).power;
  return sum;
}

/** Güce göre seviye bilgisi. */
export function levelInfo(theme, power) {
  const levels = theme.levels;
  let idx = 0;
  for (let i = 0; i < levels.length; i++) if (power >= levels[i].requiredPower) idx = i;
  const current = levels[idx];
  const next = levels[idx + 1] || null;
  const progress = next
    ? (power - current.requiredPower) / (next.requiredPower - current.requiredPower)
    : 1;
  return {
    level: current.id,
    index: idx,
    current,
    next,
    progress: Math.max(0, Math.min(1, progress)),
    toNext: next ? next.requiredPower - power : 0,
  };
}

/** Hedef fiyata ulaşmak için kaç Pomodoro daha gerekli (en az 0). */
export function pomodorosNeeded(price, coins) {
  const perPomodoro = baseReward(E.baseFocusMinutes);
  return Math.max(0, Math.ceil((price - coins) / perPomodoro));
}

/** Tema ilerleme kaydını getirir (yoksa oluşturur). */
export function themeState(state, themeId, now = Date.now()) {
  if (!state.themes[themeId]) state.themes[themeId] = defaultThemeState(now);
  return state.themes[themeId];
}

/** Ürünü satın alır. Durumu değiştirir. { ok, reason, leveledUp, ... } döndürür. */
export function buyItem(state, theme, itemId, now = Date.now()) {
  const item = theme.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: 'notFound' };
  const ts = themeState(state, theme.id, now);
  if (ts.owned.includes(itemId)) return { ok: false, reason: 'owned' };
  const before = levelInfo(theme, totalPower(theme, ts.owned));
  if (item.minLevel > before.level) return { ok: false, reason: 'locked' };
  if (state.wallet.coins < item.price) return { ok: false, reason: 'coins' };
  state.wallet.coins -= item.price;
  state.wallet.spentTotal += item.price;
  ts.owned.push(itemId);
  if (ts.goalItem === itemId) ts.goalItem = null;
  const power = totalPower(theme, ts.owned);
  const after = levelInfo(theme, power);
  const leveledUp = after.level > ts.levelSeen;
  if (leveledUp) ts.levelSeen = after.level;
  return { ok: true, item, leveledUp, level: after.current, power };
}
