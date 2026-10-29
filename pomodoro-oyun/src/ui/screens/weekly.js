// Haftalık olay sonucu (maç / festival / defile / sahiplendirme günü): kısa animasyon + ödül.
import { h } from '../dom.js';
import { t, fmtNumber, fmtMinutes } from '../../i18n/index.js';
import { seededRandom } from '../../core/dates.js';
import { openModal } from '../components/modal.js';
import { confetti, countUp } from '../components/effects.js';
import { play } from '../sound.js';
import { motionOn } from '../dom.js';

/** Futbol için sonuca uygun (ve her seferinde aynı) skor üretir. */
export function goalsFor(ev) {
  const r = seededRandom(`g|${ev.themeId}|${ev.week}`);
  if (ev.result === 'win') {
    const a = 2 + Math.floor(r() * 3);
    return [a, Math.floor(r() * a)];
  }
  if (ev.result === 'lose') {
    const b = 2 + Math.floor(r() * 3);
    return [Math.floor(r() * b), b];
  }
  const d = Math.floor(r() * 3) + 1;
  return [d, d];
}

/** Olay sonucunu gösterir; kapanınca onClose çağrılır. */
export function showWeekly(ctx, ev, onClose) {
  const theme = ctx.themes[ev.themeId];
  const we = theme.weeklyEvent;
  const texts = we.resultTexts[ev.result];
  const rnd = seededRandom(`t|${ev.themeId}|${ev.week}`);
  const text = texts[Math.floor(rnd() * texts.length)];
  const icon = ev.result === 'win' ? '🏆' : ev.result === 'draw' ? '🤝' : '🌱';
  const level = theme.levels.find((l) => l.opponentPower === ev.opp) || theme.levels[0];

  const stage = h('div', { class: 'stack center weekly-stage' }, h('p', { class: 'emoji-big spin', 'aria-hidden': 'true' }, theme.icon), h('p', null, we.intro));
  const coinEl = h('span', { class: 'count-up big-number' }, '0');
  const result = h('div', { class: 'stack center' },
    h('p', { class: 'emoji-big pop', 'aria-hidden': 'true' }, icon),
    h('h3', null, t(`weekly.result.${ev.result}`)),
    we.scoreStyle === 'goals'
      ? h('p', { class: 'scoreboard', 'aria-label': t('weekly.scoreAria') }, `${goalsFor(ev).join(' – ')}`)
      : h('div', { class: 'scoreboard small-board' }, h('span', null, `${t('weekly.you')} ${fmtNumber(ev.score)}`), h('span', null, `${we.vsLabel} ${fmtNumber(ev.opp)}`)),
    h('p', { class: 'small muted' }, `${level.opponentName}`),
    h('p', null, text),
    h('p', { class: 'small muted' }, t('weekly.explain', { label: theme.texts.powerLabel, power: fmtNumber(ev.power), time: fmtMinutes(ev.minutes) })),
    h('p', { class: 'row', style: { justifyContent: 'center' } }, h('span', { 'aria-hidden': 'true' }, theme.currency.icon), '+', coinEl),
    h('p', { class: 'small muted' }, t('weekly.noLoss')));
  result.hidden = true;

  const m = openModal({
    title: we.name,
    body: [stage, result],
    actions: [{ label: t('weekly.ok'), kind: 'primary' }],
    className: 'celebrate',
    onClose,
  });
  const reveal = () => {
    stage.hidden = true;
    result.hidden = false;
    play(ev.result === 'lose' ? 'warn' : 'levelup');
    countUp(coinEl, 0, ev.coins, 700, fmtNumber);
    if (ev.result === 'win') confetti(40);
  };
  if (motionOn()) setTimeout(reveal, 1400);
  else reveal();
  return m;
}
