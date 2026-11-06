"""Modeli, eğitimde HİÇ görmediği türler üzerinde sınar. Ölçüler:
 - bilgi doğruluğu: cevaptaki her bilgi sözcüğü 'bilgi' parçasında var mı (uydurma kontrolü)
 - tam kopya: bilginin kendisi cevapta eksiksiz geçiyor mu
 - çeşitlilik: aynı soruya sıcaklıkla 5 kez sorunca kaç farklı cevap çıkıyor"""
import json, os, sys, random, torch
sys.path.insert(0, os.path.dirname(__file__))
from tok import Tok
from model import LM
from build_data import fold
D = os.path.dirname(__file__)
T = Tok(json.load(open(os.path.join(D, 'tok.json')))); ck = torch.load(os.path.join(D, 'lm.pt'))
m = LM(**ck['cfg']); m.load_state_dict(ck['sd']); m.eval(); SON = T.id['<son>']
TW = set(json.load(open(os.path.join(D, 'template_words.json'))))
def gen(ctx, temp=0.0):
    ids = T.encode(ctx); out = m.generate(ids, SON, 200, temp)
    return T.decode(out).replace('<son>', '').strip()
def verify(ctx, ans):
    src = set(fold(ctx.replace('<bilgi>', ' ').replace('<soru>', ' ').replace('<cevap>', ' ')).split())
    bad = [w for w in fold(ans).split() if w not in TW and w not in src]
    return bad
if __name__ == '__main__':
    va = [json.loads(l) for l in open(os.path.join(D, 'val.jsonl'))]
    random.seed(3); sample = random.sample(va, int(os.environ.get("N", 300)))
    ok = full = 0; fails = []
    for e in sample:
        a = gen(e['ctx']); bad = verify(e['ctx'], a)
        parts = e['ctx'].split('<soru>')[0].replace('<bilgi>', '').split('|')
        info = fold(parts[2]) if len(parts) > 2 and parts[1].strip() in ('yer', 'görünüş', 'çiçeklenme') else None
        ok += not bad
        if info and info != 'yok' and info != 'hayvan': full += (info in fold(a))
        if bad: fails.append((e['ctx'][:120], a[:160], bad[:5]))
    n_info = sum(1 for e in sample if e['ctx'].split('|')[1].strip() in ('yer', 'görünüş', 'çiçeklenme'))
    print(f'Uydurma kontrolü: {ok}/{len(sample)} cevap temiz (%{100 * ok // len(sample)})')
    print(f'Bilgi tam kopya (yer/görünüş/çiçeklenme türlerinde): {full}/{n_info}')
    for f in fails[:6]: print('  HATA:', f)
    for e in random.sample(sample, 5):
        print('\n', e['ctx'].split('<cevap>')[0][-160:], '\n  model:', gen(e['ctx']), '\n  doğru:', e['ans'][:160])
    e = sample[0]; outs = {gen(e['ctx'], 0.8) for _ in range(5)}
    print(f'\nÇeşitlilik: aynı soruya 5 denemede {len(outs)} farklı cevap')
