const KEY_ENABLED = 'endemik.notify';
const KEY_SEEN = 'endemik.seen';
const COOLDOWN_MS = 24 * 3600 * 1000;

export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const notifyEnabled = () => { try { return localStorage.getItem(KEY_ENABLED) === '1'; } catch { return false; } };

function seen() { try { return JSON.parse(localStorage.getItem(KEY_SEEN) || '{}'); } catch { return {}; } }
function markSeen(id) { const s = seen(); s[id] = Date.now(); try { localStorage.setItem(KEY_SEEN, JSON.stringify(s)); } catch { /* yoksay */ } }

let watchId = null;

// Kullanıcının bulunduğu lokalitedeki türleri döndürür.
export function speciesNear(pos, species, extra = []) {
  const hits = [];
  for (const sp of species) {
    const locs = [...(sp.localities || []), ...extra.filter((e) => e.species_id === sp.id).map((e) => ({ name: 'Kullanıcı kaydı', lat: e.lat, lng: e.lng, radiusKm: 3 }))];
    for (const loc of locs) {
      if (distanceKm(pos, loc) <= (loc.radiusKm || 5)) { hits.push({ sp, loc }); break; }
    }
  }
  return hits;
}

async function notify(sp, loc) {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
  const opts = {
    body: `${loc.name} çevresinde ${sp.name} (${sp.sci || sp.group}) yayılış gösterir. Detaylar için dokunun.`,
    icon: './icons/icon-192.png',
    data: { url: `./#/tur/${sp.id}` },
    tag: sp.id,
  };
  if (reg) await reg.showNotification(`Yakınınızda: ${sp.name}`, opts);
  else new Notification(`Yakınınızda: ${sp.name}`, opts);
}

export async function startWatching(getSpecies, getExtra, onHit) {
  if (!('geolocation' in navigator)) throw new Error('Bu cihaz konum desteklemiyor.');
  if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  try { localStorage.setItem(KEY_ENABLED, '1'); } catch { /* yoksay */ }
  stopWatching(false);
  watchId = navigator.geolocation.watchPosition((p) => {
    const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    const hits = speciesNear(pos, getSpecies(), getExtra());
    onHit?.(pos, hits);
    const s = seen();
    for (const { sp, loc } of hits) {
      if (Date.now() - (s[sp.id] || 0) < COOLDOWN_MS) continue;
      markSeen(sp.id);
      if ('Notification' in window && Notification.permission === 'granted') notify(sp, loc);
    }
  }, (err) => console.warn('Konum hatası', err), { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
}

export function stopWatching(persist = true) {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (persist) { try { localStorage.setItem(KEY_ENABLED, '0'); } catch { /* yoksay */ } }
}
