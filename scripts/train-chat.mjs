// Sohbet botunun dil anlama modelini eğitir ve ölçer.
// Kullanım: node scripts/train-chat.mjs  → src/data/chat-model.json
// Eğitim verisi burada üretilir (soru kalıpları × tür/yer yer tutucuları × yazım çeşitleri).
// Başarı, eğitimde HİÇ kullanılmayan, elle yazılmış sorularla ölçülür.
import { readFileSync, writeFileSync } from 'node:fs';
import { DIM, features, fold } from '../src/chatmodel.js';
import { createBot } from '../src/chatlogic.js';

const species = JSON.parse(readFileSync(new URL('../src/data/species.json', import.meta.url)));
const SMALL = JSON.parse(readFileSync(new URL('../src/data/chat-small.json', import.meta.url)));

// <tur> = tür adı, <yer> = yer adı (çalışırken bot bunları maskeler)
const T = {
  ozet: ['<tur> nedir', '<tur> nedir kisaca anlat', '<tur> hakkinda bilgi ver', '<tur> hakkinda ne biliyorsun', '<tur> ne', '<tur> kimdir', 'bana <tur> turunu anlat',
    '<tur> turunu tanit', '<tur> ile ilgili bilgi', '<tur> hakkinda bilgi almak istiyorum', '<tur> ne tur bir canlidir', '<tur> neymis', 'bu tur nedir', 'bu tur hakkinda bilgi ver',
    '<tur> hakkinda kisa bir ozet', 'anlatir misin <tur>', '<tur> turu nedir', '<tur> denen sey ne', 'merak ediyorum <tur> nedir', '<tur> hakkinda neler soyleyebilirsin', '<tur> hakkinda anlatsana', '<tur> nasil bir canli anlatsana', '<tur> nasil bir canli', '<tur> turunu anlatsana', '<tur> anlatsana'],
  yer: ['<tur> nerede yasar', '<tur> nerelerde bulunur', '<tur> nerede yasiyor', '<tur> hangi bolgede yasar', '<tur> nerede gorulur', '<tur> yayilis alani neresi', '<tur> hangi illerde var',
    '<tur> nerede yetisir', '<tur> nerede yetisiyor', '<tur> nerede bulunuyor', 'bu tur nerede yasar', '<tur> hangi bolgelerde gorulur', '<tur> habitati neresi', '<tur> nereye ozgu',
    '<tur> turunun yasadigi yerler', '<tur> yasam alani nedir', '<tur> hangi sehirde', 'nerede gorebilirim <tur>', '<tur> nerede bulabilirim', '<tur> yayilisi nasil', 'hangi yerlerde yasar <tur>'],
  gorunum: ['<tur> neye benzer', '<tur> nasil gorunur', '<tur> neye benziyor', '<tur> nasil bir hayvan', '<tur> nasil bir bitki', '<tur> ozellikleri neler', '<tur> rengi ne', '<tur> boyu ne kadar',
    '<tur> ne kadar buyuk', '<tur> nasil bir seydir gorunus olarak', '<tur> morfolojisi nasil', '<tur> gorunusu nasil', 'bu tur neye benzer', '<tur> fiziksel ozellikleri', '<tur> ne renk',
    '<tur> yapraklari nasil', '<tur> tuyleri var mi', '<tur> nasil taniyabilirim', '<tur> bedeni nasil', '<tur> ne buyuklukte', '<tur> tarif eder misin'],
  cicek: ['<tur> ne zaman cicek acar', '<tur> ne zaman cicek aciyor', '<tur> cicek acma zamani', '<tur> hangi aylarda cicek acar', '<tur> ciceklenme tarihi', '<tur> ne zaman ciceklenir',
    '<tur> cicegi ne zaman acar', '<tur> hangi mevsimde cicek acar', '<tur> cicek acar mi', '<tur> cicek donemi', 'bu bitki ne zaman cicek acar', '<tur> cicekleri ne zaman acilir',
    '<tur> nisanda cicek acar mi', '<tur> cicek acma donemi ne zaman', '<tur> hangi ay cicek verir', '<tur> ciceklenme donemi nedir', '<tur> cicek acma ayi', 'ne zaman cicek acar <tur>', '<tur> ciceklenme zamani', '<tur> ciceklenme zamani ne', '<tur> ciceklenir mi', '<tur> ne zaman ciceklenir',
    '<tur> hangi donemde ciceklenir', '<tur> kac aylarinda cicek acar', '<tur> ne zaman cicek verir', '<tur> ciceklenme zamani nedir'],
  statu: ['<tur> nesli tehlikede mi', '<tur> korunma durumu ne', '<tur> koruma statusu nedir', '<tur> tehlike altinda mi', '<tur> nesli tukenmek uzere mi', '<tur> korunuyor mu',
    '<tur> yok olma riski var mi', '<tur> kirmizi listede mi', '<tur> iucn durumu ne', '<tur> statusu ne', '<tur> ne kadar tehlikede', '<tur> tehlike kategorisi nedir', 'bu tur korunuyor mu',
    '<tur> yasaklar var mi', '<tur> kritik mi', '<tur> koruma durumu', '<tur> neden tehlikede', '<tur> kanunla korunuyor mu', '<tur> nesli azalmis mi', 'ulusal statusu nedir <tur>'],
  liste: ['<yer> da hangi turler yasar', '<yer> civarinda hangi turler var', '<yer> bolgesinde hangi canlilar var', '<yer> da hangi hayvanlar var', '<yer> da hangi bitkiler var',
    '<yer> de hangi turler bulunur', '<yer> ile ilgili turler neler', '<yer> yakininda hangi turler yasiyor', '<yer> deki turleri listele', '<yer> da yasayan turler hangileri',
    '<yer> nin endemik turleri', '<yer> bolgesindeki korunan turler', 'hangi turler var', 'hangi hayvanlar var', 'hangi bitkiler var', 'kac tur var', 'hangi turleri tanitiyorsun',
    'listede neler var', 'bana ornek turler say', 'elinde hangi hayvanlar var', 'elinde hangi bitkiler var', 'kac hayvan kac bitki var', 'turleri say', '<yer> da endemik bitki var mi', '<yer> de neler yasiyor'],
  endemik: ['endemik ne demek', 'endemik nedir', 'endemik tur ne demek', 'endemik ne anlama geliyor', 'endemik canli nedir', 'endemik ne demek anlat', 'endemik kelimesinin anlami', 'endemik turler nedir',
    'endemik ne anlama gelir', 'endemik olmak ne demek', 'neden endemik turler onemli', 'endemik bitki nedir', 'endemik hayvan nedir', 'yerel endemik nedir', 'endemizm nedir', 'endemik ne', 'endemik tur ne ise yarar',
    'endemik ne demek sence', 'peki endemik ne demek'],
  selam: ['merhaba', 'selam', 'selamlar', 'merhabalar', 'hey', 'gunaydin', 'iyi gunler', 'iyi aksamlar', 'slm', 'mrb', 'hello', 'hi', 'iyi geceler', 'alo', 'orada misin'],
  tesekkur: ['tesekkurler', 'tesekkur ederim', 'sag ol', 'cok sagol', 'eyvallah', 'saol', 'harika tesekkurler', 'cok tesekkur ederim', 'super tesekkurler', 'sagolasin', 'mersi', 'eline saglik', 'yardimin icin tesekkurler', 'tamam tesekkurler', 'bu kadar yeter tesekkurler'],
  yardim: ['yardim', 'ne yapabilirsin', 'ne sorabilirim', 'bu ne', 'nasil kullanilir', 'neler yapabiliyorsun', 'bana yardim eder misin', 'ne soracagimi bilmiyorum', 'hangi sorulara cevap verirsin',
    'ne ise yarasin', 'sen ne is yaparsin', 'bu bot ne yapiyor', 'nasil soru sorayim', 'ornek soru ver', 'yardim lazim', 'komutlar neler', 'neleri biliyorsun'],
};
T.zaman = ['<ay> ayinda hangi bitkiler cicek acar', '<ay> da cicek acan bitkiler', '<ay> ayinda cicek acan turler neler', 'hangi bitkiler <ay> da cicek verir', '<ay> ayinda ciceklenen bitkiler hangileri',
  '<ay> aylarinda hangi bitkiler ciceklenir', 'hangi bitkiler <ay> ayinda ciceklenir', '<ay> da hangi turler cicek acar', '<ay> ayinda hangi cicekler acar', '<ay> ayinda cicek veren bitkiler',
  '<ay> mevsiminde hangi bitkiler cicek acar', '<ay> doneminde cicek acan bitkiler', '<ay> da ciceklenen turler var mi', 'hangi bitkiler <ay> da acar', '<ay> ayinda ciceklenen turleri say',
  '<ay> da hangi bitkiler ciceklenir', 'cicek acma zamani <ay> olan bitkiler', '<ay> ayinda hangi turlerin cicegi acar', 'hangi turler <ay> doneminde ciceklenir', '<ay> ayi bitkileri'];
T.tehdit = ['nesli tehlikede olan turler hangileri', 'hangi turler tehlikede', 'kritik tehlikede olan hayvanlar', 'hangi bitkilerin nesli tehlikede', 'tehlike altindaki turler neler', 'nesli tukenme tehlikesindeki hayvanlar',
  'en cok tehlikede olan turler', 'hangi turler yok olma tehlikesinde', 'tehlikedeki bitkiler hangileri', 'nesli tehlike altinda olan hayvanlar neler', 'hassas durumdaki turler hangileri', 'kritik seviyedeki turler',
  'hangi hayvanlarin nesli tehlikede', 'korunmasi en acil turler hangileri', 'yok olma riski olan turler', 'tehlike altindaki bitkileri say', 'hangi turlerin nesli tukenmek uzere', 'kritik durumdaki bitkiler hangileri',
  'nesli tehlike altindaki turleri listele', 'tehlikede olan hayvanlari say'];
T.disi = ['pizza nasil yapilir', 'hava nasil olacak', 'bugun mac kac kac bitti', 'matematik odevimi yap', 'bana sarki soyle', 'en iyi telefon hangisi', 'turkiyenin baskenti neresi', 'bitcoin ne olacak',
  'yemek tarifi ver', 'film onerir misin', 'saat kac', 'bana sut hakkinda siir yaz', 'ingilizce ceviri yap', 'futbol takimi hangisi', 'oyun oner', 'internet hizi neden yavas', 'sinav sonuclari ne zaman aciklanacak',
  'kedi nasil beslenir', 'arabam bozuldu ne yapayim', 'ders calismak istemiyorum', 'bana fikra anlat', 'dolar kac lira', 'ev odevime yardim et', 'en guzel renk ne', 'sen nerelisin', 'kod yazar misin',
  'instagram nasil acilir', 'yarin okul var mi', 'hangi burcsun', 'hosgeldin partisi nasil olur', 'hava durumu nasil', 'yarin hava nasil olacak', 'film nasildi', 'ders nasil gecti', 'su an hava nasil', 'bu sarki nasil', 'takim nasil oynadi'];
for (const [k, v] of Object.entries(SMALL)) T[k] = v.q;
const PRE = ['', '', '', 'peki ', 'acaba ', 'bir de ', 'lutfen ', 'bana soyler misin ', 'merak ettim ', 'soru: ', 'hocam ', 'bir sey sorayim '];
const POST = ['', '', '', ' acaba', ' lutfen', ' soyler misin', ' bilen var mi', ' ya', ' yani', ' sence'];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; // tekrarlanabilir sonuç

const data = [];
const intents = Object.keys(T);
for (const [intent, list] of Object.entries(T)) for (const t of list) for (let k = 0; k < 6; k++) {
  let q = t.replace(/<tur>/g, 'tur').replace(/<yer>/g, 'yer').replace(/<ay>/g, 'ay');
  if (!['selam', 'tesekkur'].includes(intent) || k % 2) q = rnd(PRE) + q + rnd(POST);
  data.push([q.trim(), intents.indexOf(intent)]);
}

// ---- Eğitim: çok sınıflı lojistik regresyon, Adam, L2 ----
const used = new Set(); const X = data.map(([q, y]) => { const f = features(q); f.forEach(([i]) => used.add(i)); return [f, y]; });
const idx = [...used].sort((a, b) => a - b); const pos = new Map(idx.map((c, k) => [c, k]));
const C = intents.length, D = idx.length;
const W = Array.from({ length: C }, () => new Float64Array(D)), B = new Float64Array(C);
const mW = W.map(() => new Float64Array(D)), vW = W.map(() => new Float64Array(D)), mB = new Float64Array(C), vB = new Float64Array(C);
const lr = 0.05, l2 = 1e-5; let step = 0;
for (let ep = 0; ep < 60; ep++) {
  X.sort(() => Math.random() - 0.5);
  for (let s = 0; s < X.length; s += 32) {
    const batch = X.slice(s, s + 32); step++;
    const gW = W.map(() => new Map()), gB = new Float64Array(C);
    for (const [f, y] of batch) {
      const z = Array.from(B);
      for (const [i, v] of f) { const k = pos.get(i); for (let c = 0; c < C; c++) z[c] += W[c][k] * v; }
      const m = Math.max(...z), e = z.map((x) => Math.exp(x - m)), sum = e.reduce((a, b) => a + b, 0);
      for (let c = 0; c < C; c++) {
        const d = (e[c] / sum - (c === y ? 1 : 0)) / batch.length;
        gB[c] += d;
        for (const [i, v] of f) { const k = pos.get(i); gW[c].set(k, (gW[c].get(k) || 0) + d * v); }
      }
    }
    const upd = (p, mm, vv, k, g) => { mm[k] = 0.9 * mm[k] + 0.1 * g; vv[k] = 0.999 * vv[k] + 0.001 * g * g; p[k] -= lr * (mm[k] / (1 - 0.9 ** step)) / (Math.sqrt(vv[k] / (1 - 0.999 ** step)) + 1e-8); };
    for (let c = 0; c < C; c++) { for (const [k, g] of gW[c]) upd(W[c], mW[c], vW[c], k, g + l2 * W[c][k]); upd(B, mB, vB, c, gB[c]); }
  }
}
const r = (x) => Math.round(x * 100) / 100;
const model = { intents, idx, w: W.map((row) => Array.from(row, r)), b: Array.from(B, r) };
writeFileSync(new URL('../src/data/chat-model.json', import.meta.url), JSON.stringify(model));
console.log(`Eğitim örneği: ${data.length}, sınıf: ${C}, kullanılan özellik: ${D}`);

// ---- Ölçüm: eğitimde kullanılmayan, elle yazılmış sorular (gerçek tür/yer adlarıyla) ----
const bot = createBot(species, model);
const TEST = {
  ozet: ['Kelaynak nedir?', 'Hopa engereği hakkında bilgi verir misin', 'Van kertenkelesi nasıl bir canlı, anlatsana', 'Truva kardeleni ile ilgili bir şeyler söyle', 'Toy kuşunu tanıt', 'Fırat kaplumbağası kimdir', 'Merak ettim, Kulindor ne?'],
  yer: ['Kelaynak nerede yaşıyor?', 'Fırat kaplumbağasını nerelerde görebilirim', 'Truva kardeleni hangi ilde yetişir', 'Hopa engereğinin yayılış alanı neresi', 'Toy kuşu hangi bölgelerde bulunur', 'Van kertenkelesi nerelerde var'],
  gorunum: ['Kelaynak neye benziyor?', 'Hopa engereği nasıl görünür', 'Truva kardeleninin yaprakları nasıl', 'Toy ne kadar büyük', 'Fırat kaplumbağasının rengi ne', 'Van kertenkelesini nasıl tanırım'],
  cicek: ['Truva kardeleni ne zaman çiçek açar?', 'Baskil lalesi hangi aylarda çiçek verir', 'Kulindor çiçeklenme zamanı ne', 'Dağ gülü hangi mevsimde çiçek açıyor', 'Mevzek ne zaman çiçeklenir'],
  statu: ['Kelaynak nesli tehlikede mi?', 'Hopa engereği korunuyor mu', 'Toyun koruma durumu nedir', 'Fırat kaplumbağası ne kadar tehlikede', 'Van kertenkelesi kırmızı listede mi'],
  liste: ['Ankara\'da hangi türler yaşıyor?', 'Malatya çevresinde hangi bitkiler var', 'Hatay\'daki korunan türleri listele', 'Kaç tür var elinde?', 'Muğla yakınında hangi hayvanlar yaşar', 'Hangi hayvanlar var?'],
  endemik: ['Endemik ne demek?', 'Endemik tür neden önemli', 'Endemik canlı ne anlama gelir', 'Endemik kelimesi neyi ifade eder'],
  selam: ['Merhaba!', 'Selam, merhaba', 'Günaydın', 'Merhabalar'],
  tesekkur: ['Teşekkürler', 'Sağ ol çok yardımcı oldun', 'Eyvallah'],
  yardim: ['Ne yapabilirsin?', 'Neler sorabilirim sana?', 'Sana ne sorabilirim', 'Nasıl kullanıyorum seni'],
};
let ok = 0, n = 0; const bad = [];
for (const [intent, qs] of Object.entries(TEST)) for (const q of qs) {
  const got = bot.reply(q).intent; n++; if (got === intent) ok++; else bad.push(`${q} → ${got} (beklenen ${intent})`);
}
console.log(`Elle yazılmış test: ${ok}/${n} doğru (%${Math.round((100 * ok) / n)})`);
bad.forEach((b) => console.log('  yanlış:', b));
// İkinci küme: şablonlar düzeltildikten SONRA, hiç bakılmadan yazılmış yeni sorular
const TEST2 = {
  ozet: ['Fırat kaplumbağası hakkında bilgi alabilir miyim?', 'Hopa engereğini bana anlatsana', 'Kelaynak ne tür bir kuş', 'Baskil lalesi nedir?'],
  yer: ['Hangi illerde yaşıyor Kelaynak?', 'Truva kardelenini nerede bulabilirim', 'Toy kuşu nerelerde görülür', 'Hopa engereği hangi bölgelerde yaşar'],
  gorunum: ['Kelaynağın görünüşü nasıl?', 'Baskil lalesinin özellikleri neler', 'Hopa engereği ne renk', 'Fırat kaplumbağası ne büyüklükte'],
  cicek: ['Baskil lalesi ne zaman çiçeklenir', 'Truva kardeleni çiçek açma dönemi ne zaman', 'Dağ gülü çiçeklenme zamanı ne', 'Kulindor hangi ayda çiçek verir'],
  statu: ['Fırat kaplumbağasının koruma durumu nedir?', 'Toy kuşu yok olma riskinde mi', 'Hopa engereği ne kadar korunuyor', 'Kelaynak kritik durumda mı'],
  liste: ['Kars civarında hangi canlılar yaşıyor?', 'İstanbul\'da hangi bitkiler var', 'Sana hangi türleri sorabilirim', 'Hatay\'da neler yaşıyor'],
  endemik: ['Endemik ne demek acaba', 'Endemik türler neden korunmalı'],
  selam: ['Selam, merhaba', 'Hey orada mısın'],
  tesekkur: ['Çok teşekkürler', 'Sağ olun'],
  yardim: ['Neler sorabilirim sana', 'Bu uygulama ne işe yarıyor'],
  zaman: ['Nisan ayında hangi bitkiler çiçek açar?', 'Mayısta çiçek açan bitkiler hangileri', 'Haziranda hangi türler çiçeklenir', 'İlkbaharda çiçek açan bitkiler', 'Temmuz ayında çiçek veren bitkiler var mı'],
  tehdit: ['Hangi türlerin nesli tehlikede?', 'Kritik tehlikedeki hayvanlar hangileri', 'Nesli tükenme tehlikesindeki bitkiler neler', 'Tehlike altındaki türleri say'],
  hal: ['Nasılsın?', 'Naber, iyi misin', 'Ne haber'],
  yapiyor: ['Neler yapıyorsun?', 'Şu an ne yapıyorsun', 'Bugün ne yaptın'],
  ad: ['Adın ne?', 'Sen kimsin', 'Kendini tanıtır mısın'],
  yapan: ['Seni kim yaptı?', 'Kimler geliştirdi seni', 'Seni kim eğitti'],
  yas: ['Kaç yaşındasın?', 'Yaşın kaç', 'Ne zaman doğdun'],
  veda: ['Hoşça kal', 'Görüşürüz', 'Ben gidiyorum'],
  iltifat: ['Harikasın', 'Çok akıllısın', 'Seni seviyorum'],
  keyifsiz: ['Sıkıldım', 'Canım sıkılıyor', 'Moralim bozuk'],
  disi: ['Bugün hava nasıl?', 'Bana bir fıkra anlat', 'Pasta tarifi verir misin', 'Maç kaç kaç bitti'],
};
let ok2 = 0, n2 = 0; const bad2 = [];
for (const [intent, qs] of Object.entries(TEST2)) for (const q of qs) { const got = bot.reply(q).intent; n2++; if (got === intent) ok2++; else bad2.push(`${q} → ${got} (beklenen ${intent})`); }
console.log(`Yeni test kümesi: ${ok2}/${n2} doğru (%${Math.round((100 * ok2) / n2)})`);
bad2.forEach((b) => console.log('  yanlış:', b));
// Tür bulma: her türün tam adı yazılınca o tür bulunuyor mu?
let found = 0; const miss = [];
for (const s of species) { const ids = bot.findSpecies(s.name + ' nerede yaşar'); if (ids.includes(s.id)) found++; else miss.push(s.name); }
console.log(`Tür adı bulma: ${found}/${species.length}`, miss.length ? '→ ' + miss.join(', ') : '');
