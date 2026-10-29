// Erişilebilir pencere: odak tuzağı, Esc ile kapanma, kapanınca odak geri döner.
import { h } from '../dom.js';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * opts: { title, body, actions: [{ label, kind, onClick, keepOpen }], dismissible = true, wide }
 * onClick false dönerse pencere kapanmaz. { close } döndürür.
 */
export function openModal({ title, body, actions = [], dismissible = true, onClose, className = '' }) {
  const host = document.getElementById('overlay');
  const previous = document.activeElement;
  const titleId = `m${Math.random().toString(36).slice(2, 8)}`;
  const modal = h('div', { class: `modal ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    title ? h('h2', { id: titleId }, title) : null,
    h('div', { class: 'modal-body stack' }, body),
    actions.length
      ? h('div', { class: 'modal-actions' },
          actions.map((a) =>
            h('button', {
              type: 'button',
              class: `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-outline'}`,
              onClick: async () => {
                const r = a.onClick ? await a.onClick() : undefined;
                if (r !== false) close();
              },
            }, a.label)))
      : null);
  const overlay = h('div', { class: 'overlay' }, modal);
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    if (previous && previous.focus) previous.focus();
    if (onClose) onClose();
  }

  function onKey(e) {
    if (e.key === 'Escape' && dismissible) {
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      const items = [...modal.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay && dismissible) close();
  });
  document.addEventListener('keydown', onKey, true);
  host.append(overlay);
  const target = modal.querySelector('.btn-primary') || modal.querySelector(FOCUSABLE) || modal;
  if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
  setTimeout(() => target.focus(), 30);
  return { close, el: modal };
}

/** Evet/Hayır onayı. Promise<boolean> döndürür. */
export function confirmDialog({ title, text, yes, no, danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title,
      body: h('p', null, text),
      actions: [
        { label: no, onClick: () => { answered = true; resolve(false); } },
        { label: yes, kind: danger ? 'danger' : 'primary', onClick: () => { answered = true; resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
