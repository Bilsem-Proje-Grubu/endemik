// Tema JSON dosyalarını üretir: `npm run uret`.
// Ürün listelerini buradan düzenleyip yeniden üretebilirsin; ya da src/themes/*.json dosyalarını elle de değiştirebilirsin.
// Tüm isimler KURGUSALDIR; gerçek kişi, marka ya da takım adı yoktur.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/themes');

// Kademe başına güç aralığı (ürün sırasına göre aralıkta dağıtılır)
const POWER = { bronze: [8, 14], silver: [18, 26], gold: [32, 44], legend: [55, 70] };

/** "Ad|Rol|kademe|emoji" satırlarını ürün nesnelerine çevirir. */
function makeItems(prefix, category, lines, artFor) {
  const counters = {};
  return lines.map((line, i) => {
    const [name, role, tier, emoji] = line.split('|');
    const [lo, hi] = POWER[tier];
    counters[tier] = (counters[tier] || 0) + 1;
    const power = lo + ((counters[tier] * 3 + i) % (hi - lo + 1));
    const t = CONFIG.tiers[tier];
    const item = {
      id: `${prefix}${String(i + 1).padStart(2, '0')}`,
      category,
      name,
      tier,
      price: t.price,
      power,
      minLevel: t.minLevel,
    };
    if (role) item.role = role;
    if (emoji) item.emoji = emoji;
    item.art = artFor(role, i, emoji);
    return item;
  });
}

const person = (style) => (role, i) => `person-${style(role)}-${(i % 6) + 1}`;
const emojiArt = () => 'emoji';

// ---------------------------------------------------------------- FUTBOL
const footballPlayers = `
Deniz Kayran|Kaleci|bronze
Eren Dalkıran|Kaleci|bronze
Selim Ardıç|Kaleci|silver
Aylin Tuncay|Kaleci|gold
Kaan Yılmazer|Defans|bronze
Berk Soydan|Defans|bronze
Ece Karabulut|Defans|bronze
Su Demirtaş|Defans|bronze
Taner Gökova|Defans|silver
Cem Alparslan|Defans|silver
Nehir Bozdoğan|Defans|silver
Onur Kalkan|Defans|gold
Rüzgar Tekinel|Defans|legend
Ali Duru|Orta saha|bronze
Mina Sarıkaya|Orta saha|bronze
Umut Çakırer|Orta saha|bronze
Bora Akyel|Orta saha|bronze
Baran Ölmez|Orta saha|silver
Zeynep Ayaz|Orta saha|silver
Tolga Erdemir|Orta saha|silver
Yasin Korkmaz|Orta saha|gold
Irmak Doğan|Orta saha|gold
Poyraz Aksel|Orta saha|legend
Efe Karaca|Forvet|bronze
Ceren Yaman|Forvet|bronze
Alp Tarhan|Forvet|bronze
Duru Işık|Forvet|silver
Mete Sönmez|Forvet|silver
Doruk Sezgin|Forvet|gold
Lale Çınar|Forvet|gold
Atlas Bayraktar|Forvet|gold
Rüya Kılıçer|Forvet|legend
`.trim().split('\n');

const footballStaff = `
Fizyoterapist Cansu|Fizyoterapist|bronze
Kondisyoner Tamer|Kondisyoner|bronze
Analist Gizem|Veri analisti|silver
Antrenör Orhan|Kaleci antrenörü|silver
Antrenör Naz|Yardımcı antrenör|gold
Gökhan Hoca|Teknik direktör|legend
`.trim().split('\n');

const footballFacilities = `
Antrenman Sahası||bronze|⚽
Soyunma Odası||bronze|🚿
Spor Salonu||silver|🏋️
Işıklandırma||silver|💡
Kapalı Tribün||gold|🏟️
Modern Stadyum||legend|🏆
`.trim().split('\n');

const footballRole = (r) => ({ Kaleci: 'gk', Defans: 'def', 'Orta saha': 'mid', Forvet: 'fwd' }[r] || 'staff');

const football = {
  id: 'football',
  name: 'Futbol Menajeri',
  tagline: 'Çalış, takımını şampiyon yap!',
  icon: '⚽',
  currency: { name: 'Altın', icon: '🪙' },
  palette: {
    light: { primary: '#17692F', onPrimary: '#FFFFFF', accent: '#B07F00', tint: '#E6F4EA' },
    dark: { primary: '#4CC477', onPrimary: '#06210F', accent: '#F5B700', tint: '#12301C' },
    preview: '#1B7F3B',
  },
  levels: ['Amatör Lig', '3. Lig', '2. Lig', '1. Lig', 'Süper Lig'],
  opponents: ['Mahalle Gençlik', 'Çarşı Spor', 'Liman Atletik', 'Dağ Yıldızları', 'Kıta Şampiyonları'],
  categories: [
    {
      id: 'players', name: 'Oyuncular', singular: 'oyuncu', slotLimit: 11, layout: 'pitch', icon: '👟',
      roleSlots: { Kaleci: 1, Defans: 4, 'Orta saha': 3, Forvet: 3 },
      positions: [
        { role: 'Kaleci', x: 50, y: 86 },
        { role: 'Defans', x: 14, y: 66 }, { role: 'Defans', x: 38, y: 70 }, { role: 'Defans', x: 62, y: 70 }, { role: 'Defans', x: 86, y: 66 },
        { role: 'Orta saha', x: 24, y: 44 }, { role: 'Orta saha', x: 50, y: 50 }, { role: 'Orta saha', x: 76, y: 44 },
        { role: 'Forvet', x: 20, y: 20 }, { role: 'Forvet', x: 50, y: 14 }, { role: 'Forvet', x: 80, y: 20 },
      ],
    },
    { id: 'staff', name: 'Teknik ekip', singular: 'ekip üyesi', slotLimit: 3, layout: 'row', icon: '📋' },
    { id: 'facilities', name: 'Tesisler', singular: 'tesis', slotLimit: 4, layout: 'row', icon: '🏟️' },
  ],
  items: [
    ...makeItems('p', 'players', footballPlayers, person(footballRole)),
    ...makeItems('s', 'staff', footballStaff, person(() => 'staff')),
    ...makeItems('f', 'facilities', footballFacilities, emojiArt),
  ],
  weeklyEvent: {
    id: 'match',
    name: 'Hafta Sonu Maçı',
    vsLabel: 'Rakip',
    scoreStyle: 'goals',
    intro: 'Hafta sonu maçının düdüğü çaldı!',
    resultTexts: {
      win: ['Harika bir oyun! Haftalık çalışman sahaya yansıdı, maçı kazandınız.', 'Tribünler ayakta! Bu hafta emeğinin karşılığını aldın.', 'Takım senin çalışmanla büyüdü ve kazandı!'],
      draw: ['Çekişmeli bir maç oldu, berabere kaldınız. Bir sonraki hafta daha da güçlü!', 'İki takım da elinden geleni yaptı: beraberlik.'],
      lose: ['Bu hafta olmadı ama takım ayakta. Yeni bir hafta, yeni bir şans!', 'Maçı rakip aldı; oyuncuların seninle gurur duyuyor. Birlikte tekrar deneriz.'],
    },
  },
  texts: {
    powerLabel: 'Takım gücü',
    worldTitle: 'Takımım',
    emptyWorld: 'Takımın boş. İlk Pomodoro\'nu yap, ilk oyuncunu al!',
    buyVerb: 'Transfer et',
    ownedLabel: 'Takımda',
    priceLabel: 'Bonservis',
    interrupted: 'Antrenman yarıda kaldı, yarın tekrar deneriz.',
    focusHint: 'Antrenman sürüyor…',
    breakHint: 'Soyunma odasında mola zamanı.',
    completed: ['Antrenman tamam! Takım güçleniyor.', 'Harika bir seans: formda kalmaya devam!', 'Bir antrenman daha cebinde.'],
    sceneNote: 'Slotlara en güçlü oyuncuların otomatik girer.',
  },
};

// ---------------------------------------------------------------- KAFE
const cafeFurniture = `
Hasır Sandalye||bronze|🪑
Ahşap Masa||bronze|🪵
Saksı Çiçeği||bronze|🪴
Duvar Saati||bronze|🕰️
Sarkıt Lamba||silver|💡
Kitap Rafı||silver|📚
Duvar Tablosu||silver|🖼️
Rahat Koltuk||silver|🛋️
Gitar Köşesi||gold|🎸
Dikey Bahçe||gold|🌿
Büyük Cam Cephe||gold|🪟
Kuş Sesli Çeşme||gold|⛲
Kristal Avize||legend|✨
Çatı Terası||legend|🌇
`.trim().split('\n');

const cafeMenu = `
Sade Kahve||bronze|☕
Demli Çay||bronze|🍵
Poğaça||bronze|🥐
Kurabiye||bronze|🍪
Cupcake||silver|🧁
Kaşarlı Tost||silver|🥪
Pankek||silver|🥞
Sıcak Çikolata||silver|🍫
Soğuk Kahve||gold|🧋
Cheesecake||gold|🍰
Çilekli Tatlı||gold|🍓
Ev Yapımı Limonata||gold|🍋
Kafenin Özel Karışımı||legend|🌟
Şefin Doğum Günü Pastası||legend|🎂
`.trim().split('\n');

const cafeStaff = `
Barista Defne|Barista|bronze
Garson Kuzey|Garson|bronze
Kasiyer Melis|Kasiyer|silver
Pastacı Hasan|Pastacı|silver
Müzisyen Ada|Müzisyen|gold
Şef Barista Tuna|Şef barista|gold
Fotoğrafçı Ilgın|Fotoğrafçı|gold
Müdür Sevgi|Kafe müdürü|legend
`.trim().split('\n');

const cafeEquipment = `
Demlik||bronze|🫖
Kahve Değirmeni||bronze|🫘
Buzdolabı||silver|🧊
Taş Fırın||silver|🔥
Hızlı Wi-Fi||gold|📶
Profesyonel Espresso Makinesi||legend|🏭
`.trim().split('\n');

const cafe = {
  id: 'cafe',
  name: 'Kafe Dünyam',
  tagline: 'Çalış, kendi kafeni büyüt!',
  icon: '☕',
  currency: { name: 'Kahve çekirdeği', icon: '🫘' },
  palette: {
    light: { primary: '#86441F', onPrimary: '#FFFFFF', accent: '#A8641B', tint: '#F6EBDD' },
    dark: { primary: '#E0A672', onPrimary: '#2A1608', accent: '#F0B86E', tint: '#33210F' },
    preview: '#8A4B2A',
  },
  levels: ['Mahalle Kafesi', 'Sevilen Köşe', 'Şehir Kafesi', 'Ödüllü Kafe', 'Ünlü Kafe'],
  opponents: ['Mahalle beklentisi', 'Gazete eleştirmeni', 'Şehir lezzet yarışması', 'Ulusal kafe ödülü', 'Dünya kafe festivali'],
  categories: [
    { id: 'furniture', name: 'Mobilya ve dekor', singular: 'dekor', slotLimit: 8, layout: 'grid', icon: '🪑' },
    { id: 'menu', name: 'Menü', singular: 'lezzet', slotLimit: 8, layout: 'grid', icon: '🍰' },
    { id: 'staff', name: 'Ekip', singular: 'ekip üyesi', slotLimit: 4, layout: 'row', icon: '🧑‍🍳' },
    { id: 'equipment', name: 'Ekipman', singular: 'ekipman', slotLimit: 4, layout: 'row', icon: '⚙️' },
  ],
  items: [
    ...makeItems('m', 'furniture', cafeFurniture, emojiArt),
    ...makeItems('u', 'menu', cafeMenu, emojiArt),
    ...makeItems('e', 'staff', cafeStaff, person(() => 'cafe')),
    ...makeItems('q', 'equipment', cafeEquipment, emojiArt),
  ],
  weeklyEvent: {
    id: 'festival',
    name: 'Kafe Festivali',
    vsLabel: 'Jüri beklentisi',
    scoreStyle: 'points',
    intro: 'Mahalle kafe festivali başladı, jüri kapıda!',
    resultTexts: {
      win: ['Jüri bayıldı! Kafen festivalin yıldızı oldu.', 'Kuyruklar kapıya kadar uzandı; bu hafta emeğin tatlı bir başarıya dönüştü.', 'Festivalin birincisi senin kafen!'],
      draw: ['Jüri kararsız kaldı ama kafen çok sevildi. Haftaya daha iddialı olacağız.', 'Dengeli bir festival oldu; müşteriler yine de gülümseyerek ayrıldı.'],
      lose: ['Bu festivalde ışığı başkaları aldı ama kafen hâlâ ayakta. Yeni haftada yeni tarifler!', 'Bu kez olmadı; müşterilerin bir sonraki gelişte daha iyisini bulacak.'],
    },
  },
  texts: {
    powerLabel: 'Kafe popülerliği',
    worldTitle: 'Kafem',
    emptyWorld: 'Kafen henüz boş. İlk Pomodoro\'nu yap, ilk sandalyeni al!',
    buyVerb: 'Kafeye ekle',
    ownedLabel: 'Kafede',
    priceLabel: 'Fiyat',
    interrupted: 'Kafe bir an kapandı, yarın yeniden açarız.',
    focusHint: 'Kahve demleniyor…',
    breakHint: 'Bir fincan mola zamanı.',
    completed: ['Bir fincan daha demlendi, kafen büyüyor!', 'Harika seans: müşteriler memnun.', 'Kasa dolmaya devam ediyor.'],
    sceneNote: 'Slotlara en popüler ürünlerin otomatik girer.',
  },
};

// ---------------------------------------------------------------- MODA
const fashionFabrics = `
Pamuk||bronze|🧶
Keten||bronze|🌾
Kot Kumaş||bronze|👖
Polar||bronze|☁️
Saten||silver|🎀
Kadife||silver|🟣
Şifon||silver|🦋
Yün||silver|🐑
İpek||gold|🐛
Dantel||gold|🕸️
Brokar||gold|🪭
Altın İşlemeli Kumaş||legend|🌟
`.trim().split('\n');

const fashionModels = `
Model Tara|Podyum modeli|bronze
Model Aras|Podyum modeli|bronze
Model Selin|Katalog modeli|silver
Model Kuzey|Katalog modeli|silver
Model Lara|Kapak modeli|gold
Model Deniz|Kapak modeli|gold
Model Ayaz|Podyum modeli|gold
Model Yaren|Starlet|legend
`.trim().split('\n');

const fashionOutfits = `
Basic Tişört||bronze|👕
Kot Pantolon||bronze|👖
Yazlık Elbise||bronze|👗
Atkı ve Bere||bronze|🧣
Trençkot||silver|🧥
Spor Ayakkabı||silver|👟
Omuz Çantası||silver|👜
Hasır Şapka||silver|👒
Abiye||gold|🥻
Topuklu Ayakkabı||gold|👠
Takı Seti||gold|💍
Güneş Gözlüğü||gold|🕶️
Taç Koleksiyonu||legend|👑
İmza Defile Kıyafeti||legend|🌈
`.trim().split('\n');

const fashionStudio = `
Dikiş Makinesi||bronze|🧵
Kesim Masası||bronze|✂️
Işıklı Ayna||silver|🪞
Kumaş Dolabı||silver|🗄️
Defile Podyumu||gold|🎭
Tasarım Tableti||legend|🖌️
`.trim().split('\n');

const fashion = {
  id: 'fashion',
  name: 'Moda Stüdyosu',
  tagline: 'Çalış, kendi defileni düzenle!',
  icon: '👗',
  currency: { name: 'Elmas', icon: '💎' },
  palette: {
    light: { primary: '#A82565', onPrimary: '#FFFFFF', accent: '#6A35C2', tint: '#FBE8F1' },
    dark: { primary: '#F28BBE', onPrimary: '#3A0720', accent: '#C3A1FF', tint: '#3A1329' },
    preview: '#B02A6B',
  },
  levels: ['Küçük Atölye', 'Butik Stüdyo', 'Moda Atölyesi', 'Tasarım Evi', 'Moda Evi'],
  opponents: ['Mahalle defilesi', 'Okul moda günü', 'Şehir moda haftası', 'Ulusal defile', 'Uluslararası moda haftası'],
  categories: [
    { id: 'fabrics', name: 'Kumaşlar', singular: 'kumaş', slotLimit: 6, layout: 'grid', icon: '🧵' },
    { id: 'models', name: 'Modeller', singular: 'model', slotLimit: 5, layout: 'row', icon: '🧍' },
    { id: 'outfits', name: 'Koleksiyon', singular: 'parça', slotLimit: 8, layout: 'grid', icon: '👗' },
    { id: 'studio', name: 'Stüdyo', singular: 'stüdyo ekipmanı', slotLimit: 4, layout: 'row', icon: '🪞' },
  ],
  items: [
    ...makeItems('k', 'fabrics', fashionFabrics, emojiArt),
    ...makeItems('o', 'models', fashionModels, person(() => 'model')),
    ...makeItems('c', 'outfits', fashionOutfits, emojiArt),
    ...makeItems('t', 'studio', fashionStudio, emojiArt),
  ],
  weeklyEvent: {
    id: 'runway',
    name: 'Defile',
    vsLabel: 'Jüri beklentisi',
    scoreStyle: 'points',
    intro: 'Işıklar söndü, defile başlıyor!',
    resultTexts: {
      win: ['Alkışlar dinmiyor! Koleksiyonun defilenin en çok konuşulanı oldu.', 'Jüri tasarımlarına tam puan verdi. Emeğin podyumda parladı!', 'Basın seni konuşuyor: harika bir defile!'],
      draw: ['Güzel bir defile oldu; jüri tasarımlarını beğendi ama kararsız kaldı. Haftaya daha cesur olalım.', 'Sağlam bir gösteri: ne öne çıktın ne geride kaldın.'],
      lose: ['Bu defile istediğin gibi olmadı ama yeni fikirler doğdu. Yeni hafta, yeni koleksiyon!', 'Bu kez jüri başka tarzları seçti; senin çizgin gelişmeye devam ediyor.'],
    },
  },
  texts: {
    powerLabel: 'Defile stili',
    worldTitle: 'Stüdyom',
    emptyWorld: 'Stüdyon boş. İlk Pomodoro\'nu yap, ilk kumaşını al!',
    buyVerb: 'Stüdyoya ekle',
    ownedLabel: 'Stüdyoda',
    priceLabel: 'Fiyat',
    interrupted: 'Dikişe ara verdik, yarın kaldığımız yerden devam ederiz.',
    focusHint: 'Tasarım üzerinde çalışılıyor…',
    breakHint: 'Terzi arası: biraz esne.',
    completed: ['Bir parça daha tamamlandı, koleksiyon büyüyor!', 'Harika seans: stilin gelişiyor.', 'Atölye parlıyor.'],
    sceneNote: 'Slotlara en güçlü parçalar otomatik girer.',
  },
};

// ---------------------------------------------------------------- BARINAK
const shelterAnimals = `
Yavru Köpek||bronze|🐶
Tekir Kedi||bronze|🐱
Tavşan||bronze|🐰
Hamster||bronze|🐹
Kanarya||bronze|🐤
Kirpi||silver|🦔
Kaplumbağa||silver|🐢
Papağan||silver|🦜
Siyah Kedi||silver|🐈‍⬛
Ördek||silver|🦆
Midilli||gold|🐴
Koyun||gold|🐑
Keçi||gold|🐐
Baykuş||gold|🦉
Kurtarıcı Köpek||legend|🐕‍🦺
Gökkuşağı Tavus Kuşu||legend|🦚
`.trim().split('\n');

const shelterHomes = `
Küçük Kulübe||bronze|🛖
Yumuşak Yatak||bronze|🛏️
Kedi Evi||bronze|🏠
Isıtmalı Kulübe||silver|🔥
Kedi Tırmanma Kulesi||silver|🗼
Geniş Ahır||gold|🏚️
Bahçeli Yuva||gold|🏡
Hayvan Köyü||legend|🏘️
`.trim().split('\n');

const shelterToys = `
Top||bronze|⚽
Kemik||bronze|🦴
Yumak||bronze|🧶
Mama Kabı||bronze|🥣
Tırmalama Tahtası||silver|🪵
Gıcırtılı Oyuncak||silver|🧸
Su Çeşmesi||silver|🚰
Veteriner Çantası||gold|🩺
Taşıma Aracı||gold|🚐
Sağlık Kliniği||legend|🏥
`.trim().split('\n');

const shelterGarden = `
Çim Alan||bronze|🌱
Sebze Bahçesi||bronze|🥕
Oyun Parkuru||silver|🎪
Gölgelik Ağaçlar||silver|🌳
Çiçek Bahçesi||gold|🌻
Doğal Havuz||legend|🏞️
`.trim().split('\n');

const shelter = {
  id: 'shelter',
  name: 'Hayvan Barınağı',
  tagline: 'Çalış, dostlarına yuva ol!',
  icon: '🐾',
  currency: { name: 'Mama puanı', icon: '🦴' },
  palette: {
    light: { primary: '#17707F', onPrimary: '#FFFFFF', accent: '#B5651D', tint: '#E1F3F6' },
    dark: { primary: '#5CC8D9', onPrimary: '#062C33', accent: '#F2A65A', tint: '#0F2F36' },
    preview: '#1F7A8C',
  },
  levels: ['Küçük Barınak', 'Mahalle Barınağı', 'Sevgi Yuvası', 'Büyük Barınak', 'Örnek Barınak'],
  opponents: ['Mahalle hedefi', 'Okul hedefi', 'Şehir hedefi', 'Bölge hedefi', 'Ülke hedefi'],
  categories: [
    { id: 'animals', name: 'Dostlarımız', singular: 'dost', slotLimit: 10, layout: 'grid', icon: '🐾' },
    { id: 'homes', name: 'Yuvalar', singular: 'yuva', slotLimit: 6, layout: 'row', icon: '🏠' },
    { id: 'care', name: 'Bakım ve oyuncaklar', singular: 'bakım ürünü', slotLimit: 6, layout: 'grid', icon: '🦴' },
    { id: 'garden', name: 'Bahçe', singular: 'bahçe öğesi', slotLimit: 4, layout: 'row', icon: '🌳' },
  ],
  items: [
    ...makeItems('a', 'animals', shelterAnimals, emojiArt),
    ...makeItems('h', 'homes', shelterHomes, emojiArt),
    ...makeItems('b', 'care', shelterToys, emojiArt),
    ...makeItems('g', 'garden', shelterGarden, emojiArt),
  ],
  weeklyEvent: {
    id: 'adoption',
    name: 'Sahiplendirme Günü',
    vsLabel: 'Haftalık hedef',
    scoreStyle: 'points',
    intro: 'Sahiplendirme günü başladı, kapıda ziyaretçiler var!',
    resultTexts: {
      win: ['Harika bir gün! Birçok dostumuz sevgi dolu yuvalara kavuştu.', 'Bu hafta yaptığın çalışma barınağı çok sevimli yaptı; ziyaretçiler hayran kaldı.', 'Hedefi aştık; kuyruklar boş yuva bırakmadı!'],
      draw: ['Sakin ama güzel bir gün: birkaç dostumuz yeni yuvasına gitti.', 'Hedefimize çok yaklaştık; haftaya daha da iyi olacak.'],
      lose: ['Bu hafta ziyaretçi az geldi ama dostlarımız seni seviyor. Yeni haftada yeniden deneriz!', 'Bu kez olmadı; barınak her zaman sıcak, kapımız açık.'],
    },
  },
  texts: {
    powerLabel: 'Mutluluk',
    worldTitle: 'Barınağım',
    emptyWorld: 'Barınak sessiz. İlk Pomodoro\'nu yap, ilk dostunu karşıla!',
    buyVerb: 'Barınağa kabul et',
    ownedLabel: 'Barınakta',
    priceLabel: 'Bakım masrafı',
    interrupted: 'Dostlarımız beklesin, yarın yeniden ilgilenirsin.',
    focusHint: 'Dostlarımız mışıl mışıl uyuyor…',
    breakHint: 'Dostlarla kısa bir mola.',
    completed: ['Dostlarımızın karnı doydu, teşekkürler!', 'Harika seans: barınak daha mutlu.', 'Kuyruklar sallanıyor!'],
    sceneNote: 'Slotlara en mutlu dostların otomatik girer.',
  },
};

// ---------------------------------------------------------------- Ortak işlemler
/** Seviyeleri (güç eşikleri + rakip gücü) ürünlerden hesaplar. */
function buildLevels(theme) {
  let maxPower = 0;
  for (const cat of theme.categories) {
    const inCat = theme.items.filter((i) => i.category === cat.id);
    const groups = cat.roleSlots ? Object.entries(cat.roleSlots).map(([r, n]) => [inCat.filter((i) => i.role === r), n]) : [[inCat, cat.slotLimit]];
    for (const [list, n] of groups) maxPower += list.map((i) => i.power).sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0);
  }
  const req = CONFIG.levelFractions.map((f) => Math.round(maxPower * f));
  const levels = theme.levels.map((name, i) => {
    const next = req[i + 1];
    const span = next !== undefined ? next - req[i] : Math.round(req[i] * 0.4);
    return {
      id: i + 1,
      name,
      requiredPower: req[i],
      opponentName: theme.opponents[i],
      opponentPower: Math.max(30, Math.round(req[i] + span * 0.6)),
    };
  });
  const { opponents, ...rest } = theme;
  return { ...rest, levels, maxPower };
}

for (const theme of [football, cafe, fashion, shelter]) {
  const built = buildLevels(theme);
  writeFileSync(join(OUT, `${theme.id}.json`), JSON.stringify(built, null, 2) + '\n');
  console.log(theme.id, 'ürün:', built.items.length, 'azami güç:', built.maxPower, 'eşikler:', built.levels.map((l) => l.requiredPower).join(','));
}
