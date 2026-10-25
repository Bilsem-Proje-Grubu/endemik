// Spam önleme: dakikada en fazla 5 kayıt. Hak dolunca 60 saniye beklenir.
// Bu sınır tarayıcıdadır (kolay aşılabilir); asıl koruma veritabanında (supabase/rate-limit.sql).
const KEY = 'endemik.sendlimit';
export const MAX_SENDS = 5;
const WINDOW_MS = 60 * 1000;
const BLOCK_MS = 60 * 1000;

function read() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.times)) return s; } catch { /* varsayılan */ }
  return { times: [], until: 0 };
}
function write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* yoksay */ } }

// Beklemesi gereken saniye (0 ise gönderebilir).
export function waitSeconds() {
  const s = read(), now = Date.now();
  return s.until > now ? Math.ceil((s.until - now) / 1000) : 0;
}

// Başarılı gönderimden sonra çağrılır; 5. kayıtta 60 saniyelik bekleme başlar.
export function recordSend() {
  const now = Date.now();
  let times = read().times.filter((t) => now - t < WINDOW_MS);
  times.push(now);
  let until = 0;
  if (times.length >= MAX_SENDS) { until = now + BLOCK_MS; times = []; }
  write({ times, until });
}

// Sunucu "çok hızlı" dediğinde (başka cihaz/sekme de gönderiyor olabilir) 60 saniye beklet.
export function blockNow() { write({ times: [], until: Date.now() + BLOCK_MS }); }

export function limitMessage(sec) {
  return `Dakikada en fazla ${MAX_SENDS} kayıt gönderebilirsiniz. ${sec} saniye sonra tekrar deneyin.`;
}
