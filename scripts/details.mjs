// Ayrıntılı kayıtlar. Statü ve çiçeklenme bilgileri ilgili tür eylem planı PDF'inden alınmıştır.
// Lokalite koordinatları yer adı düzeyinde YAKLAŞIK noktalardır (approx: true); PDF'teki
// haritalarla doğrulanıp kesinleştirilmelidir.
export const details = {
  'Eber Sarısı': {
    description: 'Dünyada yalnızca Eber Gölü çevresinde yetişen, Türkiye’nin en dar yayılışlı bitkilerinden biridir. Yöresel adı piyan veya acı piyandır. Baklagiller (Fabaceae) familyasındandır.',
    flowering: 'Nisan sonu – Mayıs',
    statusNational: 'Türkiye Bitkileri Kırmızı Listesi: CR (Kritik Tehlikede)',
    statusIntl: 'Bern Sözleşmesi Ek-I (mutlak korunan bitki)',
    localities: [
      { name: 'Eber Gölü güneyi (Afyonkarahisar)', lat: 38.612, lng: 31.152, radiusKm: 5, approx: true },
      { name: 'Akşehir Gölü güneybatısı', lat: 38.5, lng: 31.321, radiusKm: 5, approx: true },
    ],
  },
  'Baskil Lalesi': {
    description: 'Elazığ ili sınırlarında dar bir alanda yayılış gösteren, soğanlı ve yerel endemik bir lale türüdür. Tür eylem planı 2015’te hazırlanmıştır.',
    flowering: 'Nisan sonu – Mayıs (mayıs ortasında tohuma geçer)',
    statusNational: 'Endemik, nesli tehlike altında',
    statusIntl: '',
    localities: [{ name: 'Baskil (Elazığ)', lat: 38.57, lng: 38.82, radiusKm: 10, approx: true }],
  },
  'Truva Kardeleni': {
    description: 'Dünyada yalnızca Çanakkale’de parçalı olarak yayılış gösteren yerel endemik, soğanlı bir bitkidir. Denizden 400–600 m yükseklikte yetişir. Çanakkale yöresinde “boynueğri” olarak da bilinir.',
    flowering: 'Kış sonu – erken ilkbahar',
    statusNational: 'Yerel endemik',
    statusIntl: 'IUCN: CR (Kritik Tehlikede) · CITES Ek-II',
    localities: [{ name: 'Biga (Çanakkale)', lat: 40.22, lng: 27.24, radiusKm: 15, approx: true }],
  },
  'Trabzon Kanaryaotu': {
    description: 'Trabzon ve Gümüşhane illerinde yayılış gösteren endemik bir papatyagiller (Asteraceae) bitkisidir.',
    flowering: '',
    statusNational: 'Endemik',
    statusIntl: 'IUCN: CR · Bern ve CITES ek listelerinde yok',
    localities: [
      { name: 'Trabzon çevresi', lat: 40.9, lng: 39.7, radiusKm: 20, approx: true },
      { name: 'Gümüşhane çevresi', lat: 40.46, lng: 39.48, radiusKm: 20, approx: true },
    ],
  },
  'Samsun Madımağı': {
    description: 'Samsun’un Lâdik ve Havza çevresinde, Tersakan Çayı kıyılarında ve köy mera alanlarında yayılış gösteren endemik bir bitkidir.',
    flowering: '',
    statusNational: 'Endemik',
    statusIntl: '',
    localities: [
      { name: 'Lâdik (Samsun)', lat: 40.91, lng: 35.89, radiusKm: 10, approx: true },
      { name: 'Havza (Samsun)', lat: 40.97, lng: 35.67, radiusKm: 8, approx: true },
    ],
  },
  'Manisa Lalesi': {
    description: 'Doğu Akdeniz bölgesinin bir lale türüdür. Türkiye’de yalnızca batıda yayılış gösterir. Çiçeklenme mevsimi baharın ilk aylarına denk gelir.',
    flowering: 'İlkbaharın ilk ayları',
    statusNational: '',
    statusIntl: '',
    localities: [{ name: 'Spil Dağı (Manisa)', lat: 38.55, lng: 27.4, radiusKm: 8, approx: true }],
  },
  'Fırat Kaplumbağası': {
    description: 'Fırat ve Dicle nehirleri ile kollarına özgü, Türkiye, Suriye, Irak ve İran’da dağılış gösteren tatlı su kaplumbağasıdır. Barajlar, yaşam alanı tahribatı, olta avcılığı ve kirlilik tehdit eder.',
    morphology: '',
    statusNational: 'Tür eylem planı: Gaziantep',
    statusIntl: 'IUCN: EN (Tehlike Altında), popülasyon azalıyor · Bern Ek-III',
    localities: [{ name: 'Fırat Nehri – Gaziantep/Karkamış', lat: 36.83, lng: 38.0, radiusKm: 15, approx: true }],
  },
  'Kelaynak': {
    description: 'Sürüler halinde yaşayan, kıvrık gagalı, kel başlı göçmen bir kuştur. Türkiye’de Şanlıurfa Birecik’te yaşayan yarı-yabani koloni ile bilinir.',
    morphology: 'Kel kırmızı baş, uzun kıvrık kırmızı gaga, siyah yeşilimsi metalik parlak tüyler.',
    flowering: '',
    statusNational: '',
    statusIntl: '',
    localities: [{ name: 'Birecik (Şanlıurfa)', lat: 37.03, lng: 37.98, radiusKm: 6, approx: true }],
  },
};
