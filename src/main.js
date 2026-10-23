import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './style.css';
import species from './data/species.json';
import { hasBackend, addSighting, getApprovedSightings, getLocalSightings, adminLogin, adminLogout, adminSession, adminList, adminSetStatus } from './supabase.js';
import { startWatching, stopWatching, notifyEnabled, speciesNear } from './geo.js';
import { aiFillSpeciesInfo } from './ai.js';

const app = document.getElementById('app');
const LIST_PAGE = 'https://www.tarimorman.gov.tr/DKMP/Menu/49/Tur-Eylem-Planlari';
const byId = new Map(species.map((s) => [s.id, s]));
let approved = []; // Supabase'ten gelen onaylı kullanıcı kayıtları
let map = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (s) => (s.group === 'fauna' ? '🦎' : '🌿');
const thumb = (s, cls = '') => `<div class="thumb ${cls}">${s.image ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(s.image)}" alt="${esc(s.name)}" onerror="this.replaceWith(document.createTextNode('${icon(s)}'))">` : icon(s)}</div>`;

function toast(msg, ms = 3500) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function shell(inner, active, top = '') {
  if (map) { map.stop(); map.remove(); map = null; }
  app.innerHTML = `${top}<main class="view">${inner}</main>
  <nav class="nav">
    <a href="#/" class="${active === 'home' ? 'on' : ''}"><span>🏠</span>Türler</a>
    <a href="#/harita" class="${active === 'map' ? 'on' : ''}"><span>🗺️</span>Harita</a>
    <a href="#/ekle" class="${active === 'add' ? 'on' : ''}"><span>➕</span>Lokalite ekle</a>
    <a href="#/ayarlar" class="${active === 'set' ? 'on' : ''}"><span>🔔</span>Ayarlar</a>
  </nav>`;
  window.scrollTo(0, 0);
}

// ---------- Ana sayfa ----------
let filter = 'all';
let query = '';
function viewHome() {
  const top = `<header class="topbar">
    <div class="brand">🌿 <b>ENDEMİK</b><small>${species.length} tür</small></div>
    <input class="search" id="q" type="search" placeholder="Tür adı ara…" value="${esc(query)}" autocomplete="off">
    <div class="chips">
      ${[['all', 'Hepsi'], ['fauna', 'Fauna'], ['flora', 'Flora'], ['loc', 'Lokalitesi olanlar']].map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
    </div></header>`;
  shell('<div class="section-title" id="ttl"></div><div class="grid" id="grid"></div>', 'home', top);
  const draw = () => {
    const q = query.toLocaleLowerCase('tr');
    const list = species.filter((s) =>
      (filter === 'all' || (filter === 'loc' ? s.localities.length : s.group === filter)) &&
      (!q || s.name.toLocaleLowerCase('tr').includes(q) || s.sci.toLocaleLowerCase('tr').includes(q)));
    document.getElementById('ttl').textContent = `${list.length} tür`;
    document.getElementById('grid').innerHTML = list.length ? list.map((s) => `
      <a class="card" href="#/tur/${s.id}">${thumb(s)}<div class="nm">${esc(s.name)}</div><div class="sc">${esc(s.sci)}</div></a>`).join('')
      : '<div class="empty">Sonuç yok.</div>';
  };
  draw();
  document.getElementById('q').addEventListener('input', (e) => { query = e.target.value; draw(); });
  document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; viewHome(); }));
}

// ---------- Tür detayı ----------
function allLocalities(s) {
  const extra = approved.filter((a) => a.species_id === s.id).map((a) => ({ name: 'Kullanıcı kaydı', lat: a.lat, lng: a.lng, radiusKm: 3, user: true }));
  return [...s.localities, ...extra];
}
function viewSpecies(id) {
  const s = byId.get(id);
  if (!s) return viewHome();
  const locs = allLocalities(s);
  const row = (k, v) => `<dt>${k}</dt><dd>${v ? esc(v) : '<span class="badge">Bilgi eklenecek</span>'}</dd>`;
  shell(`<a class="back" href="#/">← Türler</a>
    ${thumb(s, 'hero')}
    ${s.imageCredit ? `<div class="sc" style="text-align:right">Fotoğraf: ${esc(s.imageCredit.author || 'Wikimedia Commons')} · <a href="${esc(s.imageCredit.source)}" target="_blank" rel="noopener">${esc(s.imageCredit.license)}</a></div>` : ''}
    <h1>${esc(s.name)}</h1>
    <div class="sci">${esc(s.sci)} · ${s.group === 'fauna' ? 'Fauna' : 'Flora'}</div>
    ${s.description ? `<p>${esc(s.description)}</p>` : '<p class="note">Bu tür için ayrıntılı bilgi henüz eklenmedi. Kaynak: Tür Eylem Planı.</p>'}
    <dl class="kv">
      ${row('Morfolojik özellikler', s.morphology)}
      ${row('Çiçeklenme tarihi', s.group === 'flora' ? s.flowering : 'Floraya özgü')}
      ${row('Ulusal statü', s.statusNational)}
      ${row('Uluslararası statü', s.statusIntl)}
    </dl>
    <h3 class="section-title">Yayılış lokaliteleri</h3>
    ${locs.length ? `<div id="m" class="map"></div>
      <ul>${locs.map((l) => `<li>${esc(l.name)}${l.approx ? ' <span class="badge">yaklaşık</span>' : ''}${l.user ? ' <span class="badge loc">kullanıcı</span>' : ''}</li>`).join('')}</ul>`
      : '<div class="note">Bu tür için lokalite verisi henüz eklenmedi.</div>'}
    <p><a href="${esc(s.pdf || LIST_PAGE)}" target="_blank" rel="noopener">Tür eylem planı (DKMP) ↗</a></p>
    <a class="btn" style="display:inline-block;text-decoration:none" href="#/ekle?tur=${s.id}">Bu türü gördüm, lokalite ekle</a>`, 'home');
  if (locs.length) {
    map = L.map('m');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    locs.forEach((l) => L.circle([l.lat, l.lng], { radius: (l.radiusKm || 5) * 1000, color: l.user ? '#e8b84a' : '#6fcf4f', weight: 2 }).bindPopup(esc(l.name)).addTo(map));
    // Daire sınırları harita görünümü olmadan hesaplanamaz; merkez noktalarına göre sığdır.
    map.fitBounds(L.latLngBounds(locs.map((l) => [l.lat, l.lng])).pad(0.5), { animate: false, maxZoom: 10 });
  }
}

// ---------- Genel harita ----------
function viewMap() {
  shell('<h2 class="section-title">Yayılış haritası</h2><div id="m" class="map tall"></div><p class="note" id="mi">Konumunuz için Ayarlar’dan bildirimi açın.</p>', 'map');
  map = L.map('m').setView([39, 35], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
  for (const s of species) for (const l of allLocalities(s)) {
    L.circle([l.lat, l.lng], { radius: (l.radiusKm || 5) * 1000, color: s.group === 'fauna' ? '#e8b84a' : '#6fcf4f', weight: 2 })
      .bindPopup(`<b>${esc(s.name)}</b><br>${esc(l.name)}<br><a href="#/tur/${s.id}">Detay</a>`).addTo(map);
  }
  navigator.geolocation?.getCurrentPosition((p) => {
    const me = { lat: p.coords.latitude, lng: p.coords.longitude };
    L.circleMarker([me.lat, me.lng], { radius: 8, color: '#4aa3e8', fillOpacity: 0.8 }).addTo(map).bindPopup('Buradasınız');
    const hits = speciesNear(me, species, approved);
    document.getElementById('mi').textContent = hits.length ? `Yakınınızdaki türler: ${hits.map((h) => h.sp.name).join(', ')}` : 'Bulunduğunuz yerde kayıtlı tür lokalitesi yok.';
  }, () => {}, { timeout: 8000 });
}

// ---------- Lokalite ekle ----------
function viewAdd(preselect) {
  shell(`<h2 class="section-title">Yeni lokalite ekle</h2>
    ${hasBackend ? '' : '<div class="note">Sunucu bağlı değil. Kaydınız yalnızca bu cihazda saklanır.</div>'}
    <form class="f" id="f">
      <label>Tür adı<input name="name" list="sp" required placeholder="Listeden seçin veya yeni tür yazın" value="${esc(preselect ? byId.get(preselect)?.name : '')}" autocomplete="off"></label>
      <datalist id="sp">${species.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist>
      <div class="row"><button type="button" class="btn ghost" id="gps">📍 Konumumu kullan</button></div>
      <label>Enlem<input name="lat" type="number" step="any" min="-90" max="90" required></label>
      <label>Boylam<input name="lng" type="number" step="any" min="-180" max="180" required></label>
      <label>Not (isteğe bağlı)<textarea name="note" rows="3" maxlength="500"></textarea></label>
      <div class="row"><button type="button" class="btn ghost" id="ai">✨ Tür bilgisini yapay zekâ ile doldur (demo)</button></div>
      <div id="aiout"></div>
      <button class="btn" type="submit">Gönder</button>
      <p class="note">Kayıtlar yönetici onayından sonra yayınlanır.</p>
    </form>`, 'add');
  const f = document.getElementById('f');
  let ai = null;
  document.getElementById('gps').onclick = () => navigator.geolocation.getCurrentPosition((p) => {
    f.lat.value = p.coords.latitude.toFixed(6); f.lng.value = p.coords.longitude.toFixed(6);
  }, () => toast('Konum alınamadı. İzin verdiğinizden emin olun.'), { enableHighAccuracy: true, timeout: 15000 });
  document.getElementById('ai').onclick = async (e) => {
    if (!f.name.value.trim()) return toast('Önce tür adını yazın.');
    e.target.disabled = true;
    ai = await aiFillSpeciesInfo(f.name.value, species);
    e.target.disabled = false;
    document.getElementById('aiout').innerHTML = `<div class="panel"><span class="badge">DEMO</span>
      <p>${esc(ai.description)}</p>
      <dl class="kv"><dt>Bilimsel ad</dt><dd>${esc(ai.sci || '—')}</dd><dt>Çiçeklenme</dt><dd>${esc(ai.flowering || '—')}</dd>
      <dt>Ulusal statü</dt><dd>${esc(ai.statusNational || '—')}</dd><dt>Uluslararası statü</dt><dd>${esc(ai.statusIntl || '—')}</dd></dl></div>`;
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const name = f.name.value.trim();
    const known = species.find((s) => s.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'));
    try {
      const r = await addSighting({ species_id: known ? known.id : 'yeni:' + name.toLocaleLowerCase('tr'), species_name: name, lat: +f.lat.value, lng: +f.lng.value, note: f.note.value.trim(), ai_info: ai });
      toast(r.local ? 'Kaydedildi (yalnızca bu cihazda).' : 'Gönderildi. Onaydan sonra yayınlanacak.');
      location.hash = '#/';
    } catch (err) { console.error(err); toast('Gönderilemedi: ' + (err.message || 'bilinmeyen hata')); }
  };
}

// ---------- Ayarlar ----------
function viewSettings() {
  const on = notifyEnabled();
  const local = getLocalSightings();
  shell(`<h2 class="section-title">Ayarlar</h2>
    <div class="panel"><b>Yakındaki tür bildirimi</b>
      <p class="note">Bir türün yayılış lokalitesine girdiğinizde bildirim gönderilir. Tarayıcı tabanlı (PWA) olduğu için güvenilir çalışması uygulama açıkken ya da kısa süre arka plandayken mümkündür.</p>
      <button class="btn ${on ? 'ghost' : ''}" id="nt">${on ? 'Bildirimi kapat' : 'Bildirimi aç'}</button>
      <div id="st" class="sci"></div></div>
    <div class="panel"><b>Sunucu durumu</b><p>${hasBackend ? 'Supabase bağlı.' : 'Supabase bağlı değil (yerel mod).'}</p>
      ${local.length ? `<p>Bu cihazda gönderilmemiş ${local.length} kayıt var.</p>` : ''}</div>
    <div class="panel"><b>Hakkında</b><p>Veriler Doğa Koruma ve Milli Parklar Genel Müdürlüğü <a href="${LIST_PAGE}" target="_blank" rel="noopener">Tür Eylem Planları</a> sayfasından alınmıştır. Lokaliteler yaklaşık konumdur.</p>
      <p><a href="#/yonetim">Yönetici girişi</a></p></div>`, 'set');
  document.getElementById('nt').onclick = async () => {
    if (notifyEnabled()) { stopWatching(); return viewSettings(); }
    try {
      await startWatching(() => species, () => approved, (pos, hits) => {
        const el = document.getElementById('st');
        if (el) el.textContent = hits.length ? `Yakınınızda: ${hits.map((h) => h.sp.name).join(', ')}` : 'Yakınınızda kayıtlı tür lokalitesi yok.';
      });
      viewSettings();
    } catch (err) { toast(err.message); }
  };
}

// ---------- Yönetici ----------
async function viewAdmin() {
  if (!hasBackend) return shell('<a class="back" href="#/ayarlar">←</a><p class="note">Yönetim için Supabase bağlantısı gerekir.</p>', 'set');
  const ses = await adminSession();
  if (!ses) {
    shell(`<a class="back" href="#/ayarlar">←</a><h2 class="section-title">Yönetici girişi</h2>
      <form class="f" id="lf"><label>E-posta<input name="e" type="email" required></label><label>Şifre<input name="p" type="password" required></label><button class="btn">Giriş</button></form>`, 'set');
    document.getElementById('lf').onsubmit = async (e) => {
      e.preventDefault();
      try { await adminLogin(e.target.e.value, e.target.p.value); viewAdmin(); } catch (err) { toast('Giriş başarısız.'); }
    };
    return;
  }
  const pending = await adminList('pending');
  shell(`<a class="back" href="#/ayarlar">←</a><h2 class="section-title">Onay bekleyenler (${pending.length})</h2>
    ${pending.map((p) => `<div class="panel"><b>${esc(p.species_name)}</b><div class="sci">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${new Date(p.created_at).toLocaleDateString('tr')}</div>
      <p>${esc(p.note)}</p><div class="row"><button class="btn" data-a="approved" data-id="${esc(p.id)}">Onayla</button><button class="btn danger" data-a="rejected" data-id="${esc(p.id)}">Reddet</button></div></div>`).join('') || '<div class="empty">Bekleyen kayıt yok.</div>'}
    <button class="btn ghost" id="lo">Çıkış</button>`, 'set');
  document.querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => { await adminSetStatus(b.dataset.id, b.dataset.a); approved = await getApprovedSightings(); viewAdmin(); });
  document.getElementById('lo').onclick = async () => { await adminLogout(); viewAdmin(); };
}

// ---------- Yönlendirme ----------
function route() {
  const [path, qs] = location.hash.replace(/^#/, '').split('?');
  const m = path.match(/^\/tur\/(.+)$/);
  if (m) return viewSpecies(decodeURIComponent(m[1]));
  if (path === '/harita') return viewMap();
  if (path === '/ekle') return viewAdd(new URLSearchParams(qs || '').get('tur'));
  if (path === '/ayarlar') return viewSettings();
  if (path === '/yonetim') return viewAdmin();
  viewHome();
}
window.addEventListener('hashchange', route);

getApprovedSightings().then((a) => { approved = a; });
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
// Bildirim açıksa uygulama yeniden açıldığında izlemeyi sürdür.
if (notifyEnabled()) startWatching(() => species, () => approved).catch(() => {});
