import { createClient } from '@supabase/supabase-js';
import { waitSeconds, recordSend, blockNow, limitMessage } from './ratelimit.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const hasBackend = !!supabase;

const LOCAL_KEY = 'endemik.sightings';

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function writeLocal(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); return true; } catch { return false; }
}

// Gizlilik: kayıt konumu yaklaşık 5 km'lik ızgaranın (0,05°) merkezine yuvarlanır; türün tam yeri saklanmaz.
// Aynı yuvarlama veritabanında da uygulanır (supabase/location-privacy.sql).
const GRID = 0.05;
export const blurCoord = (v) => Math.round((Math.floor(v / GRID) * GRID + GRID / 2) * 1000) / 1000;
export const USER_RADIUS_KM = 5;

// Yeni lokalite kaydı her zaman "pending" (onay bekliyor) olarak girer.
const isNetworkError = (e) => /failed to fetch|networkerror|network request failed|load failed|fetch/i.test(e?.message || '') && !e?.code;

function queueRow(row) {
  const list = readLocal();
  list.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), queued: true });
  // Fotoğraflı kayıtlar büyük olduğundan cihaz belleği dolabilir; sessizce kaybetmeyiz.
  if (!writeLocal(list)) throw new Error('Cihaz belleği dolu: kayıt bu cihaza alınamadı. Önce bekleyen kayıtların gitmesini bekleyin veya fotoğrafı kaldırın.');
  recordSend();
  return { local: true, queued: true };
}

// Kuyruktaki (internet yokken alınan) kayıtları gönderir; kaç tanesinin gittiğini döndürür.
export async function flushQueue() {
  if (!supabase || navigator.onLine === false) return 0;
  let sent = 0;
  for (const item of readLocal().filter((x) => x.queued)) {
    if (waitSeconds() > 0) break;
    const { id, created_at, local, queued, ...row } = item;
    const { error } = await supabase.from('sightings').insert(row);
    if (error) {
      if (error.code === '42501' || /row-level security/i.test(error.message || '')) blockNow();
      break;
    }
    recordSend();
    writeLocal(readLocal().filter((x) => x.id !== item.id));
    sent++;
  }
  return sent;
}

export async function addSighting(s) {
  const wait = waitSeconds();
  if (wait > 0) throw Object.assign(new Error(limitMessage(wait)), { rate: true });
  const row = {
    species_id: s.species_id,
    species_name: s.species_name,
    lat: blurCoord(s.lat),
    lng: blurCoord(s.lng),
    note: s.note || '',
    ai_info: s.ai_info || null,
    status: 'pending',
  };
  if (s.photo) {
    // İnternet yoksa fotoğraflı kayıt da cihaz kuyruğuna alınır (aşağıda); bağlantı gelince gönderilir.
    if (!supabase) throw new Error('Fotoğraf göndermek için sunucu bağlantısı gerekir.');
    row.photo_data = s.photo.b64;
    row.photo_author = (s.photo.author || '').trim().slice(0, 60) || null;
    row.photo_consent = true;
  }
  if (!supabase) {
    const list = readLocal();
    list.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), local: true });
    writeLocal(list);
    recordSend();
    return { local: true };
  }
  // İnternet yoksa kayıt bu cihazın kuyruğuna alınır; bağlantı gelince flushQueue ile gönderilir.
  if (navigator.onLine === false) return queueRow(row);
  const { error } = await supabase.from('sightings').insert(row);
  if (error) {
    if (isNetworkError(error)) {
      return queueRow(row);
    }
    // Veritabanındaki hız sınırı kuralı (rate-limit.sql) reddederse satır güvenlik ihlali (42501) döner.
    if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
      blockNow();
      throw Object.assign(new Error(limitMessage(waitSeconds())), { rate: true });
    }
    if (row.photo_data && noColumn(error)) throw new Error('Fotoğraf özelliği sunucuda henüz etkinleştirilmemiş. Fotoğrafı kaldırıp tekrar deneyin.');
    throw error;
  }
  recordSend();
  return { local: false };
}

// Herkese açık: yalnızca onaylı kayıtlar.
// Liste sorgularında fotoğraf metnini (photo_data) çekmeyiz; yalnızca fotoğraf olup olmadığını (photo_consent) alırız.
const LIST_COLS = 'id,species_id,species_name,lat,lng,note,status,created_at,photo_consent,photo_author';
// supabase/photos.sql henüz çalıştırılmadıysa fotoğraf sütunları yoktur (42703); o zaman temel sütunlarla devam edilir.
const noColumn = (e) => e && (e.code === '42703' || e.code === 'PGRST204' || /column .* does not exist|could not find .* column/i.test(e.message || ''));
async function listRows(status, cols) {
  let r = await supabase.from('sightings').select(cols).eq('status', status).order('created_at', { ascending: false });
  if (r.error && noColumn(r.error)) r = await supabase.from('sightings').select('*').eq('status', status).order('created_at', { ascending: false });
  return r;
}

export async function getApprovedSightings() {
  if (!supabase) return [];
  const { data, error } = await listRows('approved', LIST_COLS);
  if (error) { console.warn(error); return []; }
  return data;
}

export function getLocalSightings() { return readLocal(); }

// Yönetici işlemleri (Supabase Auth ile giriş gerekir; RLS sunucuda zorlar).
export async function adminLogin(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function adminLogout() { await supabase.auth.signOut(); }
export async function adminSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export async function adminList(status) {
  const { data, error } = await listRows(status, status === 'pending' ? '*' : LIST_COLS);
  if (error) throw error;
  return data;
}
export async function adminSetStatus(id, status) {
  const { error } = await supabase.from('sightings').update({ status }).eq('id', id);
  if (error) throw error;
}
// Kaydı kalıcı olarak siler. Silinen satır yoksa (yetki yok / kayıt yok) hata verir.
export async function adminDelete(id) {
  const { data, error } = await supabase.from('sightings').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || !data.length) throw new Error('Kayıt silinemedi.');
}

// Bir türün onaylanmış kullanıcı fotoğrafları (en yeni 12).
export async function getSpeciesPhotos(speciesId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('sightings').select('id,photo_data,photo_author,created_at')
    .eq('species_id', speciesId).eq('status', 'approved').not('photo_data', 'is', null)
    .order('created_at', { ascending: false }).limit(12);
  if (error) { console.warn(error); return []; }
  return data;
}
