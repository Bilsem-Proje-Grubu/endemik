import species from '../data/species.json';

const CELL = 0.1; // hassas türlerde konum ~10 km'lik hücreye genelleştirilir (web sürümüyle aynı)

export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inside(me, sp, l) {
  if (sp.sensitive) {
    const la = Math.floor(l.lat / CELL) * CELL, lo = Math.floor(l.lng / CELL) * CELL;
    return me.lat >= la && me.lat < la + CELL && me.lng >= lo && me.lng < lo + CELL;
  }
  return distanceKm(me, l) <= (l.radiusKm || 5);
}

// Bulunulan konumdaki türler: [{ sp, loc }]
export function speciesNear(me) {
  const hits = [];
  for (const sp of species) {
    const loc = sp.localities.find((l) => inside(me, sp, l));
    if (loc) hits.push({ sp, loc });
  }
  return hits;
}
