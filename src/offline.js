// Çevrimdışı fotoğraf indirme: Wi-Fi'de otomatik, mobil veride (veya bağlantı türü bilinmiyorsa) izinle.
const CACHE = 'endemik-offline-images';
const K_AUTO = 'endemik.offline.auto';       // '0' ise Wi-Fi'de otomatik indirme kapalı
const K_ASKED = 'endemik.offline.askedAt';   // mobil veride en son ne zaman soruldu
const ASK_EVERY_MS = 7 * 24 * 3600 * 1000;   // "Şimdi değil" denirse 7 gün sorulmaz

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* yoksay */ } };

export const supported = () => 'caches' in window;
export const autoEnabled = () => read(K_AUTO) !== '0';
export const setAutoEnabled = (on) => write(K_AUTO, on ? null : '0');

// Wi-Fi/Ethernet mi? Tarayıcı bağlantı türünü bildirmiyorsa (iPhone/Safari, Firefox, masaüstü) bilinmiyor sayılır
// ve mobil veri gibi davranılır (önce sorulur). Veri tasarrufu açıksa da mobil sayılır.
export function onWifi() {
  const c = navigator.connection;
  if (!c || c.saveData) return false;
  return c.type === 'wifi' || c.type === 'ethernet';
}

export const imageUrls = (species) =>
  [...new Set(species.map((s) => s.image).filter(Boolean).map((u) => new URL(u, location.href).href))];

export async function counts(species) {
  const urls = imageUrls(species);
  if (!supported()) return { have: 0, need: urls.length };
  const c = await caches.open(CACHE);
  let have = 0;
  for (const u of urls) if (await c.match(u)) have++;
  return { have, need: urls.length };
}

let running = false;
export const isRunning = () => running;

// Eksik fotoğrafları indirir (yarım kalan indirme kaldığı yerden sürer). onProgress(done, total)
export async function download(species, onProgress = () => {}) {
  if (!supported() || running) return false;
  running = true;
  try {
    const c = await caches.open(CACHE);
    const urls = imageUrls(species);
    let done = 0, next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const u = urls[next++];
        if (!(await c.match(u))) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch { /* sonra yeniden denenir */ } }
        onProgress(++done, urls.length);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    return true;
  } finally { running = false; }
}

// Açılışta ve ağ türü değişince çalışır.
// - Wi-Fi: otomatik indir (ayar açıksa).  - Mobil/bilinmiyor: ask(cb) ile sor; izin verilirse indir, verilmezse indirme.
export function initAuto({ species, toast, ask }) {
  const run = async () => {
    if (!supported() || running || navigator.onLine === false) return;
    const { have, need } = await counts(species);
    if (have >= need) return;
    if (onWifi()) {
      if (!autoEnabled()) return;
      toast('Wi-Fi bağlı: fotoğraflar çevrimdışı kullanım için indiriliyor…', 3000);
      await download(species);
      const r = await counts(species);
      if (r.have >= r.need) toast('Fotoğraflar indirildi. Artık internetsiz de görünür.', 3500);
      return;
    }
    if (Date.now() - (+read(K_ASKED) || 0) < ASK_EVERY_MS) return;
    ask(async (yes) => {
      write(K_ASKED, String(Date.now()));
      if (!yes) return;
      toast('Fotoğraflar indiriliyor…', 2500);
      await download(species);
      const r = await counts(species);
      if (r.have >= r.need) toast('Fotoğraflar indirildi.', 3000);
    });
  };
  setTimeout(run, 4000); // açılışı yavaşlatmamak için biraz bekle
  navigator.connection?.addEventListener?.('change', () => { if (onWifi()) run(); });
}
