// Üst şerit: para, seri, günlük hedef. Odak sırasında solar.
import { h } from '../dom.js';
import { t, fmtNumber } from '../../i18n/index.js';
import { dayKey } from '../../core/dates.js';
import { effectiveStreak } from '../../core/streak.js';

/** Üst şeridin içeriğini üretir. theme: aktif tema JSON'u (kontrol modunda null). */
export function renderTopbar(state, theme, now = Date.now()) {
  const day = dayKey(now);
  const done = (state.daily[day] && state.daily[day].completed) || 0;
  const goal = state.settings.dailyGoal;
  const streak = effectiveStreak(state.streak, day);
  return h('div', { class: 'topbar-inner' },
    theme
      ? h('span', { class: 'pill pill-coin', id: 'coin-pill', 'aria-label': t('top.coins', { n: state.wallet.coins, name: theme.currency.name }) },
          h('span', { 'aria-hidden': 'true' }, theme.currency.icon),
          h('span', { class: 'count-up', id: 'coin-value' }, fmtNumber(state.wallet.coins)))
      : null,
    h('span', { class: 'pill', 'aria-label': t('top.goal', { done, goal }) },
      h('span', { 'aria-hidden': 'true' }, '🎯'), `${done}/${goal}`),
    h('span', { class: 'pill', 'aria-label': t('top.streak', { n: streak }) },
      h('span', { 'aria-hidden': 'true' }, '🔥'), String(streak)),
  );
}
