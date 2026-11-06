"""Türkçe Vikipedi (Hugging Face: kaan39/turkish-wikipedia-dataset-clean, CC BY-SA 4.0) akışından doğa konulu maddeleri süzer.
Kullanım: curl -L <train.jsonl adresi> | python3 ml/fetch_wiki.py ÇIKTI.jsonl
Her madde için yalnızca giriş paragrafının ilk birkaç cümlesi alınır; kaynak adresi (madde numarası) saklanır."""
import json, re, sys

CONCEPTS = {  # kavram maddeleri (başlık tam eşleşir)
 'Endemizm', 'Biyolojik çeşitlilik', 'Habitat', 'Ekosistem', 'Ekoloji', 'Milli park', 'Nesli tükenme', 'Nesli tükenme tehlikesi altındaki türler', 'Kırmızı Liste', 'IUCN Kırmızı Listesi',
 'Koruma biyolojisi', 'Doğal yaşam alanı', 'Besin zinciri', 'Biyom', 'Flora', 'Fauna', 'Tür (biyoloji)', 'Cins (biyoloji)', 'Familya (biyoloji)', 'Takson', 'Sınıflandırma (biyoloji)',
 'Fotosentez', 'Polen', 'Tozlaşma', 'Herbaryum', 'Rezerv', 'Doğa koruma alanı', 'Yaban hayatı', 'Yaban hayatı koruma alanı', 'Sulak alan', 'Orman', 'Çayır', 'Step', 'Maki', 'Biyoçeşitlilik',
 'Göç (hayvan)', 'Kış uykusu', 'Evrim', 'Doğal seçilim', 'İklim değişikliği', 'Küresel ısınma', 'Orman yangını', 'Çölleşme', 'Yaban hayatı yönetimi', 'Nesli tükenmiş türler', 'Sürüngen',
 'Memeli', 'Kuş', 'Balık', 'Amfibi', 'Böcek', 'Omurgasız', 'Omurgalı', 'Bitki', 'Çiçekli bitki', 'Soğanlı bitki', 'Ağaç', 'Çalı', 'Otsu bitki', 'Tohum', 'Yaprak', 'Kök', 'Çiçek', 'Meyve',
}
CONCEPTS |= {'Milli park', 'Millî park', 'Sürüngenler', 'Memeliler', 'Kuşlar', 'Balıklar', 'Böcekler', 'Omurgasızlar', 'Omurgalılar', 'Bitkiler', 'Amfibiler', 'Amfibi', 'Baykuş', 'Alabalık', 'Tür', 'Cins', 'Familya', 'Nesli tükenmekte olan türler',
 'Besin zinciri', 'Biyom', 'Ekosistem', 'Ekoloji', 'Biyoçeşitlilik', 'Biyolojik çeşitlilik', 'Koruma biyolojisi', 'Habitat', 'Yaşam alanı', 'Taksonomi', 'Sınıflandırma', 'Evrim', 'Doğal seçilim', 'Tozlaşma', 'Fotosentez',
 'Orman', 'Çayır', 'Step', 'Maki', 'Tundra', 'Sulak alan', 'Mercan resifi', 'Yağmur ormanı', 'Çöl', 'Bataklık', 'Göç', 'Kış uykusu', 'Ormansızlaşma', 'Çölleşme', 'Küresel ısınma', 'İklim değişikliği', 'Ozon tabakası',
 'Geri dönüşüm', 'Biyosfer', 'Biyosfer rezervi', 'Doğa koruma alanı', 'Tabiat parkı', 'Tabiat anıtı', 'Yaban hayatı', 'Hayvanat bahçesi', 'Botanik bahçesi', 'Tohum bankası', 'Herbaryum', 'Polen', 'Çiçek', 'Tohum', 'Yaprak', 'Kök', 'Gövde', 'Meyve'}
BINOM = re.compile(r'\b[A-Z][a-z]+ [a-z]{3,}\b')
NOT = re.compile(r'(roman|bölüm|film|dizi|albüm|şarkı|kitap|eser|oyun|futbol|şirket|parti|sezon|karakter|ordu|savaş|televizyon|program|yayım|yayın|kanal)', re.I)
TAXA = re.compile(r'(familyas[ıi]|cinsine|cinsinden|cinsi|türüdür|türlerinden|türü|alttürü|takımına|bir (kuş|memeli|sürüngen|balık|böcek|bitki|ot|ağaç|kurbağa|semender|kaplumbağa|kertenkele|yılan|yarasa|kemirgen|çiçekli))', re.I)
TR = re.compile(r'Türkiye|Anadolu|Akdeniz|Ege|Karadeniz|Toros|Doğu Anadolu|Marmara', re.I)
BAD = re.compile(r'(\{\{|\}\}|\[\[|\]\]|<[a-z]|&[a-z]+;|http|\|\||==)')
out = open(sys.argv[1], 'w'); n = 0; seen = 0
for line in sys.stdin.buffer:
    try: d = json.loads(line)
    except Exception: continue
    seen += 1
    title, text = d.get('title', ''), d.get('text', '')
    para = text.split('\n\n')[0].strip()
    if len(para) < 120 or BAD.search(para): continue
    concept = title in CONCEPTS
    base = bool(re.search(r'familya|cins|takım|alttür|bitki|kuş|hayvan|balık|böcek|memeli|sürüngen', para[:300])) and bool(TAXA.search(para[:300])) and bool(BINOM.search(para[:250])) and not NOT.search(para[:300])
    taxon = base and ('Türkiye' in para[:500] or bool(re.search(r'nesli|tehlike|endemik|koruma altı', para[:600], re.I)))
    if not (concept or taxon): continue
    sents = re.split(r'(?<=[.!?])\s+', para); t = ''
    for s in sents:
        if len(t) + len(s) > 430 and t: break
        t += (' ' if t else '') + s
        if len(t) >= 220: break
    if len(t) < 100 or not t.endswith(('.', '!', '?')): continue
    out.write(json.dumps({'title': title, 'text': t, 'curid': d.get('page_id'), 'kind': 'kavram' if concept else 'tür', 'tr': bool(TR.search(t))}, ensure_ascii=False) + '\n'); n += 1
print('okunan', seen, 'seçilen', n, file=sys.stderr)
