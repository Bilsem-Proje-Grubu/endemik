# Devam Rehberi (Supabase Sonrası Yapılacaklar)

Bu dosya projeyi devralacak kişi içindir. Kod hazırdır: Supabase bağlantısı `src/supabase.js`, tablo ve güvenlik kuralları `supabase/schema.sql`, ayrıntılı kurulum `KURULUM.md` dosyasındadır.

## Durum
- Supabase projesi oluşturuldu.
- Henüz yapılması gerekenler aşağıdaki adımlardır (tamamlananları işaretleyin).

## Yapılacaklar
- [ ] **1. Tablo:** Supabase > SQL Editor > New query. `supabase/schema.sql` dosyasının tamamını yapıştırıp Run deyin (Success görülmeli).
- [ ] **2. Yönetici hesabı:** Authentication > Users > Add user > Create new user (Auto Confirm User açık). Sonra "Allow new users to sign up" seçeneğini kapatın.
- [ ] **3. Anahtarlar:** Project Settings > API sayfasından `Project URL` ve `anon public` anahtarını alın.
- [ ] **4. Yerelde deneme:**
  ```bash
  cp .env.example .env   # içine URL ve anon anahtarı yazın
  npm install
  npm run dev
  ```
- [ ] **5. GitHub secret'ları:** Repo > Settings > Secrets and variables > Actions altına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` ekleyin.
- [ ] **6. Yayın:** Settings > Pages > Source: GitHub Actions. Kodu `main` dalına birleştirin. Adres: https://bilsem-proje-grubu.github.io/endemik/
- [ ] **7. Test:** "Lokalite ekle" ile deneme kaydı gönderin; Ayarlar > Yönetici girişi ile girip onaylayın; haritada göründüğünü doğrulayın.

## Nasıl çalışıyor?
- Herkes kayıt ekleyebilir, kayıt her zaman `pending` girer.
- Herkes yalnızca `approved` kayıtları görür.
- Giriş yapmış yönetici kayıtları okur, onaylar, reddeder, siler.
- Bu kuralları kod değil, veritabanındaki RLS politikaları zorlar; bu yüzden anon anahtar herkese açık olabilir.

## Güvenlik uyarıları
- `service_role` anahtarını asla koda, `.env.example` dosyasına veya GitHub'a koymayın.
- `.env` dosyasını commit etmeyin.
- Yönetici hesabı açıldıktan sonra yeni kullanıcı kaydı kapalı kalmalıdır.

## Sorun giderme
- "Gönderilemedi": SQL'in çalıştığını ve secret adlarının birebir aynı olduğunu kontrol edin. Secret değiştirdiyseniz Actions > son işi Re-run edin.
- Yönetici girişi olmuyor: Kullanıcı oluşturulmuş ve onaylı mı kontrol edin.
- Sayfa boş: Pages kaynağı "GitHub Actions" mı, Actions işi yeşil mi bakın.
- Anahtarlar tanımlı değilse uygulama Supabase'siz çalışır; kayıtlar yalnızca tarayıcıda (localStorage) tutulur.

## Supabase'e giriş yapan kişiye not
Supabase proje sahibi hesabı ve veritabanı şifresi bu repoda yoktur; mevcut proje sahibinden alın veya projeye üye olarak davet isteyin.
