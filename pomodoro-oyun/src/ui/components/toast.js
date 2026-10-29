// Kısa bildirim satırı. Ekran okuyucuya da duyurulur.
import { h, announce } from '../dom.js';

/** Birkaç saniye görünen kısa mesaj. */
export function toast(message, ms = 3500) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = h('div', { class: 'toast', role: 'status' }, message);
  host.append(el);
  announce(message);
  setTimeout(() => el.remove(), ms);
}
