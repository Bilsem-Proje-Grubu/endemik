// Tema: hazır temalar + kullanıcının kendi renkleriyle oluşturduğu "özel" tema.
// Seçim bu cihazda saklanır. Renkler CSS değişkenleri olarak uygulanır.
const KEY = 'endemik.theme';          // 'auto' | hazır tema adı | 'custom'
const KEY_CUSTOM = 'endemik.theme.custom'; // { bg, bg2, accent, text }
const KEY_VARS = 'endemik.theme.vars';     // sayfa çizilmeden önce uygulanan son renkler (index.html)

const BASE = { warn: '#e8b84a', danger: '#e5604f' };
const mk = (v, swatch) => ({ vars: { ...BASE, ...v }, swatch });

// Marka adları yalnızca renk paletlerinden ilham alındığını belirtmek içindir; markalarla bağlantı yoktur.
export const PRESETS = {
  dark: { label: '🌙 Koyu', ...mk({ bg: '#1b1f1a', bg2: '#252a23', card: '#2c322a', line: '#3a4137', text: '#e8ece4', muted: '#9aa595', accent: '#6fcf4f', 'on-accent': '#10200a', thumb: 'linear-gradient(135deg, #3b4a35, #232a21)' }, ['#1b1f1a', '#6fcf4f', '#e8ece4']) },
  light: { label: '☀️ Açık', ...mk({ bg: '#f3f5ef', bg2: '#ffffff', card: '#ffffff', line: '#d3dacb', text: '#1c2a19', muted: '#5a6856', accent: '#2e7d1b', warn: '#b7791f', danger: '#c0392b', 'on-accent': '#ffffff', thumb: 'linear-gradient(135deg, #dfe8d6, #c9d6bd)' }, ['#f3f5ef', '#2e7d1b', '#1c2a19']) },
  gece: { label: '🌌 Gece mavisi', ...mk({ bg: '#050912', bg2: '#0d1a33', card: '#0d1a33', line: '#1e3359', text: '#e6ecf7', muted: '#8ea2c4', accent: '#4da3ff', 'on-accent': '#04101f', thumb: 'linear-gradient(135deg, #16294d, #050912)' }, ['#050912', '#0d1a33', '#4da3ff']) },
  whatsapp: { label: 'WhatsApp koyu', ...mk({ bg: '#0b141a', bg2: '#202c33', card: '#202c33', line: '#2a3942', text: '#e9edef', muted: '#8696a0', accent: '#00a884', 'on-accent': '#0b141a', thumb: 'linear-gradient(135deg, #2a3942, #111b21)' }, ['#0b141a', '#00a884', '#e9edef']) },
  valorant: { label: 'Valorant', ...mk({ bg: '#0f1923', bg2: '#1f2a33', card: '#1f2a33', line: '#36424d', text: '#ece8e1', muted: '#8b978f', accent: '#ff4655', danger: '#ff7a85', 'on-accent': '#0f1923', thumb: 'linear-gradient(135deg, #2b3844, #0f1923)' }, ['#0f1923', '#ff4655', '#ece8e1']) },
  'duolingo-dark': { label: 'Duolingo koyu', ...mk({ bg: '#131f24', bg2: '#1f2c33', card: '#1f2c33', line: '#37464f', text: '#f1f7fb', muted: '#9fb0b9', accent: '#58cc02', danger: '#ff6b6b', 'on-accent': '#131f24', thumb: 'linear-gradient(135deg, #2b3d46, #131f24)' }, ['#131f24', '#58cc02', '#f1f7fb']) },
  duolingo: { label: 'Duolingo açık', ...mk({ bg: '#ffffff', bg2: '#f4f4f4', card: '#f4f4f4', line: '#e0e0e0', text: '#3c3c3c', muted: '#6b6b6b', accent: '#388200', warn: '#b7791f', danger: '#c0392b', 'on-accent': '#ffffff', thumb: 'linear-gradient(135deg, #e6f7d3, #c9ecab)' }, ['#ffffff', '#58cc02', '#3c3c3c']) },
};

const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

// ---- renk yardımcıları ----
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }; // t: b'ye yaklaşma oranı
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* yoksay */ } };

export function getTheme() {
  const t = read(KEY);
  return t === 'auto' || t === 'custom' || PRESETS[t] ? t : 'auto';
}

export function getCustom() {
  try { const c = JSON.parse(read(KEY_CUSTOM)); if (c && c.bg && c.bg2 && c.accent && c.text) return c; } catch { /* varsayılan */ }
  const v = effectiveVars();
  return { bg: v.bg, bg2: v.bg2, accent: v.accent, text: v.text };
}

// Kullanıcının seçtiği 4 renkten bütün değişkenleri türetir.
function customVars(c) {
  return {
    ...BASE, bg: c.bg, bg2: c.bg2, card: c.bg2, text: c.text, accent: c.accent,
    line: mix(c.bg2, c.text, 0.22), muted: mix(c.text, c.bg, 0.4),
    'on-accent': contrast('#ffffff', c.accent) >= contrast('#10200a', c.accent) ? '#ffffff' : '#10200a',
    thumb: `linear-gradient(135deg, ${mix(c.bg2, c.text, 0.1)}, ${c.bg})`,
  };
}

function effectiveVars() {
  const t = getTheme();
  if (t === 'custom') { try { const c = JSON.parse(read(KEY_CUSTOM)); if (c) return customVars(c); } catch { /* aşağı */ } }
  const id = t === 'auto' || t === 'custom' ? (mq && mq.matches ? 'light' : 'dark') : t;
  return PRESETS[id].vars;
}

function apply() {
  const vars = effectiveVars();
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty('--' + k, v);
  const scheme = lum(vars.bg) > 0.4 ? 'light' : 'dark';
  root.dataset.theme = scheme;
  root.style.colorScheme = scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars.bg);
  write(KEY_VARS, JSON.stringify({ vars, scheme }));
}

export function setTheme(t) { write(KEY, t === 'auto' ? null : t); apply(); }

// Özel temada tek bir rengi değiştirir ve hemen uygular.
export function setCustomColor(part, value) {
  write(KEY_CUSTOM, JSON.stringify({ ...getCustom(), [part]: value }));
  write(KEY, 'custom');
  apply();
}

export function resetTheme() { write(KEY, null); write(KEY_CUSTOM, null); apply(); }

export function customWarnings(c) {
  const w = [];
  if (contrast(c.text, c.bg) < 4.5) w.push('Yazı rengi arka plana çok yakın, okunması zor olabilir.');
  if (contrast(c.text, c.bg2) < 4.5) w.push('Yazı rengi kart rengine çok yakın, okunması zor olabilir.');
  if (contrast(c.accent, c.bg) < 3) w.push('Düğme/vurgu rengi arka plana çok yakın, seçilmesi zor olabilir.');
  return w;
}

export function initTheme() {
  apply();
  mq?.addEventListener?.('change', apply);
}
