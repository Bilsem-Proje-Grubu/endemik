// Çevrimdışı çalışma: temel dosyalar kurulumda önceden indirilir (precache.json), tür fotoğrafları
// kullanıcı isteğiyle 'endemik-offline-images' önbelleğine alınır, görülen harita karoları ve
// resimler çalışma sırasında saklanır.
const CACHE = 'endemik-v3';
const KEEP = (k) => k === CACHE || k.startsWith('endemik-offline');

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    try {
      const c = await caches.open(CACHE);
      const list = (await (await fetch('./precache.json', { cache: 'no-store' })).json()).core || [];
      await Promise.allSettled(list.map((u) => c.add(new Request(u, { cache: 'reload' }))));
    } catch { /* ilk açılışta ağ yoksa sonra yeniden denenir */ }
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !KEEP(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase ve harita karoları her zaman ağdan (karolar başarılı olursa önbelleğe girer).
  if (url.hostname.endsWith('supabase.co')) return;
  // Sayfanın kendisi (index.html) önce ağdan gelir (yeni sürüm takılı kalmasın); ağ yoksa ya da 5 sn'de
  // cevap vermezse önbellekteki kopya açılır.
  if (req.mode === 'navigate') {
    const net = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), 5000));
    e.respondWith(Promise.race([net, timeout]).catch(() =>
      caches.match(req).then((h) => h || caches.match('./')).then((h) => h || net)));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname.endsWith('tile.openstreetmap.org') || url.hostname.endsWith('wikimedia.org') || url.hostname.endsWith('inaturalist.org') || url.hostname.endsWith('inaturalist-open-data.s3.amazonaws.com'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

// Bildirime tıklanınca ilgili türe git.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data && e.notification.data.url ? e.notification.data.url : './';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
