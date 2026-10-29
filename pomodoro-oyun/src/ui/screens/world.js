// Dünyam: temanın ana sahnesi. Sahip olunan ürünler sahnede görünür, boş slotlar "+" ile gösterilir.
import { h, fromHTML } from '../dom.js';
import { t, fmtNumber } from '../../i18n/index.js';
import { itemArt, emptySlotArt } from '../../assets/art.js';
import { equippedIds, levelInfo, themeState, totalPower } from '../../core/economy.js';
import { openModal } from '../components/modal.js';

// Son satın alınan ürün (sahneye animasyonla gelsin diye)
let justBought = null;
export const markJustBought = (id) => { justBought = id; };

function slotTile(item, theme, extra = {}) {
  const btn = h('button', {
    type: 'button',
    class: `slot ${item.id === justBought ? 'just-bought' : ''}`,
    'aria-label': t('world.itemAria', { name: item.name, power: item.power }),
    onClick: () => itemDetails(item, theme),
    style: extra.style,
  });
  btn.append(fromHTML(itemArt(item, 64)));
  btn.append(h('span', { class: 'slot-name' }, item.name));
  return btn;
}

function emptyTile(cat, extra = {}) {
  const a = h('a', { class: 'slot empty', href: `#/shop?cat=${cat.id}`, 'aria-label': t('world.emptyAria', { cat: cat.singular }), style: extra.style });
  a.append(fromHTML(emptySlotArt(64)));
  a.append(h('span', { class: 'slot-name' }, '+'));
  return a;
}

function itemDetails(item, theme) {
  openModal({
    title: item.name,
    body: [
      h('div', { class: 'row' }, fromHTML(itemArt(item, 96)),
        h('div', { class: 'stack', style: { gap: '0.25rem' } },
          item.role ? h('p', null, item.role) : null,
          h('p', null, h('span', { class: 'tier' }, `${t(`tier.${item.tier}.icon`)} ${t(`tier.${item.tier}.name`)}`)),
          h('p', { class: 'small muted' }, `${theme.texts.powerLabel}: +${item.power}`))),
    ],
    actions: [{ label: t('common.close'), kind: 'primary' }],
  });
}

/** Futbol sahası gibi konumlu sahneler. */
function pitchScene(cat, ids, theme) {
  const items = ids.map((id) => theme.items.find((i) => i.id === id));
  const used = new Set();
  const placed = cat.positions.map((pos) => {
    const found = items.find((i) => !used.has(i.id) && i.role === pos.role);
    if (found) used.add(found.id);
    return { pos, item: found || null };
  });
  const scene = h('div', { class: 'scene scene-pitch', role: 'group', 'aria-label': cat.name });
  scene.append(h('div', { class: 'pitch-lines', 'aria-hidden': 'true' }));
  for (const { pos, item } of placed) {
    const style = { left: `${pos.x}%`, top: `${pos.y}%` };
    const tile = item ? slotTile(item, theme, { style }) : emptyTile(cat, { style });
    tile.classList.add('pos');
    scene.append(tile);
  }
  return scene;
}

export function mount(root, ctx) {
  const state = ctx.state;
  const theme = ctx.theme;
  const ts = themeState(state, theme.id);
  const power = totalPower(theme, ts.owned);
  const lvl = levelInfo(theme, power);
  const eq = equippedIds(theme, ts.owned);

  const header = h('div', { class: 'card world-head' },
    h('div', { class: 'row spread' },
      h('div', null, h('p', { class: 'small muted' }, t('world.level', { n: lvl.level })), h('h1', null, lvl.current.name)),
      h('div', { class: 'center' }, h('p', { class: 'small muted' }, theme.texts.powerLabel), h('strong', { class: 'big-number' }, fmtNumber(power)))),
    h('div', { class: 'progress', role: 'progressbar', 'aria-label': t('world.progressAria'), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(lvl.progress * 100) },
      h('span', { style: { width: `${lvl.progress * 100}%` } })),
    h('p', { class: 'small muted' }, lvl.next ? t('world.toNext', { n: lvl.toNext, name: lvl.next.name }) : t('world.maxLevel')));

  const sections = theme.categories.map((cat) => {
    const ids = eq[cat.id];
    const ownedInCat = ts.owned.filter((id) => theme.items.find((i) => i.id === id && i.category === cat.id));
    const bench = ownedInCat.filter((id) => !ids.includes(id));
    let scene;
    if (cat.layout === 'pitch') {
      scene = pitchScene(cat, ids, theme);
    } else {
      scene = h('div', { class: `scene scene-${cat.layout}`, role: 'group', 'aria-label': cat.name });
      for (const id of ids) scene.append(slotTile(theme.items.find((i) => i.id === id), theme));
      for (let i = ids.length; i < cat.slotLimit; i++) scene.append(emptyTile(cat));
    }
    return h('section', { class: 'stack world-section', 'aria-labelledby': `cat-${cat.id}` },
      h('div', { class: 'row spread' }, h('h2', { id: `cat-${cat.id}` }, `${cat.icon} ${cat.name}`), h('span', { class: 'pill' }, `${ids.length}/${cat.slotLimit}`)),
      scene,
      bench.length
        ? h('details', { class: 'bench' },
            h('summary', null, t('world.bench', { n: bench.length })),
            h('div', { class: 'row-wrap' }, bench.map((id) => slotTile(theme.items.find((i) => i.id === id), theme))))
        : null);
  });

  root.append(h('div', { class: 'stack' },
    header,
    ts.owned.length === 0
      ? h('div', { class: 'card empty-state' },
          h('p', { class: 'emoji-big', 'aria-hidden': 'true' }, theme.icon),
          h('p', null, theme.texts.emptyWorld),
          h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap' } },
            h('a', { class: 'btn btn-primary', href: '#/focus' }, t('world.startPomodoro')),
            h('a', { class: 'btn btn-outline', href: '#/shop' }, t('world.goShop'))))
      : null,
    sections,
    h('p', { class: 'small muted center' }, theme.texts.sceneNote)));
  justBought = null;
  return {};
}
