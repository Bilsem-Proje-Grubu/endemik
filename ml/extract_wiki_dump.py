"""Türkçe Vikipedi dökümünden (Hugging Face wikimedia/wikipedia, 20231101.tr, parquet) canlı/doğa maddelerini ayıklar.
Kullanım: python3 ml/extract_wiki_dump.py p0.parquet p1.parquet > adaylar.jsonl
Her satır: {title, curid, text(ilk paragraf), kind}. Sonra ml/make_wiki_json.py ile temizlenir."""
import sys, json, re
import pyarrow.parquet as pq

# Ayıklama: ilk cümlede canlı türü/cinsi/familyası belirten kalıplar
KIND = [
  ('tür', r"\b(familyas[ıi]ndan|familyasına ait|familyasının|cinsine ait|cinsinin|cinsinden|alt türü|türüdür|endemik|\w+ türü|takımından|takımına)\b"),
]
ANIMAL = r"\b(kuş|kuşu|memeli|sürüngen|kertenkele|yılan|kaplumbağa|balık|balığı|böcek|böceği|kelebek|yarasa|kurbağa|semender|örümcek|akrep|karınca|arı|geyik|kedi|köpek|kurt|tilki|ayı|fok|yunus|balina|su kuşu|kartal|şahin|baykuş|ördek|kaz|turna|pelikan|toy|keklik)\b"
PLANT = r"\b(bitki|bitkisi|çiçek|çiçeği|ağaç|ağacı|çalı|otu|otsu|orkide|lale|zambak|soğan|yosun|mantar|eğrelti|geofit|endemik bitki)\b"
BAD = r"\(\d{1,2} \w+ \d{4}|\bdoğum\b|\bölüm\b|\b(futbolcu|oyuncu|şarkıcı|politikacı|yazar|şirket|şehir|ilçe|belde|köy|film|dizi|albüm|sinema|kulübü|mahalle|futbol|basketbol|voleybol|siyasetçi|müzisyen|akademisyen)\b"
SCI = re.compile(r"\b[A-Z][a-z]{3,}\s+[a-z]{3,}(?:\s+[a-z]{3,})?\b")  # Latince ikili ad

def first_par(t):
    t = t.strip().split('\n')[0]
    return re.sub(r'\s+', ' ', t)

def classify(title, p):
    s = p[:400]
    if re.search(BAD, s, re.I): return None
    sci = bool(SCI.search(s))
    fam = bool(re.search(KIND[0][1], s, re.I))
    ani = bool(re.search(ANIMAL, s, re.I)); pl = bool(re.search(PLANT, s, re.I))
    if sci and fam and (ani or pl): return 'bitki' if pl and not ani else 'hayvan'
    if sci and (ani or pl) and re.search(r"\bbir\b.*\b(türü|cinsi|familyası|alt türü)\b", s): return 'bitki' if pl and not ani else 'hayvan'
    return None

n = 0; kept = 0
for f in sys.argv[1:]:
    pf = pq.ParquetFile(f)
    for b in pf.iter_batches(batch_size=4000, columns=['id', 'title', 'text']):
        for r in b.to_pylist():
            n += 1
            p = first_par(r['text'])
            if len(p) < 60: continue
            k = classify(r['title'], p)
            if k:
                kept += 1
                print(json.dumps({'title': r['title'], 'curid': r['id'], 'text': p, 'kind': k}, ensure_ascii=False))
print(n, 'madde tarandı,', kept, 'aday', file=sys.stderr)
