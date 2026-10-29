// İlk açılış: aydınlatma metni -> tema seçimi -> 3 adımlı tanıtım -> isteğe bağlı anket.
import { CONFIG } from '../../config.js';
import { h, clear } from '../dom.js';
import { t } from '../../i18n/index.js';
import { themePicker } from '../components/themePicker.js';
import { surveyForm } from '../components/survey.js';
import { themeState } from '../../core/economy.js';
import { submitSurvey } from '../../core/research.js';
import { dayKey } from '../../core/dates.js';

const STEPS = ['consent', 'theme', 'how1', 'how2', 'goal', 'survey'];

export function mount(root, ctx) {
  const { store } = ctx;
  let step = store.get().profile.consentAt ? 'theme' : 'consent';
  let chosen = store.get().profile.theme;
  let goal = store.get().settings.dailyGoal;
  const box = h('div', { class: 'stack welcome' });
  root.append(box);

  function dots() {
    const i = STEPS.indexOf(step);
    return h('div', { class: 'step-dots', role: 'img', 'aria-label': t('welcome.stepOf', { n: i + 1, total: STEPS.length }) },
      STEPS.map((_, k) => h('span', { class: k <= i ? 'on' : '' })));
  }

  function nav(next, { label, disabled, back } = {}) {
    return h('div', { class: 'modal-actions' },
      back ? h('button', { type: 'button', class: 'btn btn-outline', onClick: () => go(back) }, t('common.back')) : null,
      h('button', { type: 'button', class: 'btn btn-primary btn-big', disabled, onClick: () => next() }, label || t('common.next')));
  }

  function go(s) {
    step = s;
    draw();
    window.scrollTo(0, 0);
  }

  function finish() {
    const now = Date.now();
    store.update((s) => {
      s.profile.onboarded = true;
      s.profile.theme = chosen;
      s.settings.dailyGoal = goal;
      themeState(s, chosen, now);
    });
    ctx.go('focus');
  }

  function draw() {
    clear(box);
    box.append(dots());
    if (step === 'consent') {
      box.append(
        h('h1', null, t('consent.title')),
        h('p', { class: 'emoji-big center', 'aria-hidden': 'true' }, '🔒'),
        h('div', { class: 'card stack' },
          ['p1', 'p2', 'p3', 'p4', 'p5'].map((k) => h('p', null, t(`consent.${k}`)))),
        h('p', { class: 'card note' }, `👪 ${t('consent.parent')}`),
        nav(() => {
          store.update((s) => { s.profile.consentAt = Date.now(); });
          go('theme');
        }, { label: t('consent.ok') }));
    } else if (step === 'theme') {
      const picker = themePicker({ selected: chosen, onPick: (id) => { chosen = id; next.disabled = false; ctx.previewTheme(id); } });
      const next = h('button', { type: 'button', class: 'btn btn-primary btn-big', disabled: !chosen, onClick: () => go('how1') }, t('welcome.start'));
      box.append(h('h1', null, t('welcome.title')), h('p', { class: 'muted' }, t('welcome.subtitle')), picker.el,
        h('p', { class: 'small muted center' }, t('welcome.changeAnytime')),
        h('div', { class: 'modal-actions' }, next));
    } else if (step === 'how1') {
      box.append(h('p', { class: 'emoji-big center', 'aria-hidden': 'true' }, '⏱️'), h('h1', null, t('how.s1.title')), h('p', null, t('how.s1.text', { focus: CONFIG.timer.defaultFocus, brk: CONFIG.timer.defaultShortBreak })),
        nav(() => go('how2'), { back: 'theme' }));
    } else if (step === 'how2') {
      box.append(h('p', { class: 'emoji-big center', 'aria-hidden': 'true' }, '🪙'), h('h1', null, t('how.s2.title')),
        h('p', null, t('how.s2.text', { coins: CONFIG.economy.coinsPerMinute * CONFIG.economy.baseFocusMinutes, cap: CONFIG.economy.dailyRewardedCap })),
        h('p', { class: 'card note' }, `💚 ${t('how.s2.safe')}`),
        nav(() => go('goal'), { back: 'how1' }));
    } else if (step === 'goal') {
      box.append(h('p', { class: 'emoji-big center', 'aria-hidden': 'true' }, '🎯'), h('h1', null, t('how.s3.title')), h('p', null, t('how.s3.text')),
        h('div', { class: 'chips', role: 'group', 'aria-label': t('how.s3.title') },
          CONFIG.goals.map((g) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(goal === g), onClick: () => { goal = g; draw(); } }, t('how.s3.option', { n: g })))),
        h('p', { class: 'small muted' }, t('how.s3.hint')),
        nav(() => go('survey'), { back: 'how2' }));
    } else {
      box.append(h('h1', null, t('survey.title')),
        surveyForm({
          phase: 'baseline',
          onSubmit: (answers) => { store.update((s) => { submitSurvey(s, 'baseline', answers, Date.now()); }); finish(); },
          onSkip: () => { store.update((x) => { x.research.surveySnoozedDay = dayKey(Date.now()); }, { silent: true }); finish(); },
        }));
    }
  }

  draw();
  return {};
}
