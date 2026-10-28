"""Wikimedia Commons kategori sayfalarından, canlı OLMAYAN gündelik sahnelerin (sokak, bina, araç, yemek, manzara…) serbest lisanslı fotoğraflarını toplar.
Bunlar 'diger' sınıfına eklenir: model "tür olmayan şeyleri" tanımayı öğrenir. Fotoğraflar depoya konmaz; dosya adları negatives_credits.csv'ye yazılır.
Kullanım: python3 collect_negatives.py ÇIKIŞ_KLASÖRÜ/diger  (var olan 'diger' klasörüne eklenir)"""
import csv, io, os, re, sys, time, random, urllib.parse, urllib.request, urllib.error, html
from PIL import Image
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'EndemikEducational/1.0 (bilsemprojegrubu@gmail.com)'}
CATS = ['Streets_in_Ankara', 'Streets_in_Istanbul', 'Roads_in_Turkey', 'Apartment_buildings_in_Turkey', 'Buildings_in_Ankara', 'Mosques_in_Turkey', 'Bridges_in_Turkey', 'Cars_in_Turkey',
 'Buses_in_Turkey', 'Trains_in_Turkey', 'Bazaars_in_Turkey', 'Food_of_Turkey', 'Mountains_of_Turkey', 'Beaches_of_Turkey', 'Villages_in_Turkey', 'Stadiums_in_Turkey', 'Airports_in_Turkey',
 'Interiors_of_mosques_in_Turkey', 'Museums_in_Turkey', 'Squares_in_Turkey', 'Shopping_malls_in_Turkey', 'Railway_stations_in_Turkey', 'Ships_of_Turkey', 'Motorways_in_Turkey', 'Tractors_in_Turkey',
 'Fields_in_Turkey', 'Lakes_of_Turkey', 'Castles_in_Turkey', 'Street_art_in_Turkey', 'Playgrounds_in_Turkey', 'Cafés_in_Turkey', 'Traffic_signs_of_Turkey', 'Electric_power_lines_in_Turkey']
def get(url, tries=5):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 404): return None   # geçersiz/yok: tekrar deneme
            time.sleep(3 * (i + 1))
        except Exception: time.sleep(3 * (i + 1))
    return None
rows = []; n = 0; seen = set()
for cat in CATS:
    h = get('https://commons.wikimedia.org/wiki/Category:' + urllib.parse.quote(cat)); time.sleep(1.5)
    if not h: print(cat, 'açılamadı', flush=True); continue
    h = html.unescape(h.decode('utf8', 'ignore'))
    thumbs = re.findall(r'https://thumb\.wikimedia\.org/wikipedia/commons/thumb/([0-9a-f]/[0-9a-f]{2})/([^/"\s]+\.(?:jpg|jpeg|JPG|JPEG))/\d+px-', h)
    got = 0
    for sub, fname in thumbs:
        if fname in seen or got >= 70: continue
        seen.add(fname)
        b = get(f'https://thumb.wikimedia.org/wikipedia/commons/thumb/{sub}/{fname}/330px-{fname}'); time.sleep(0.6)
        if not b: continue
        try: im = Image.open(io.BytesIO(b)).convert('RGB'); im.save(os.path.join(OUT, f'wc{n:04d}.jpg'), 'JPEG', quality=88)
        except Exception: continue
        rows.append([f'wc{n:04d}.jpg', fname, 'https://commons.wikimedia.org/wiki/File:' + fname, cat]); n += 1; got += 1
    print(cat, got, flush=True)
with open(os.path.join(os.path.dirname(OUT), 'negatives_credits.csv'), 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['dosya', 'commons_dosya_adi', 'sayfa', 'kategori']); w.writerows(rows)
print('bitti', n)
