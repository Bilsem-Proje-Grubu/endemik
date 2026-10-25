import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './style.css';
import species from './data/species.json';
import { hasBackend, addSighting, getApprovedSightings, getLocalSightings, adminLogin, adminLogout, adminSession, adminList, adminSetStatus, adminDelete, blurCoord, USER_RADIUS_KM, flushQueue, getSpeciesPhotos } from './supabase.js';
import { startWatching, stopWatching, notifyEnabled, speciesNear } from './geo.js';
import { aiFillSpeciesInfo } from './ai.js';
import { chatAvailable, ask, preloadLM } from './chat.js';
import { waitSeconds } from './ratelimit.js';
import * as offline from './offline.js';
import { prepareImage } from './photo.js';
import { initSwipe, swipeEnabled, setSwipeEnabled, swipeReverse, setSwipeReverse } from './swipe.js';
import { initTheme, getTheme, setTheme, getCustom, setCustomColor, resetTheme, customWarnings, PRESETS } from './theme.js';

const app = document.getElementById('app');
const LIST_PAGE = 'https://www.tarimorman.gov.tr/DKMP/Menu/49/Tur-Eylem-Planlari';
const byId = new Map(species.map((s) => [s.id, s]));
let approved = []; // Supabase'ten gelen onaylı kullanıcı kayıtları
let map = null;
let cleanup = null; // sayfadan çıkarken çalışır (kamerayı kapatır)
let dirtyCheck = null; // doluysa true döner (yazılmış form varken kaydırarak sayfadan çıkılmasın)
let slideDir = null;   // sekme geçişi animasyonunun yönü

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Resmi olmayan (veya yüklenemeyen) türler için hayvan grubuna uygun simge.
const FAUNA_ICON = {
  'agri-kertenkelesi': '🦎', 'iskenderun-kertenkelesi': '🦎', 'van-kertenkelesi': '🦎', 'col-varani': '🦎',
  'marmaris-semenderi': '🦎', 'kafkas-semenderi': '🦎',
  'anadolu-engeregi': '🐍', 'beyazbantli-dag-engeregi': '🐍', 'hopa-engeregi': '🐍',
  'firat-kaplumbagasi': '🐢', 'trakya-tosbagasi': '🐢',
  'tavas-kurbagasi': '🐸',
  'karadeniz-alabaligi': '🐟', 'siraz-baligi': '🐟',
  'akbez-geyik-bocegi': '🪲', 'avrupa-kirmizi-orman-karincasi': '🐜',
  'kelaynak': '🐦', 'tepeli-pelikan': '🐦', 'turna': '🐦', 'dag-horozu': '🐦', 'toy': '🐦',
  'alageyik': '🦌', 'hatay-dag-ceylani': '🦌',
  'mugla-ili-akdeniz-foku': '🦭', 'mersin-ili-akdeniz-foku': '🦭',
  'sakalli-yarasa': '🦇', 'saz-kedisi': '🐈', 'cizgili-sirtlan': '🐺',
  'igdir-col-faresi': '🐀', 'yer-yediuyuru': '🐭',
};
// Bitkiler cinse (bilimsel adın ilk sözcüğü) göre gruplanır.
const FLORA_ICON = {
  '🌷': ['Tulipa', 'Fritillaria'],
  '🪻': ['Iris', 'Crocus', 'Bellevalia', 'Hyacinthus', 'Scilla', 'Ornithogalum'],
  '🔔': ['Campanula'],
  '🌸': ['Lilium', 'Galanthus', 'Aubrieta', 'Alyssum', 'Iberis', 'Aethionema', 'Silene', 'Saponaria', 'Alkanna', 'Anchusa', 'Onosma', 'Tchihatchewia'],
  '🌼': ['Centaurea', 'Psephellus', 'Rhaponticoides', 'Senecio', 'Sonchus', 'Hypericum', 'Thermopsis', 'Gentiana'],
  '🌺': ['Rhodothamnus', 'Adonis'],
  '🌱': ['Astragalus', 'Dorycnium', 'Vicia', 'Glycyrrhiza'],
  '🌵': ['Salsola', 'Asparagus', 'Polygonum', 'Amphoricarpos', 'Acantholimon', 'Ekimia', 'Rosularia'],
  '🌾': ['Ferula', 'Prangos', 'Cephalaria', 'Pseudodelphinium', 'Physoptychis', 'Erodium'],
  '🍃': ['Verbascum', 'Stachys', 'Sideritis', 'Salvia', 'Ajuga'],
};
const FLORA_BY_GENUS = Object.fromEntries(Object.entries(FLORA_ICON).flatMap(([e, gs]) => gs.map((g) => [g, e])));
const icon = (s) => (s.group === 'fauna' ? FAUNA_ICON[s.id] || '🐾' : FLORA_BY_GENUS[(s.sci || '').split(' ')[0]] || '🌿');
const thumb = (s, cls = '') => `<div class="thumb ${cls}${s.imageCredit?.type === 'specimen' ? ' specimen' : ''}">${s.image ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(s.image)}" alt="${esc(s.name)}" onerror="this.replaceWith(document.createTextNode('${icon(s)}'))">` : icon(s)}</div>`;

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
  if (cleanup) { cleanup(); cleanup = null; }
  dirtyCheck = null; // her sayfa kendi kilidini yeniden tanımlar
  if (slideDir) { document.querySelector('main.view')?.classList.add('slide-' + slideDir); slideDir = null; }
}

// ---------- Ana sayfa ----------
let filter = 'all';
let query = '';
function viewHome() {
  const top = `<header class="topbar">
    <div class="brand">🌿 <b>ENDEMİK</b><small>${species.length} tür</small>${chatAvailable ? '<a class="askbtn" href="#/sohbet">💬 Sor</a>' : ''}</div>
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
  const extra = approved.filter((a) => a.species_id === s.id).map((a) => ({ name: 'Kullanıcı kaydı', lat: a.lat, lng: a.lng, radiusKm: USER_RADIUS_KM, user: true }));
  return [...s.localities, ...extra];
}
function viewSpecies(id) {
  const s = byId.get(id);
  if (!s) return viewHome();
  const locs = allLocalities(s);
  const row = (k, v) => `<dt>${k}</dt><dd>${v ? esc(v) : '<span class="badge">Bilgi eklenecek</span>'}</dd>`;
  shell(`<a class="back" href="#/">← Türler</a>
    ${thumb(s, 'hero')}
    ${s.imageCredit ? `<div class="sc" style="text-align:right">${s.imageCredit.type === 'specimen' ? 'Herbaryum örneği (müze taraması)' : 'Fotoğraf'}: ${esc(s.imageCredit.author || 'Wikimedia Commons')} · <a href="${esc(s.imageCredit.source)}" target="_blank" rel="noopener">${esc(s.imageCredit.license)}</a></div>` : ''}
    ${!s.imageCredit && hasBackend ? '<div class="panel"><b>📷 Bu türün fotoğrafı yok</b><p class="note">Serbest kullanılabilen bir fotoğrafı bulunamadı. Doğada gördüyseniz aşağıdan çekip gönderebilirsiniz; onaydan sonra burada gösterilir.</p><a class="btn" style="display:inline-block;text-decoration:none" href="#/ekle?tur=${s.id}">📷 Fotoğraf çek ve gönder</a></div>' : ''}
    <h1>${esc(s.name)}</h1>
    <div class="sci">${esc(s.sci)} · ${s.group === 'fauna' ? 'Fauna' : 'Flora'}</div>
    ${s.description ? `<p>${esc(s.description)}</p>` : s.morphology || s.statusNational || s.statusIntl ? '' : '<p class="note">Bu tür için ayrıntılı bilgi henüz eklenmedi. Kaynak: Tür Eylem Planı.</p>'}
    <dl class="kv">
      ${row('Morfolojik özellikler', s.morphology)}
      ${s.group === 'flora' ? row('Çiçeklenme tarihi', s.flowering) : ''}
      ${row('Ulusal statü', s.statusNational)}
      ${row('Uluslararası statü', s.statusIntl)}
    </dl>
    <h3 class="section-title">Yayılış lokaliteleri</h3>
    ${locs.length ? `<div id="m" class="map"></div>
      <ul>${locs.map((l) => `<li>${esc(l.name)}${l.approx ? ' <span class="badge">yaklaşık</span>' : ''}${l.user ? ' <span class="badge loc">kullanıcı</span>' : ''}</li>`).join('')}</ul>`
      : '<div class="note">Bu tür için lokalite verisi henüz eklenmedi.</div>'}
    <div id="ph"></div>
    <p><a href="${esc(s.pdf || LIST_PAGE)}" target="_blank" rel="noopener">Tür eylem planı (DKMP) ↗</a></p>
    <div class="row"><a class="btn" style="display:inline-block;text-decoration:none" href="#/ekle?tur=${s.id}">Bu türü gördüm, lokalite ekle</a>
      <button class="btn ghost" id="share" type="button">↗ Paylaş</button></div>`, 'home');
  document.getElementById('share').onclick = async () => {
    const link = location.origin + location.pathname + '#/tur/' + s.id;
    const data = { title: s.name, text: `${s.name} (${s.sci}) — Türkiye'nin endemik türlerinden biri.`, url: link };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(link); toast('Bağlantı kopyalandı.'); }
    } catch (err) { if (err && err.name !== 'AbortError') toast('Paylaşılamadı: ' + link, 6000); }
  };
  if (hasBackend && navigator.onLine !== false) {
    getSpeciesPhotos(s.id).then((rows) => {
      const el = document.getElementById('ph');
      if (!el || !rows.length) return;
      el.innerHTML = `<h3 class="section-title">Kullanıcı fotoğrafları (${rows.length})</h3>
        <div class="note">Kullanıcı katkısıdır; uzman doğrulaması yapılmamıştır.</div>
        <div class="pgrid">${rows.map((r) => `<figure><img loading="lazy" alt="${esc(s.name)} – kullanıcı fotoğrafı" src="data:image/jpeg;base64,${r.photo_data}"><figcaption>Fotoğraf: ${esc(r.photo_author || 'Anonim')} · CC BY-SA 4.0</figcaption></figure>`).join('')}</div>`;
      el.querySelectorAll('.pgrid img').forEach((img) => img.onclick = () => {
        const o = document.createElement('div');
        o.className = 'lightbox'; o.innerHTML = `<img alt="" src="${img.src}">`;
        o.onclick = () => o.remove();
        document.body.appendChild(o);
      });
    }).catch(() => {});
  }
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
      ${hasBackend ? `<div class="panel" id="photobox"><b>📷 Fotoğraf (isteğe bağlı)</b>
        <p class="note">Gördüğünüz türün fotoğrafını ekleyebilirsiniz. Fotoğraftaki konum ve cihaz bilgisi (EXIF) silinir; yönetici onayından sonra türün sayfasında gösterilir.</p>
        <div class="row"><button type="button" class="btn" id="camopen">📷 Fotoğraf çek</button>
        <button type="button" class="btn ghost" id="galopen">🖼️ Galeriden seç</button></div>
        <input type="file" id="photo" accept="image/*" hidden>
        <input type="file" id="photocap" accept="image/*" capture="environment" hidden>
        <div id="camview" class="camview" hidden><video id="camvid" playsinline muted autoplay></video>
          <div class="row"><button type="button" class="btn" id="camshot">⚪ Çek</button><button type="button" class="btn ghost" id="camclose">Vazgeç</button></div></div>
        <div id="photoprev"></div>
        <div id="photoopts" hidden>
          <label>Fotoğraf sahibi adı (isteğe bağlı)<input name="pauthor" maxlength="60" placeholder="Boş bırakırsanız “Anonim” yazılır" autocomplete="off"></label>
          <label class="chk"><input type="checkbox" name="pconsent"> <span>Bu fotoğrafı ben çektim; CC BY-SA 4.0 lisansıyla, adım belirtilerek bu uygulamada gösterilmesine izin veriyorum.</span></label>
          <button type="button" class="btn ghost" id="photorm">Fotoğrafı kaldır</button>
        </div></div>` : ''}
      <label>Tür adı<input name="name" list="sp" required placeholder="Listeden seçin veya yeni tür yazın" value="${esc(preselect ? byId.get(preselect)?.name : '')}" autocomplete="off"></label>
      <datalist id="sp">${species.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist>
      <div class="row"><button type="button" class="btn ghost" id="gps">📍 Konumumu kullan</button></div>
      <div id="gpshelp"></div>
      <p class="note">Ya da türü gördüğünüz yere haritada dokunarak işaretleyin.</p>
      <div id="pm" class="map"></div>
      <input name="lat" type="hidden"><input name="lng" type="hidden">
      <p class="note" id="pick">Konum henüz seçilmedi.</p>
      <label>Not (isteğe bağlı)<textarea name="note" rows="3" maxlength="500"></textarea></label>
      <div class="row"><button type="button" class="btn ghost" id="ai">✨ Tür bilgisini yapay zekâ ile doldur (demo)</button></div>
      <div id="aiout"></div>
      <button class="btn" type="submit" id="send">Gönder</button>
      <p class="note">Kayıtlar yönetici onayından sonra yayınlanır. Spam'i önlemek için dakikada en fazla 5 kayıt gönderilebilir. Hangi bilgilerin toplandığını <a href="#/gizlilik">Gizlilik sayfasında</a> okuyabilirsiniz.</p>
    </form>`, 'add');
  const f = document.getElementById('f');
  dirtyCheck = () => !!(f.name.value.trim() || f.note.value.trim() || f.lat.value || document.getElementById('photoprev')?.innerHTML);
  let ai = null;
  // Konum, GPS ile ya da haritaya dokunarak seçilir (koordinat yazmak gerekmez).
  map = L.map('pm').setView([39, 35], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
  let marker = null;
  const setPoint = (lat, lng) => {
    f.lat.value = lat.toFixed(6); f.lng.value = lng.toFixed(6);
    if (marker) marker.setLatLng([lat, lng]); else marker = L.circleMarker([lat, lng], { radius: 9, color: '#e8b84a', fillOpacity: 0.8 }).addTo(map);
    document.getElementById('pick').textContent = `Kaydedilecek yaklaşık konum: ${blurCoord(lat).toFixed(3)}, ${blurCoord(lng).toFixed(3)} (gizlilik için ≈5 km'ye yuvarlanır; türün tam yeri paylaşılmaz).`;
  };
  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng));
  document.getElementById('gps').onclick = () => navigator.geolocation.getCurrentPosition((p) => {
    setPoint(p.coords.latitude, p.coords.longitude);
    map.setView([p.coords.latitude, p.coords.longitude], 13);
    document.getElementById('gpshelp').innerHTML = '';
  }, (err) => {
    const why = err.code === 1 ? 'Konum izni kapalı görünüyor.' : err.code === 3 ? 'Konum zamanında alınamadı.' : 'Konum alınamadı (telefonun konum/GPS özelliği kapalı olabilir).';
    document.getElementById('gpshelp').innerHTML = `<div class="panel"><b>${why}</b>
      <p class="note">Açmak için:<br>
      • <b>Android (Chrome):</b> adres çubuğunun solundaki simgeye (kilit) dokunun → <i>İzinler</i> → <i>Konum</i> → <i>İzin ver</i>, sonra sayfayı yenileyin.<br>
      • <b>iPhone (Safari):</b> Ayarlar → Gizlilik ve Güvenlik → Konum Servisleri → Safari Web Siteleri → <i>Uygulamayı Kullanırken</i>.<br>
      • Sayfa WhatsApp, Instagram gibi başka bir uygulamanın içinde açıldıysa izin menüsü çıkmaz: ⋮ menüsünden <i>Tarayıcıda aç</i> deyip Chrome/Safari'de açın.</p>
      <p class="note"><b>Hiçbiri olmadıysa sorun değil:</b> aşağıdaki haritaya dokunarak konumu seçebilirsiniz.</p></div>`;
  }, { enableHighAccuracy: true, timeout: 15000 });
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
  // Fotoğraf: seçilince küçültülür, EXIF silinir, önizleme gösterilir.
  let photo = null;
  const photoIn = document.getElementById('photo');
  if (photoIn) {
    const capIn = document.getElementById('photocap');
    const view = document.getElementById('camview'), vid = document.getElementById('camvid');
    let stream = null;
    const stopCam = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; vid.srcObject = null; view.hidden = true; };
    cleanup = stopCam;
    const useFile = async (file, input) => {
      if (!file) return;
      try {
        photo = await prepareImage(file);
        document.getElementById('photoprev').innerHTML = `<img class="pphoto" alt="Seçilen fotoğraf" src="${photo.dataUrl}">`;
        document.getElementById('photoopts').hidden = false;
      } catch (err) { photo = null; if (input) input.value = ''; toast(err.message || 'Fotoğraf işlenemedi.'); }
    };
    photoIn.onchange = () => useFile(photoIn.files[0], photoIn);
    capIn.onchange = () => { useFile(capIn.files[0], capIn); if (!f.lat.value) document.getElementById('gps').click(); };
    document.getElementById('galopen').onclick = () => photoIn.click();
    document.getElementById('camopen').onclick = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return capIn.click();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } }, audio: false });
        vid.srcObject = stream; view.hidden = false; await vid.play().catch(() => {});
        view.scrollIntoView({ block: 'center' });
        // Konumu şimdiden iste: çekim bitince hazır olsun.
        if (!f.lat.value) document.getElementById('gps').click();
      } catch (err) {
        stopCam();
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) toast('Kamera izni verilmedi; telefonun kamerasını açıyorum.', 4000);
        capIn.click();
      }
    };
    document.getElementById('camclose').onclick = stopCam;
    document.getElementById('camshot').onclick = () => {
      if (!vid.videoWidth) return toast('Kamera henüz hazır değil, bir saniye bekleyin.');
      const c = document.createElement('canvas'); c.width = vid.videoWidth; c.height = vid.videoHeight;
      c.getContext('2d').drawImage(vid, 0, 0);
      c.toBlob((b) => { stopCam(); if (b) useFile(new File([b], 'kamera.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
    };
    document.getElementById('photorm').onclick = () => {
      photo = null; photoIn.value = ''; capIn.value = '';
      document.getElementById('photoprev').innerHTML = '';
      document.getElementById('photoopts').hidden = true;
    };
  }
  // Hak dolunca "Gönder" düğmesi 60 saniye geri sayım gösterir.
  let timer = null;
  const tick = () => {
    const btn = document.getElementById('send');
    if (!btn) { clearInterval(timer); return; }
    const w = waitSeconds();
    btn.disabled = w > 0;
    btn.textContent = w > 0 ? `Bekleyin: ${w} sn` : 'Gönder';
    if (w <= 0) { clearInterval(timer); timer = null; }
  };
  const startCountdown = () => { tick(); if (!timer && waitSeconds() > 0) timer = setInterval(tick, 500); };
  startCountdown();
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.lat.value) return toast('Önce konumu seçin: haritaya dokunun veya “Konumumu kullan”a basın.');
    if (photo && !f.pconsent.checked) return toast('Fotoğraf için izin kutusunu işaretleyin (fotoğrafı siz çektiniz ve paylaşılmasına izin veriyorsunuz).', 5000);
    const name = f.name.value.trim();
    const known = species.find((s) => s.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'));
    try {
      const r = await addSighting({ species_id: known ? known.id : 'yeni:' + name.toLocaleLowerCase('tr'), species_name: name, lat: +f.lat.value, lng: +f.lng.value, note: f.note.value.trim(), ai_info: ai, photo: photo ? { b64: photo.b64, author: f.pauthor.value } : null });
      toast(r.queued ? (photo ? 'İnternet yok: kayıt ve fotoğrafınız bu cihaza alındı, bağlantı gelince otomatik gönderilecek.' : 'İnternet yok: kayıt bu cihaza alındı, bağlantı gelince otomatik gönderilecek.') : photo ? 'Gönderildi. Kayıt ve fotoğrafınız onaydan sonra yayınlanacak.' : r.local ? 'Kaydedildi (yalnızca bu cihazda).' : 'Gönderildi. Onaydan sonra yayınlanacak.', 5000);
      location.hash = '#/';
    } catch (err) {
      if (err.rate) { toast(err.message, 5000); startCountdown(); return; }
      console.error(err); toast('Gönderilemedi: ' + (err.message || 'bilinmeyen hata'));
    }
  };
}

// ---------- Ayarlar ----------
let chatLog = []; // {role:'user'|'assistant', text, ids}
function viewChat() {
  shell(`<a class="back" href="#/">← Türler</a>
    <h2 class="section-title">💬 Endemik'e sor</h2>
    <p class="note">Türün nerede yaşadığını, neye benzediğini, ne zaman çiçek açtığını, korunma durumunu ya da bir yerde hangi türlerin bulunduğunu sorabilirsiniz. Cevapları, proje grubumuzun sıfırdan yazıp eğittiği küçük bir dil modeli telefonunuzda yazar (ilk açılışta yaklaşık 2 MB model indirilir). Sorularınız hiçbir yere gönderilmez. Model bilgiyi kayıtlardan okur; kayıtta olmayan bir şeyi söylerse cevap hazır kalıba döner. Yalnızca uygulamadaki 94 türün kayıtlarını bilir.</p>
    <div class="chatbox" id="chat" aria-live="polite"></div>
    <form class="chatform" id="cf"><input id="cq" maxlength="400" placeholder="Örn. Kelaynak nerede yaşar?" autocomplete="off" required>
      <button class="btn" id="cs" type="submit">Gönder</button></form>`, 'home');
  const box = document.getElementById('chat'), inp = document.getElementById('cq'), btn = document.getElementById('cs');
  const bubble = (m) => `<div class="msg ${m.role}">${esc(m.text).replace(/\n/g, '<br>')}${m.source ? `<div class="src">${m.source === 'model' ? '🤖 Cevabı model yazdı' : m.source === 'karisik' ? '🤖 Kısmen model, kısmen hazır kalıp' : 'Hazır kalıp (model cevabı doğrulanamadı)'}</div>` : ''}${m.ids?.length ? `<div class="refs">${m.ids.map((i) => byId.get(i)).filter(Boolean).map((t) => `<a href="#/tur/${t.id}">${esc(t.name)} ↗</a>`).join(' ')}</div>` : ''}</div>`;
  const draw = () => {
    box.innerHTML = chatLog.length ? chatLog.map(bubble).join('') : '<div class="msg assistant">Merhaba! Ben Endemik. Türkiye\'nin endemik türleri hakkında soru sorabilirsiniz.</div>';
    box.scrollTop = box.scrollHeight;
  };
  draw(); preloadLM();
  document.getElementById('cf').onsubmit = async (e) => {
    e.preventDefault();
    const q = inp.value.trim();
    if (!q) return;
    const lastIds = chatLog.slice().reverse().find((x) => x.ids?.length)?.ids || []; // "Nerede yaşar?" gibi devam soruları
    chatLog.push({ role: 'user', text: q });
    inp.value = ''; inp.disabled = btn.disabled = true;
    draw(); box.insertAdjacentHTML('beforeend', '<div class="msg assistant" id="typing">Yazıyor…</div>'); box.scrollTop = box.scrollHeight;
    const r = await ask(q, { lastIds });
    chatLog.push({ role: 'assistant', text: r.text, ids: r.ids, source: r.source });
    inp.disabled = btn.disabled = false;
    draw(); inp.focus();
  };
}

function viewPrivacy() {
  shell(`<a class="back" href="#/ayarlar">← Ayarlar</a>
    <h2 class="section-title">Gizlilik ve veri kullanımı</h2>
    <div class="panel"><b>Kısaca</b>
      <p>Hesap açmanız ya da adınızı, e-postanızı vermeniz gerekmez. Yalnızca siz gönderirseniz bir tür kaydı, isteğe bağlı bir not ve fotoğraf paylaşılır. Konumunuz tam olarak değil, yaklaşık olarak saklanır.</p></div>
    <div class="panel"><b>Kayıt gönderirseniz neler saklanır?</b>
      <ul><li><b>Tür adı ve notunuz.</b> Notu siz yazarsınız; kişisel bilgi yazmamanızı öneririz.</li>
      <li><b>Yaklaşık konum.</b> Gördüğünüz yer, yaklaşık 5 km'lik bir karenin ortasına yuvarlanır. Tam nokta ne sunucuya kaydedilir ne de haritada görünür. Amaç, nadir türlerin tam yerinin öğrenilmemesidir.</li>
      <li><b>Fotoğraf (isteğe bağlı).</b> Fotoğrafı eklemek sizin kararınızdır. Fotoğraftaki konum, tarih ve cihaz bilgisi gönderilmeden önce silinir.</li>
      <li><b>İnternet adresiniz (IP), geçici.</b> Sistemin kötüye kullanılmaması için en fazla 10 dakika tutulur, sonra silinir ve kaydınızla ilişkilendirilmez.</li>
      <li><b>Fotoğraf sahibi adı (isteğe bağlı).</b> Yazarsanız fotoğrafın altında herkese görünür. Boş bırakırsanız “Anonim” yazılır.</li></ul></div>
    <div class="panel"><b>Kimler görür?</b>
      <p>Kaydınız önce yalnızca proje yöneticisine görünür. Onaylanırsa tür sayfasında ve haritada herkese gösterilir. Onaylanmayan kayıtlar yayınlanmaz.</p>
      <p>Fotoğraf göndermek için, fotoğrafı sizin çektiğinizi ve <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.tr" target="_blank" rel="noopener">CC BY-SA 4.0</a> lisansıyla, adınız belirtilerek bu uygulamada gösterilmesine izin verdiğinizi onaylarsınız.</p></div>
    <div class="panel"><b>Kamera</b>
      <p>Kamera yalnızca “Fotoğraf çek” düğmesine bastığınızda açılır ve fotoğrafı çektiğinizde ya da vazgeçtiğinizde kapanır. Görüntü kaydedilmez. Çekilen fotoğraf, siz “Gönder”e basmadıkça cihazınızdan çıkmaz.</p></div>
    <div class="panel"><b>Konumunuz ve bildirimler</b>
      <p>“Konumumu kullan” ve yakındaki tür bildirimi için konumunuz yalnızca telefonunuzda kullanılır. Bildirim için konumunuz sunucuya gönderilmez. Konum iznini tarayıcı ayarlarından istediğiniz zaman kapatabilirsiniz.</p></div>
    <div class="panel"><b>Sohbet botu</b>
      <p>“Sor” bölümündeki sohbet botu telefonunuzda çalışır. Yazdığınız sorular hiçbir yere gönderilmez ve saklanmaz; sayfayı kapatınca sohbet silinir.</p></div>
    <div class="panel"><b>Başka kimler veri alır?</b>
      <ul><li><b>Supabase:</b> Kayıtlar bu hizmette saklanır.</li>
      <li><b>OpenStreetMap:</b> Harita açıldığında harita parçaları OpenStreetMap sunucularından indirilir; bu sunucular internet adresinizi görebilir.</li>
      <li><b>GitHub:</b> Site GitHub Pages üzerinde yayınlanır.</li></ul>
      <p>Reklam ya da izleme (analitik) aracı kullanmıyoruz.</p></div>
    <div class="panel"><b>Cihazınızda saklananlar</b>
      <p>Tema ve ayarlarınız, indirilen fotoğraflar ve internet yokken gönderdiğiniz bekleyen kayıtlar yalnızca cihazınızda tutulur.</p></div>
    <div class="panel"><b>Kaydımı sildirmek istiyorum</b>
      <p>Hesap olmadığı için kayıtlar kişiye bağlanmaz. Gönderdiğiniz bir kaydın ya da fotoğrafın kaldırılmasını istiyorsanız, hangi tür ve yaklaşık hangi tarihte gönderdiğinizi <a href="mailto:bilsemprojegrubu@gmail.com">bilsemprojegrubu@gmail.com</a> adresine yazın ya da <a href="https://github.com/Bilsem-Proje-Grubu/endemik/issues" target="_blank" rel="noopener">proje sayfasından</a> bildirin; yönetici kaldırır.</p></div>
    <p class="note">Bu sayfa projenin çalışma biçimini açıklar; hukuki danışmanlık değildir. Bu bir öğrenci projesidir ve ticari amaç taşımaz.</p>`, 'set');
}

function viewSettings() {
  const on = notifyEnabled();
  const local = getLocalSightings();
  shell(`<h2 class="section-title">Ayarlar</h2>
    <div class="panel"><b>Yakındaki tür bildirimi</b>
      <p class="note">Bir türün yayılış lokalitesine girdiğinizde bildirim gönderilir. Tarayıcı tabanlı (PWA) olduğu için güvenilir çalışması uygulama açıkken ya da kısa süre arka plandayken mümkündür.</p>
      <button class="btn ${on ? 'ghost' : ''}" id="nt">${on ? 'Bildirimi kapat' : 'Bildirimi aç'}</button>
      <div id="st" class="sci"></div></div>
    <div class="panel"><b>Çevrimdışı kullanım</b>
      <p class="note">Tür bilgileri ve harita daireleri uygulama bir kez açıldıktan sonra internetsiz de çalışır. Fotoğrafları da telefona indirmek için aşağıdaki düğmeyi kullanın. Harita zemini (yol/arazi çizimi) yalnızca daha önce görüntülediğiniz bölgelerde görünür.</p>
      <div id="offst" class="sci"></div>
      <label class="chk"><input type="checkbox" id="offauto"> Wi‑Fi'deyken fotoğrafları otomatik indir <small>(mobil veride önce size sorulur)</small></label>
      <div class="row"><button class="btn" id="offdl">📥 Fotoğrafları indir</button></div></div>
    <div class="panel"><b>Gezinme</b>
      <label class="chk"><input type="checkbox" id="swon"> Ekranı yana kaydırarak sekme değiştir</label>
      <label class="chk"><input type="checkbox" id="swnat"> Yönü ters çevir <small>(kapalıyken: sola kaydırınca sağdaki sekmeye, sağa kaydırınca soldaki sekmeye geçilir)</small></label>
      <p class="note">Harita, metin kutuları ve yana kayan düğme satırları üzerinde kaydırma o öğeye aittir; sekme değişmez. Lokalite ekle sayfasında yazdığınız bir şey varsa kaydırarak çıkılmaz.</p></div>
    <div class="panel"><b>Tema</b>
      <div class="themes" id="theme">${[['auto', '🌓 Otomatik', null], ...Object.entries(PRESETS).map(([k, p]) => [k, p.label, p.swatch])].map(([k, l, sw]) => `<button class="tbtn ${getTheme() === k ? 'on' : ''}" data-t="${k}"><span class="sw">${(sw || []).map((c) => `<i style="background:${c}"></i>`).join('')}</span>${l}</button>`).join('')}</div>
      <p class="note">Otomatik: telefonunuzun koyu/açık ayarını izler. WhatsApp, Valorant ve Duolingo temaları yalnızca renk paletlerinden esinlenmiştir; bu markalarla bağlantımız yoktur.</p>
      <details class="custom" ${getTheme() === 'custom' ? 'open' : ''}><summary>🎨 Kendi temanı oluştur</summary>
        ${[['bg', 'Arka plan'], ['bg2', 'Kartlar ve paneller'], ['accent', 'Düğmeler / vurgu'], ['text', 'Yazılar']].map(([k, l]) => `<div class="pick"><span>${l}</span><input type="color" data-c="${k}" value="${getCustom()[k]}"></div>`).join('')}
        <div id="twarn"></div>
        <div class="row"><button class="btn ghost" id="treset">Sıfırla</button></div>
      </details></div>
    <div id="srv"></div>
    ${local.length ? `<div class="panel"><p>Bu cihazda gönderilmemiş ${local.length} kayıt var.</p></div>` : ''}
    <div class="panel"><b>Hakkında</b><p>Veriler Doğa Koruma ve Milli Parklar Genel Müdürlüğü <a href="${LIST_PAGE}" target="_blank" rel="noopener">Tür Eylem Planları</a> sayfasından alınmıştır. Lokaliteler yaklaşık konumdur.</p>
      <p><a href="#/gizlilik">Gizlilik ve veri kullanımı</a></p>
      <p><a href="#/yonetim">Yönetici girişi</a></p></div>`, 'set');
  const swon = document.getElementById('swon'), swnat = document.getElementById('swnat');
  swon.checked = swipeEnabled(); swnat.checked = swipeReverse(); swnat.disabled = !swon.checked;
  swon.onchange = () => { setSwipeEnabled(swon.checked); swnat.disabled = !swon.checked; };
  swnat.onchange = () => setSwipeReverse(swnat.checked);
  const offStatus = async () => {
    const el = document.getElementById('offst'), btn = document.getElementById('offdl');
    if (!el) return;
    if (!offline.supported()) { el.textContent = 'Bu tarayıcı çevrimdışı önbelleği desteklemiyor.'; btn.disabled = true; return; }
    const { have, need } = await offline.counts(species);
    el.textContent = have >= need ? `Fotoğraflar indirildi (${have}/${need}) ✓` : `Fotoğraflar: ${have}/${need} indirildi.`;
    btn.textContent = have >= need ? '✓ Hazır, tekrar kontrol et' : '📥 Fotoğrafları indir (~6 MB)';
  };
  const auto = document.getElementById('offauto');
  auto.checked = offline.autoEnabled();
  auto.onchange = () => offline.setAutoEnabled(auto.checked);
  document.getElementById('offdl').onclick = async (e) => {
    if (!offline.supported()) return;
    if (navigator.onLine === false) return toast('İndirmek için internet gerekir.');
    e.target.disabled = true;
    await offline.download(species, (done, total) => { const el = document.getElementById('offst'); if (el) el.textContent = `İndiriliyor… ${done}/${total}`; });
    await offStatus();
    const btn = document.getElementById('offdl'); if (btn) btn.disabled = false;
  };
  offStatus();
  // Sunucu durumu yalnızca yönetici oturumu açıkken görünür.
  if (hasBackend) adminSession().then((ses) => {
    const el = document.getElementById('srv');
    if (ses && el) el.innerHTML = '<div class="panel"><b>Sunucu durumu</b><p>Supabase bağlı.</p>' + (import.meta.env.VITE_PR_NUMBER ? `<p class="note">Site sürümü: PR #${esc(import.meta.env.VITE_PR_NUMBER)}</p>` : '') + '</div>';
  }).catch(() => {});
  const warn = () => { document.getElementById('twarn').innerHTML = customWarnings(getCustom()).map((m) => `<div class="note">${m}</div>`).join(''); };
  const mark = () => document.querySelectorAll('#theme button').forEach((x) => x.classList.toggle('on', x.dataset.t === getTheme()));
  document.querySelectorAll('#theme button').forEach((b) => b.onclick = () => {
    setTheme(b.dataset.t); mark();
    document.querySelectorAll('[data-c]').forEach((i) => { i.value = getCustom()[i.dataset.c]; });
    warn();
  });
  document.querySelectorAll('[data-c]').forEach((i) => i.oninput = () => { setCustomColor(i.dataset.c, i.value); mark(); warn(); });
  document.getElementById('treset').onclick = () => {
    resetTheme(); mark();
    document.querySelectorAll('[data-c]').forEach((i) => { i.value = getCustom()[i.dataset.c]; });
    warn();
  };
  if (getTheme() === 'custom') warn();
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
  const [pending, live] = await Promise.all([adminList('pending'), adminList('approved')]);
  const card = (p, btns) => `<div class="panel"><b>${esc(p.species_name)}</b>${p.photo_consent ? ' <span class="badge loc">📷 fotoğraflı</span>' : ''}<div class="sci">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${new Date(p.created_at).toLocaleDateString('tr')}</div>
      <p>${esc(p.note)}</p>
      ${p.photo_data ? `<img class="pphoto" alt="Kullanıcı fotoğrafı" src="data:image/jpeg;base64,${esc(p.photo_data)}"><div class="sci">Fotoğraf sahibi: ${esc(p.photo_author || 'Anonim')} · CC BY-SA 4.0 izni onaylandı</div>` : ''}
      <div class="row">${btns}</div></div>`;
  const del = (p) => `<button class="btn danger" data-del="${esc(p.id)}" data-name="${esc(p.species_name)}">Sil</button>`;
  shell(`<a class="back" href="#/ayarlar">←</a><h2 class="section-title">Onay bekleyenler (${pending.length})</h2>
    ${pending.map((p) => card(p, `<button class="btn" data-a="approved" data-id="${esc(p.id)}">Onayla</button><button class="btn ghost" data-a="rejected" data-id="${esc(p.id)}">Reddet</button>${del(p)}`)).join('') || '<div class="empty">Bekleyen kayıt yok.</div>'}
    <h2 class="section-title">Yayındaki kayıtlar (${live.length})</h2>
    ${live.map((p) => card(p, del(p))).join('') || '<div class="empty">Yayında kullanıcı kaydı yok.</div>'}
    <button class="btn ghost" id="lo">Çıkış</button>`, 'set');
  document.querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => {
    try { await adminSetStatus(b.dataset.id, b.dataset.a); approved = await getApprovedSightings(); viewAdmin(); } catch (err) { toast('İşlem başarısız: ' + (err.message || 'bilinmeyen hata')); }
  });
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm(`“${b.dataset.name}” kaydı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    try { await adminDelete(b.dataset.del); approved = await getApprovedSightings(); toast('Kayıt silindi.'); viewAdmin(); } catch (err) { toast('Silinemedi: ' + (err.message || 'bilinmeyen hata')); }
  });
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
  if (path === '/gizlilik') return viewPrivacy();
  if (path === '/sohbet') return viewChat();
  if (path === '/yonetim') return viewAdmin();
  viewHome();
}
window.addEventListener('hashchange', route);

// Sekme sırası (alt menüyle aynı): Türler, Harita, Lokalite ekle, Ayarlar.
const TABS = ['#/', '#/harita', '#/ekle', '#/ayarlar'];
function currentTab() {
  const path = location.hash.replace(/^#/, '').split('?')[0];
  if (path === '/harita') return 1;
  if (path === '/ekle') return 2;
  if (path === '/ayarlar' || path === '/yonetim' || path === '/gizlilik') return 3;
  return 0; // ana sayfa ve tür sayfaları
}
initSwipe({
  tabs: TABS,
  current: currentTab,
  blocked: () => { if (dirtyCheck && dirtyCheck()) { toast('Formda yazdıklarınız var; alt menüden geçebilirsiniz.', 2500); return true; } return false; },
  go: (i, dir) => {
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) slideDir = dir;
    location.hash = TABS[i];
  },
});

initTheme();
window.addEventListener('offline', () => toast('İnternet bağlantısı yok. Kayıtlar bu cihaza alınır.', 4000));
window.addEventListener('online', async () => {
  const n = await flushQueue().catch(() => 0);
  toast(n ? `Bağlantı geldi: bekleyen ${n} kayıt gönderildi.` : 'İnternet bağlantısı geri geldi.', 4000);
});
flushQueue().catch(() => {});

// Mobil veride fotoğraf indirmek için izin kartı (ekranın altında, bildirim gibi).
function askDownload(cb) {
  if (document.getElementById('askcard')) return;
  // Form doldururken (Lokalite ekle) veya yönetici sayfasında kart çıkmaz; sayfadan ayrılınca gösterilir.
  const busy = () => /^#\/(ekle|yonetim)/.test(location.hash);
  if (busy()) {
    const again = () => { if (!busy()) { window.removeEventListener('hashchange', again); askDownload(cb); } };
    window.addEventListener('hashchange', again);
    return;
  }
  const d = document.createElement('div');
  d.id = 'askcard'; d.className = 'askcard';
  d.innerHTML = `<b>Fotoğraflar internetsiz de görünsün mü?</b>
    <p>Mobil veri kullanıyorsunuz. Tür fotoğraflarını telefona indirmek yaklaşık 6 MB veri harcar.</p>
    <div class="row"><button class="btn" id="askyes">İndir</button><button class="btn ghost" id="askno">Şimdi değil</button></div>`;
  document.body.appendChild(d);
  const done = (yes) => { d.remove(); cb(yes); };
  d.querySelector('#askyes').onclick = () => done(true);
  d.querySelector('#askno').onclick = () => done(false);
}
offline.initAuto({ species, toast, ask: askDownload });
getApprovedSightings().then((a) => {
  approved = a;
  // Harita/tür sayfası kayıtlar gelmeden çizilmiş olabilir; yeniden çiz (form sayfalarına dokunma).
  if (/^#\/(harita|tur\/)/.test(location.hash)) route();
});
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
// Bildirim açıksa uygulama yeniden açıldığında izlemeyi sürdür.
if (notifyEnabled()) startWatching(() => species, () => approved).catch(() => {});
