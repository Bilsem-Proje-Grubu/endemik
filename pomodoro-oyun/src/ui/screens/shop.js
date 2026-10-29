// Mağaza: kategori sekmeleri, kademe filtresi, "kaç Pomodoro kaldı", hedef belirleme, satın alma onayı.
import { h, fromHTML, clear } from '../dom.js';
import { t, fmtNumber } from '../../i18n/index.js';
import { itemArt } from '../../assets/art.js';
import { buyItem, equippedIds, slotCapacity, slotGroup, levelInfo, pomodorosNeeded, themeState, totalPower } from '../../core/economy.js';
import { evaluate } from '../../core/achievements.js';
import { confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { showLevelUp } from '../components/celebration.js';
import { confetti } from '../components/effects.js';
import { play } from '../sound.js';
import { markJustBought } from './world.js';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'legend'];
let shopCat = null;
let shopTier = 'all';

export function mount(root, ctx) {
  const { store } = ctx;
  const theme = ctx.theme;
  if (ctx.query.cat) shopCat = ctx.query.cat;
  if (!theme.categories.some((c) => c.id === shopCat)) shopCat = theme.categories[0].id;

  const view = h('div', { class: 'stack' });
  root.append(view);

  async function buy(item) {
    const s = store.get();
    const ok = await confirmDialog({
      title: t('shop.confirmTitle', { name: item.name }),
      text: t('shop.confirmText', { price: fmtNumber(item.price), icon: theme.currency.icon, left: fmtNumber(s.wallet.coins - item.price) }),
      yes: theme.texts.buyVerb,
      no: t('common.cancel'),
    });
    if (!ok) return;
    const res = store.update((st) => {
      const r = buyItem(st, theme, item.id, Date.now());
      const badges = r.ok ? evaluate(st, ctx.themes, Date.now()) : [];
      return { ...r, badges };
    });
    if (!res.ok) {
      toast(t(`shop.fail.${res.reason}`));
      return;
    }
    play('buy');
    markJustBought(item.id);
    toast(t('shop.bought', { name: item.name }));
    for (const b of res.badges) toast(`${ctx.badgeIcon(b)} ${t('shop.newBadge', { name: t(`badges.${b}.name`) })}`, 4500);
    if (res.leveledUp) showLevelUp(ctx, res.level);
    else confetti(14);
  }

  function setGoal(item) {
    store.update((st) => {
      const ts = themeState(st, theme.id);
      ts.goalItem = ts.goalItem === item.id ? null : item.id;
    });
  }

  function card(item, ctxInfo) {
    const { coins, lvl, owned, goal, eq } = ctxInfo;
    const isOwned = owned.includes(item.id);
    const locked = item.minLevel > lvl.level;
    const need = pomodorosNeeded(item.price, coins);
    const cat = theme.categories.find((c) => c.id === item.category);
    const group = slotGroup(cat, item);
    const inGroup = eq[item.category].map((id) => theme.items.find((i) => i.id === id)).filter((i) => slotGroup(cat, i) === group);
    const full = inGroup.length >= slotCapacity(cat, group);
    const benchOnly = !isOwned && full && item.power <= Math.min(...inGroup.map((i) => i.power));
    let action;
    if (isOwned) {
      action = h('p', { class: 'status owned' }, `✓ ${theme.texts.ownedLabel}`);
    } else if (locked) {
      action = h('p', { class: 'status locked' }, `🔒 ${t('shop.unlockAt', { n: item.minLevel, name: theme.levels[item.minLevel - 1].name })}`);
    } else if (need > 0) {
      action = h('div', { class: 'stack', style: { gap: '0.5rem' } },
        h('button', { type: 'button', class: 'btn btn-small btn-block', disabled: true, 'aria-disabled': 'true' }, t('shop.needMore', { n: need })),
        h('button', { type: 'button', class: 'btn btn-small btn-ghost btn-block', 'aria-pressed': String(goal === item.id), onClick: () => setGoal(item) },
          goal === item.id ? `🎯 ${t('shop.goalOn')}` : `🎯 ${t('shop.goalSet')}`));
    } else {
      action = h('button', { type: 'button', class: 'btn btn-primary btn-small btn-block', onClick: () => buy(item) }, theme.texts.buyVerb);
    }
    return h('article', { class: `card item-card tier-${item.tier} ${isOwned ? 'is-owned' : ''}`, 'aria-label': item.name },
      h('div', { class: 'row' }, fromHTML(itemArt(item, 64)),
        h('div', { class: 'stack', style: { gap: '0.125rem', minWidth: 0 } },
          h('h3', null, item.name),
          item.role ? h('p', { class: 'small muted' }, item.role) : null,
          h('p', null, h('span', { class: 'tier' }, `${t(`tier.${item.tier}.icon`)} ${t(`tier.${item.tier}.name`)}`)))),
      h('div', { class: 'row spread item-meta' },
        h('span', { class: 'small' }, `⚡ +${item.power}`),
        h('strong', null, `${theme.currency.icon} ${fmtNumber(item.price)}`)),
      benchOnly ? h('p', { class: 'small muted' }, t('shop.benchHint')) : null,
      action);
  }

  function render() {
    const s = store.get();
    const ts = themeState(s, theme.id);
    const power = totalPower(theme, ts.owned);
    const lvl = levelInfo(theme, power);
    const eq = equippedIds(theme, ts.owned);
    const info = { coins: s.wallet.coins, lvl, owned: ts.owned, goal: ts.goalItem, eq };
    const items = theme.items
      .filter((i) => i.category === shopCat && (shopTier === 'all' || i.tier === shopTier))
      .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.power - b.power);

    clear(view);
    view.append(
      h('div', { class: 'row spread' }, h('h1', null, t('shop.title')),
        h('span', { class: 'pill pill-coin' }, theme.currency.icon, ` ${fmtNumber(s.wallet.coins)}`)),
      h('p', { class: 'small muted' }, t('shop.levelNote', { n: lvl.level, name: lvl.current.name })),
      h('div', { class: 'chips', role: 'tablist', 'aria-label': t('shop.categories') },
        theme.categories.map((c) =>
          h('button', {
            type: 'button', role: 'tab', class: 'chip', 'aria-selected': String(c.id === shopCat),
            onClick: () => { shopCat = c.id; render(); },
          }, `${c.icon} ${c.name}`))),
      h('div', { class: 'chips', role: 'group', 'aria-label': t('shop.tiers') },
        ['all', ...TIER_ORDER].map((tier) =>
          h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(shopTier === tier),
            onClick: () => { shopTier = tier; render(); },
          }, tier === 'all' ? t('shop.allTiers') : `${t(`tier.${tier}.icon`)} ${t(`tier.${tier}.name`)}`))),
      items.length
        ? h('div', { class: 'grid' }, items.map((i) => card(i, info)))
        : h('p', { class: 'card muted center' }, t('shop.noItems')));
  }

  render();
  return { update: render };
}
