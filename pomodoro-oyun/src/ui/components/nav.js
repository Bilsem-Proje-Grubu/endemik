// Alt gezinme (5 sekme). Kontrol modunda oyun sekmeleri gizlenir.
import { h } from '../dom.js';
import { t } from '../../i18n/index.js';
import { navIcon } from '../../assets/art.js';

export const TABS = [
  { id: 'focus', game: false },
  { id: 'world', game: true },
  { id: 'shop', game: true },
  { id: 'stats', game: false },
  { id: 'settings', game: false },
];

/** Gezinme çubuğunu üretir. current: şu anki sekme kimliği. */
export function renderNav(current, control) {
  return h('nav', { class: 'bottom-nav', 'aria-label': t('nav.label') },
    TABS.filter((tab) => !(control && tab.game)).map((tab) => {
      const link = h('a', {
        class: 'nav-item',
        href: `#/${tab.id}`,
        'aria-current': tab.id === current ? 'page' : null,
        html: navIcon(tab.id),
      });
      link.append(h('span', null, t(`nav.${tab.id}`)));
      return link;
    }));
}
