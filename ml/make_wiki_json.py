"""fetch_wiki.py çıktısını temizleyip src/data/wiki.json üretir. Modelin sözcük dağarcığında olmayan karakter içeren maddeler atılır."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from tok import Tok
D = os.path.dirname(__file__); ROOT = os.path.join(D, '..')
T = Tok(json.load(open(os.path.join(D, 'tok.json'))))
rows = [json.loads(l) for l in open(sys.argv[1])]
out = []; seen = set(); drop = 0
for r in rows:
    if r['title'] in seen: continue
    if re.search(r'\(\d{1,2} \w+ \d{4}|basketbol|futbol|voleybol|spor kulübü|\bGSK\b|\bargan yağı\b|\bakademisyen\b|\byazar\b|\bşirket\b', r['text'] + ' ' + r['title'], re.I): drop += 1; continue  # tür/kavram dışı maddeler (kişi, spor, ürün)
    t = re.sub(r'\s+', ' ', r['text']).strip()
    t = re.sub(r'\s*\((?:İngilizce|Latince|Fransızca|Almanca)[^)]*\)', '', t)  # dil notlarını at
    if T.id['<unk>'] in T.encode(t + ' ' + r['title']) or len(T.encode(t)) > 230: drop += 1; continue
    m = re.match(r'^(.{3,40}?)(?: veya bilimsel adıyla |\s*\()', t)
    alias = m.group(1).strip(' ,') if m and not re.search(r'\d|[A-Z][a-z]+ [a-z]+$', m.group(1)) else ''
    seen.add(r['title'])
    out.append({'t': r['title'], 'a': alias, 'x': t, 'u': f"https://tr.wikipedia.org/wiki?curid={r['curid']}", 'k': r['kind']})
json.dump(out, open(os.path.join(ROOT, 'src/data/wiki.json'), 'w'), ensure_ascii=False)
print(len(out), 'madde,', drop, 'atıldı; boyut', os.path.getsize(os.path.join(ROOT, 'src/data/wiki.json')) // 1024, 'KB')
for x in out[:6]: print(' ', x['t'], '|', x['a'], '|', x['x'][:90])
