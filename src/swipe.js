// Ekranı yana kaydırarak sekmeler arasında geçiş.
// Varsayılan: parmağı SOLA kaydırınca sağdaki sekmeye, SAĞA kaydırınca soldaki sekmeye geçilir (sayfa çevirir gibi).
// "Yönü ters çevir" seçeneğiyle tersi olur.
const K_ON = 'endemik.swipe.off';        // '1' ise kapalı
const K_REV = 'endemik.swipe.reverse';   // '1' ise ters yön

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* yoksay */ } };

export const swipeEnabled = () => read(K_ON) !== '1';
export const setSwipeEnabled = (on) => write(K_ON, on ? null : '1');
export const swipeReverse = () => read(K_REV) === '1';
export const setSwipeReverse = (on) => write(K_REV, on ? '1' : null);

// Bu öğelerin üstünde başlayan kaydırmalar kendi işlerini yapar (harita sürükleme, yatay kayan çipler, renk/kaydırıcı seçimi...).
const IGNORE = '.leaflet-container, .chips, input[type=range], input[type=color], input[type=file], select, .lightbox, .askcard, [data-noswipe]';

// tabs: sıralı sekme yolları, current(): şu anki sekme sırası (-1 ise sekme dışı), go(index, dir), blocked(): geçişi engelle (ör. dolu form)
export function initSwipe({ tabs, current, go, blocked }) {
  let s = null;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { s = null; return; }
    const t = e.touches[0];
    const edge = 24; // ekranın kenarından başlayanlar sistem geri hareketine bırakılır
    if (t.clientX < edge || t.clientX > window.innerWidth - edge) { s = null; return; }
    if (e.target.closest?.(IGNORE)) { s = null; return; }
    s = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!s || !swipeEnabled()) { s = null; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y, dt = Date.now() - s.t;
    s = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6 || dt > 800) return; // kısa, eğik ya da yavaş hareket
    if (window.getSelection && String(window.getSelection()).length) return;         // metin seçiliyorsa
    const i = current();
    if (i < 0) return;
    // Varsayılan: sola kaydır (dx<0) → sağdaki sekme (i+1); sağa kaydır → soldaki sekme (i-1). Ters çevirme açıksa tersi.
    const step = (dx < 0 ? 1 : -1) * (swipeReverse() ? -1 : 1);
    const j = i + step;
    if (j < 0 || j >= tabs.length) return;
    if (blocked && blocked()) return;
    go(j, step < 0 ? 'left' : 'right');
  }, { passive: true });
}
