// İstatistikler ve rozetler. Grafikler kütüphanesiz, saf SVG ile çizilir. Kıyas sadece kişinin kendisiyle.
import { h, fromHTML, esc } from '../dom.js';
import { t, fmtMinutes } from '../../i18n/index.js';
import { dayKey } from '../../core/dates.js';
import { effectiveStreak, freezeLeft } from '../../core/streak.js';
import * as S from '../../core/stats.js';
import { progressList } from '../../core/achievements.js';

let tab = 'summary';

/** Haftalık çubuk grafik (SVG metni). */
export function barChartSVG(bars) {
  const W = 320;
  const H = 170;
  const padB = 28;
  const padT = 22;
  const max = Math.max(60, ...bars.map((b) => b.minutes));
  const bw = 28;
  const gap = (W - bars.length * bw) / (bars.length + 1);
  const parts = bars.map((b, i) => {
    const x = gap + i * (bw + gap);
    const hgt = Math.round(((H - padB - padT) * b.minutes) / max);
    const y = H - padB - hgt;
    return `<g>
      <rect x="${x}" y="${y}" width="${bw}" height="${Math.max(hgt, b.minutes ? 3 : 0)}" rx="8" fill="${b.isToday ? 'var(--primary)' : 'var(--primary-soft)'}"/>
      ${b.minutes ? `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${b.minutes}</text>` : ''}
      <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--text-2)">${esc(b.label)}</text>
    </g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><line x1="8" x2="${W - 8}" y1="${H - padB}" y2="${H - padB}" stroke="var(--border)" stroke-width="2"/>${parts.join('')}</svg>`;
}

/** Isı haritası (SVG metni): sütunlar hafta, satırlar gün. */
export function heatmapSVG(cols) {
  const cell = 14;
  const gap = 3;
  const W = cols.length * (cell + gap);
  const H = 7 * (cell + gap);
  const rects = [];
  cols.forEach((col, ci) => col.forEach((d, ri) => {
    if (d.future) return;
    rects.push(`<rect x="${ci * (cell + gap)}" y="${ri * (cell + gap)}" width="${cell}" height="${cell}" rx="4" class="heat-${d.level}"><title>${esc(d.day)}: ${d.minutes} dk</title></rect>`);
  }));
  return `<svg viewBox="0 0 ${W} ${H}" class="heatmap" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`;
}

function tile(label, value) {
  return h('div', { class: 'card tile' }, h('p', { class: 'small muted' }, label), h('strong', { class: 'big-number' }, value));
}

function summary(ctx) {
  const s = ctx.state;
  const now = Date.now();
  const today = dayKey(now);
  const sessions = s.sessions;
  const totals = S.totals(sessions, today);
  const bars = S.weekBars(sessions, today);
  const cmp = S.compareYesterday(sessions, today);
  const subjects = S.subjectBreakdown(sessions).slice(0, 6);
  const best = S.bestBucket(sessions);
  const streak = effectiveStreak(s.streak, today);
  const heat = S.heatmap(sessions, today);
  const maxSubject = Math.max(1, ...subjects.map((x) => x.minutes));

  let cmpText = t('stats.cmpNone');
  if (cmp.today > 0 || cmp.yesterday > 0) {
    if (cmp.diff > 0) cmpText = t('stats.cmpMore', { n: fmtMinutes(cmp.diff) });
    else if (cmp.diff < 0) cmpText = t('stats.cmpLess');
    else cmpText = t('stats.cmpSame');
  }

  const table = h('table', { class: 'sr-only' },
    h('caption', null, t('stats.weekChart')),
    h('tbody', null, bars.map((b) => h('tr', null, h('th', null, b.label), h('td', null, fmtMinutes(b.minutes))))));

  return h('div', { class: 'stack' },
    h('div', { class: 'tiles' }, tile(t('stats.today'), fmtMinutes(totals.today)), tile(t('stats.week'), fmtMinutes(totals.week)), tile(t('stats.month'), fmtMinutes(totals.month))),
    h('p', { class: 'card center' }, `👏 ${cmpText}`),
    h('section', { class: 'card stack', 'aria-labelledby': 'wk' },
      h('h2', { id: 'wk' }, t('stats.weekChart')), fromHTML(barChartSVG(bars)), table),
    h('section', { class: 'card stack', 'aria-labelledby': 'sub' },
      h('h2', { id: 'sub' }, t('stats.subjects')),
      subjects.length
        ? h('ul', { class: 'bars' }, subjects.map((x) =>
            h('li', null,
              h('div', { class: 'row spread' }, h('span', null, x.subject || t('stats.noLabel')), h('span', { class: 'small muted' }, fmtMinutes(x.minutes))),
              h('div', { class: 'progress' }, h('span', { style: { width: `${(x.minutes / maxSubject) * 100}%` } })))))
        : h('p', { class: 'muted' }, t('stats.subjectsEmpty'))),
    h('section', { class: 'card stack', 'aria-labelledby': 'bt' },
      h('h2', { id: 'bt' }, t('stats.bestTime')),
      best ? h('p', null, t('stats.bestTimeText', { name: t(`stats.bucket.${best.id}`) })) : h('p', { class: 'muted' }, t('stats.bestTimeEmpty'))),
    h('section', { class: 'card stack', 'aria-labelledby': 'hm' },
      h('h2', { id: 'hm' }, t('stats.heatmap')),
      h('div', { class: 'heat-wrap' }, fromHTML(heatmapSVG(heat))),
      h('div', { class: 'row small muted heat-legend', 'aria-hidden': 'true' }, t('stats.less'), [0, 1, 2, 3, 4].map((l) => h('span', { class: `heat-swatch heat-${l}` })), t('stats.more'))),
    h('section', { class: 'card stack', 'aria-labelledby': 'st' },
      h('h2', { id: 'st' }, t('stats.streak')),
      h('p', null, `🔥 ${t('stats.streakNow', { n: streak })} · ${t('stats.streakBest', { n: s.streak.best })}`),
      h('p', { class: 'small muted' }, `🧊 ${t('stats.freezeLeft', { n: Math.max(0, freezeLeft(s.streak, today)) })}`),
      h('p', { class: 'small muted' }, t('stats.streakNote'))),
    h('a', { class: 'btn btn-outline btn-block', href: '#/research' }, `🔬 ${t('stats.researchLink')}`));
}

function badges(ctx) {
  const list = progressList(ctx.state, ctx.themes);
  const unlocked = list.filter((b) => b.unlockedAt).length;
  return h('div', { class: 'stack' },
    h('p', { class: 'card center' }, t('badges.count', { n: unlocked, total: list.length })),
    h('ul', { class: 'badge-grid' }, list.map((b) => {
      const done = !!b.unlockedAt;
      return h('li', { class: `card badge ${done ? 'got' : 'locked'}`, 'aria-label': `${t(`badges.${b.id}.name`)}: ${done ? t('badges.got') : t('badges.locked')}` },
        h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, done ? b.icon : '🔒'),
        h('strong', null, t(`badges.${b.id}.name`)),
        h('span', { class: 'small muted' }, t(`badges.${b.id}.hint`)),
        !done && b.target > 1
          ? h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': b.target, 'aria-valuenow': b.value }, h('span', { style: { width: `${(b.value / b.target) * 100}%` } }))
          : null,
        !done && b.target > 1 ? h('span', { class: 'small muted' }, `${b.value}/${b.target}`) : null,
        done ? h('span', { class: 'small' }, `✓ ${t('badges.got')}`) : null);
    })));
}

export function mount(root, ctx) {
  const body = h('div');
  function render() {
    body.replaceChildren(tab === 'summary' ? summary(ctx) : badges(ctx));
    for (const b of seg.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  }
  const seg = h('div', { class: 'segmented', role: 'tablist', 'aria-label': t('stats.title') },
    ['summary', 'badges'].map((id) =>
      h('button', { type: 'button', role: 'tab', dataset: { tab: id }, onClick: () => { tab = id; render(); } }, t(`stats.tab.${id}`))));
  root.append(h('div', { class: 'stack' }, h('h1', null, t('stats.title')), seg, body));
  render();
  return { update: render };
}
