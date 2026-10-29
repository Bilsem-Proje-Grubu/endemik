// Ayarlar: süreler, ses, görünüm, sağlık, tema, veri dışa/içe aktarma, silme, hakkında.
import { CONFIG } from '../../config.js';
import { h } from '../dom.js';
import { t } from '../../i18n/index.js';
import { THEMES } from '../../themes/index.js';
import { themePicker } from '../components/themePicker.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { ask as askNotify, supported as notifySupported } from '../notify.js';
import { themeState } from '../../core/economy.js';
import { defaultState } from '../../core/storage.js';

let versionTaps = 0;

function section(title, ...children) {
  return h('section', { class: 'card stack', 'aria-label': title }, h('h2', null, title), ...children);
}

function toggleRow(id, label, desc, checked, onChange) {
  return h('div', { class: 'setting' },
    h('label', { for: id }, h('div', null, label), desc ? h('div', { class: 'desc' }, desc) : null),
    h('input', { type: 'checkbox', class: 'switch', id, role: 'switch', checked, onChange: (e) => onChange(e.target.checked) }));
}

function chipRow(label, options, current, onPick, fmt) {
  return h('div', { class: 'field' },
    h('span', { class: 'label', id: `lbl-${label}` }, label),
    h('div', { class: 'chips', role: 'group', 'aria-labelledby': `lbl-${label}` },
      options.map((o) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(o === current), onClick: () => onPick(o) }, fmt(o)))));
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function mount(root, ctx) {
  const { store } = ctx;
  const body = h('div', { class: 'stack' });
  root.append(body);

  const set = (fn) => { store.update((s) => fn(s.settings)); ctx.applySettings(); };

  function changeTheme() {
    const picker = themePicker({ selected: store.get().profile.theme, onPick: () => {} });
    openModal({
      title: t('settings.themeChange'),
      body: [picker.el, h('p', { class: 'small muted' }, t('settings.themeNote'))],
      actions: [
        { label: t('common.cancel') },
        {
          label: t('common.apply'), kind: 'primary',
          onClick: () => {
            const id = picker.selected;
            if (!id) return false;
            store.update((s) => { s.profile.theme = id; themeState(s, id, Date.now()); });
            ctx.applyTheme();
            toast(t('settings.themeChanged', { name: THEMES[id].name }));
          },
        },
      ],
    });
  }

  async function onNotify(on) {
    if (on) {
      const r = await askNotify();
      if (r !== 'granted') {
        toast(t('settings.notifyDenied'));
        store.update((s) => { s.settings.notifications = false; });
        return;
      }
    }
    store.update((s) => { s.settings.notifications = on; });
  }

  function importFile() {
    const input = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', 'aria-label': t('settings.import'),
      onChange: async () => {
        const file = input.files[0];
        if (!file) return;
        const next = store.storage.parseImport(await file.text());
        if (!next) { toast(t('settings.importBad')); return; }
        const ok = await confirmDialog({ title: t('settings.importTitle'), text: t('settings.importText'), yes: t('settings.importYes'), no: t('common.cancel'), danger: true });
        if (!ok) return;
        store.replace(next);
        ctx.applySettings();
        ctx.applyTheme();
        toast(t('settings.importOk'));
      } });
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  }

  async function wipe() {
    const ok = await confirmDialog({ title: t('settings.wipeTitle'), text: t('settings.wipeText'), yes: t('settings.wipeYes'), no: t('common.cancel'), danger: true });
    if (!ok) return;
    store.storage.wipe();
    store.replace(defaultState(), { save: false });
    ctx.applySettings();
    ctx.go('welcome');
  }

  function render() {
    const s = store.get();
    const st = s.settings;
    const th = ctx.theme;
    body.replaceChildren(
      h('h1', null, t('settings.title')),
      !ctx.isControl() ? section(t('settings.theme'),
        h('p', null, th ? `${th.icon} ${th.name}` : ''),
        h('p', { class: 'small muted' }, t('settings.themeNote')),
        h('button', { type: 'button', class: 'btn btn-outline', onClick: changeTheme }, t('settings.themeChange'))) : null,
      section(t('settings.timer'),
        chipRow(t('settings.focus'), CONFIG.timer.focusOptions, st.focusMin, (v) => set((x) => { x.focusMin = v; }), (v) => t('fmt.min', { n: v })),
        chipRow(t('settings.shortBreak'), CONFIG.timer.shortBreakOptions, st.shortBreakMin, (v) => set((x) => { x.shortBreakMin = v; }), (v) => t('fmt.min', { n: v })),
        chipRow(t('settings.goal'), CONFIG.goals, st.dailyGoal, (v) => set((x) => { x.dailyGoal = v; }), (v) => t('how.s3.option', { n: v })),
        toggleRow('autobreak', t('settings.autoBreak'), t('settings.autoBreakDesc'), st.autoBreak, (v) => set((x) => { x.autoBreak = v; }))),
      section(t('settings.feedback'),
        toggleRow('snd', t('settings.sound'), null, st.sound, (v) => set((x) => { x.sound = v; })),
        toggleRow('vib', t('settings.vibration'), null, st.vibration, (v) => set((x) => { x.vibration = v; })),
        notifySupported() ? toggleRow('ntf', t('settings.notifications'), t('settings.notificationsDesc'), st.notifications, onNotify) : null,
        toggleRow('mot', t('settings.reduceMotion'), t('settings.reduceMotionDesc'), st.reduceMotion, (v) => set((x) => { x.reduceMotion = v; }))),
      section(t('settings.look'),
        h('div', { class: 'field' }, h('span', { class: 'label', id: 'lbl-mode' }, t('settings.colorMode')),
          h('div', { class: 'segmented', role: 'group', 'aria-labelledby': 'lbl-mode' },
            ['auto', 'light', 'dark'].map((m) => h('button', { type: 'button', 'aria-selected': String(st.colorMode === m), onClick: () => set((x) => { x.colorMode = m; }) }, t(`settings.mode.${m}`))))),
        chipRow(t('settings.fontSize'), CONFIG.fontScales, st.fontScale, (v) => set((x) => { x.fontScale = v; }), (v) => t(`settings.font.${String(v).replace('.', '_')}`))),
      section(t('settings.health'),
        toggleRow('slp', t('settings.sleep'), t('settings.sleepDesc'), st.sleepReminder, (v) => set((x) => { x.sleepReminder = v; }))),
      section(t('settings.research'),
        h('div', { class: 'field' }, h('label', { for: 'pcode' }, t('settings.code')),
          h('input', { class: 'input', id: 'pcode', type: 'text', maxlength: 12, autocomplete: 'off', placeholder: t('settings.codePlaceholder'), value: s.profile.participantCode,
            onChange: (e) => store.update((x) => { x.profile.participantCode = e.target.value.replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 12); }, { silent: true }) }),
          h('p', { class: 'small muted' }, t('settings.codeDesc'))),
        h('a', { class: 'btn btn-outline', href: '#/research' }, `🔬 ${t('stats.researchLink')}`)),
      section(t('settings.data'),
        h('p', { class: 'small muted' }, t('settings.dataDesc')),
        h('div', { class: 'row-wrap' },
          h('button', { type: 'button', class: 'btn btn-outline', onClick: () => download(`pomodoro-oyun-yedek-${new Date().toISOString().slice(0, 10)}.json`, store.storage.exportJSON(store.get()), 'application/json') }, t('settings.export')),
          h('button', { type: 'button', class: 'btn btn-outline', onClick: importFile }, t('settings.import')),
          h('button', { type: 'button', class: 'btn btn-danger', onClick: wipe }, t('settings.wipe'))),
        store.storage.backend.persistent ? null : h('p', { class: 'card note' }, t('settings.noStorage'))),
      section(t('settings.about'),
        h('p', null, t('about.text')),
        h('p', { class: 'small muted' }, t('about.fiction')),
        h('p', { class: 'small muted' }, t('about.noAds')),
        h('button', {
          type: 'button', class: 'btn btn-ghost', id: 'version-btn',
          onClick: () => {
            versionTaps += 1;
            if (versionTaps >= CONFIG.research.unlockTaps && !store.get().research.unlocked) {
              store.update((x) => { x.research.unlocked = true; }, { silent: true });
              toast(t('settings.researchUnlocked'));
            }
          },
        }, t('about.version', { v: CONFIG.appVersion }))),
    );
  }

  render();
  return { update: render };
}
