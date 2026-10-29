// Küçük DOM yardımcıları. Kullanıcı metni her zaman metin düğümü olarak eklenir (XSS'e karşı güvenli).

/** h('div', { class: 'x', onClick: fn }, 'metin', child) -> Element */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v; // Sadece güvenilir (kendi ürettiğimiz) SVG metinleri için
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Bir elemanın içeriğini temizler. */
export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** İçeriği değiştirir. */
export function setChildren(el, ...children) {
  clear(el);
  append(el, children);
  return el;
}

/** Güvenilir SVG/HTML metninden tek eleman üretir. */
export function fromHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Metni HTML'e güvenle gömmek için kaçışlar (SVG metinleri üretirken). */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Ekran okuyucuya duyuru (aria-live). */
export function announce(text) {
  const el = document.getElementById('sr-live');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => {
    el.textContent = text;
  }, 50);
}

/** Hareket açık mı? (ayar + sistem tercihi) */
export function motionOn() {
  return document.documentElement.dataset.motion !== 'off';
}
