# Jüri Sunumu İçin Özet — Pomodoro Oyun

## 1. Problem
Lise öğrencileri ders çalışmaya **başlamakta** ve **odağını korumakta** zorlanıyor. Pomodoro tekniği (25 dk odak, 5 dk mola) bilinen ve işe yarayan bir yöntem; ancak sıkıcı bulunduğu için çoğu öğrenci birkaç günde bırakıyor.

## 2. Çözüm
Çalışmayı bir oyunun **tek ilerleme yolu** yapan web uygulaması. Tamamlanan her Pomodoro oyun parası kazandırır; para olmadan oyunda ilerlenmez. Kullanıcı dört temadan birini seçer (hepsi herkese açık): **Futbol Menajeri, Kafe Dünyam, Moda Stüdyosu, Hayvan Barınağı**. Tek bir oyun motoru dört temayı çalıştırır; yeni tema eklemek sadece bir JSON dosyasıdır.

Uygulama sunucusuzdur: her şey tarayıcıda çalışır, veri sadece cihazda durur, telefona kurulur ve internet olmadan çalışır (PWA).

## 3. Yenilikçi yanları
- **Tek motor, çok tema:** Öğrencinin ilgisine göre oyun kılığı seçilir; çalışma mekaniği aynı kalır.
- **Çabaya bağlı ödül, sağlıklı sınırlar:** Günlük para tavanı (8 Pomodoro), uyku hatırlatması, uzun mola önerisi, yarım kalan oturumda **hiçbir şey kaybedilmez**. Şans kutusu, liderlik tablosu, reklam, gerçek para yok; "dönmezsen…" türü baskı yok.
- **Dürüst sayaç:** Sekme gizli kalırsa, saat oynanırsa ya da iki sekmede sayaç açılırsa oturum para vermez; dil nötr ve suçlayıcı değil.
- **Ölçüm içinde gömülü:** Araştırma verisi uygulamanın doğal bir parçası (aşağıda).
- **Haftalık olay çalışmaya bağlı:** Maç/festival/defile sonucu o haftaki çalışma süresini doğrudan hesaba katar; sonuç tohumludur, yeniden açılarak değiştirilemez.

## 4. Bilimsel dayanak
- **Pomodoro tekniği (Cirillo):** Kısa, sınırlı odak aralıkları ve düzenli molalar başlamayı kolaylaştırır, zihinsel yorgunluğu azaltır.
- **Oyunlaştırma:** Oyun öğelerinin (puan, seviye, koleksiyon, hedef) eğitim bağlamında motivasyon ve katılımı artırabildiği literatürde gösterilmiştir. Etki, tasarıma bağlıdır; bu yüzden uygulamada **ölçüyoruz**.
- **Öz-belirleme kuramı (Deci & Ryan):** Özerklik (süre, tema, ses, bildirim kullanıcıda), yetkinlik (görünür ilerleme, "kaç Pomodoro kaldı" hedefi) ve ilişkililik. İçsel motivasyonu körükleyen tasarım tercihleri: çaba rozetleri, sosyal kıyas yok, sadece "dünkü kendinle" kıyas.
- **Büyüme zihniyeti (Dweck):** 30+ cesaretlendirici mesaj; "başarısız oldun" yok, "bugün olmadı, yarın yeni bir şans" var.
- **Dış ödülün sağlıklı kullanımı:** Aşırı gerekçelendirme riskine karşı ödüller çabaya ve sürece bağlı, günlük tavanlı; ceza ve kayıp korkusu yok.

> Not: Bu bölümdeki kaynak adlarını sunumda tam künyeleriyle (yazar, yıl, yayın) vermek için proje ekibi literatür taramasını tamamlamalıdır.

## 5. Ölçme yöntemi
Uygulama içinde, **kişisel veri toplamadan** (ad, e-posta, konum yok; her şey cihazda):

| Ölçüm | Nasıl |
|-------|-------|
| **Kullanım kaydı** | Her oturum için tarih, saat, süre, tamamlandı/yarım, tema, ders etiketi |
| **Mini anket (3 soru, 1–5)** | Başlangıçta ve **2 hafta sonra** aynı sorular: başlamak ne kadar kolay, odağı koruma, keyif |
| **Kontrol modu** | İsteğe bağlı gizli ayar: ilk **3 gün oyun kapalı**, sade Pomodoro; sonra oyun açılır. Oturumlar `control` / `game` diye etiketlenir |
| **Katılımcı kodu** | Ör. "K07": sonuçlar kimlik olmadan eşleştirilir |
| **Rapor ekranı** | Günlük ortalama odak, tamamlama oranı, haftalık değişim, anket farkı, sade vs oyunlu dönem |
| **CSV** | Tek tıkla; UTF-8 BOM, `;` ayraçlı — Excel'de Türkçe karakterler bozulmadan açılır |

**Etik:** İlk açılışta açık aydınlatma metni (hangi veri, nerede, nasıl silinir); 18 yaş altı için "velinin bilgisi olmalı" ifadesi; veri dışa aktarma ve tek dokunuşla silme.

## 6. Sonuçlar nasıl okunur?
1. **Etki göstergesi:** Aynı katılımcının *kontrol dönemi* ile *oyunlu dönem* günlük ortalama odak süresini karşılaştır (`Rapor → Sade mod ve oyunlu mod kıyası`).
2. **Alışkanlık göstergesi:** Aktif gün sayısı, haftalık değişim ve seri; bırakma eğilimi için haftalık dakikaların 6 haftalık grafiği.
3. **Kalite göstergesi:** Tamamlama oranı (yarım kalan / toplam oturum).
4. **Öznel gösterge:** Anket farkı = 2. hafta − başlangıç (her soru için −4…+4; pozitif = iyileşme).
5. **Birleştirme:** Tüm katılımcıların CSV'leri birleştirilir; `katilimci_kodu`, `mod`, `tur` sütunlarıyla Excel/SPSS'te karşılaştırılır (ör. eşleştirilmiş t-testi ya da Wilcoxon).

**Sınırlılıklar (jüriye açıkça söylenmeli):** Küçük örneklem; 3 günlük kontrol dönemi kısa; kontrol ve oyunlu dönemin sırası sabit (sıra etkisi) — gelecek çalışmada dönemler katılımcılar arasında ters çevrilebilir. Anket öz-bildirimdir. Veriler cihazda olduğu için toplama, katılımcıların CSV göndermesiyle yapılır.

## 7. Teknik özet
Saf HTML/CSS/JS (framework yok), PWA, çevrimdışı çalışır, sunucu yok; **86 birim testi** (zamanlayıcı, ekonomi, günlük tavan, hile önleme, migrasyon, haftalık olay, seri, istatistik, rozet, CSV/rapor, tema şeması, renk kontrastı); WCAG AA renk kontrastı, klavye ve ekran okuyucu desteği, hareket azaltma.
