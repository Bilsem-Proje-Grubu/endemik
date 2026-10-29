// Tema seçici: 4 büyük kart + seçilen temanın küçük önizlemesi. Hoş geldin ve ayarlar ekranında ortak.
import { h, fromHTML } from '../dom.js';
import { t } from '../../i18n/index.js';
import { itemArt, themeBadge } from '../../assets/art.js';
import { THEMES } from '../../themes/index.js';
import { THEME_IDS } from '../../config.js';

function sampleItems(theme) {
  const pick = (tier) => theme.items.find((i) => i.tier === tier);
  return ['bronze', 'silver', 'gold', 'legend'].map(pick).filter(Boolean);
}

/** onPick(themeId) seçim değişince çağrılır. Kök eleman ve seçili kimliği döndürür. */
export function themePicker({ selected = null, onPick }) {
  let current = selected;
  const cards = h('div', { class: 'theme-cards', role: 'radiogroup', 'aria-label': t('welcome.themeLabel') });
  const preview = h('div', { class: 'card preview', 'aria-live': 'polite' });
  const root = h('div', { class: 'stack' }, cards, preview);

  function draw() {
    cards.replaceChildren(...THEME_IDS.map((id) => {
      const th = THEMES[id];
      const btn = h('button', {
        type: 'button', role: 'radio', class: `theme-card ${id === current ? 'selected' : ''}`,
        'aria-checked': String(id === current), 'data-theme-id': id,
        onClick: () => { current = id; draw(); onPick(id); },
      }, fromHTML(themeBadge(th, 56)),
      h('strong', null, th.name), h('span', { class: 'small' }, th.tagline),
      h('span', { class: 'swatches', 'aria-hidden': 'true' },
        h('i', { style: { background: th.palette.light.primary } }), h('i', { style: { background: th.palette.light.accent } }), h('i', { style: { background: th.palette.dark.primary } })));
      return btn;
    }));
    if (!current) {
      preview.replaceChildren(h('p', { class: 'muted center' }, t('welcome.pickPrompt')));
      return;
    }
    const th = THEMES[current];
    preview.replaceChildren(
      h('h3', null, th.name),
      h('p', { class: 'small' }, t('welcome.previewCurrency', { name: th.currency.name, icon: th.currency.icon })),
      h('div', { class: 'row-wrap preview-items' }, sampleItems(th).map((i) => fromHTML(itemArt(i, 52)))),
      h('p', { class: 'small muted' }, `${th.weeklyEvent.name} · ${th.levels[0].name} → ${th.levels[th.levels.length - 1].name}`),
      h('p', { class: 'small muted' }, t('welcome.noGender')));
  }

  draw();
  return { el: root, get selected() { return current; } };
}
