// Tür eylem planı PDF'lerinden alınan kısa bilgiler ve yayılış yerleri (ikinci tur).
// Koordinatlar yer adı (ilçe/vadi/göl) düzeyinde YAKLAŞIK noktalardır; "approx" etiketiyle gösterilir.
// PDF'te yeri/özelliği belirtilmeyen alanlar boş bırakılmıştır.
const P = (name, lat, lng, radiusKm = 8) => ({ name, lat, lng, radiusKm, approx: true });

export const details2 = {
  'Ağrı Kertenkelesi': {
    description: 'Yalnızca Türkiye’nin doğusunda ve çevre ülkelerin sınırlı bölgelerinde yaşayan, kaya kertenkeleleri (Darevskia) cinsinden bir türdür. Ardahan, Kars, Bayburt, Iğdır, Erzurum ve Ağrı illerinde yayılış gösterir.',
    statusIntl: 'Bern Sözleşmesi Ek-3',
    localities: [P('Posof (Ardahan)', 41.52, 42.73), P('Kars çevresi', 40.6, 43.1, 10), P('Ağrı çevresi', 39.72, 43.05, 10)],
  },
  'Akbez Geyik Böceği': {
    description: 'Ölü meşe ve karaağaç gibi geniş yapraklı ağaçların odunuyla beslenen bir geyik böceğidir. Hatay’da Belen, Erzin, Hassa, Kırıkhan ve Yayladağı gibi ilçelerde yayılış gösterir.',
    statusIntl: 'IUCN: NT (Yakın Tehdit; tür düzeyinde)',
    localities: [P('Belen (Hatay)', 36.49, 36.19), P('Erzin (Hatay)', 36.96, 36.2), P('Hassa (Hatay)', 36.8, 36.51), P('Kırıkhan (Hatay)', 36.5, 36.36), P('Yayladağı (Hatay)', 35.9, 36.07)],
  },
  'Alageyik': {
    description: 'Türkiye’de doğal popülasyonu bugün yalnızca Antalya’daki Düzlerçamı Yaban Hayatı Geliştirme Sahası ve çevresinde yaşar.',
    localities: [P('Düzlerçamı (Antalya)', 36.98, 30.5)],
  },
  'Anadolu Engereği': {
    description: 'Dünyada ve Türkiye’de yalnızca Antalya’nın Elmalı yöresinden bilinen, tek nokta endemiği bir engerektir. Elmalı’daki sığınak (refugium) alanında yaşayan relikt bir türdür.',
    morphology: 'Küçük bir engerek; gebe dişilerin boyu 242–256 mm olarak ölçülmüştür.',
    statusIntl: 'IUCN: CR (Kritik Tehlikede) · Bern Ek-2',
    localities: [P('Elmalı (Antalya)', 36.74, 29.92)],
  },
  'Avrupa Kırmızı Orman Karıncası': {
    description: 'Türkiye’de yalnızca Trakya’da bilinen, orman karıncası (Formica pratensis) türüdür. Bilinen yuva sayısı 8 lokalitede 21’dir.',
    statusIntl: 'IUCN: NT (Yakın Tehdit)',
    localities: [P('Meriç yöresi (Edirne)', 41.2, 26.55, 10)],
  },
  'Iğdır Çöl Faresi': {
    description: 'Dünyada yalnızca Ermenistan ve Türkiye’de, Iğdır’ın Aralık ilçesinde Ağrı Dağı eteklerindeki sınırlı çalılık ve kumluk alanda yaşayan bir çöl faresidir.',
    morphology: 'Sırt tarafı sarımsı kahverengi, karın beyaz renkli, sıçan benzeri bir çöl faresidir.',
    localities: [P('Aralık (Iğdır)', 39.87, 44.51)],
  },
  'Hatay Dağ Ceylanı': {
    description: 'Türkiye’de bugün yalnızca Hatay ilinde yaşayan dağ ceylanıdır. Eskiden Fırat’ın batısında Adana, Maraş, Gaziantep’e uzanan alanlarda yaşadığı düşünülür.',
    localities: [P('Kırıkhan–Hassa hattı (Hatay)', 36.6, 36.45, 15)],
  },
  'Beyazbantlı Dağ Engereği': {
    description: 'Sivas ili sınırlarında yaşayan, dar yayılışlı bir dağ engereğidir. Türkiye’deki ilk kaydı 1990’dır.',
    morphology: 'Boyu 80 cm’ye kadar ulaşabilen, nispeten kısa boylu bir dağ engereğidir.',
    localities: [P('Sivas çevresi', 39.75, 37.02, 15)],
  },
  'Hopa Engereği': {
    description: 'Artvin ilinde dar ve parçalı yayılış gösteren engerek türüdür. Ticari toplama ve yaşam alanı tahribatı nedeniyle hızla azalmaktadır.',
    localities: [P('Hopa (Artvin)', 41.4, 41.42, 12)],
  },
  'İskenderun Kertenkelesi': {
    description: 'Türkiye’de Adana Yumurtalık’tan Hatay Dörtyol’a kadar uzanan sahil boyunca kumluk alanlarda kesintili yayılış gösterir. İsrail, Kıbrıs ve Lübnan’da da bulunur.',
    localities: [P('Yumurtalık kıyıları (Adana)', 36.77, 35.78, 10), P('Dörtyol kıyıları (Hatay)', 36.85, 36.22, 10)],
  },
  'Kafkas Semenderi': {
    description: 'Kuzeydoğu Anadolu’da ve Gürcistan’ın batısında yaşayan, dar yayılışlı ve tehlike altındaki bir kuyruklu kurbağadır. Artvin, Giresun, Gümüşhane, Rize ve Trabzon’da denizden 2900 m yüksekliğe kadar parçalı dağılır.',
    morphology: 'İnce ve uzun yapılı; boyu 13–19 cm kadardır.',
    localities: [P('Artvin çevresi', 41.18, 41.82, 10), P('Rize çevresi', 41.02, 40.52, 10), P('Trabzon çevresi', 41.0, 39.72, 10), P('Gümüşhane çevresi', 40.46, 39.48, 10), P('Giresun çevresi', 40.91, 38.39, 10)],
  },
  'Karadeniz Alabalığı': {
    description: 'Karadeniz’e dökülen akarsularda yaşayan kırmızı benekli bir alabalık türüdür. Büyük akarsularda 1200–1300 m’den sonra, küçük akarsularda 300–400 m’den sonra görülür.',
    morphology: 'Vücut rengi gümüşi, baş ve ağız küçüktür; 1 m’yi aşan boylara ulaşabilir.',
    localities: [P('İkizdere (Rize)', 40.79, 40.56), P('Fırtına Vadisi (Çamlıhemşin, Rize)', 41.0, 41.0)],
  },
  'Marmaris Semenderi': {
    description: 'Sudan tamamen bağımsız yaşayan ve üremek için suya ihtiyaç duymayan bir kuyruklu kurbağadır. Gün boyu taş ve kayaların altında saklanır; deniz seviyesinden 850 m’ye kadar bulunur.',
    localities: [P('Marmaris (Muğla)', 36.85, 28.27), P('Ula (Muğla)', 37.1, 28.42)],
  },
  'Muğla İli Akdeniz Foku': {
    description: 'Dünya nüfusu 350–450 olarak tahmin edilen Akdeniz foku, Muğla’da Milas–Bodrum kıyı şeridinde yaşar.',
    localities: [P('Bodrum–Milas kıyıları (Muğla)', 37.1, 27.5, 20)],
  },
  'Çöl Varanı': {
    description: 'Şanlıurfa, Adıyaman ve Şırnak illerinde yaşayan, oyuk açan büyük bir sürüngendir.',
    localities: [P('Şanlıurfa çevresi', 37.16, 38.8, 15), P('Adıyaman çevresi', 37.76, 38.28, 15), P('Şırnak çevresi', 37.52, 42.46, 15)],
  },
  'Sakallı Yarasa': {
    description: 'Küçük-orta boyutlu, orman yaşamına bağlı bir yarasadır. Rize’de Kaçkar Dağı eteklerinde Fırtına Vadisi’nin Çat ve Meydan köylerinde araştırılmıştır.',
    localities: [P('Çat (Çamlıhemşin, Rize)', 40.98, 41.03)],
  },
  'Saz Kedisi': {
    description: 'Geniş ama parçalı dağılan bir kedi türüdür. Türkiye’de Adana’daki Akyatan Yaban Hayatı Geliştirme Sahası gibi sulak alanlarda bulunur.',
    localities: [P('Akyatan Lagünü (Adana)', 36.65, 35.3, 10)],
  },
  'Siraz Balığı': {
    description: 'Beyşehir Gölü ve onu besleyen dereler, Bakaran Çayı, Çarşamba Kanalı ve Suğla Gölü çevresinde yayılış gösteren tatlı su balığıdır.',
    localities: [P('Beyşehir Gölü (Konya)', 37.78, 31.52, 15)],
  },
  'Tavas Kurbağası': {
    description: 'Küresel ölçekte çok dar bir alanda, Denizli’nin Tavas ilçesinde Çakıroluk mevkiinde yaşayan yerel endemik bir kurbağadır.',
    morphology: 'Sırtın yanlarındaki kıvrımlar daima daha açık renklidir; hemen her zaman açık renkli bir sırt orta şeridi bulunur.',
    localities: [P('Tavas (Denizli)', 37.57, 29.07)],
  },
  'Tepeli Pelikan': {
    description: 'Ülkemizde üreyen ve yıl boyu kalan yerli bir popülasyonu ve Balkanlar ile Karadeniz’in kuzeyinden gelen bir kışlayan popülasyonu vardır. Menderes Deltası ve Azap Gölü önemli alanlardandır.',
    morphology: 'Erişkinlerde boy 160–180 cm, kanat açıklığı 310–345 cm, ağırlık 10–12 kg’dır.',
    localities: [P('Büyük Menderes Deltası (Aydın)', 37.55, 27.17, 15)],
  },
  'Toy': {
    description: 'Dünyanın en ağır uçabilen kuşlarından biridir.',
    morphology: 'Başı ve boynu gri, sırtı kızıl üzerine enine siyah çizgili, alt tarafı beyazdır. Erkeğin beyaz bıyıkları her yıl uzar ve yaşlı bireylerde 20 cm’yi geçer.',
  },
  'Turna': {
    description: 'Ülkemizde kuluçkaya yattığı belirlenen alanların 9’u Sivas ili sınırları içindedir. Tuz Gölü göç döneminde binlerce bireyin toplandığı bir alandır.',
    localities: [P('Tuz Gölü', 38.75, 33.4, 15), P('Sivas çevresi', 39.75, 37.02, 15)],
  },
  'Van Kertenkelesi': {
    description: 'Kesin olarak tek bir lokalitede yaşadığı belirtilen, kaya kertenkelesi (Darevskia) cinsinin en küçük türüdür.',
    morphology: 'Kaya kertenkeleleri arasında en kısa boyludur (99 mm); kesikli oksipital çizgisi ve 5–7 mavi yan lekesi vardır.',
  },
  'Avanos Keveni': {
    description: 'Nevşehir’in Avanos çevresinde yayılış gösteren endemik bir kevendir (Acantholimon).',
    localities: [P('Avanos (Nevşehir)', 38.72, 34.85)],
  },
  'Kabamayasıl': {
    description: 'Diyarbakır’ın Çermik ilçesinde dar alanda bilinen bir mayasıl otudur.',
    localities: [P('Çermik (Diyarbakır)', 38.14, 39.46)],
  },
  'Yalı Havacivası': {
    description: 'Yalnızca Muğla’nın Marmaris ve Ortaca ilçelerinde yayılış gösteren oldukça dar yayılışlı bir endemiktir.',
    localities: [P('Marmaris (Muğla)', 36.85, 28.27), P('Ortaca (Muğla)', 36.84, 28.77)],
  },
  'Nezaket Kevkesi': {
    description: 'Çankırı ilinde yayılış gösteren endemik bir bitkidir. İlin Devrez Çayı’nın suladığı bölgelerinde bulunur.',
    localities: [P('Çankırı çevresi', 40.6, 33.62, 15)],
  },
  'Gövrek': {
    description: 'Antalya’dan Elmalı’ya giderken Gümüş Bucağı mevkiinde de kaydedilmiş bir bitkidir. Elmalı yöresinde bilinir.',
    morphology: 'Taban yaprakları şeritsi-dar tersmızraksı, 4–10 × 0,4–0,8 cm, tam kenarlı veya hafif dalgalıdır.',
    localities: [P('Elmalı (Antalya)', 36.74, 29.92, 10)],
  },
  'Tuz Kırgını': {
    description: 'Türkiye’de yalnızca Konya’nın Cihanbeyli ilçesinde, Bolluk Gölü kıyılarında yetişen yerel endemik bir bitkidir.',
    morphology: 'Herdem yeşil, çok yıllık; yaprakları küçük pullara indirgenmiştir.',
    localities: [P('Bolluk Gölü (Cihanbeyli, Konya)', 38.45, 32.87, 6)],
  },
  'Beypazarı Geveni': {
    description: 'Yaklaşık 50 cm boyunda, tabanda çalımsı, parçalı yapraklı bir geven türüdür.',
    morphology: 'Yaprakçıkları 3–4 çift, eliptik–ters yumurtamsı, basık tüylüdür. Çiçekleri mavimsi menekşe rengindedir.',
    flowering: 'Mayıs ortası – Haziran ortası',
    localities: [P('Beypazarı (Ankara)', 40.17, 31.92, 10)],
  },
  'Er Geveni': {
    description: 'Bugün yalnızca Ankara’nın Çamlıdere ve Kızılcahamam ilçelerinde yerel olarak yayılış gösterir.',
    localities: [P('Çamlıdere (Ankara)', 40.49, 32.47), P('Kızılcahamam (Ankara)', 40.47, 32.65)],
  },
  'Niğde Obrizyası': {
    description: 'Niğde’de Üçkapılı Köyü çevresinde volkanik kayalar üzerinde yayılış gösteren bir bitkidir.',
    localities: [P('Üçkapılı yöresi (Niğde)', 37.97, 34.68, 10)],
  },
  'Edirne Sümbülü': {
    description: 'Edirne, Kırklareli ve Tekirdağ illerinde doğal yayılış gösteren soğanlı bir bitkidir. Tip lokalitesi Uzunköprü, Karapınar Köyü civarındadır.',
    localities: [P('Uzunköprü (Edirne)', 41.27, 26.69), P('Keşan (Edirne)', 40.86, 26.63), P('Edirne çevresi', 41.67, 26.56)],
  },
  'Ayaş Çançiçeği': {
    description: 'Ankara’da Ayaş’ın Aysantıbeli geçidi yol kenarı ile Kahramankazan’ın Orhaniye (Çal Tepesi) çevresinde yayılış gösterir.',
    localities: [P('Ayaş (Ankara)', 40.02, 32.33), P('Kahramankazan (Ankara)', 40.21, 32.68)],
  },
  'Tüylü Çançiçeği': {
    description: 'Aydın yöresinde Söke ve Kuşadası dolaylarında görülen bir çançiçeğidir.',
    localities: [P('Söke (Aydın)', 37.75, 27.4, 10), P('Kuşadası (Aydın)', 37.86, 27.26, 10)],
  },
  'İspir Çıngırağı': {
    description: 'Erzurum’da küçük bir alanda, İspir yöresinde Çoruh Vadisi’nde birkaç küçük popülasyon halinde bulunur.',
    localities: [P('İspir (Erzurum)', 40.48, 40.99, 10)],
  },
  'Kulindor': {
    description: 'İstanbul’da Anadolu yakasında Aydos Dağı ve Avrupa yakasında Subaşı çevresinde en iyi popülasyonları bulunan bir bitkidir.',
    localities: [P('Aydos Dağı (İstanbul)', 40.96, 29.29, 5)],
  },
  'Peygamber Çiçeği': {
    description: 'Türkiye’de Yozgat’ın Şefaatli ilçesinde sınırlı bir alanda yayılış gösteren bir bitkidir.',
    localities: [P('Şefaatli (Yozgat)', 39.5, 34.77, 10)],
  },
  'Sultan Pelemiri': {
    description: 'Dünyada yalnızca İstanbul’un Avrupa yakasında kireçten zengin toprak ve kayalıklarda yetişir. Yarımburgaz ve Ispartakule vadilerinde alanlar tespit edilmiştir.',
    morphology: 'Çok yıllık, 100 cm’ye kadar boylanan çok gövdeli bir çalıdır; sarımsı krem renkli çok sayıda çiçeği baş şeklinde toplanmıştır.',
    localities: [P('Yarımburgaz Vadisi (İstanbul)', 41.07, 28.74, 5)],
  },
  'Sinop Çiğdemi': {
    description: 'Sinop’un çayırlık yaşam alanlarında yayılış gösteren, süsengiller (Iridaceae) familyasından bir çiğdem türüdür.',
    localities: [P('Sinop çevresi', 42.02, 35.15, 15)],
  },
  'Kızıl Kaplanotu': {
    description: 'Dünyada yalnızca Karaman merkeze bağlı Bucakkışla, Kurucabel, Aşağıakın ve Çukur mevkilerinde, 100 km²’den az bir alanda yayılış gösterir. 350–900 m yükseklikte kızılçam orman açıklıklarında kalkerli yüzeylerde yetişir.',
    flowering: 'Mayıs – Temmuz',
    localities: [P('Karaman çevresi', 37.18, 33.22, 10)],
  },
  'Seçmen Çakşırı': {
    description: 'Türkiye’ye endemiktir; yalnızca Denizli’nin Acıpayam ilçesinde, Karaismailler–Suçatı köyleri arasında 630–950 m yükseklikte doğal olarak yetişir.',
    morphology: 'Boyu 130 cm’ye kadar olabilen çok yıllık bir bitkidir.',
    localities: [P('Acıpayam (Denizli)', 37.42, 29.35)],
  },
  'Güdük İğnelik': {
    description: 'Gümüşhane Merkez ilçesine bağlı Akocak ve Yağmurdere köyleri mevkiinde yayılış gösterir; Gümüşhane ve Trabzon kayıtları dışında başka bilgi yoktur.',
    localities: [P('Akocak yöresi (Gümüşhane)', 40.46, 39.48)],
  },
  'Sarı Afat': {
    description: 'Kütahya ili sınırlarında yayılış gösteren bir bitkidir; en fazla birey Acısu–Çiçekli Yayla mevkiinde bulunmuştur.',
    localities: [P('Kütahya çevresi', 39.42, 29.98, 15)],
  },
  'Konya Meyanı': {
    description: 'Konya ilinde doğal yayılış gösterir. En önemli tehdit, yayılış alanının Gözlü Tarım İşletmesi sınırları içindeki tarım arazisi ile karayolu arasında kalmasıdır.',
    morphology: 'Yaprakları pinnat, salgı benekli bir meyan türüdür.',
    localities: [P('Gözlü yöresi (Konya)', 38.05, 32.55, 10)],
  },
  'Sümbül': {
    description: '“Kaya sümbülü” olarak da bilinen ve yalnızca Türkiye’ye özgü bir alttürdür. Kahramanmaraş yöresinde doğal olarak yayılış gösterir; çiçeklerinin güçlü kokusuyla tanınır.',
    localities: [P('Kahramanmaraş çevresi', 37.58, 36.93, 15)],
  },
  'Tuz Beğendiotu': {
    description: 'İran-Turan bölgesine endemik; Tuz Gölü’nün güney-güneybatısında, Konya Cihanbeyli’de Tersakan Gölü kıyılarında ve Aksaray Eskil’de yayılış gösterir.',
    morphology: 'Çiçekleri lilamsı beyazımsı, çok yıllık bir bitkidir.',
    localities: [P('Cihanbeyli (Konya)', 38.65, 32.93, 12)],
  },
  'Kır Navruzu': {
    description: 'Kayseri’nin Yahyalı ilçesinde Çamlıca Mahallesi yöresinde yayılış gösteren bir süsen (Iris) türüdür.',
    localities: [P('Çamlıca (Yahyalı, Kayseri)', 38.1, 35.35)],
  },
  'Peşmen Navruzu': {
    description: 'Malatya’da Pötürge yöresinde bilinen bir Iris türüdür.',
    localities: [P('Pötürge yöresi (Malatya)', 38.17, 38.58)],
  },
  'Yer Sasalı': { description: 'Malatya ilinde bilinen bir ornithogalum türüdür.', localities: [P('Malatya çevresi', 38.35, 38.31, 15)] },
  'Malatya Kantaronu': { description: 'Malatya ilinde bilinen bir kantaron türüdür.', localities: [P('Malatya çevresi', 38.35, 38.31, 15)] },
  'Ak Navruz': {
    description: 'Osmaniye ilinde 21 lokalitede tespit edilmiş bir Iris alttürüdür.',
    localities: [P('Osmaniye çevresi', 37.07, 36.25, 15)],
  },
  'Ak Zambak': {
    description: 'İzmir ili sınırlarında yayılış gösteren popülasyonlar için eylem planı hazırlanmıştır.',
    localities: [P('İzmir çevresi', 38.42, 27.14, 15)],
  },
  'Kum Emziği': {
    description: 'İstanbul’da kumullarda yetişen bir emzik otu türüdür.',
    morphology: 'Kaide yaprakları 25–35 × 2,5–3 mm, gövde yaprakları 20–55 × 3,7 mm, lineer-spatulat – lineer-lanseolattır.',
    localities: [P('Altınşehir yöresi (İstanbul)', 41.04, 28.78, 5)],
  },
  'Gezertere': {
    description: 'Nisan ayında uyanıp gelişimine başlayan, Mayıs’ta çiçek açan, Haziran–Temmuz’da meyve veren ve Ağustos’ta tohumlarını döken bir bitkidir.',
    flowering: 'Mayıs',
  },
  'Has Tülübaşı': {
    description: 'Temel yayılış alanı Malatya’da Darende ve Gürün ilçeleri arasından geçen Tohma Vadisi’dir.',
    localities: [P('Tohma Vadisi (Darende, Malatya)', 38.55, 37.5, 12)],
  },
  'Koyak Tülübaşı': {
    description: 'Konya’nın Hadim ilçesinde Gevne Vadisi’nde yayılış gösterir.',
    localities: [P('Gevne Vadisi (Hadim, Konya)', 36.99, 32.46)],
  },
  'Mevzek': {
    description: 'Türkiye’ye endemiktir; yalnızca Konya’nın Karapınar ilçesinde çok dar bir alanda yayılış gösterir.',
    localities: [P('Karapınar (Konya)', 37.72, 33.55)],
  },
  'Aydın Gaşağı': {
    description: 'Aydın’daki Samsun Dağı’na özgü yerel endemik olarak bilinirken, 2001’de ikinci bir lokalite saptanmıştır.',
    localities: [P('Samsun Dağı (Aydın)', 37.7, 27.15, 10)],
  },
  'Dağ Gülü': {
    description: 'Artvin’in Murgul ilçesinde Tiryal Dağı’nda yayılış gösteren bir bitkidir.',
    localities: [P('Tiryal Dağı (Murgul, Artvin)', 41.28, 41.55)],
  },
  'Dicle Koruğu': {
    description: 'Diyarbakır ilinde yayılış gösteren, kirpikli yapraklarından adını alan bir koruk otu türüdür.',
    localities: [P('Diyarbakır çevresi', 37.91, 40.23, 15)],
  },
  'Karaüşmen': {
    description: 'Konya’nın Karapınar yöresinde Meke Gölü volkan konisinin güneydoğusundaki küçük tepelerde ve volkan ağzının doğusunda yayılış gösterir. 950–1076 m yükseklikte yetişir.',
    flowering: 'Haziran',
    localities: [P('Meke Gölü (Karapınar, Konya)', 37.68, 33.64, 5)],
  },
  'Bozdağ Sivri Çayı': {
    description: 'İzmir Ödemiş’in Bozdağlar bölgesinde tek nokta endemiği olarak yayılış gösterir.',
    localities: [P('Bozdağlar (Ödemiş, İzmir)', 38.35, 28.04)],
  },
  'Denizli Nakılı': {
    description: 'Türkiye’ye endemiktir; yalnızca Denizli il sınırları içinde yayılış gösterir.',
    localities: [P('Denizli çevresi', 37.78, 29.09, 15)],
  },
  'Testi Otu': {
    description: 'Denizli Nakılı ile birlikte aynı eylem planı kapsamında korunan, yakın zamanda tanıtılmış bir bitkidir.',
    localities: [P('Denizli çevresi', 37.78, 29.09, 15)],
  },
  'Erzincan Sütotu': {
    description: 'Erzincan ili sınırları içinde yayılış gösteren endemik bir bitkidir.',
    localities: [P('Erzincan çevresi', 39.75, 39.49, 15)],
  },
  'Çarşak Çayı': {
    description: 'Dünyada yalnızca Bayburt ili sınırlarında, Kop Dağı Geçidi’ndeki Bahtlı Dağ’da bulunur.',
    localities: [P('Bahtlı Dağ (Kop Dağı, Bayburt)', 40.03, 40.45)],
  },
  'Terli Sığırkuyruğu': {
    description: 'Niğde’nin Çamardı ilçesinde Çukurbağ Köyü dolaylarında, Emli Vadisi girişinde ve Elekgölü’nün kuzeyinde yayılış gösterir.',
    localities: [P('Çamardı (Niğde)', 37.35, 34.98)],
  },
  'Riva Sığırkuyruğu': {
    description: 'Kırklareli’nde Demirköy ilçesinde İğneada Longoz Ormanları ve Kıyıköy doğal sit alanları türün esas yayılış alanlarıdır.',
    localities: [P('İğneada (Kırklareli)', 41.87, 27.97), P('Kıyıköy (Kırklareli)', 41.63, 28.1)],
  },
  'Sığırkuyruğu': {
    description: 'Eskişehir’in Sivrihisar ilçesi ve çevresinde yetişir; ilçenin her yerinde bulunmaz.',
    localities: [P('Sivrihisar (Eskişehir)', 39.45, 31.53, 15)],
  },
  'Gök Sığırkuyruğu': {
    description: 'Bursa il sınırlarında yayılış gösteren bir sığırkuyruğu türüdür.',
    localities: [P('Bursa çevresi', 40.18, 29.06, 15)],
  },
  'Karacafiği': {
    description: 'Dünyada yalnızca Ankara’nın Kızılcahamam ilçesinde Akyarma Geçidi yakınlarında 1400–1500 m arasında çok sınırlı bir alanda yayılış gösterir.',
    localities: [P('Akyarma Geçidi (Kızılcahamam, Ankara)', 40.47, 32.65, 5)],
  },
  // Önceki turdaki kaydı PDF'teki yer adlarıyla güncelle
  'Trabzon Kanaryaotu': {
    localities: [P('Boztepe, Maşatlık (Trabzon)', 41.0, 39.75, 6), P('Kürtün (Gümüşhane)', 40.69, 39.1, 8)],
  },
  'Baskil Lalesi': {
    localities: [P('Kuluşağı Köyü, Baskil (Elazığ)', 38.57, 38.82, 5)],
  },
};
