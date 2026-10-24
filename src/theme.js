// Tema: 'auto' (cihaz ayarı), 'dark' (koyu), 'light' (açık). Seçim bu cihazda saklanır.
const KEY = 'endemik.theme';
const COLORS = { dark: '#1b1f1a', light: '#f3f5ef' };
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

export function getTheme() {
  try { const t = localStorage.getItem(KEY); return t === 'dark' || t === 'light' ? t : 'auto'; } catch { return 'auto'; }
}

function apply() {
  const t = getTheme();
  const eff = t === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = eff;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[eff]);
}

export function setTheme(t) {
  try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* yoksay */ }
  apply();
}

export function initTheme() {
  apply();
  mq?.addEventListener?.('change', apply);
}
