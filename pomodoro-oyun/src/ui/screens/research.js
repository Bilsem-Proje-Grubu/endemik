// Araştırma raporu: jüriye gösterilecek özet, anket öncesi/sonrası, CSV dışa aktarma, kontrol modu (gizli bölüm).
import { h, fromHTML } from '../dom.js';
import { t, fmtMinutes } from '../../i18n/index.js';
import { buildReport, buildCSV, controlActive, setControlMode, submitSurvey, surveyDue } from '../../core/research.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { surveyForm } from '../components/survey.js';
import { toast } from '../components/toast.js';
import { barChartSVG } from './stats.js';
import { dayKey } from '../../core/dates.js';

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Anket penceresi (başlangıç ya da 2. hafta). */
export function openSurvey(ctx, phase) {
  const m = openModal({
    title: t('survey.title'),
    body: surveyForm({
      phase,
      onSubmit: (answers) => {
        ctx.store.update((s) => { submitSurvey(s, phase, answers, Date.now()); });
        m.close();
        toast(t('survey.thanks'));
      },
      onSkip: () => {
        ctx.store.update((s) => { s.research.surveySnoozedDay = dayKey(Date.now()); }, { silent: true });
        m.close();
      },
    }),
  });
}

export function mount(root, ctx) {
  const { store } = ctx;
  const body = h('div', { class: 'stack' });
  root.append(body);

  function surveyCompare(rep) {
    const { baseline, followup, diffs } = rep.survey;
    if (!baseline) return h('p', { class: 'muted' }, t('research.noSurvey'));
    return h('div', { class: 'stack' },
      [1, 2, 3].map((n, i) => h('div', { class: 'stack', style: { gap: '0.25rem' } },
        h('strong', { class: 'small' }, t(`survey.q${n}`)),
        h('div', { class: 'row small' }, h('span', { style: { width: '4.5rem' } }, t('research.before')),
          h('div', { class: 'progress', style: { flex: 1 } }, h('span', { style: { width: `${(baseline.answers[i] / 5) * 100}%` } })), h('span', null, String(baseline.answers[i]))),
        followup
          ? h('div', { class: 'row small' }, h('span', { style: { width: '4.5rem' } }, t('research.after')),
              h('div', { class: 'progress', style: { flex: 1 } }, h('span', { style: { width: `${(followup.answers[i] / 5) * 100}%` } })), h('span', null, `${followup.answers[i]} (${diffs[i] > 0 ? '+' : ''}${diffs[i]})`))
          : null)),
      followup ? null : h('p', { class: 'small muted' }, t('research.followupWait')));
  }

  function render() {
    const s = store.get();
    const rep = buildReport(s, Date.now());
    const due = surveyDue(s, Date.now());
    const control = controlActive(s, Date.now());
    const pct = (x) => (x === null ? '—' : `%${Math.round(x * 100)}`);
    const bars = rep.weeks.map((w) => ({ label: w.week.slice(5).replace('-', '/'), minutes: w.minutes, isToday: false }));
    bars[bars.length - 1].isToday = true;

    body.replaceChildren(
      h('div', { class: 'row spread' }, h('h1', null, t('research.title')), h('a', { class: 'btn btn-ghost', href: '#/stats' }, t('common.back'))),
      h('p', { class: 'muted' }, t('research.intro')),
      h('div', { class: 'tiles' },
        h('div', { class: 'card tile' }, h('p', { class: 'small muted' }, t('research.avgDaily')), h('strong', { class: 'big-number' }, fmtMinutes(rep.avgDailyMinutes))),
        h('div', { class: 'card tile' }, h('p', { class: 'small muted' }, t('research.completion')), h('strong', { class: 'big-number' }, pct(rep.completionRate))),
        h('div', { class: 'card tile' }, h('p', { class: 'small muted' }, t('research.weekChange')),
          h('strong', { class: 'big-number' }, rep.weekChangePct === null ? '—' : `${rep.weekChangePct > 0 ? '+' : ''}${rep.weekChangePct}%`))),
      h('section', { class: 'card stack', 'aria-labelledby': 'rw' }, h('h2', { id: 'rw' }, t('research.weeks')), fromHTML(barChartSVG(bars)),
        h('p', { class: 'small muted' }, t('research.counts', { done: rep.completedSessions, partial: rep.interruptedSessions, days: rep.activeDays }))),
      h('section', { class: 'card stack', 'aria-labelledby': 'rs' }, h('h2', { id: 'rs' }, t('research.survey')), surveyCompare(rep),
        due ? h('button', { type: 'button', class: 'btn btn-primary', onClick: () => { openSurvey(ctx, due); } }, t(due === 'baseline' ? 'research.takeBaseline' : 'research.takeFollowup')) : null),
      rep.control || rep.game
        ? h('section', { class: 'card stack', 'aria-labelledby': 'rc' }, h('h2', { id: 'rc' }, t('research.modes')),
            h('p', null, t('research.modeControl', { v: rep.control ? fmtMinutes(rep.control.avgDaily) : '—' })),
            h('p', null, t('research.modeGame', { v: rep.game ? fmtMinutes(rep.game.avgDaily) : '—' })),
            h('p', { class: 'small muted' }, t('research.modesNote')))
        : null,
      h('section', { class: 'card stack', 'aria-labelledby': 'rx' }, h('h2', { id: 'rx' }, t('research.export')),
        h('p', { class: 'small muted' }, t('research.exportDesc')),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: () => download(`pomodoro-arastirma-${new Date().toISOString().slice(0, 10)}.csv`, buildCSV(store.get())) }, `⬇ ${t('research.exportBtn')}`)),
      s.research.unlocked
        ? h('section', { class: 'card stack', 'aria-labelledby': 'rk' }, h('h2', { id: 'rk' }, t('research.control')),
            h('p', { class: 'small muted' }, t('research.controlDesc')),
            h('p', null, control ? t('research.controlOn') : t('research.controlOff')),
            h('button', {
              type: 'button', class: control ? 'btn btn-outline' : 'btn btn-primary',
              onClick: async () => {
                if (control) {
                  store.update((x) => setControlMode(x, false, Date.now()));
                  ctx.applyTheme();
                  return;
                }
                const ok = await confirmDialog({ title: t('research.controlConfirmTitle'), text: t('research.controlConfirmText'), yes: t('research.controlStart'), no: t('common.cancel') });
                if (ok) {
                  store.update((x) => setControlMode(x, true, Date.now()));
                  ctx.applyTheme();
                  ctx.go('focus');
                }
              },
            }, control ? t('research.controlStop') : t('research.controlStart')))
        : null,
    );
  }

  render();
  return { update: render };
}
