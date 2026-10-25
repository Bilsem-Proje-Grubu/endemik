"""Eğitim verisi üretir: (bilgi parçası, soru) -> cevap.
Cevaplar, çok sayıda cümle kalıbının rastgele birleştirilmesiyle kurulur; bilgi (yer, görünüş, tarih...) her zaman 'bilgi' parçasından kopyalanır.
Model bu örneklerden "bilgiyi oku, soruya göre kendi cümlenle yaz" işini öğrenir. Bilgiyi ezberlemez."""
import json, random, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
random.seed(11)
ROOT = os.path.join(os.path.dirname(__file__), '..')
SP = json.load(open(os.path.join(ROOT, 'src/data/species.json')))

def fold(s):
    s = s.lower().replace('i̇', 'i')
    for a, b in zip('ışğüöçâîû', 'isguocaiu'): s = s.replace(a, b)
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', ' ', s)).strip()
def end(x):
    x = x.strip()
    return x if re.search(r'[.!?)]$', x) else x + '.'
def kind(s): return 'hayvan' if s['group'] == 'fauna' else 'bitki'
def pick(a): return random.choice(a)
def listing(items, n=8):
    return ', '.join(items[:n]) + (f' ve {len(items) - n} tür daha' if len(items) > n else '')

# ---- Soru kalıpları (sade harflerle; kullanıcı da böyle yazsa sorun olmaz) ----
Q = {
 'ozet': ['{t} nedir', '{t} nedir kisaca anlat', '{t} hakkinda bilgi ver', '{t} hakkinda ne biliyorsun', '{t} ne', '{t} kimdir', 'bana {t} turunu anlat', '{t} turunu tanit',
   '{t} ile ilgili bilgi', '{t} hakkinda bilgi almak istiyorum', '{t} ne tur bir canlidir', 'anlatir misin {t}', '{t} turu nedir', 'merak ediyorum {t} nedir', '{t} hakkinda anlatsana',
   '{t} nasil bir canli anlatsana', '{t} hakkinda kisa bir ozet', 'bir de {t} nedir', 'peki {t} nedir', '{t} hakkinda neler soyleyebilirsin'],
 'yer': ['{t} nerede yasar', '{t} nerelerde bulunur', '{t} nerede yasiyor', '{t} hangi bolgede yasar', '{t} nerede gorulur', '{t} yayilis alani neresi', '{t} hangi illerde var',
   '{t} nerede yetisir', '{t} nerede bulunuyor', '{t} hangi bolgelerde gorulur', '{t} habitati neresi', '{t} yasam alani nedir', '{t} hangi sehirde', 'nerede gorebilirim {t}',
   '{t} nerede bulabilirim', '{t} yayilisi nasil', 'hangi yerlerde yasar {t}', 'peki {t} nerede yasar', '{t} nerelerde yetisiyor', '{t} hangi illerde gorulur'],
 'gorunum': ['{t} neye benzer', '{t} nasil gorunur', '{t} neye benziyor', '{t} ozellikleri neler', '{t} rengi ne', '{t} boyu ne kadar', '{t} ne kadar buyuk', '{t} morfolojisi nasil',
   '{t} gorunusu nasil', '{t} fiziksel ozellikleri', '{t} ne renk', '{t} nasil taniyabilirim', '{t} ne buyuklukte', '{t} tarif eder misin', '{t} nasil bir gorunuse sahip',
   'peki {t} neye benziyor', '{t} nasil gorunuyor', '{t} bedeni nasil', '{t} ayirt edici ozellikleri neler', '{t} neye benzer anlat'],
 'cicek': ['{t} ne zaman cicek acar', '{t} ne zaman cicek aciyor', '{t} cicek acma zamani', '{t} hangi aylarda cicek acar', '{t} ciceklenme tarihi', '{t} ne zaman ciceklenir',
   '{t} hangi mevsimde cicek acar', '{t} cicek acar mi', '{t} cicek donemi', '{t} ciceklenme zamani ne', '{t} hangi ay cicek verir', '{t} ciceklenme donemi nedir', '{t} ciceklenme zamani',
   '{t} ciceklenir mi', '{t} hangi donemde ciceklenir', 'peki {t} ne zaman ciceklenir', '{t} ne zaman cicek verir', 'ne zaman cicek acar {t}', '{t} cicek acma donemi ne zaman', '{t} kac aylarinda cicek acar'],
 'statu': ['{t} nesli tehlikede mi', '{t} korunma durumu ne', '{t} koruma statusu nedir', '{t} tehlike altinda mi', '{t} korunuyor mu', '{t} yok olma riski var mi', '{t} kirmizi listede mi',
   '{t} iucn durumu ne', '{t} statusu ne', '{t} ne kadar tehlikede', '{t} tehlike kategorisi nedir', '{t} koruma durumu', '{t} neden tehlikede', '{t} kanunla korunuyor mu',
   'peki {t} korunuyor mu', '{t} ulusal statusu nedir', '{t} uluslararasi statusu nedir', '{t} nesli azalmis mi', '{t} kritik mi', 'ne kadar korunuyor {t}'],
}
QLIST = ['{y} da hangi turler yasar', '{y} civarinda hangi turler var', '{y} bolgesinde hangi canlilar var', '{y} da hangi hayvanlar var', '{y} da hangi bitkiler var', '{y} de hangi turler bulunur',
  '{y} ile ilgili turler neler', '{y} yakininda hangi turler yasiyor', '{y} deki turleri listele', '{y} da yasayan turler hangileri', '{y} bolgesindeki korunan turler', '{y} da endemik bitki var mi',
  '{y} de neler yasiyor', 'peki {y} da hangi turler var', '{y} civarinda neler var']
QGEN = ['hangi turler var', 'hangi hayvanlar var', 'hangi bitkiler var', 'kac tur var', 'hangi turleri tanitiyorsun', 'listede neler var', 'bana ornek turler say', 'elinde hangi hayvanlar var',
  'elinde hangi bitkiler var', 'kac hayvan kac bitki var', 'turleri say', 'neler biliyorsun']
PRE = ['', '', '', '', 'peki ', 'acaba ', 'lutfen ', 'bana soyler misin ', 'merak ettim ', 'hocam ']
POST = ['', '', '', '', ' acaba', ' lutfen', ' soyler misin', ' ya', ' yani']
def dress(q): return (pick(PRE) + q + pick(POST)).strip()

# ---- Cevap kalıpları: bilgi parçaları {…} içine kopyalanır ----
def a_ozet(s):
    n, sci, k, d = s['name'], s['sci'], kind(s), end(s.get('description') or '')
    if not s.get('description'): return pick([f'{n} ({sci}) bir {k} türü. Ayrıntılı bir açıklaması kayıtlarımda yok.', f'{n} için elimde yalnızca bilimsel adı var: {sci}. Bir {k} türü.'])
    return pick([f'{n} ({sci}), Türkiye\'nin korunan {k} türlerinden biri. {d}', f'{n} için kısaca şunu söyleyebilirim: {d} Bilimsel adı {sci}.',
      f'{d} Bu {k} türü {sci} olarak adlandırılıyor ve {n} adıyla biliniyor.', f'{n} bir {k} türü. {d}', f'Kısaca anlatayım: {d} ({n}, {sci})',
      f'{n}, bilimsel adıyla {sci}. {d}', f'{cap(k)} türü olan {n} ({sci}) şöyle tanıtılıyor: {d}']) + pick(['', '', '', ' İstersen nerede yaşadığını da söyleyebilirim.', ' Dilersen görünüşünü de anlatabilirim.'])
def cap(x): return x[:1].upper() + x[1:]
def a_yer(s):
    n = s['name']; l = [x['name'] for x in s['localities']]
    if not l: return pick([f'{n} için kayıtlarımda yayılış yeri bilgisi yok.', f'{n} nerede yaşıyor diye baktım ama kayıtlarımda yer bilgisi bulamadım.'])
    t = ', '.join(l[:6]) + (f' ve {len(l) - 6} yer daha' if len(l) > 6 else '')
    return pick([f'{n} şu yerlerde biliniyor: {t}. Bunlar genel yayılış bilgisidir, tam nokta değildir.', f'Kayıtlara göre {n} {t} çevresinde yaşıyor. Tam yerini paylaşmıyoruz, çünkü nadir türler korunmalı.',
      f'{n} için bilinen yerler: {t}. Türün sayfasındaki haritada bu yerleri görebilirsin.', f'{n} {t} yörelerinde görülüyor. Kesin konum bilgisi verilmiyor.', f'Elimdeki kayıtlara göre {n} şuralarda yaşıyor: {t}.'])
def a_gorunum(s):
    n = s['name']; m = s.get('morphology')
    if not m: return pick([f'{n} için görünüşüyle ilgili ayrıntılı bir kayıt yok.', f'{n} nasıl görünür diye baktım ama kayıtlarımda görünüş bilgisi yok.'])
    m = end(m)
    return pick([f'{n} şöyle tarif ediliyor: {m}', f'Görünüş olarak {n}: {m}', f'{n} için kayıtlı özellikler: {m}', f'{n} kayıtlarda şöyle anlatılıyor: {m}', f'{n} nasıl görünür derseniz: {m}'])
def a_cicek(s):
    n = s['name']
    if s['group'] == 'fauna': return pick([f'{n} bir hayvan olduğu için çiçek açmaz. İstersen görünüşünü anlatabilirim.', f'Çiçeklenme bitkilere özgüdür; {n} bir hayvan. Nerede yaşadığını sorabilirsin.'])
    f = s.get('flowering')
    if not f: return pick([f'{n} için çiçeklenme tarihi kayıtlarımda yok. Bu bilgi tür eylem planında verilmemiş.', f'{n} ne zaman çiçek açıyor diye baktım ama kayıtlarımda tarih yok.'])
    f = end(f)
    return pick([f'{n} için çiçeklenme dönemi: {f}', f'{n} şu dönemde çiçek açıyor: {f}', f'Çiçeklenme zamanı olarak kayıtlarda {f} yazıyor ({n}).', f'{n} çiçeklerini şu dönemde veriyor: {f}'])
def a_statu(s):
    n = s['name']; p = []
    if s.get('statusNational'): p.append(end('Ulusal durumu: ' + s['statusNational']))
    if s.get('statusIntl'): p.append(end('Uluslararası durumu: ' + s['statusIntl']))
    if not p: return pick([f'{n} için korunma durumu bilgisi kayıtlarımda yok.', f'{n} korunuyor mu diye baktım ama kayıtlarımda statü bilgisi yok.'])
    j = ' '.join(p)
    return pick([f'{n} için korunma durumu şöyle. {j}', f'{n} koruma altında. {j}', f'Korunma açısından {n}: {j}', f'{n} için kayıtlı statü bilgisi şu: {j}'])
A = {'ozet': a_ozet, 'yer': a_yer, 'gorunum': a_gorunum, 'cicek': a_cicek, 'statu': a_statu}

def ctx(s, intent):
    n = s['name']
    if intent == 'ozet': return f'{n} | özet | {kind(s)} | {s["sci"]} | {s.get("description") or "yok"}'
    if intent == 'yer': return f'{n} | yer | ' + ('; '.join(x['name'] for x in s['localities'][:6]) + (f' ve {len(s["localities"]) - 6} yer daha' if len(s['localities']) > 6 else '') if s['localities'] else 'yok')
    if intent == 'gorunum': return f'{n} | görünüş | {s.get("morphology") or "yok"}'
    if intent == 'cicek': return f'{n} | çiçeklenme | ' + ('hayvan' if s['group'] == 'fauna' else (s.get('flowering') or 'yok'))
    if intent == 'statu': return f'{n} | statü | ulusal: {s.get("statusNational") or "yok"} | uluslararası: {s.get("statusIntl") or "yok"}'

# yaz sonu: a_yer ile ctx uyumu için yer listesini 6 ile sınırlı kullanıyoruz (a_yer içinde de 6)

# ---- Sohbet ve genel durumlar ----
CHAT = {
 'selam': (['merhaba', 'selam', 'selamlar', 'merhabalar', 'hey', 'gunaydin', 'iyi gunler', 'iyi aksamlar', 'naber', 'nasilsin', 'merhaba nasilsin', 'slm', 'mrb', 'hello', 'orada misin'],
   ['Merhaba! Ben Endemik. Türkiye\'nin korunan türlerini sorabilirsin.', 'Selam! Hangi türü merak ediyorsun?', 'Merhaba, hoş geldin! Bir tür adı yaz, sana anlatayım.', 'Selam, buradayım! Endemik türler hakkında ne öğrenmek istersin?', 'Merhaba! İyiyim, teşekkürler. Sen hangi türü merak ediyorsun?']),
 'tesekkur': (['tesekkurler', 'tesekkur ederim', 'sag ol', 'cok sagol', 'eyvallah', 'saol', 'harika tesekkurler', 'cok tesekkur ederim', 'sagolasin', 'eline saglik', 'yardimin icin tesekkurler'],
   ['Rica ederim!', 'Ne demek, başka merak ettiğin bir tür var mı?', 'Memnun oldum. Doğayı korumak hepimizin işi.', 'Ben teşekkür ederim! Başka bir şey sormak istersen buradayım.']),
 'endemik': (['endemik ne demek', 'endemik nedir', 'endemik tur ne demek', 'endemik ne anlama geliyor', 'endemik canli nedir', 'endemik kelimesinin anlami', 'endemik olmak ne demek', 'neden endemik turler onemli', 'endemik bitki nedir', 'endemik hayvan nedir', 'endemizm nedir'],
   ['Endemik, bir canlının yalnızca belirli bir bölgede doğal olarak yaşaması, dünyanın başka yerinde bulunmaması demek. Bu yüzden korunmaları çok önemli.', 'Endemik tür, sadece tek bir bölgeye ya da ülkeye özgü olan türdür. O bölgede yok olursa dünyadan da yok olmuş olur.',
    'Bir canlının dünyada yalnızca belirli bir yerde yaşıyor olmasına endemik denir. Böyle türler yok olursa başka yerde bulunmadıkları için tamamen kaybolurlar.']),
}
EX = ['Kelaynak nerede yaşar?', 'Hopa engereği neye benziyor?', 'Ankara çevresinde hangi türler var?', 'Truva kardeleni ne zaman çiçek açar?', 'Endemik ne demek?']
YARDIM_Q = ['yardim', 'ne yapabilirsin', 'ne sorabilirim', 'sen kimsin', 'bu ne', 'nasil kullanilir', 'neler yapabiliyorsun', 'bana yardim eder misin', 'hangi sorulara cevap verirsin', 'bu bot ne yapiyor', 'nasil soru sorayim', 'ornek soru ver', 'sen nesin', 'neleri biliyorsun']
YARDIM_A = ['Şunları sorabilirsin: bir türün nerede yaşadığını, neye benzediğini, ne zaman çiçek açtığını, korunma durumunu ya da bir yerde hangi türlerin bulunduğunu. Örneğin: "{e}"',
  'Ben Endemik\'im; Türkiye\'nin korunan {n} türünü tanıtıyorum. Mesela şöyle sorabilirsin: "{e}"', 'Bana türlerin yaşadığı yerleri, görünüşlerini, çiçeklenme zamanlarını ve korunma durumlarını sorabilirsin. Örneğin: "{e}"']
DISI_Q = ['pizza nasil yapilir', 'hava nasil olacak', 'bugun mac kac kac bitti', 'matematik odevimi yap', 'bana sarki soyle', 'en iyi telefon hangisi', 'turkiyenin baskenti neresi', 'bitcoin ne olacak', 'yemek tarifi ver',
  'film onerir misin', 'saat kac', 'ingilizce ceviri yap', 'futbol takimi hangisi', 'oyun oner', 'kedi nasil beslenir', 'bana fikra anlat', 'dolar kac lira', 'en guzel renk ne', 'sen nerelisin', 'kod yazar misin',
  'hava durumu nasil', 'yarin hava nasil olacak', 'film nasildi', 'ders nasil gecti', 'bu sarki nasil', 'takim nasil oynadi', 'instagram nasil acilir', 'hangi burcsun']
DISI_A = ['Ben yalnızca Türkiye\'nin korunan türleri ve doğa hakkında konuşabiliyorum. Örneğin: "{e}"', 'Bu konuda yardımcı olamam; ama bir türün nerede yaşadığını ya da neye benzediğini anlatabilirim. Örneğin: "{e}"',
  'Burada işim endemik türler; o konuda bilgim yok. Ama şunu sorabilirsin: "{e}"', 'Bu soruya cevap veremiyorum. Türler hakkında soru sorarsan severek anlatırım. Örneğin: "{e}"']
BELIRSIZ_A = ['Hangi türü soruyorsun? Tür adını yazarsan söyleyebilirim. Örneğin: "{e}"', 'Hangi türden bahsettiğini anlayamadım. Tür adını yazar mısın? Örneğin: "{e}"']
BELIRSIZ_Q = ['nerede yasar', 'neye benziyor', 'ne zaman cicek acar', 'korunuyor mu', 'nedir', 'hakkinda bilgi ver', 'nerede bulunur', 'nasil gorunur', 'tehlikede mi', 'ne zaman ciceklenir']
def a_genel(species):
    f = sum(1 for s in species if s['group'] == 'fauna'); b = len(species) - f
    return f, b

def synthetic_species(n, pool):
    """Gerçek kayıtların parçalarını karıştırıp uydurma türler üretir. Model her seferinde yeni isimler ve metinler görür;
    böylece bilgiyi ezberlemek yerine 'bilgi parçasını okuyup kopyalamayı' öğrenir."""
    syl = ['ka', 'ra', 'si', 'tu', 'mel', 'bo', 'zan', 'der', 'lin', 've', 'ko', 'hay', 'tur', 'ak', 'yel', 'dag', 'ni', 'sar', 'ge', 'ba', 'çam', 'şi', 'ğa', 'ün', 'öz', 'ır']
    adj = ['Kara', 'Sarı', 'Kızıl', 'Ak', 'Mavi', 'Yeşil', 'Dağ', 'Göl', 'Taş', 'Kır', 'Yaylak', 'Bozkır', 'Çöl', 'Orman', 'Boz', 'Gri', 'Büyük', 'Küçük', 'Uzun', 'Tüylü']
    noun = ['Kertenkelesi', 'Engereği', 'Baykuşu', 'Çiçeği', 'Lalesi', 'Otu', 'Sümbülü', 'Gülü', 'Faresi', 'Kurbağası', 'Balığı', 'Çançiçeği', 'Navruzu', 'Kantaronu', 'Geveni', 'Kardeleni', 'Sığırkuyruğu', 'Kaplumbağası', 'Salamandrası', 'Yarasası']
    allloc = [l for p in pool for l in p['localities']]
    vocab = sorted({w for p in pool for k in ('description', 'morphology', 'flowering', 'statusNational', 'statusIntl') for w in re.findall(r"[\w'’-]+", p.get(k) or '')})
    def salad(lo=3, hi=40):
        # hiç görülmemiş metin: rastgele sözcük dizisi. Ezberlenemez, yalnızca kopyalanabilir.
        n = random.randint(lo, hi); ws_ = [random.choice(vocab) for _ in range(n)]
        for i in range(n):
            if random.random() < 0.1: ws_[i] += ','
            if random.random() < 0.05: ws_[i] = ''.join(random.choice(syl) for _ in range(random.randint(2, 4)))
        t = ' '.join(ws_); return t[:1].upper() + t[1:] + '.'
    def rloc():
        nm_ = ''.join(random.choice(syl) for _ in range(random.randint(2, 4))).capitalize()
        return {'name': nm_ + random.choice(['', ' Köyü', ' çevresi', ' Dağı', ' Gölü']) + (' (' + ''.join(random.choice(syl) for _ in range(random.randint(2, 3))).capitalize() + ')' if random.random() < 0.6 else '')}
    out = []
    for _ in range(n):
        def nm():
            r = random.random()
            if r < 0.4: return random.choice(adj) + ' ' + random.choice(noun)
            if r < 0.7: return ''.join(random.choice(syl) for _ in range(random.randint(2, 4))).capitalize() + ' ' + random.choice(noun)
            return random.choice(adj) + ' ' + ''.join(random.choice(syl) for _ in range(random.randint(2, 3))).capitalize() + random.choice(['', 'ı', 'i'])
        g = random.choice(['fauna', 'flora'])
        sci = ''.join(random.choice(syl) for _ in range(3)).capitalize() + ' ' + ''.join(random.choice(syl) for _ in range(3))
        src = [p for p in pool if p['group'] == g] or pool
        pp = lambda k: random.choice(src).get(k)
        locs = ([rloc() for _ in range(random.randint(1, 9))] if random.random() < 0.6 else random.sample(allloc, random.randint(1, 9))) if random.random() < 0.9 else []
        sal = lambda k, lo=3, hi=40: salad(lo, hi) if random.random() < 0.6 else pp(k)
        out.append({'id': 'x', 'name': nm(), 'sci': sci, 'group': g, 'description': sal('description', 4, 30) if random.random() < 0.9 else None,
          'morphology': sal('morphology', 5, 60) if random.random() < 0.85 else None, 'flowering': (salad(1, 4) if random.random() < 0.6 else pp('flowering')) if g == 'flora' and random.random() < 0.85 else None,
          'statusNational': sal('statusNational', 2, 25) if random.random() < 0.85 else None, 'statusIntl': sal('statusIntl', 2, 25) if random.random() < 0.7 else None, 'localities': locs})
    return out

def synthetic_lists(n, pool):
    """Rastgele tür ve yer adlarıyla liste soruları: model uzun listeleri tekrara düşmeden, olduğu gibi aktarmayı öğrenir."""
    fake = synthetic_species(600, pool)
    names_pool = [f['name'] for f in fake] + [s['name'] for s in pool]
    syl = ['an', 'ka', 'ra', 'zi', 'mu', 'bol', 'sa', 'ge', 'den', 'ni', 'ço', 'hat', 'tun', 'ar', 'şi', 'ev', 'ük', 'ış']
    out = []
    for _ in range(n):
        disp = ''.join(random.choice(syl) for _ in range(random.randint(2, 4))).capitalize()
        names = random.sample(names_pool, random.choice([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]))
        c = f'{disp} | türler: {listing(names, 8)}'
        n_ = len(names)
        ans = pick([f'{disp} ile ilgili kayıtlı {n_} tür var: {listing(names, 8)}.', f'Kayıtlarda {disp} çevresinde şu türler geçiyor: {listing(names, 8)}.', f'{disp} yöresinde bilinen türler: {listing(names, 8)}.'])
        out.append((f'<bilgi> yer | {c} <soru> {dress(pick(QLIST).replace("{y}", fold(disp)))} <cevap>', ans))
    for _ in range(800):
        q = pick(QGEN); pool2 = names_pool; ex = random.sample(pool2, 5)
        f_, b_ = random.randint(10, 60), random.randint(10, 90)
        out.append((f'<bilgi> genel | {f_ + b_} tür: {f_} hayvan, {b_} bitki | örnekler: {", ".join(ex)} <soru> {dress(q)} <cevap>',
          pick([f'Elimde {f_ + b_} tür var: {f_} hayvan, {b_} bitki. Örneğin: {", ".join(ex)}. Bir tür adı yazarsan ayrıntısını anlatırım.', f'Toplam {f_ + b_} tür tanıtıyorum; {f_} tanesi hayvan, {b_} tanesi bitki. Birkaç örnek: {", ".join(ex)}.'])))
    return out

def examples(species, n_variants, places, extras=True):
    out = []
    nf, nb = a_genel(SP)
    for s in species:
        for intent, qs in Q.items():
            for q in random.sample(qs, min(n_variants, len(qs))):
                name = fold(s['name'])
                qq = dress(q.replace('{t}', name))
                out.append((f'<bilgi> {ctx(s, intent)} <soru> {qq} <cevap>', A[intent](s)))
    # yer adına göre liste
    if not extras: return out
    for y, (disp, ids) in places.items():
        names = [x['name'] for x in SP if x['id'] in ids]
        for q in random.sample(QLIST, 4):
            c = f'{disp} | türler: {listing(names, 8)}'
            ans = pick([f'{disp} ile ilgili kayıtlı {len(names)} tür var: {listing(names, 8)}.', f'Kayıtlarda {disp} çevresinde şu türler geçiyor: {listing(names, 8)}.', f'{disp} yöresinde bilinen türler: {listing(names, 8)}.'])
            out.append((f'<bilgi> yer | {c} <soru> {dress(q.replace("{y}", y))} <cevap>', ans))
    for _ in range(260):
        q = pick(QGEN); ex = random.sample([s['name'] for s in SP], 5); w = 'hayvan' if 'hayvan' in q else 'bitki' if 'bitki' in q else None
        pool = [s['name'] for s in SP if (w is None or kind(s) == w)]
        ex = random.sample(pool, 5)
        out.append((f'<bilgi> genel | {len(SP)} tür: {nf} hayvan, {nb} bitki | örnekler: {", ".join(ex)} <soru> {dress(q)} <cevap>',
          pick([f'Elimde {len(SP)} tür var: {nf} hayvan, {nb} bitki. Örneğin: {", ".join(ex)}. Bir tür adı yazarsan ayrıntısını anlatırım.', f'Toplam {len(SP)} tür tanıtıyorum; {nf} tanesi hayvan, {nb} tanesi bitki. Birkaç örnek: {", ".join(ex)}.'])))
    for intent, (qs, ans) in CHAT.items():
        for _ in range(110): out.append((f'<bilgi> sohbet | {intent} <soru> {dress(pick(qs))} <cevap>', pick(ans)))
    for _ in range(110):
        e = pick(EX); out.append((f'<bilgi> sohbet | yardım | örnek: {e} | tür sayısı: {len(SP)} <soru> {dress(pick(YARDIM_Q))} <cevap>', pick(YARDIM_A).format(e=e, n=len(SP))))
    for _ in range(220):
        e = pick(EX); out.append((f'<bilgi> sohbet | konu dışı | örnek: {e} <soru> {dress(pick(DISI_Q))} <cevap>', pick(DISI_A).format(e=e)))
    for _ in range(110):
        e = pick(EX); out.append((f'<bilgi> sohbet | tür belirsiz | örnek: {e} <soru> {dress(pick(BELIRSIZ_Q))} <cevap>', pick(BELIRSIZ_A).format(e=e)))
    return out

def place_index():
    skip = set('cevresi civari koyu koyleri yoresi dagi daglari golu vadisi adasi mevkii mahallesi kasabasi ilcesi belediyesi milli parki merkez bolgesi arasinda kuzey guney dogu bati yakini kiyilari sahili hatti'.split())
    idx = {}
    for s in SP:
        for l in s['localities']:
            for w in re.findall(r'[\wİıŞşĞğÜüÖöÇç]+', l['name']):
                f = fold(w)
                if len(f) < 4 or f in skip: continue
                d = idx.setdefault(f, [w, set()]); d[1].add(s['id'])
    return {k: tuple(v) for k, v in idx.items()}

def template_words():
    """Şablonlardaki (bilgi içermeyen) sözcükler: modelin kendi kurabileceği sözcükler. Bunun dışındaki sözcükler bilgi parçasında geçmek zorundadır."""
    dummy = {'name': 'ZQX', 'sci': 'ZQX', 'group': 'fauna', 'description': 'ZQX', 'morphology': 'ZQX', 'flowering': 'ZQX', 'statusNational': 'ZQX', 'statusIntl': 'ZQX', 'localities': [{'name': 'ZQX'}] * 9}
    flora = dict(dummy, group='flora')
    empty = dict(dummy, description=None, morphology=None, flowering=None, statusNational=None, statusIntl=None, localities=[])
    empty_flora = dict(empty, group='flora')
    ws = set()
    def add(t): ws.update(fold(t).split())
    for _ in range(300):
        for d in (dummy, flora, empty, empty_flora):
            for f in A.values(): add(f(d))
        for qs, ans in CHAT.values():
            for a in ans: add(a)
        for a in YARDIM_A + DISI_A + BELIRSIZ_A: add(a.format(e='', n=''))
        add(f'Elimde tür var hayvan bitki Örneğin Bir tür adı yazarsan ayrıntısını anlatırım Toplam tanıtıyorum tanesi birkaç örnek')
        for p in ('ile ilgili kayıtlı tür var', 'Kayıtlarda çevresinde şu türler geçiyor', 'yöresinde bilinen türler'): add(p)
    ws.discard('zqx')
    return sorted(ws)

if __name__ == '__main__':
    places = place_index()
    random.shuffle(SP)
    FINAL = os.environ.get('FINAL') == '1'
    hold = SP[:8]; train_sp = SP if FINAL else SP[8:]
    pl_train = places
    tr = examples(train_sp, 14, pl_train) + examples(synthetic_species(2600, train_sp), 3, {}, extras=False) + synthetic_lists(4000, train_sp); va = examples(hold, 14, {})
    random.shuffle(tr)
    for name, data in (('train', tr), ('val', va)):
        with open(os.path.join(os.path.dirname(__file__), f'{name}.jsonl'), 'w') as f:
            for c, a in data: f.write(json.dumps({'ctx': c, 'ans': a}, ensure_ascii=False) + '\n')
    json.dump(template_words(), open(os.path.join(os.path.dirname(__file__), 'template_words.json'), 'w'), ensure_ascii=False)
    print(len(tr), 'eğitim', len(va), 'sınama örneği; sınama türleri:', [s['name'] for s in hold])
    for c, a in random.sample(tr, 4): print('\n', c[:300], '\n →', a[:300])
