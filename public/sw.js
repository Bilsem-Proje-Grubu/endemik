// Basit çevrimdışı önbellek: kabuk dosyaları ve tür verisi.
const CACHE = 'endemik-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Supabase ve harita karoları her zaman ağdan (karolar başarılı olursa önbelleğe girer).
  if (url.hostname.endsWith('supabase.co')) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname.endsWith('tile.openstreetmap.org') || url.hostname === 'upload.wikimedia.org')) {
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
