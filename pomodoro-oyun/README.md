# Pomodoro Oyun

Lise öğrencileri için **oyunlaştırılmış Pomodoro** uygulaması: 25 dakika odaklan, 5 dakika dinlen. **Çalışmak, oyunu ilerletmenin tek yolu.** Her tamamlanan Pomodoro oyun parası kazandırır; para olmadan transfer, geliştirme, alışveriş yapılamaz.

Dört tema vardır ve hepsi herkese açıktır; istediğin zaman değiştirebilirsin:

| Tema | Fikir |
|------|-------|
| **Futbol Menajeri** | Takımı kur, oyuncu transfer et, haftalık maç oyna |
| **Kafe Dünyam** | Kendi kafeni aç, geliştir, festivale katıl |
| **Moda Stüdyosu** | Kumaş, model ve koleksiyon edin, defile düzenle |
| **Hayvan Barınağı** | Dostlara bak, barınağı büyüt, sahiplendirme gününe katıl |

Bu proje bir TÜBİTAK / Teknofest çalışmasıdır. İçinde **ölçülebilir veri toplayan bir araştırma modülü** vardır (bkz. `JURI_OZETI.md`).

> Tüm isimler ve karakterler kurgusaldır. Reklam, gerçek parayla satın alma, liderlik tablosu ve şans kutusu **yoktur**.

## Kurulum ve çalıştırma

Gerekenler: Node.js 18+.

```bash
cd pomodoro-oyun
npm install
npm run dev        # geliştirme sunucusu (http://localhost:5173)
npm run build      # dist/ klasörüne derler
npm run preview    # derlenmiş sürümü dener (http://localhost:4173)
npm test           # birim testleri
```

`dist/` klasörü herhangi bir statik sunucuya (GitHub Pages, okul sunucusu…) olduğu gibi konabilir; yollar göreli olduğu için alt klasörde de çalışır. İlk açılıştan sonra internet olmadan da çalışır ve telefonda "Ana ekrana ekle" ile uygulama gibi kurulabilir.

## Klasör yapısı

```
pomodoro-oyun/
├── index.html · public/ (manifest, sw.js, simgeler)
├── src/
│   ├── main.js              Başlangıç: durum, yönlendirme, tema uygulama
│   ├── config.js            TÜM sabitler (süreler, ödüller, limitler)
│   ├── core/                Oyun motoru — DOM'a dokunmaz, testlidir
│   │   ├── timer.js         Zamanlayıcı hesabı (saf)
│   │   ├── controller.js    Oturum akışı: sayaç + hile önleme + ekonomi + rozet
│   │   ├── antiCheat.js     Gizli sekme, saat hilesi, tek sayaç kilidi
│   │   ├── economy.js       Ödül, günlük tavan, güç, seviye, satın alma
│   │   ├── weekly.js        Haftalık olay (maç/festival/defile/sahiplendirme)
│   │   ├── streak.js        Esnek seri (haftada 1 dondurma)
│   │   ├── stats.js         İstatistikler
│   │   ├── achievements.js  32 rozet
│   │   ├── research.js      Anket, kontrol modu, CSV, rapor
│   │   ├── storage.js       Kayıt + sürüm göçü (migrasyon)
│   │   └── store.js · dates.js
│   ├── themes/              football/cafe/fashion/shelter .json  (+ index.js)
│   ├── ui/
│   │   ├── screens/         odak, dünyam, mağaza, istatistik, ayarlar, araştırma, hoş geldin, haftalık
│   │   ├── components/      modal, toast, konfeti, üst şerit, alt menü, tema seçici, anket
│   │   └── styles/          tokens.css (tasarım sistemi), base, components, screens, theme-*.css
│   ├── i18n/tr.json         Tüm arayüz metinleri
│   └── assets/art.js        Tüm görseller (SVG + emoji) tek yerde
├── tests/                   Vitest birim testleri
└── tools/                   Tema üretici, simge üretici, tarayıcı duman/görsel testleri
```

## Ekonomi sayıları nasıl ayarlanır?

Hepsi `src/config.js` içindedir:

| Ne | Nerede |
|----|--------|
| Odak/mola süreleri, duraklatma, gizli kalma sınırı | `CONFIG.timer` |
| Dakika başı para (25 dk = 100), bonuslar, günlük tavan (8) | `CONFIG.economy` |
| Kademe fiyatları ve seviye kilitleri | `CONFIG.tiers` (+ `npm run uret`) |
| Seviye eşikleri | `CONFIG.levelFractions` |
| Haftalık olay (rastgelelik, ödüller, saat) | `CONFIG.weekly` |
| Anket aralığı, kontrol modu süresi | `CONFIG.research` |

Fiyat ya da kademe değişirse tema dosyalarını yeniden üret: `npm run uret`. Denge testi (`tests/economy.test.js`) beklenen kazancı kontrol eder.

## Yeni tema nasıl eklenir? (adım adım)

1. **JSON:** `src/themes/football.json` dosyasını örnek alıp `src/themes/muzik.json` oluştur. Gerekli alanlar: `id`, `name`, `tagline`, `icon`, `currency`, `palette` (aydınlık + karanlık), `levels`, `categories`, `items` (en az 40), `weeklyEvent`, `texts`. Ya da `tools/temalari-uret.mjs` içine yeni bir tema bloğu ekleyip `npm run uret` çalıştır (fiyat/güç/seviye otomatik hesaplanır).
2. **Kaydet:** `src/themes/index.js` içinde JSON'u içe aktar ve `THEMES` nesnesine ekle; `src/config.js` içindeki `THEME_IDS` listesine kimliği yaz.
3. **CSS (isteğe bağlı):** `src/ui/styles/theme-muzik.css` oluştur (`:root[data-theme="muzik"] .ambient { … }` ile odak arka planı ve sahne zemini), `src/main.js` başına `import` ekle.
4. **Görseller:** Ürün `art` alanı `"emoji"` ise `emoji` alanı kullanılır; `"person-<stil>-<n>"` ise karakter çizilir (stiller `src/assets/art.js` içinde). Yeni çizim stili için sadece `art.js` değişir.
5. **Test et:** `npm test` — şema, 40 ürün, fiyatlar, kontrast, "TODO yok" testleri yeni temayı otomatik kapsar (test dosyası `THEME_IDS` listesini kullanır).

Motora (`src/core/`) dokunman gerekmez.

## Hile önleme ve sağlıklı tasarım (özet)

- Sekme **30 sn'den uzun** gizli kalırsa oturum para vermez. Saat geri/ileri alınırsa oturum geçersiz. İki sekmede aynı anda sayaç çalışmaz.
- Dil nötrdür: "Bu oturum sayılmadı" — kimse suçlanmaz. **Yarım kalan oturumda hiçbir şey kaybedilmez**, sadece para verilmez.
- Günde en fazla **8 Pomodoro** para verir. 23:00'ten sonra nazik uyku hatırlatması. 4 Pomodoro'da uzun mola önerisi.
- Seri: haftada 1 otomatik dondurma hakkı; sosyal kıyas yok, sadece dünkü kendinle.

## Araştırma modülü

Oturum kayıtları, 3 soruluk anket (başlangıç ve 2 hafta sonra), isteğe bağlı kontrol modu ve CSV dışa aktarma vardır. Ayrıntı ve sonuçların nasıl okunacağı: **`JURI_OZETI.md`**. Karar gerekçeleri: **`KARARLAR.md`**.

Gizli bölümü açmak için: Ayarlar → Hakkında → sürüm yazısına 5 kez dokun, sonra İstatistik → Araştırma raporu.

## Testler

```bash
npm test
```

Kapsam: zamanlayıcı hesabı, ekonomi ve günlük tavan, hile önleme, migrasyon ve kayıt, haftalık olay, seri, istatistikler, rozetler, CSV ve rapor, tema şeması, palet kontrastı, i18n anahtarları ve yasaklı ifadeler.

Tarayıcıda uçtan uca deneme (isteğe bağlı): `npm run build && npx vite preview --port 4173` çalışırken `node tools/e2e-duman.mjs` ve `node tools/e2e-gorsel.mjs` (Playwright gerekir).

## Kalite ölçümleri

- **Birim testleri:** 86 test, hepsi geçiyor (`npm test`).
- **Lighthouse 12 (mobil, derlenmiş sürüm):** Performans **100**, Erişilebilirlik **100**, En İyi Uygulamalar **100**, SEO 91. Lighthouse 12'de ayrı bir "PWA" puanı kalmadı; PWA şartları elle doğrulandı: manifest + 192/512/maskable PNG simgeler, servis çalışanı, **internet kapalıyken sayfa açılıyor**.
- **Tarayıcı duman testi:** ilk açılış → tema → tanıtım → Pomodoro → ödül → mağaza → Dünyam akışı konsolda hata/uyarı olmadan geçiyor.
