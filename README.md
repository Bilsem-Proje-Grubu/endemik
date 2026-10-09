# Endemik

Doğa Koruma ve Milli Parklar Genel Müdürlüğü'nün **Tür Eylem Planı** hazırlanmış fauna ve flora türlerini tanıtan PWA.

- Ana sayfa: tür adı ve resmi (koyu tema, kart ızgarası)
- Tür detayı: morfoloji, çiçeklenme, ulusal/uluslararası statü, lokalite haritası
- Konuma göre bildirim: türün lokalitesine girince (uygulama açık/kısa arka plan)
- Kullanıcı lokalite ekler → Supabase'de `pending` → yönetici onaylar
- Yapay zekâ ile tür bilgisi doldurma: şimdilik **demo** (`src/ai.js`)

## Geliştirme
```
npm install
npm run dev
```
Veriyi yeniden üretmek için `node scripts/build-species.mjs` (`scripts/details.mjs` ayrıntıları ekler).

## Supabase
1. supabase.com'da proje açın, `supabase/schema.sql` dosyasını SQL Editor'de çalıştırın.
2. Authentication > Users: yalnızca kendi yönetici hesabınızı oluşturun, "Allow new users to sign up" seçeneğini kapatın.
3. Yerel için `.env.example` → `.env`; GitHub için Settings > Secrets and variables > Actions altına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` ekleyin. (anon key herkese açık olabilir; güvenlik RLS ile sağlanır.)

## Yayın
Settings > Pages > Source: **GitHub Actions**. `main`'e push edilince `.github/workflows/deploy.yml` yayınlar.
