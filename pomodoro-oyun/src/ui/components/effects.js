// Kısa (200-600 ms) mikro animasyonlar. Hareket kapalıysa hiçbir şey yapmaz.
import { h, motionOn } from '../dom.js';

const COLORS = ['#f5b700', '#e8590c', '#2f80ed', '#27ae60', '#d6336c', '#9b51e0'];

/** Konfeti yağdırır (seviye atlama, rozet vb.). */
export function confetti(count = 36) {
  if (!motionOn()) return;
  for (let i = 0; i < count; i++) {
    const p = h('span', { class: 'confetti-piece', 'aria-hidden': 'true' });
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = COLORS[i % COLORS.length];
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--rot', `${360 + Math.random() * 540}deg`);
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.append(p);
    setTimeout(() => p.remove(), 2600);
  }
}

/** Bozuk paralar from noktasından to elemanına uçar. */
export function flyCoins(fromRect, toEl, icon, n = 8) {
  if (!motionOn() || !toEl || !fromRect) return;
  const to = toEl.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = h('span', { class: 'fly-coin', 'aria-hidden': 'true' }, icon);
    c.style.left = `${fromRect.left + fromRect.width / 2}px`;
    c.style.top = `${fromRect.top + fromRect.height / 2}px`;
    document.body.append(c);
    const dx = to.left + to.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = to.top + to.height / 2 - (fromRect.top + fromRect.height / 2);
    const anim = c.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5 + (Math.random() - 0.5) * 80}px, ${dy * 0.3 - 40}px) scale(1.2)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.2 },
      ],
      { duration: 600 + Math.random() * 200, delay: i * 50, easing: 'ease-in', fill: 'both' },
    );
    anim.onfinish = () => c.remove();
  }
}

/** Sayıyı from -> to sayar (ör. kazanılan para). */
export function countUp(el, from, to, ms = 600, format = (n) => String(n)) {
  if (!motionOn() || from === to) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  function step(now) {
    const k = Math.min(1, (now - start) / ms);
    el.textContent = format(Math.round(from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
