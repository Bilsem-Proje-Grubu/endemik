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
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* yoksay */ }
}

// Gizlilik: kayıt konumu yaklaşık 5 km'lik ızgaranın (0,05°) merkezine yuvarlanır; türün tam yeri saklanmaz.
// Aynı yuvarlama veritabanında da uygulanır (supabase/location-privacy.sql).
const GRID = 0.05;
export const blurCoord = (v) => Math.round((Math.floor(v / GRID) * GRID + GRID / 2) * 1000) / 1000;
export const USER_RADIUS_KM = 5;

// Yeni lokalite kaydı her zaman "pending" (onay bekliyor) olarak girer.
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
  if (!supabase) {
    const list = readLocal();
    list.push({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), local: true });
    writeLocal(list);
    recordSend();
    return { local: true };
  }
  const { error } = await supabase.from('sightings').insert(row);
  if (error) {
    // Veritabanındaki hız sınırı kuralı (rate-limit.sql) reddederse satır güvenlik ihlali (42501) döner.
    if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
      blockNow();
      throw Object.assign(new Error(limitMessage(waitSeconds())), { rate: true });
    }
    throw error;
  }
  recordSend();
  return { local: false };
}

// Herkese açık: yalnızca onaylı kayıtlar.
export async function getApprovedSightings() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('sightings').select('*').eq('status', 'approved');
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
  const { data, error } = await supabase.from('sightings').select('*').eq('status', status).order('created_at', { ascending: false });
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
