# ENDEMİK – Proje Devir Notu

> **Bu dosya, projeyi sıfırdan devralacak bir yapay zekâ (veya kişi) içindir.** Önce "0. Yeni yapay zekâya ilk mesaj" bölümünü okuyun, sonra gerisini. Son güncelleme: 25 Ekim 2026. Gizli anahtar/şifre içermez.

---

## 0. Yeni yapay zekâya ilk mesaj (kullanıcı bunu yapıştırabilir)

> Bu dosya, "Endemik" projesinin tam devir notudur. Projeyi buradan devralıyorsun. Önce dosyanın tamamını oku. Kullanıcı (BİLSEM Proje Grubu) teknik biri değil, **yalnızca telefondan** çalışıyor; açıklamaları **sade Türkçe**, terimleri açıklayarak ve **kısa** yaz, adım adım yönlendir, sorunlarda ekran görüntüsü iste. Yapay zekâ çıktılarını kaynakla doğrula, emin olmadığın bilgiyi uydurma. Önceki sohbette kaldığımız yer 12. bölümde. "Son durum" ve "Yapılacaklar" bölümlerinden devam et; önce bana bir durum özeti ver, sonra yapılacaklardan hangisiyle başlamak istediğimi sor.

---

## 1. Proje nedir?

**Endemik**, Türkiye'nin endemik ve koruma altındaki canlılarını tanıtan, **kurulumsuz çalışan bir mobil web uygulamasıdır (PWA)**. Veriler, T.C. Tarım ve Orman Bakanlığı **Doğa Koruma ve Milli Parklar Genel Müdürlüğü'nün (DKMP) "Tür Eylem Planları"** PDF'lerinden alınmıştır (94 tür: 30 fauna, 64 flora).

- **Kullanıcı:** BİLSEM Proje Grubu (TÜBİTAK ve Teknofest projeleri yapar). Amaç: hem halka tanıtım hem koruma çalışmalarına halk katkısı (vatandaş bilimi).
- **Canlı site:** https://bilsem-proje-grubu.github.io/endemik/
- **Kod deposu:** https://github.com/Bilsem-Proje-Grubu/endemik (GitHub hesabı: `bilsemprojegrubu`)
- **Veritabanı:** Supabase (kullanıcının kendi hesabında, ücretsiz plan, proje adı "Endemik").
- **Hosting:** GitHub Pages (ücretsiz).

## 2. Kullanıcı hakkında (iletişim kuralları – ÇOK ÖNEMLİ)

- **Yalnızca telefondan** çalışıyor (Android, Chrome). Bilgisayar yok sayılmalı. Supabase/GitHub menülerini mobilde bulmakta zorlanıyor; "şuraya bas, sonra şuraya" şeklinde yönlendirin.
- Kod bilmiyor. Kendi ifadesiyle: **"Türkçe konuş anlamıyorum, ya da terimsel konuş ama açıklayarak."** Terimleri parantez içinde açıklayın.
- **"Okumaya üşendim, özet ver"** der. Uzun anlatımdan sonra 4–6 satırlık özet verin. Kararlı olun; "A mı B mi?" yerine **tek öneri + gerekçe** verin, sonra onay isteyin.
- Çoğunlukla "yap / et / evet" diyerek onay verir; sorulmadan çok iş yapılmasını da sever ama **yanlış anlaşılma riski** vardır (ör. "Yönetici girişinde görünsün" = giriş ekranında mı, girişten sonra mı?). Belirsizse kısaca yorumunuzu söyleyip ilerleyin, sonra düzeltin.
- **Gizli anahtarları, şifreleri sohbete yazdırmayın/yazmayın.** (Supabase `service_role`/secret anahtarı hiçbir yere girilmez.)
- Tüm değişiklikler **canlı siteye gidiyor**; her işten sonra "yayında doğruladım" diye kontrol edip bildirin.
- Mesajlarda emoji az, madde işareti ve tablo bol; sonuç cümlesi net.

## 3. Teknik yapı (özet)

- **Vite 5 + saf JavaScript** (framework yok). **Leaflet 1.9** (harita, OpenStreetMap karoları), **@supabase/supabase-js 2.x**.
- **Hash yönlendirme:** `#/` (Türler), `#/tur/<id>` (tür detayı), `#/harita`, `#/ekle` (Lokalite ekle), `#/ayarlar`, `#/yonetim` (yönetici girişi/paneli).
- **PWA:** `public/manifest.webmanifest`, `public/sw.js` (service worker, önbellek adı `endemik-v3`), derlemede `precache.json` üreten Vite eklentisi (`vite.config.js`).
- **Dil:** Arayüz ve yorumlar Türkçe. Commit mesajları Türkçe.

### Dosya haritası
| Yol | Ne işe yarar |
|---|---|
| `src/main.js` | Tüm ekranlar (ana sayfa, tür detayı, harita, lokalite ekle, ayarlar, yönetici), yönlendirme, kaydırma/çevrimdışı/izin kartı bağlantıları |
| `src/style.css` | Görünüm; renkler CSS değişkenleriyle (`--bg`, `--accent`…) |
| `src/theme.js` | Temalar: Otomatik, Koyu, Açık, Gece mavisi, WhatsApp koyu, Valorant, Duolingo koyu/açık + kullanıcının 4 renkle "kendi teması" (kontrast uyarısı dahil) |
| `src/supabase.js` | Supabase istemcisi, kayıt gönderme (`addSighting`), konum yuvarlama (`blurCoord`), çevrimdışı kayıt kuyruğu (`flushQueue`), yönetici işlemleri, tür fotoğrafları (`getSpeciesPhotos`) |
| `src/ratelimit.js` | Tarayıcıda hız sınırı: dakikada 5 kayıt, dolunca 60 sn bekleme |
| `src/offline.js` | Fotoğrafları çevrimdışı indirme: Wi‑Fi'de otomatik, mobil/bilinmiyorsa izin kartı |
| `src/photo.js` | Fotoğrafı 1024 px'e küçültüp JPEG'e çevirir (EXIF/GPS silinir) |
| `src/swipe.js` | Yana kaydırarak sekme değiştirme |
| `src/geo.js` | Konuma göre bildirim (`watchPosition`, uygulama açıkken) |
| `src/ai.js` | **Yapay zekâ doldurma – yalnızca DEMO** (gerçek model bağlı değil) |
| `src/data/species.json` | **Üretilen** tür verisi (elle düzenlemeyin; `scripts/` ile üretilir) |
| `src/data/images.json` | Resim adresi + sahibi + lisans bilgisi |
| `public/species-img/` | Kendi sitemizde barındırılan tür fotoğrafları (69 dosya, ~6.4 MB) |
| `supabase/*.sql` | Veritabanı kurulum betikleri (bkz. 7) |
| `scripts/` | Veri ve resim üretim araçları (bkz. 5) |
| `.github/workflows/deploy.yml` | Yayın otomasyonu (bkz. 6) |
| `KURULUM.md` | Kullanıcıya yönelik Supabase/GitHub kurulum rehberi |

## 4. Uygulama özellikleri (şu an yayında olanlar)

1. **Tür listesi:** kart ızgarası, arama, filtre (Hepsi/Fauna/Flora/Lokalitesi olanlar). Resmi olmayan türlerde türe uygun emoji simgesi (🐀🐸🐟🌷🪻…).
2. **Tür detayı:** fotoğraf (kaynak/lisans satırıyla), açıklama, morfoloji, çiçeklenme (yalnızca bitkide), ulusal/uluslararası statü, yayılış haritası (daireler), DKMP PDF bağlantısı, "Bu türü gördüm" düğmesi, onaylı **kullanıcı fotoğrafları** galerisi.
3. **Harita:** tüm lokalite daireleri (fauna sarı, flora yeşil), kullanıcının konumuna göre yakındaki türler.
4. **Lokalite ekle:** tür seç, **haritaya dokunarak** (veya GPS ile) konum seç, not, isteğe bağlı **fotoğraf** (izin kutusu + sahibi adı). Kayıt `pending` olarak gider.
5. **Yönetici paneli** (`#/yonetim`, Supabase hesabıyla giriş): bekleyen kayıtları **Onayla / Reddet / Sil**, yayındaki kayıtları **Sil**, bekleyen fotoğrafı önizle.
6. **Konum gizliliği:** kullanıcı kayıtları ~5 km'lik ızgaraya (0,05°) yuvarlanır; haritada 5 km'lik daire.
7. **Spam koruması:** tarayıcıda dakikada 5 kayıt + 60 sn bekleme geri sayımı; veritabanında aynı IP'den dakikada 5 (bkz. 7).
8. **Çevrimdışı mod:** temel dosyalar önceden önbelleğe alınır; fotoğraflar Wi‑Fi'de otomatik, mobil veride izinle iner; internetsiz gönderilen kayıt kuyruğa alınıp bağlantı gelince gönderilir (fotoğraflı kayıt kuyruğa alınmaz).
9. **Temalar** (bkz. `theme.js`), **yana kaydırarak sekme değiştirme** (varsayılan: sola kaydır → sağdaki sekme; Ayarlar'dan kapatılır/ters çevrilir).
10. **Bildirim:** türün lokalitesine girince (PWA sınırı: uygulama açık/kısa süre arka plandayken güvenilir).
11. **Ayarlar:** bildirim, çevrimdışı indirme, gezinme, tema, hakkında, yönetici girişi. "Sunucu durumu – Supabase bağlı" kutusu **yalnızca yönetici oturumu açıkken** görünür (kullanıcıya gösterilmez; bilinçli istek).

## 5. Veri hattı (nasıl üretiliyor)

- **Kaynak:** DKMP sayfası https://www.tarimorman.gov.tr/DKMP/Menu/49/Tur-Eylem-Planlari (91 plan PDF'i; bizde 94 kayıt çünkü bazı türlerin il bazlı birden fazla planı var). **DKMP'nin yayınladığı tüm planlar zaten kapsanıyor; yeni tür eklemek şimdilik önerilmiyor.**
- **Üretim:** `scripts/species-list.mjs` (ad, bilimsel ad, PDF adı) → `details.mjs`, `details2.mjs`, `details3.mjs`, `details4.mjs` (elle/yapay zekâ yardımıyla PDF'lerden çıkarılan bilgiler; her biri öncekini **yalnızca boş alanlarda** tamamlar) → `images.json` → **`node scripts/build-species.mjs`** → `src/data/species.json`.
- **Resim araçları:** `fetch-images.mjs` (Wikipedia), `fetch-images-inat.mjs` (iNaturalist, **tür adı birebir eşleşme**), `fetch-images-commons.mjs` (Commons; harita/poster/şema dosyalarını eler), `fetch-images-floranatolica.mjs` (CC BY-SA, gözlemci adıyla), `fetch-images-herbarium.mjs` (GBIF herbaryum taramaları CC0/CC BY; kartta "Herbaryum örneği" etiketli), `localize-images.mjs` (dış resimleri 800 px'e küçültüp `public/species-img/` altına alır).
- **Ders çıkarılanlar (hatalar):**
  - Eski resim betiği yalnızca **cinse** bakıyordu → yanlış tür fotoğrafı (İskenderun kertenkelesi) çıktı. Artık tür adı birebir.
  - Wikimedia'nın hız sınırı (HTTP 429) çok istekte engeller; yavaş çalıştırın, `Retry-After`'ı bekleyin.
  - **PDF indirmede `curl -m 120` büyük dosyaları yarım kesti** (5 PDF eksik indi; dosya boyutu tam 4096'nın katı olunca şüphelenin). `--max-time 900 -C -` kullanın ve `pdfinfo` ile doğrulayın. Bir PDF (Çizgili Sırtlan) taranmış resimdi; `rapidocr-onnxruntime` ile OCR yapıldı (Türkçe harfler ASCII'ye düşer).
  - PDF metinlerindeki bozuk harfler (Ġ→İ, Ģ→Ş) normalleştirilmeli.
  - Her bilgi için PDF'ten **birebir alıntı** zorunlu tutuldu ve programla doğrulandı. Yapay zekâ özetlerine körü körüne güvenmeyin.
- **Koordinatlar:** PDF'teki UTM (ED50→WGS84, `pyproj`) ve derece-dakika değerleri; yoksa yer adından **OpenStreetMap Nominatim** (1 istek/sn, kullanıcı-ajanı şart) ve "yaklaşık" işaretli. Belirsiz yerler uydurulmadı.
- **Güncel kapsam:** açıklama 94/94, lokalite 94/94 (172 nokta), morfoloji 90, çiçeklenme 60/64 (bitki), ulusal statü 90, uluslararası statü 75, **resim 69/94**.
- **Resimsiz 25 tür** (lisanslı fotoğraf bulunamadı): Iğdır Çöl Faresi, Karadeniz Alabalığı, Siraz Balığı, Tavas Kurbağası, Van Kertenkelesi, Yer Yediuyuru, Avanos Keveni, Karaman Kayagülü, Peygamber Çiçeği, Sultan Pelemiri, Seçmen Çakşırı, Kerkür, Baskil Lalesi, Truva Kardeleni, Konya Meyanı, Yer Sasalı, Gezertere, Samsun Madımağı, Dişli Çakşı, Mevzek, Dağ Gülü, Siirt Adaçayı, Eber Sarısı, Sığırkuyruğu, Gök Sığırkuyruğu.
- **Bilimsel ad düzeltmeleri (DKMP plan başlıklarına göre):** Sakallı yarasa *Myotis brandtii*; Hopa engereği *Vipera kaznakovi*; Karadeniz alabalığı *Salmo coruhensis* (plan: syn. *Salmo trutta labrax*; literatürde ayrı tür sayılabilir); Siraz balığı *Capoeta mauricii*.
- **Önemli uyarı:** Bilgiler yapay zekâ yardımıyla özetlendi; bazı statüler planın **kendi önerisi** (değerde "önerilmiş" yazar). **Bir uzmanın (öğretmen/biyolog) son kontrolü gerekir.**

## 6. Yayın ve çalışma düzeni (nasıl yayınlanır)

- **Yayın:** `main` dalına her birleştirme (merge) `deploy.yml`'yi çalıştırır: derler, `dist`'i **`gh-pages`** dalına yazar (peaceiris/actions-gh-pages). **GitHub ayarı: Pages → Source = "Deploy from a branch → gh-pages / (root)"** (kullanıcı ayarladı). İlk denemede `deploy-pages` (Actions kaynaklı) hiçbir adım çalışmadan reddedilmişti (muhtemelen `github-pages` environment kuralı); `gh-pages` yöntemiyle çözüldü.
- **Çalışma akışı (Claude Code Web ortamında):** özel dal `claude/elegant-cannon-gc8lfa` üzerinde çalışılır → commit + push → **PR açılır (`mcp__github__create_pull_request`) → birleştirilir (`merge_pull_request`, yöntem: merge)** → ~30–60 sn sonra canlı sitede doğrulanır (ör. yeni JS paketinde bir metin aranır). Birleştirme sonrası dal yeniden `origin/main`'e eşitlenir: `git fetch origin main && git checkout -B claude/elegant-cannon-gc8lfa origin/main`. `gh` komutu yok; GitHub işleri MCP araçlarıyla yapılır. "Stop hook" bekleyen commit'ler için push ister.
- **Not:** Kullanıcı açıkça "merge et/yayına al" dediği için PR'lar hemen birleştirildi. Yeni bir yapay zekâ bunu kullanıcıdan teyit etmelidir.
- **Test yöntemi (önerilir):** Playwright + Chromium (gerçek dokunma olayları için CDP), `vite preview`, sahte Supabase (`page.route`), gerçek **Postgres 16** ile SQL testleri, 94 tür sayfası taraması. Her özelliği yayından önce böyle test edin. Canlı sitede kullanıcı hesabıyla işlem yapılamaz (yönetici şifresi bilinmez).
- **Ortam notu:** `/tmp` altındaki indirilen PDF'ler/ara dosyalar oturumla birlikte silinir; PDF'ler `species.json` içindeki `pdf` adresinden yeniden indirilebilir.

## 7. Supabase ve veritabanı

- **Tablo:** `sightings` (`id, species_id, species_name, lat, lng, note, ai_info, status('pending'|'approved'|'rejected'), created_at` + fotoğraf sütunları `photo_data, photo_author, photo_consent`). Güvenlik: **RLS** — herkes yalnızca `approved` okur; herkes yalnızca `pending` ekler; giriş yapmış yönetici hepsini okur/günceller/siler. Yeni kullanıcı kaydı Supabase'de **kapalı** olmalı (yoksa herkes yönetici olabilir).
- **Anahtarlar:** Siteye gömülen yalnızca **herkese açık** `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (yeni biçim: `sb_publishable_…`); GitHub → Settings → Secrets and variables → Actions → **Repository secrets** olarak kayıtlı. `service_role/secret` anahtarı hiçbir yerde yok ve olmamalı.
- **SQL betikleri ve durumları** (Supabase → SQL Editor'de kullanıcı tarafından çalıştırılır):

| Betik | Ne yapar | Durum |
|---|---|---|
| `schema.sql` | Tablo + RLS | ✅ Çalıştırıldı |
| `rate-limit.sql` | Aynı IP'den dakikada 5 ekleme (tek ifadelik `language sql` fonksiyon, `send_log` tablosu IP'yi ≤10 dk tutar) | ✅ Çalıştırıldı ("Success") |
| `location-privacy.sql` | Konumu ızgaraya yuvarlayan `BEFORE INSERT` tetikleyicisi | ❓ **Kodu verildi, çalıştırıldığı teyit EDİLMEDİ** |
| `photos.sql` | Fotoğraf sütunları + CHECK kısıtları (JPEG, ≤450000 karakter, izin zorunlu) | ❓ **Kodu verildi, çalıştırıldığı teyit EDİLMEDİ** |

  Site, `photos.sql` çalıştırılmamışsa da bozulmaz (sütun yoksa `*` ile geri döner; fotoğraflı gönderimde anlaşılır uyarı verir).
- **Supabase SQL Editor tuzakları (yaşandı):** (1) `declare` bölümlü plpgsql fonksiyonları ve `$$` mobil editörde **sözdizimi hatası** verdi → `$fn$` etiketli, `declare`'siz tek ifadelik fonksiyonlar kullanıldı. (2) Kod önceki yazının üstüne yapıştırılırsa hata çıkar → **önce alanı boşaltın (Ctrl+A, Delete)**. (3) `drop policy` için "Potential issue detected" uyarısı normaldir, **Run query** denir. (4) Betikleri tek parça verin; tekrar çalıştırılabilir (idempotent) yazın.
- Kullanıcının Supabase'de ücretsiz plan sınırı (2 proje) nedeniyle **yeni hesap** açtığını unutmayın.

## 8. Alınan kararlar (gerekçeleriyle)

- **Yeni tür eklenmez:** DKMP'nin tüm planları zaten var; eksik olan genişlik değil derinlik (resim/doğrulama).
- **Yapay zekâ:** Sıfırdan model yapılmaz (veri yok: çoğu türün <5 fotoğrafı var). **Hazır API + sunucu tarafı (Supabase Edge Function)**, anahtar sunucuda gizli, kullanım sınırı, "yapay zekâ taslağı, doğrulanmamıştır" etiketi, yönetici onayı. Şu an `src/ai.js` **demo**.
- **Fotoğraf katkısı veritabanında (base64, ~100–250 KB):** Storage yerine; atomik, mevcut RLS/hız sınırı geçerli, test edilebilir. Çok büyürse Storage'a taşınır.
- **Kullanıcı fotoğrafı ana resmi değiştirmez;** ayrı galeride, "uzman doğrulaması yapılmamıştır" notuyla.
- **Telif/lisans:** yalnızca CC0 / CC BY / CC BY‑SA; CC BY‑NC alınmadı. Yazar ve lisans her fotoğrafın altında gösterilir (silmeyin).
- **Marka temaları** (WhatsApp, Valorant, Duolingo) yalnızca renk paletinden esinlenmiştir; ekranda "bu markalarla bağlantımız yoktur" notu var.
- **Konum yuvarlama:** nesli tehlike altındaki türlerin tam yeri kaçakçılığa yol açabilir.
- **Herbaryum taramaları** resimsiz bitkilerde "çok eski fotoğraf" olarak kabul edildi (kullanıcı önerisi), açıkça etiketli.

## 9. Bilinen sınırlamalar / riskler

- **25 tür resimsiz** (liste 5. bölümde); çözüm: kullanıcının kendi/izinli fotoğrafları veya fotoğraf katkısı.
- **Bildirim:** PWA olduğu için arka planda konum izleme güvenilir değil; kesin çözüm yerel (Android) uygulama.
- **Harita zemini** çevrimdışı yalnızca görüntülenen bölgelerde (OSM toplu indirme politikası gereği önbellek yapılmadı).
- **iPhone/Safari ve Firefox** ağ türünü (Wi‑Fi/mobil) bildirmez → fotoğraf indirme izin kartı çıkar.
- **Statüler:** bir kısmı planın önerisi; bazı kaynaklar kendi içinde çelişir (iki değer de yazıldı).
- **Lokalite koordinatları yaklaşık** (yer adından çözülenler "yaklaşık" etiketli).
- **Yönetici ekranı:** reddedilen kayıtlar listelenmez; onaylı kaydı geri alma yok (silinir).
- **Ana sayfa/Harita ilk açılışta** kullanıcı kayıtları internetten gelince yeniden çizilir (bir kez düzeltildi).
- **Spam:** hız sınırı IP başlığına güvenir; başlık taklit edilirse aşılabilir (en iyi çaba).
- **Veri doğruluğu** için uzman onayı yapılmadı.

## 10. Yapılacaklar (öncelik sırasıyla – önerim)

1. **Teyit:** Kullanıcı `location-privacy.sql` ve `photos.sql`'i çalıştırdı mı? Çalıştırmadıysa (kod 7. bölümdeki dosyalardadır) yardım edin; sonra **gerçek bir deneme fotoğraflı kayıt** gönderip yönetici panelinden onaylayıp tür sayfasında görüldüğünü doğrulayın; deneme kayıtlarını (örn. Kahramankazan'daki test kaydı) **silin** (yönetici paneli → Sil).
2. **Uzman kontrolü:** bir öğretmen/biyoloğa veri örneklemesi (özellikle statüler, 4 bilimsel ad kararı).
3. **Resimsiz 25 tür:** izinli fotoğraf toplama (izin yazısı şablonu hazırlanabilir) veya kullanıcı katkısı.
4. **Gizlilik/KVKK metni:** Hakkında sayfasına kısa gizlilik açıklaması (IP ≤10 dk, konum yuvarlama, fotoğraf izni).
5. **Yapay zekâ (API):** önce yalnızca yönetici aracı olarak "tür bilgisi taslağı"; harcama sınırı; anahtar Supabase gizli alanında.
6. **Fikirler:** quiz/koleksiyon ("gördüm" listesi, rozet), tür paylaş düğmesi (WhatsApp/QR), İngilizce dil, erişilebilirlik, seçilen kullanıcı fotoğrafını ana resim yapma, 2 aşamalı doğrulama/yedekleme (yönetici hesabı), README'yi güncelleme.
7. **Teknofest/TÜBİTAK raporu:** kullanılan yöntem (kaynak doğrulama, alıntı denetimi, gizlilik tasarımı, çevrimdışı çalışma) iyi anlatılabilir.

## 11. Sık kullanılan komutlar

```bash
npm install
npm run dev                       # yerel geliştirme
npm run build                     # dist/ üretir
node scripts/build-species.mjs    # details*.mjs + images.json → src/data/species.json
node scripts/fetch-images-inat.mjs   # (diğer fetch-images-*.mjs / localize-images.mjs benzer)
```
`.env.example` → `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). `.env` dosyası git'e girmez.

## 12. Son durum (sohbetin sonu)

- Son yapılan iş: **ekranı yana kaydırarak sekme değiştirme** eklendi. Kullanıcı yönü yanlış söylediğini belirtti; **düzeltildi ve yayınlandı** (PR #29): *parmağı sola kaydırınca sağdaki sekme, sağa kaydırınca soldaki sekme* açılır (Türler – Harita – Lokalite ekle – Ayarlar sırası). Ayarlar → Gezinme'den kapatılır/ters çevrilir. Harita, yana kayan çipler, seçim haritası üzerinde başlayan kaydırmalar sekme değiştirmez; Lokalite ekle'de yazılmış form varken kaydırarak çıkılmaz.
- Yayında en son birleştirilen: PR #29 (`main`). Canlı sitede doğrulandı.
- Kullanıcıya en son söylenen: "Fotoğraf SQL'ini çalıştırdıysanız bir deneme fotoğrafı gönderip nasıl çalıştığını söyleyin." → **bu teyit bekleniyor** (bkz. 10.1).
- Kullanıcı bu dosyayı, sohbetin otomatik özetlenmesi (auto-compact) öncesinde **başka bir yapay zekâya aynı şekilde devam edebilmek için** istedi.
- Yönetici girişi: kullanıcının Supabase'de oluşturduğu e‑posta/şifre hesabıyla (Ayarlar → Yönetici girişi). Şifre kimsede/yapay zekâda **yok**; sormayın, yazdırmayın.

## 13. Hızlı kontrol listesi (devralan için)

- [ ] Bu dosyanın tamamını okudum; kullanıcıyla sade Türkçe konuşacağım.
- [ ] Depoyu klonladım / erişimim var (GitHub araçları, `main` dalı güncel).
- [ ] Canlı siteyi açıp ekranları gördüm: https://bilsem-proje-grubu.github.io/endemik/
- [ ] 10. bölümden bir sonraki işi önerdim ve onay aldım.
- [ ] Her değişiklikten sonra: test → commit → PR → merge → canlıda doğrula → kullanıcıya **kısa** özet.
