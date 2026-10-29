// Uygulama başlangıcı: durum, denetleyici, yönlendirme, tema uygulama, olay kancaları.
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/styles/theme-football.css';
import './ui/styles/theme-cafe.css';
import './ui/styles/theme-fashion.css';
import './ui/styles/theme-shelter.css';

import { CONFIG } from './config.js';
import { h, clear } from './ui/dom.js';
import { t } from './i18n/index.js';
import { THEMES } from './themes/index.js';
import { createBackend, createStorage } from './core/storage.js';
import { createStore } from './core/store.js';
import { createLock } from './core/antiCheat.js';
import { dayKey } from './core/dates.js';
import { createController, realClock } from './core/controller.js';
import { controlActive, surveyDue } from './core/research.js';
import { resolvePending } from './core/weekly.js';
import { BADGES } from './core/achievements.js';
import { setSoundEnabled } from './ui/sound.js';
import { show as showNotification } from './ui/notify.js';
import { renderTopbar } from './ui/components/topbar.js';
import { renderNav } from './ui/components/nav.js';
import { toast } from './ui/components/toast.js';
import { showCompletion, showInterrupted } from './ui/components/celebration.js';
import { showWeekly } from './ui/screens/weekly.js';
import { openSurvey } from './ui/screens/research.js';

import * as focusScreen from './ui/screens/focus.js';
import * as worldScreen from './ui/screens/world.js';
import * as shopScreen from './ui/screens/shop.js';
import * as statsScreen from './ui/screens/stats.js';
import * as settingsScreen from './ui/screens/settings.js';
import * as researchScreen from './ui/screens/research.js';
import * as welcomeScreen from './ui/screens/welcome.js';

const SCREENS = { focus: focusScreen, world: worldScreen, shop: shopScreen, stats: statsScreen, settings: settingsScreen, research: researchScreen, welcome: welcomeScreen };
const GAME_ONLY = new Set(['world', 'shop']);
const TAB_OF = { research: 'stats' };

// ---------------- Durum ----------------
const backend = createBackend();
const storage = createStorage(backend);
const store = createStore(storage);

let tabId = Math.random().toString(36).slice(2, 10);
try {
  tabId = sessionStorage.getItem('pomodoroOyun.tab') || tabId;
  sessionStorage.setItem('pomodoroOyun.tab', tabId);
} catch {
  /* sessionStorage yoksa rastgele kimlik yeterli */
}
const lock = createLock(backend, tabId);

const dom = {
  app: document.getElementById('app'),
  topbar: h('header', { class: 'topbar' }),
  main: h('main', { id: 'main', tabindex: '-1' }),
  nav: h('div'),
};
dom.app.append(dom.topbar, dom.main, dom.nav);

let route = { name: 'focus', query: {} };
let screen = null;
let screenName = null;

/** Ekranlara verilen ortak bağlam. */
const ctx = {
  store,
  themes: THEMES,
  get state() { return store.get(); },
  get theme() { return ctx.isControl() ? null : THEMES[store.get().profile.theme] || null; },
  get query() { return route.query; },
  isControl: () => controlActive(store.get(), Date.now()),
  badgeIcon: (id) => (BADGES[id] ? BADGES[id].icon : '⭐'),
  go: (name) => { location.hash = `#/${name}`; },
  applySettings,
  applyTheme,
  previewTheme: (id) => paintPalette(THEMES[id] || null),
};

// ---------------- Denetleyici ----------------
const ctrl = createController({
  store,
  lock,
  clock: realClock,
  getThemes: () => THEMES,
  hooks: {
    onComplete(outcome) {
      if (document.hidden) {
        showNotification(t('notify.doneTitle'), t('notify.doneBody'), 'pomodoro-done');
      }
      showCompletion(ctx, outcome);
      checkWeekly();
    },
    onInterrupt(info) {
      showInterrupted(ctx, info);
    },
    onBreakEnd() {
      toast(t('notify.breakEndBody'));
      if (document.hidden) showNotification(t('notify.breakEndTitle'), t('notify.breakEndBody'), 'pomodoro-break');
    },
    onWarn() {
      toast(t('focus.comeBack'), 4000);
    },
    onHidden() {
      if (store.get().settings.notifications) showNotification(t('notify.hiddenTitle'), t('notify.hiddenBody'), 'pomodoro-hidden');
    },
  },
});
ctx.ctrl = ctrl;

let appliedTheme = null; // En son uygulanan tema (değişimi saptamak için)
let started = false; // İlk yönlendirme yapılana kadar ekran çizilmez

// ---------------- Görünüm ayarları ----------------
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function effectiveDark() {
  const mode = store.get().settings.colorMode;
  return mode === 'dark' || (mode === 'auto' && !!(darkQuery && darkQuery.matches));
}

/** Yazı boyutu, renk modu, hareket ve ses ayarlarını uygular. */
function applySettings() {
  const s = store.get().settings;
  const root = document.documentElement;
  root.style.setProperty('--font-scale', String(s.fontScale));
  if (s.colorMode === 'auto') root.removeAttribute('data-mode');
  else root.dataset.mode = s.colorMode;
  const motionOff = s.reduceMotion || !!(reduceQuery && reduceQuery.matches);
  root.dataset.motion = motionOff ? 'off' : 'on';
  setSoundEnabled(s.sound);
  applyTheme();
}

/** Bir temanın paletini CSS değişkenlerine yazar (th yoksa nötr palet). */
function paintPalette(th) {
  const root = document.documentElement;
  const dark = effectiveDark();
  const p = th ? (dark ? th.palette.dark : th.palette.light) : dark
    ? { primary: '#8ab4ff', onPrimary: '#0b1b3a', accent: '#f5b700', tint: '#1b2433' }
    : { primary: '#1a4fb8', onPrimary: '#ffffff', accent: '#8a6400', tint: '#e8eefc' };
  root.style.setProperty('--primary', p.primary);
  root.style.setProperty('--on-primary', p.onPrimary);
  root.style.setProperty('--accent', p.accent);
  root.style.setProperty('--tint', p.tint);
  root.style.setProperty('--primary-soft', `color-mix(in srgb, ${p.primary} 38%, transparent)`);
  root.dataset.theme = th ? th.id : 'plain';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', th ? th.palette.preview : '#1a4fb8');
}

/** Aktif temayı uygular: renkler + üst şerit + ekran (kontrol modunda nötr). */
function applyTheme() {
  const th = ctx.theme;
  paintPalette(th);
  appliedTheme = th ? th.id : 'plain';
  if (!started) return;
  renderChrome();
  mountScreen(true);
}

// ---------------- Yönlendirme ----------------
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, query = ''] = raw.split('?');
  const q = {};
  for (const [k, v] of new URLSearchParams(query)) q[k] = v;
  return { name: name || 'focus', query: q };
}

function resolveRoute() {
  const s = store.get();
  let r = parseHash();
  if (!s.profile.onboarded) r = { name: 'welcome', query: {} };
  else if (r.name === 'welcome' || !SCREENS[r.name]) r = { name: 'focus', query: {} };
  else if (GAME_ONLY.has(r.name) && ctx.isControl()) r = { name: 'focus', query: {} };
  return r;
}

function renderChrome() {
  const s = store.get();
  const welcome = route.name === 'welcome';
  dom.topbar.hidden = welcome;
  dom.nav.hidden = welcome;
  if (welcome) return;
  clear(dom.topbar).append(renderTopbar(s, ctx.theme));
  dom.nav.replaceWith((dom.nav = renderNav(TAB_OF[route.name] || route.name, ctx.isControl())));
  const snap = ctrl.snapshot();
  document.body.classList.toggle('focus-mode', !!snap && snap.phase === 'focus' && !snap.viewer);
}

function mountScreen(force = false) {
  if (!force && screenName === route.name && screen) return;
  if (screen && screen.destroy) screen.destroy();
  const y = window.scrollY;
  clear(dom.main);
  screenName = route.name;
  screen = SCREENS[route.name].mount(dom.main, ctx) || {};
  if (force) window.scrollTo(0, y);
}

function navigate() {
  route = resolveRoute();
  renderChrome();
  mountScreen(true);
  window.scrollTo(0, 0);
  if (route.name !== 'focus') document.title = t('app.name');
  dom.main.focus({ preventScroll: true });
}

// ---------------- Olaylar ----------------
store.subscribe(() => {
  const themeKey = ctx.theme ? ctx.theme.id : 'plain';
  if (started && themeKey !== appliedTheme) {
    appliedTheme = themeKey;
    applyTheme(); // Tema ya da kontrol modu değişti: renkleri ve ekranı yenile
    return;
  }
  const was = route.name;
  route = resolveRoute();
  if (route.name !== was) {
    navigate();
    return;
  }
  renderChrome();
  if (screen && screen.update) screen.update();
  else mountScreen(true);
});

window.addEventListener('hashchange', navigate);
window.addEventListener('storage', (e) => {
  if (e.key === CONFIG.storageKey) store.reload();
});
document.addEventListener('visibilitychange', () => {
  ctrl.handleVisibility(document.hidden);
  if (!document.hidden) {
    ctrl.tick();
    checkWeekly();
  }
});
if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener('change', applySettings);

setInterval(() => ctrl.tick(), 500);

// ---------------- Haftalık olay ve anket ----------------
let showingWeekly = false;

/** Bekleyen haftalık olay sonuçlarını sırayla gösterir. */
function checkWeekly() {
  const s = store.get();
  if (!s.profile.onboarded || ctx.isControl() || !ctx.theme) return;
  store.update((st) => { resolvePending(st, ctx.theme, Date.now()); }, { silent: true });
  renderChrome();
  showNextEvent();
}

function showNextEvent() {
  const s = store.get();
  if (showingWeekly || !s.pendingEvents.length) return;
  showingWeekly = true;
  const ev = s.pendingEvents[0];
  showWeekly(ctx, ev, () => {
    showingWeekly = false;
    store.update((st) => { st.pendingEvents.shift(); });
    showNextEvent();
  });
}

function checkSurvey() {
  const s = store.get();
  const due = surveyDue(s, Date.now());
  const today = dayKey(Date.now());
  if (due && s.research.surveySnoozedDay !== today && !document.getElementById('overlay').childElementCount) openSurvey(ctx, due);
}

// ---------------- Başlat ----------------
applySettings();
ctrl.restore();
route = resolveRoute();
started = true;
navigate();
setTimeout(() => {
  checkWeekly();
  if (!store.get().pendingEvents.length) checkSurvey();
}, 600);

if (!backend.persistent) toast(t('settings.noStorage'), 6000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
