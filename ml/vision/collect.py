"""iNaturalist'ten serbest lisanslı (CC0, CC BY, CC BY-SA) gözlem fotoğrafları toplar.
Kullanım: python3 collect.py ÇIKIŞ_KLASÖRÜ   (fotoğraflar depoya konmaz; atıf bilgisi credits.csv'ye yazılır)
 - hedef türler: species.json'da iNaturalist'te ≥20 serbest lisanslı fotoğrafı olan türler
 - 'diger' sınıfı: Türkiye'de gözlenen diğer canlılar (hedef türler hariç) -> model "bunlardan biri değil" demeyi öğrenir"""
import csv, io, json, os, sys, time, random, urllib.parse, urllib.request, concurrent.futures as cf
from PIL import Image
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'EndemikEducational/1.0 (bilsemprojegrubu@gmail.com)'}
LIC = 'cc0,cc-by,cc-by-sa'
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SP = {s['id']: s for s in json.load(open(os.path.join(ROOT, 'src/data/species.json')))}
COUNTS = json.load(open(sys.argv[2]))  # inat_counts.json
def get(url, tries=4):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
        except Exception as e: time.sleep(2 * (i + 1))
    return None
def api(path, **q):
    b = get('https://api.inaturalist.org/v1/' + path + '?' + urllib.parse.urlencode(q)); time.sleep(1.0)
    return json.loads(b) if b else {}
def fetch_obs(params, want):
    got, page, seen = [], 1, set()
    while len(got) < want and page <= 12:
        d = api('observations', photos='true', photo_license=LIC, quality_grade='research', per_page=100, page=page, order_by='votes', **params)
        rs = d.get('results', [])
        if not rs: break
        for o in rs:
            if o['id'] in seen or not o.get('photos'): continue
            seen.add(o['id']); p = o['photos'][0]
            got.append({'obs': o['id'], 'url': p['url'].replace('square', 'medium'), 'license': p.get('license_code'), 'attr': p.get('attribution'), 'taxon': (o.get('taxon') or {}).get('name')})
        page += 1
    return got[:want]
def save(rec, path):
    b = get(rec['url'])
    if not b: return False
    try:
        im = Image.open(io.BytesIO(b)).convert('RGB'); im.thumbnail((384, 384)); im.save(path, 'JPEG', quality=88); return True
    except Exception: return False
classes = {}
for sid, (n, ok) in COUNTS.items():
    if n >= 20:
        sci = SP[sid]['sci'].replace('subsp.', '').strip(); classes.setdefault(sci, []).append(sid)
rows = []
def run(label, recs):
    d = os.path.join(OUT, label); os.makedirs(d, exist_ok=True)
    with cf.ThreadPoolExecutor(4) as ex:
        res = list(ex.map(lambda ir: save(ir[1], os.path.join(d, f'{ir[0]:04d}.jpg')), enumerate(recs)))
    for i, (r, ok) in enumerate(zip(recs, res)):
        if ok: rows.append([label, f'{i:04d}.jpg', r['obs'], r['license'], r['attr'], r['taxon']])
    print(label, sum(res), '/', len(recs), flush=True)
for sci, ids in classes.items():
    label = ids[0] if len(ids) == 1 else '+'.join(sorted(ids))  # aynı bilimsel adlı kayıtlar tek sınıf
    run(label, fetch_obs({'taxon_name': sci}, 110))
# diğer: Türkiye'de gözlenen, hedef olmayan canlılar (kuş, memeli, sürüngen, böcek, bitki...)
random.seed(4); others = []
for iconic in ['Aves', 'Mammalia', 'Reptilia', 'Amphibia', 'Actinopterygii', 'Insecta', 'Plantae', 'Arachnida']:
    for r in fetch_obs({'place_id': 7050, 'iconic_taxa': iconic}, 90 if iconic != 'Plantae' else 140):
        if r['taxon'] and r['taxon'] not in classes: others.append(r)
random.shuffle(others); run('diger', others)
with open(os.path.join(OUT, 'credits.csv'), 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['sinif', 'dosya', 'gozlem', 'lisans', 'atif', 'takson']); w.writerows(rows)
print('bitti', len(rows))
