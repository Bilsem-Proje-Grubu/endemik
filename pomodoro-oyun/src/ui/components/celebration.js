// Pomodoro bitince / yarım kalınca / seviye atlayınca gösterilen pencereler.
import { h } from '../dom.js';
import { t, tList, pick, fmtNumber } from '../../i18n/index.js';
import { openModal } from './modal.js';
import { confetti, flyCoins, countUp } from './effects.js';
import { play, vibrate } from '../sound.js';
import { announce } from '../dom.js';

/** Tamamlanan odak oturumunun kutlaması. outcome: controller.onComplete verisi. */
export function showCompletion(ctx, outcome) {
  const theme = ctx.theme;
  const { reward, setCompleted, streak, badges, control } = outcome;
  const settings = ctx.state.settings;
  play('done');
  vibrate([120, 80, 120], settings.vibration);
  announce(t('done.announce', { n: reward.total }));

  const totalEl = h('span', { class: 'count-up big-number' }, '0');
  const rows = [];
  if (!control && theme) {
    if (reward.capped) {
      rows.push(h('p', { class: 'card note' }, t('done.capped')));
    } else {
      rows.push(h('div', { class: 'reward-box' },
        h('div', { class: 'row', style: { justifyContent: 'center', gap: '0.5rem' } },
          h('span', { class: 'big-coin', 'aria-hidden': 'true' }, theme.currency.icon), h('span', null, '+'), totalEl),
        h('ul', { class: 'breakdown' },
          h('li', null, h('span', null, t('done.base')), h('span', null, `+${reward.base}`)),
          reward.bonuses.map((b) => h('li', null, h('span', null, t(`done.bonus.${b.id}`)), h('span', null, `+${b.coins}`))))));
    }
  }

  let streakLine = '';
  if (streak.lostFrom > 0) streakLine = t('streak.reset');
  else if (streak.froze) streakLine = t('streak.froze');
  else if (streak.current > 1) streakLine = t('streak.days', { n: streak.current });

  const body = [
    h('p', { class: 'center emoji-big', 'aria-hidden': 'true' }, '🎉'),
    h('p', { class: 'center' }, theme && !control ? pick(theme.texts.completed) : t('done.plain')),
    ...rows,
    h('p', { class: 'center growth' }, pick(tList('growth'))),
    streakLine ? h('p', { class: 'center small' }, `🔥 ${streakLine}`) : null,
    setCompleted ? h('p', { class: 'card note' }, `🌿 ${t('done.longBreak')}`) : null,
    badges.length
      ? h('div', { class: 'card' },
          h('strong', null, t('done.newBadges')),
          h('ul', { class: 'badge-list' }, badges.map((id) => h('li', null, `${ctx.badgeIcon(id)} ${t(`badges.${id}.name`)}`))))
      : null,
  ];

  const m = openModal({
    title: t('done.title'),
    body,
    actions: [{ label: t('done.ok'), kind: 'primary' }],
    className: 'celebrate',
  });
  if (!reward.capped && reward.total > 0) {
    countUp(totalEl, 0, reward.total, 700, fmtNumber);
    play('coin');
    confetti(24);
    const from = m.el.querySelector('.big-coin');
    const to = document.getElementById('coin-pill');
    if (from && to) setTimeout(() => flyCoins(from.getBoundingClientRect(), to, theme.currency.icon, 8), 500);
  } else {
    totalEl.textContent = '';
  }
  if (badges.length) setTimeout(() => confetti(30), 400);
}

/** Yarım kalan oturum: suçlamayan, destekleyici dil. Hiçbir şey kaybedilmez. */
export function showInterrupted(ctx, info) {
  if (info.phase !== 'focus') return;
  const theme = ctx.theme;
  play('warn');
  openModal({
    title: t('interrupted.title'),
    body: [
      h('p', null, t(`interrupted.reason.${info.reason}`)),
      h('p', { class: 'card note' }, `💚 ${t('interrupted.safe')}`),
      theme ? h('p', { class: 'muted' }, theme.texts.interrupted) : null,
      h('p', { class: 'growth' }, t('interrupted.tomorrow')),
    ],
    actions: [{ label: t('interrupted.ok'), kind: 'primary' }],
  });
}

/** Seviye atlama kutlaması. */
export function showLevelUp(ctx, level, onClose) {
  play('levelup');
  confetti(60);
  announce(t('levelup.announce', { name: level.name }));
  openModal({
    title: t('levelup.title'),
    body: [
      h('p', { class: 'center emoji-big', 'aria-hidden': 'true' }, '🚀'),
      h('p', { class: 'center level-name' }, level.name),
      h('p', { class: 'center' }, t('levelup.text')),
    ],
    actions: [{ label: t('levelup.ok'), kind: 'primary' }],
    className: 'celebrate',
    onClose,
  });
}
