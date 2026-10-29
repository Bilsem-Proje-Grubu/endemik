// Odak ekranı: dairesel sayaç, görev adı, başlat/duraklat/bırak, mola ipuçları, hedef çubuğu.
import { CONFIG } from '../../config.js';
import { h, clear, fromHTML } from '../dom.js';
import { t, tList, pick, fmtNumber } from '../../i18n/index.js';
import { dayKey } from '../../core/dates.js';
import { formatClock } from '../../core/timer.js';
import { baseReward, pomodorosNeeded, themeState } from '../../core/economy.js';
import { subjectBreakdown } from '../../core/stats.js';
import { confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { play } from '../sound.js';

const R = 88; // Halka yarıçapı
const CIRC = 2 * Math.PI * R;

let draftTask = ''; // Sayfa içinde ekranlar arasında görev adı korunur

/** Saat 23:00'ten sonra mı (uyku hatırlatması için)? */
export function isLateHour(now = new Date()) {
  const hr = now.getHours();
  return hr >= CONFIG.economy.sleepReminderHour || hr < CONFIG.economy.sleepReminderEndHour;
}

export function mount(root, ctx) {
  const { store, ctrl } = ctx;
  let modeKey = '';
  let breakTip = pick(tList('tips.break'));

  const phaseEl = h('p', { class: 'phase-label', 'aria-hidden': 'true' });
  const timeEl = h('div', { class: 'ring-time', 'aria-hidden': 'true' });
  const subEl = h('div', { class: 'ring-sub', 'aria-hidden': 'true' });
  const svg = fromHTML(`<svg class="ring-svg" viewBox="0 0 200 200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle class="ring-track" cx="100" cy="100" r="${R}"/><circle class="ring-progress" cx="100" cy="100" r="${R}" stroke-dasharray="${CIRC}"/></svg>`);
  const progressCircle = svg.querySelector('.ring-progress');
  const ring = h('div', { class: 'ring', role: 'timer', 'aria-label': t('focus.timerLabel') },
    svg, h('div', { class: 'ring-center' }, timeEl, subEl));
  const ambient = h('div', { class: 'ambient', 'aria-hidden': 'true' });
  const controls = h('div', { class: 'stack focus-controls' });
  const wrap = h('section', { class: 'focus stack', 'aria-label': t('nav.focus') }, ambient, phaseEl, ring, controls);
  root.append(wrap);

  const st = () => store.get();
  const theme = () => ctx.theme;

  function goalCard() {
    const th = theme();
    if (!th) return null;
    const ts = themeState(st(), th.id);
    const item = th.items.find((i) => i.id === ts.goalItem);
    if (!item) return null;
    const coins = st().wallet.coins;
    const need = pomodorosNeeded(item.price, coins);
    return h('a', { class: 'card goal-card', href: '#/shop', 'aria-label': t('focus.goalAria', { name: item.name }) },
      h('div', { class: 'row spread' },
        h('strong', null, `🎯 ${item.name}`),
        h('span', { class: 'small muted' }, need === 0 ? t('focus.goalReady') : t('focus.goalNeed', { n: need }))),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': item.price, 'aria-valuenow': Math.min(coins, item.price) },
        h('span', { style: { width: `${Math.min(100, (coins / item.price) * 100)}%` } })),
      h('p', { class: 'small muted' }, `${fmtNumber(Math.min(coins, item.price))} / ${fmtNumber(item.price)} ${th.currency.icon}`));
  }

  function buildIdle(snapNone) {
    const s = st();
    const th = theme();
    const day = dayKey(Date.now());
    const rec = s.daily[day] || { rewarded: 0, completed: 0 };
    const capped = rec.rewarded >= CONFIG.economy.dailyRewardedCap;
    const subjects = subjectBreakdown(s.sessions).filter((x) => x.subject).slice(0, 8);
    const listId = 'subject-list';
    const taskInput = h('input', {
      class: 'input', id: 'task', type: 'text', maxlength: CONFIG.timer.maxLabelLength, autocomplete: 'off',
      placeholder: t('focus.taskPlaceholder'), value: draftTask, list: listId,
      onInput: (e) => { draftTask = e.target.value; },
    });
    const dots = [];
    for (let i = 0; i < CONFIG.timer.setSize; i++) {
      dots.push(h('span', { class: `dot ${i < s.cycle.count ? 'on' : ''}`, 'aria-hidden': 'true' }));
    }
    const startBtn = h('button', { type: 'button', class: 'btn btn-primary btn-big btn-block', id: 'start-btn', onClick: start }, `▶ ${t('focus.start')}`);
    const nodes = [];
    if (s.cycle.nextBreak && !s.active) {
      nodes.push(h('button', { type: 'button', class: 'btn btn-outline btn-block', onClick: () => { ctrl.startBreak(); } }, t('focus.startBreak')));
    }
    nodes.push(
      h('div', { class: 'chips', role: 'group', 'aria-label': t('focus.durationLabel') },
        CONFIG.timer.focusOptions.map((m) =>
          h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(s.settings.focusMin === m),
            onClick: () => { play('tap'); store.update((x) => { x.settings.focusMin = m; }); },
          }, t('fmt.min', { n: m })))),
      h('div', { class: 'field' },
        h('label', { for: 'task' }, t('focus.taskLabel')), taskInput,
        h('datalist', { id: listId }, subjects.map((x) => h('option', { value: x.subject })))),
      th
        ? h('p', { class: 'small muted center' }, capped
            ? t('focus.capped')
            : t('focus.rewardPreview', { n: baseReward(s.settings.focusMin), icon: th.currency.icon }))
        : null,
      startBtn,
      h('div', { class: 'row set-row', 'aria-label': t('focus.setLabel', { n: s.cycle.count, total: CONFIG.timer.setSize }) },
        h('span', { class: 'small muted', 'aria-hidden': 'true' }, t('focus.set')), h('span', { class: 'dots', 'aria-hidden': 'true' }, dots),
        h('span', { class: 'small muted' }, t('focus.setHint'))),
      s.settings.sleepReminder && isLateHour() ? h('p', { class: 'card note', role: 'note' }, `🌙 ${t('focus.sleep')}`) : null,
      goalCard(),
    );
    controls.append(...nodes.filter(Boolean));
    void snapNone;
  }

  function buildRunning(snap) {
    if (snap.viewer) {
      controls.append(h('p', { class: 'card note', role: 'status' }, t('focus.otherTab')));
      return;
    }
    const nodes = [];
    if (snap.phase === 'focus') {
      nodes.push(h('p', { class: 'task-line' }, snap.task ? `📝 ${snap.task}` : t('focus.noTask')));
      nodes.push(h('p', { class: 'small muted center' }, theme() ? theme().texts.focusHint : t('focus.hintPlain')));
      nodes.push(h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap' } },
        snap.paused
          ? h('button', { type: 'button', class: 'btn btn-primary btn-big', onClick: () => { ctrl.resume(); update(); } }, `▶ ${t('focus.resume')}`)
          : h('button', { type: 'button', class: 'btn btn-outline btn-big', disabled: snap.pauseUsed, onClick: () => { ctrl.pause(); update(); } },
              `⏸ ${snap.pauseUsed ? t('focus.pauseUsed') : t('focus.pause')}`),
        h('button', { type: 'button', class: 'btn btn-ghost', onClick: abandon }, t('focus.abandon'))));
      if (snap.paused) {
        nodes.push(h('p', { class: 'small center', id: 'pause-note', role: 'status' }, t('focus.pauseNote', { s: Math.ceil(snap.pauseLeftMs / 1000) })));
      }
    } else {
      nodes.push(h('div', { class: 'card tip' }, h('p', null, breakTip)));
      nodes.push(h('p', { class: 'small muted center' }, theme() ? theme().texts.breakHint : t('focus.breakPlain')));
      nodes.push(h('button', { type: 'button', class: 'btn btn-outline btn-block', onClick: () => ctrl.abandon() }, t('focus.skipBreak')));
      nodes.push(goalCard());
    }
    controls.append(...nodes.filter(Boolean));
  }

  async function start() {
    play('start');
    const r = ctrl.start(draftTask);
    if (!r.ok) {
      toast(r.reason === 'otherTab' ? t('focus.otherTabToast') : t('focus.busy'));
      return;
    }
    if (st().settings.sleepReminder && isLateHour()) toast(t('focus.sleepToast'), 5000);
    update();
  }

  async function abandon() {
    const ok = await confirmDialog({ title: t('focus.abandonTitle'), text: t('focus.abandonText'), yes: t('focus.abandonYes'), no: t('focus.abandonNo'), danger: true });
    if (ok) ctrl.abandon();
  }

  /** Mod değişince denetimleri yeniden kurar; her karede halkayı günceller. */
  function update() {
    const s = st();
    const snap = ctrl.snapshot();
    const key = snap
      ? `${snap.phase}|${snap.paused}|${snap.pauseUsed}|${snap.viewer}`
      : `idle|${s.settings.focusMin}|${s.cycle.nextBreak}|${s.cycle.count}|${s.wallet.coins}|${theme() && themeState(s, theme().id).goalItem}|${ctx.isControl()}|${s.settings.sleepReminder}`;
    if (key !== modeKey) {
      if (snap && snap.phase !== 'focus' && !modeKey.startsWith(snap.phase)) breakTip = pick(tList('tips.break'));
      modeKey = key;
      const keepFocus = document.activeElement && document.activeElement.id === 'task';
      const pos = keepFocus ? document.activeElement.selectionStart : 0;
      clear(controls);
      if (snap) buildRunning(snap);
      else buildIdle();
      if (keepFocus) {
        const el = document.getElementById('task');
        if (el) { el.focus(); el.setSelectionRange(pos, pos); }
      }
      wrap.dataset.mode = snap ? snap.phase : 'idle';
    }
    refreshRing(snap);
  }

  function refreshRing(snap) {
    const s = st();
    const planned = snap ? snap.plannedMs : s.settings.focusMin * 60000;
    const remaining = snap ? snap.remainingMs : planned;
    const progress = snap ? snap.progress : 0;
    timeEl.textContent = formatClock(remaining);
    progressCircle.setAttribute('stroke-dashoffset', String(CIRC * (1 - progress)));
    let phase = t('focus.phaseIdle');
    let sub = t('fmt.min', { n: s.settings.focusMin });
    if (snap) {
      phase = snap.phase === 'focus' ? t('focus.phaseFocus') : snap.phase === 'long' ? t('focus.phaseLong') : t('focus.phaseShort');
      sub = snap.paused ? t('focus.paused') : snap.task || '';
    }
    phaseEl.textContent = phase;
    subEl.textContent = sub;
    const note = document.getElementById('pause-note');
    if (note && snap) note.textContent = t('focus.pauseNote', { s: Math.ceil(snap.pauseLeftMs / 1000) });
    document.title = snap ? `${formatClock(remaining)} · ${phase}` : t('app.name');
  }

  function onKey(e) {
    if (e.code !== 'Space' || e.repeat) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select', 'button', 'a'].includes(tag)) return;
    if (document.getElementById('overlay').childElementCount) return;
    e.preventDefault();
    const snap = ctrl.snapshot();
    if (!snap) start();
    else if (snap.phase === 'focus' && !snap.viewer) {
      if (snap.paused) ctrl.resume();
      else ctrl.pause();
      update();
    }
  }

  document.addEventListener('keydown', onKey);
  const timer = setInterval(() => update(), 250);
  update();

  return {
    update,
    destroy() {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
      document.title = t('app.name');
    },
  };
}
