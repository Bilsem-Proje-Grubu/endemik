// TÜM görseller buradan gelir: düz renkli, yuvarlak hatlı SVG + emoji. Tek bir stil, dört tema.
// Başka çizimlerle değiştirmek için sadece bu dosyadaki fonksiyonları değiştirmen yeterli.
import { esc } from '../ui/dom.js';

export const TIER_COLORS = {
  bronze: { from: '#F3D6B8', to: '#D9A06B', ring: '#A9602F' },
  silver: { from: '#EEF1F5', to: '#C4CBD6', ring: '#7B8696' },
  gold: { from: '#FFF1B8', to: '#F2C230', ring: '#B58500' },
  legend: { from: '#E4D7FF', to: '#9D7BF0', ring: '#5B34C7' },
};

const SKINS = ['#F6D2B4', '#E8B48B', '#C68B5E', '#8D5A3B', '#F1C7A0', '#A66E4B'];
const HAIRS = ['#2B1B12', '#5A3825', '#8A5A2B', '#1C1C1C', '#B5651D', '#3B2A5A'];

// Kıyafet renkleri (stil -> renk dizisi)
const OUTFITS = {
  gk: ['#F2994A', '#9B51E0', '#EB5757'],
  def: ['#2F80ED', '#1B5FC4', '#2D9CDB'],
  mid: ['#27AE60', '#1E8E4E', '#6FCF97'],
  fwd: ['#EB5757', '#D6336C', '#F2994A'],
  staff: ['#4F5D75', '#2D3142', '#6C757D'],
  cafe: ['#8D5A3B', '#C68B5E', '#5C3D2E'],
  model: ['#D6336C', '#9B51E0', '#F06595'],
};

// Rol -> küçük rozet emojisi
const ROLE_EMOJI = {
  Kaleci: '🧤', Defans: '🛡️', 'Orta saha': '🎽', Forvet: '🎯',
  Fizyoterapist: '🩹', Kondisyoner: '💪', 'Veri analisti': '📊', 'Kaleci antrenörü': '🧤',
  'Yardımcı antrenör': '📋', 'Teknik direktör': '🎓',
  Barista: '☕', Garson: '🍽️', Kasiyer: '🧾', Pastacı: '🧁', Müzisyen: '🎵', 'Şef barista': '👨‍🍳',
  Fotoğrafçı: '📷', 'Kafe müdürü': '⭐',
  'Podyum modeli': '👠', 'Katalog modeli': '📸', 'Kapak modeli': '✨', Starlet: '🌟',
};

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function hairPath(kind, color) {
  if (kind === 0) return `<path d="M33 36 Q33 18 50 18 Q67 18 67 36 Q58 28 50 28 Q42 28 33 36Z" fill="${color}"/>`;
  if (kind === 1) return `<path d="M32 40 Q30 16 50 16 Q70 16 68 40 Q66 26 50 26 Q34 26 32 40Z" fill="${color}"/><rect x="30" y="34" width="6" height="22" rx="3" fill="${color}"/><rect x="64" y="34" width="6" height="22" rx="3" fill="${color}"/>`;
  return `<circle cx="50" cy="16" r="8" fill="${color}"/><path d="M34 36 Q34 20 50 20 Q66 20 66 36 Q58 27 50 27 Q42 27 34 36Z" fill="${color}"/>`;
}

/** Karakter görseli (stil: gk/def/mid/fwd/staff/cafe/model, n: çeşit). */
function avatar(style, n, role, id) {
  const h = hash(id);
  const skin = SKINS[(h + n) % SKINS.length];
  const hair = HAIRS[(h >> 3) % HAIRS.length];
  const outfits = OUTFITS[style] || OUTFITS.staff;
  const cloth = outfits[(h >> 5) % outfits.length];
  const num = (h % 98) + 1;
  const isPlayer = ['gk', 'def', 'mid', 'fwd'].includes(style);
  const badge = ROLE_EMOJI[role] || '';
  return `
    <path d="M24 96 Q24 64 50 64 Q76 64 76 96Z" fill="${cloth}"/>
    ${isPlayer ? `<text x="50" y="86" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${num}</text>` : `<path d="M44 64 L50 74 L56 64Z" fill="#fff" opacity=".9"/>`}
    <circle cx="50" cy="40" r="16" fill="${skin}"/>
    ${hairPath(h % 3, hair)}
    <circle cx="44" cy="42" r="1.8" fill="#2B2B2B"/><circle cx="56" cy="42" r="1.8" fill="#2B2B2B"/>
    <path d="M45 48 Q50 52 55 48" stroke="#8A3B2A" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${badge ? `<text x="78" y="92" font-size="20" text-anchor="middle">${badge}</text>` : ''}`;
}

/**
 * Ürün görseli (SVG metni). size: piksel.
 * art alanı "emoji" ise item.emoji kullanılır; "person-<stil>-<n>" ise karakter çizilir.
 */
export function itemArt(item, size = 72) {
  const tier = TIER_COLORS[item.tier] || TIER_COLORS.bronze;
  const gid = `g${hash(item.id)}`;
  let inner;
  if (item.art === 'emoji' || !item.art.startsWith('person-')) {
    inner = `<text x="50" y="66" text-anchor="middle" font-size="52" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${esc(item.emoji || '⭐')}</text>`;
  } else {
    const [, style, n] = item.art.split('-');
    inner = avatar(style, Number(n) || 0, item.role, item.id);
  }
  const sparkle = item.tier === 'legend' ? `<text x="84" y="22" font-size="16" text-anchor="middle">✨</text>` : '';
  return `<svg class="item-art" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(item.name)}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tier.from}"/><stop offset="1" stop-color="${tier.to}"/></linearGradient></defs>
    <rect x="2" y="2" width="96" height="96" rx="24" fill="url(#${gid})" stroke="${tier.ring}" stroke-width="3"/>
    ${inner}${sparkle}
  </svg>`;
}

/** Boş slot görseli (+ işareti). */
export function emptySlotArt(size = 72) {
  return `<svg class="item-art" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="92" height="92" rx="24" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="8 7" opacity=".55"/>
    <path d="M50 32 V68 M32 50 H68" stroke="currentColor" stroke-width="6" stroke-linecap="round" opacity=".7"/>
  </svg>`;
}

/** Tema önizleme rozeti (büyük emoji + palet rengi). */
export function themeBadge(theme, size = 56) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="96" height="96" rx="26" fill="${theme.palette.preview}"/>
    <text x="50" y="68" text-anchor="middle" font-size="54" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${esc(theme.icon)}</text>
  </svg>`;
}

// Alt gezinme simgeleri (çizgi stili, currentColor)
const NAV_PATHS = {
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  world: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  shop: '<path d="M4 7h16l-1.4 12a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z"/><path d="M8.5 7V6a3.5 3.5 0 0 1 7 0v1"/>',
  stats: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
};

/** Gezinme simgesi (SVG metni). */
export function navIcon(name) {
  return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${NAV_PATHS[name] || ''}</svg>`;
}

/** Uygulama simgesi (manifest ve favicon için tek kaynak). */
export function appIconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#17692F"/><circle cx="256" cy="282" r="150" fill="#fff"/><circle cx="256" cy="282" r="118" fill="#17692F"/><path d="M256 190v96l56 34" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="226" y="86" width="60" height="26" rx="13" fill="#F5B700"/></svg>`;
}
