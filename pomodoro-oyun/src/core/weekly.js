// Haftalık olay (maç, festival, defile, sahiplendirme günü). Sonuç çalışmaya bağlıdır.
import { CONFIG } from '../config.js';
import { addDays, dayKey, seededRandom, weekKey } from './dates.js';
import { levelInfo, themeState, totalPower } from './economy.js';

const W = CONFIG.weekly;

/** Şu an hangi haftanın olayı sonuçlanmış olmalı? Pazar 18:00'den sonra bu hafta, önce geçen hafta. */
export function dueWeek(now) {
  const wk = weekKey(now);
  const [y, m, d] = addDays(wk, 6).split('-').map(Number);
  const eventTime = new Date(y, m - 1, d, W.eventHour, 0, 0).getTime();
  return now >= eventTime ? wk : addDays(wk, -7);
}

/** Bir haftada tamamlanan odak dakikası. */
export function minutesInWeek(sessions, wk) {
  const end = addDays(wk, 6);
  let sum = 0;
  for (const s of sessions) {
    if (s.status === 'completed' && s.day >= wk && s.day <= end) sum += s.actualMin;
  }
  return sum;
}

/** Sonucu hesaplar. Aynı hafta + tema her zaman aynı sonucu verir (yeniden deneme hilesi yok). */
export function simulate({ theme, power, minutes, week }) {
  const rng = seededRandom(`${theme.id}|${week}`);
  const level = levelInfo(theme, power);
  const opp = level.current.opponentPower;
  const noise = 1 + (rng() * 2 - 1) * W.randomness;
  const score = Math.round((power + minutes * W.minuteBonus) * noise);
  const ratio = opp > 0 ? score / opp : 2;
  let result = 'draw';
  if (ratio > 1 + W.winMargin) result = 'win';
  else if (ratio < 1 - W.winMargin) result = 'lose';
  const coins = result === 'win' ? W.winCoins : result === 'draw' ? W.drawCoins : W.loseCoins;
  return { result, score, opp, coins, power, minutes, week };
}

/**
 * Bekleyen haftalık olayı çözer (durumu değiştirir). Olay varsa döndürür.
 * Sadece aktif tema için; hiç ilerleme yoksa sessizce geçer.
 */
export function resolvePending(state, theme, now) {
  const week = dueWeek(now);
  const ts = themeState(state, theme.id, now);
  if (ts.lastEventWeek === week) return null;
  if (week < weekKey(ts.startedAt)) return null;
  ts.lastEventWeek = week;
  const power = totalPower(theme, ts.owned);
  const minutes = minutesInWeek(state.sessions, week);
  if (power === 0 && minutes === 0) return null;
  const ev = { themeId: theme.id, ...simulate({ theme, power, minutes, week }), at: now, day: dayKey(now) };
  state.wallet.coins += ev.coins;
  state.wallet.earnedTotal += ev.coins;
  ts.events.push(ev);
  state.pendingEvents.push(ev);
  return ev;
}
