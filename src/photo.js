// Kullanıcı fotoğrafını göndermeden önce hazırlar: yeniden boyutlandırır ve JPEG olarak yeniden kodlar.
// Canvas'a çizip yeniden kodlamak EXIF bilgisini (GPS konumu, cihaz, tarih) tamamen siler.
const MAX_B64 = 440000; // veritabanı sınırı 450000 karakter (supabase/photos.sql)

async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* aşağıdaki yöntemi dene */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Fotoğraf açılamadı.')); i.src = url; });
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

const toBlob = (canvas, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Fotoğraf işlenemedi.'))), 'image/jpeg', q));
const toBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1] || '');
  r.onerror = () => rej(new Error('Fotoğraf okunamadı.'));
  r.readAsDataURL(blob);
});

// Döner: { b64, dataUrl, width, height }
export async function prepareImage(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Lütfen bir fotoğraf seçin.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Fotoğraf çok büyük (en çok 25 MB).');
  const bmp = await loadBitmap(file);
  const w0 = bmp.width, h0 = bmp.height;
  let side = 1024;
  for (const q of [0.78, 0.68, 0.58, 0.48, 0.4]) {
    const k = Math.min(1, side / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // saydam PNG'lerde siyah zemin olmasın
    ctx.drawImage(bmp, 0, 0, w, h);
    const b64 = await toBase64(await toBlob(c, q));
    if (b64.length <= MAX_B64) return { b64, dataUrl: 'data:image/jpeg;base64,' + b64, width: w, height: h };
    if (q <= 0.58) side = 800;
  }
  throw new Error('Fotoğraf çok büyük, daha küçük bir fotoğraf deneyin.');
}
