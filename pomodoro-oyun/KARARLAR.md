# KARARLAR

Talimatta net olmayan ya da birden fazla yolu olan yerlerde verilen kararlar. Her satır: **karar** — neden.

## Proje ve yapı
- **Proje `pomodoro-oyun/` klasöründe, depodaki diğer proje (Endemik PWA) olduğu gibi bırakıldı** — aynı depoda başka bir uygulama vardı; talimattaki klasör adı kullanıldı, karışıklık olmasın.
- **Framework yok, saf HTML + CSS + JS (ES modules), Vite sadece derleme ve geliştirme sunucusu için** — lise öğrencileri kodu okuyabilsin. Test için Vitest + jsdom.
- **Tema = JSON + CSS + (paleti JSON'dan okunur)** — yeni tema motora dokunmadan eklenir. Renk paleti JSON'da (aydınlık + karanlık), dekoratif arka plan CSS'te.
- **Tema JSON'ları `tools/temalari-uret.mjs` ile üretilir** — 160+ ürünün tutarlı fiyat/güç/seviye değerleri elle yazılırsa kayar. Üretilen JSON'lar depoda durur, elle de düzenlenebilir.

## Ekonomi ve oyun
- **Para ortak, ürünler ve ilerleme temaya özel** (talimat önerisi) — tema değiştirmek serbest olsun, emek boşa gitmesin.
- **Güç = her kategoride sadece slot sınırı kadar en güçlü ürün** — "sınırlı slot" kuralının sade hali. Oyuncu elle kadro seçmez; en iyiler otomatik girer, fazlası "yedek" olur. Seçim yapma boyutu: slotlar doluyken zayıf ürün almanın faydası yok (mağazada uyarı çıkar).
- **Kademe → seviye kilidi:** Bronz Sv.1, Gümüş Sv.2, Altın Sv.3, Efsane Sv.4 (talimat: "seviye atlayınca yeni ürünler açılır").
- **Seviye eşikleri, temanın azami gücünün oranı** (`config.js` → `levelFractions`) — dört temada da benzer hız.
- **Denge yorumu:** Talimattaki "günde ortalama 4 Pomodoro → haftada ~1 gümüş + birkaç bronz" cümlesi, haftada **5 çalışılan gün** varsayılarak karşılanıyor (≈2.450 para = 1 gümüş + 5 bronz). 7 gün çalışan öğrenci daha fazla kazanır. Bunu `tests/economy.test.js` doğruluyor.
- **Günlük tavan:** Pomodoro'nun *bittiği* günün sayacına yazılır (gece yarısını geçen oturum bitiş gününe sayılır).
- **Set sayacı gün içinde sayılır, gün değişince sıfırlanır; yarım kalan oturum sayacı sıfırlamaz** (ceza yok).
- **Haftalık olay:** Pazar 18:00'den sonra o haftanın olayı çözülür (talimat: "pazar akşamı"); uygulama kapalıysa bir sonraki açılışta gösterilir. Sonuç = (güç + haftalık dakika × 0,1) × (1 ± %10). Rastgelelik **tohumludur** (hafta + tema) — yeniden açarak sonucu değiştirme hilesi yok. Kayıp da para verir (60) ve hiçbir şeyi bozmaz.
- **Olay sadece aktif tema için çözülür**; tema o hafta başlamışsa önceki haftalar sayılmaz.
- **Haftanın başı Pazartesi.**

## Zamanlayıcı ve hile önleme
- **Sayaç `setInterval` ile saymaz;** başlangıç zaman damgasından hesaplanır. `setInterval` yalnızca ekranı yenilemek ve kalp atışı için var.
- **"Kapanıp açılırsa devam etsin" ile "30 sn'den uzun gizli kalırsa geçersiz" kuralı birleştirildi:** son kalp atışından bu yana 30 sn'den az geçtiyse (ör. sayfa yenileme) sayaç devam eder; fazlaysa sayfa "kapalıydı" sayılıp oturum geçersizdir. Mola sayacı için bu kural yok.
- **Saat hilesi denetimi tik-tik:** iki ardışık kontrol arasında duvar saati ile `performance.now()` farkı 3 sn'yi aşarsa geçersiz. Sekme gizliyken karşılaştırma yapılmaz (telefon uykusunda yanlış alarm olmasın); yeniden görünür olunca çapa sıfırlanır. Sayfa yenilemede `performance.now()` sıfırlandığı için sadece "başlangıç geleceğe ait mi" denetlenir.
- **Sekmeler arası tek sayaç:** `localStorage` kilidi + kalp atışı (5 sn bayatlama). `BroadcastChannel` yerine bu seçildi: tarayıcı çökse bile bayat kilit kendiliğinden düşer. Diğer sekmeler `storage` olayıyla durumu yeniden okur.
- **1 dakikadan kısa denemeler kaydedilmez** (yanlışlıkla başlatma araştırma verisini kirletmesin).
- **Duraklatma sadece odak oturumunda**, tek hak, 2 dk.
- **Mola otomatik başlar** (ayarlardan kapatılır) — ritim bozulmasın.
- **Yarım kalan oturum kaydı** (`status: interrupted`, nedeni ile) araştırma için tutulur; kullanıcıya suçlayıcı olmayan metinle gösterilir.

## Psikoloji ve sağlık
- **Rozetler sadece çabaya bağlı:** kazanma/kaybetme sayısına bağlı rozet yok (ilk taslaktaki "3 zafer" rozeti "3 haftalık olaya katıl" yapıldı).
- **Liderlik tablosu, loot box, gerçek para, reklam, "dönmezsen" bildirimi yok.** `tests/i18n.test.js` yasaklı ifadeleri tarar.
- **Hayvan Barınağı'nda hayvanlar "satılmaz/satın alınmaz":** düğme "Barınağa kabul et", fiyat etiketi "bakım masrafı", ayrılan hayvan yok (kayıp korkusu yok).
- **Seri dondurma otomatik uygulanır:** tek gün atlanırsa ve o hafta hak kullanılmadıysa. Kopunca: "Seri sıfırlandı ama sen hâlâ buradasın".
- **Uyku hatırlatması 23:00-05:00 arası**, engellemez, ayarlardan kapanır.
- **Dil:** hiçbir yerde "kızlar/erkekler için" ifadesi yok; test ediliyor.

## Veri ve gizlilik
- **Sunucu yok; her şey `localStorage`'da.** `schemaVersion` + göç zinciri (`MIGRATIONS`). Gelecekteki sürümden gelen kayıt bozulmasın diye reddedilir.
- **`localStorage` yoksa/doluysa bellek içi yedeğe düşülür** ve kullanıcıya uyarı gösterilir.
- **CSV ayracı `;` + UTF-8 BOM** — Türkçe yerel ayarlı Excel'de çift tıkla düzgün açılır. Tek dosyada hem oturumlar hem anketler (`tur` sütunu). Hücreler `= + - @` ile başlıyorsa başa `'` eklenir (formül enjeksiyonuna karşı).
- **CSV'ye görev adının sadece "ders" kısmı** (tireden öncesi) yazılır — görev adına yanlışlıkla kişisel bilgi yazılsa bile dışarı çıkmaz.
- **Katılımcı kodu** sadece harf/rakam/`_`/`-`, en çok 12 karakter.
- **Anket zorunlu değil:** onboarding'de "Şimdi değil" ile atlanabilir; o gün tekrar sorulmaz, ertesi gün nazikçe yeniden sorulur.
- **Kontrol modu gizli:** Ayarlar → Hakkında'da sürüm yazısına 5 kez dokununca "Araştırma raporu" ekranında açılır. İlk 3 gün oyun/tema/mağaza/para kapalıdır, sonra kendiliğinden açılır; veri `mode: control | game` etiketiyle ayrılır.

## Görsel ve erişilebilirlik
- **Görseller:** ürünler için "kademe renkli kare + emoji" ya da kod ile çizilen karakter (SVG). Tek yerden: `src/assets/art.js`. Kademe sadece renkle değil, ikon + yazıyla da verilir.
- **Sesler Web Audio ile kodla üretilir** — dosya/telif yok.
- **Karanlık mod:** otomatik (sistem) / aydınlık / karanlık seçilebilir. Tema paletinin her ikisi de WCAG AA için test edilir.
- **Sade mod:** odak sırasında alt menü ve üst şerit solar; mola sırasında menü geri gelir (kazandığın parayı harcayabilmen için).
- **Geniş ekranda alt menü sol şeride dönüşür.**
- **Bildirim izni sadece kullanıcı ayarı açınca istenir.**
