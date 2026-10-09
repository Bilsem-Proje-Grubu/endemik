# Endemik – Supabase ve GitHub Kurulum Rehberi

Bu rehber kodlama bilmeden uygulamayı yayına almak içindir. Sırayla ilerleyin.

## A. Supabase (veritabanı)

1. https://supabase.com adresine gidin, **Start your project** > GitHub veya e-posta ile giriş yapın.
2. **New project** düğmesine basın.
   - Name: `endemik`
   - Database Password: güçlü bir şifre yazın ve bir yere kaydedin.
   - Region: `Frankfurt` (Türkiye'ye yakın).
   - **Create new project** deyin, 1–2 dakika bekleyin.
3. Soldaki menüden **SQL Editor** > **New query** açın.
4. Repodaki `supabase/schema.sql` dosyasının tamamını kopyalayıp yapıştırın ve **Run** deyin. "Success" görmelisiniz. Bu işlem `sightings` tablosunu ve güvenlik kurallarını oluşturur.
5. Soldaki menüden **Authentication** > **Users** > **Add user** > **Create new user** ile kendi e-posta ve şifrenizle yönetici hesabını oluşturun (Auto Confirm User açık olsun).
6. **Authentication** > **Sign In / Providers** (veya Settings) bölümünde **Allow new users to sign up** seçeneğini **kapatın**. Böylece başkası yönetici olamaz.
7. **Project Settings** (dişli simgesi) > **API** sayfasını açın. İki değeri not edin:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** anahtarı (`eyJ...` ile başlar). Bu anahtar herkese açık olabilir, güvenliği 4. adımdaki kurallar sağlar. **service_role** anahtarını kimseyle paylaşmayın ve koda koymayın.

## B. GitHub (yayın)

1. Repoyu açın: `github.com/bilsem-proje-grubu/endemik`.
2. **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. İki secret ekleyin:
   - Name: `VITE_SUPABASE_URL`, Secret: A-7'deki Project URL
   - Name: `VITE_SUPABASE_ANON_KEY`, Secret: A-7'deki anon public anahtar
3. **Settings** > **Pages** > **Build and deployment** > **Source** kısmını **GitHub Actions** yapın.
4. Kodu `main` dalına alın: **Pull requests** sekmesinde `claude/endemik-pwa` dalından PR açıp **Merge** edin (veya bana "main'e birleştir" deyin).
5. **Actions** sekmesinde "GitHub Pages'e yayınla" işinin yeşil olmasını bekleyin (1–2 dakika).
6. Adres: `https://bilsem-proje-grubu.github.io/endemik/`

## C. Telefonda kurulum ve deneme

1. Adresi telefonda açın (iPhone: Safari, Android: Chrome).
2. iPhone: Paylaş > **Ana Ekrana Ekle**. Android: menü > **Uygulamayı yükle**.
3. Ayarlar sekmesinden **Bildirimi aç** deyin, konum ve bildirim izinlerini verin. iPhone'da bildirim yalnızca ana ekrana eklenmiş uygulamada çalışır.
4. **Lokalite ekle** sekmesinden deneme kaydı gönderin.
5. Ayarlar > **Yönetici girişi** ile A-5'teki hesapla girip kaydı onaylayın. Onaylanan kayıt haritada görünür.

## Sorun giderme
- Sayfa boş açılıyorsa: Pages kaynağının "GitHub Actions" olduğunu ve Actions işinin yeşil bittiğini kontrol edin.
- "Gönderilemedi" hatası: secret adlarını ve SQL'in çalıştığını kontrol edin. Secret değiştirdiyseniz Actions > son işi **Re-run** edin.
- Yönetici girişi başarısız: A-5'te kullanıcının oluşturulduğunu ve onaylı olduğunu kontrol edin.
