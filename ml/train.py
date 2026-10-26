import json, os, sys, time, math, random, torch
sys.path.insert(0, os.path.dirname(__file__))
from tok import train_bpe, Tok
from model import LM
D = os.path.dirname(__file__)
torch.manual_seed(1); random.seed(1); torch.set_num_threads(4)
rd = lambda n: [json.loads(l) for l in open(os.path.join(D, n))]
tr, va = rd('train.jsonl'), rd('val.jsonl')
if os.path.exists(os.path.join(D, 'tok.json')): T = Tok(json.load(open(os.path.join(D, 'tok.json'))))
else:
    tj = train_bpe([e['ctx'].replace('<bilgi>', '').replace('<soru>', '').replace('<cevap>', '') + ' ' + e['ans'] for e in tr + va], 1800)
    json.dump(tj, open(os.path.join(D, 'tok.json'), 'w'), ensure_ascii=False); T = Tok(tj)
SON = T.id['<son>']; BLOCK = 448
def enc(e):
    c = T.encode(e['ctx']); a = T.encode(e['ans']) + [SON]
    return c, a
def prep(data):
    out = []
    for e in data:
        c, a = enc(e)
        if len(c) + len(a) <= BLOCK: out.append((c, a))
    return out
if os.environ.get('FT'):  # ek eğitim: yeni örneklerin hepsi + eski örneklerden rastgele bir kısım
    new = [e for e in tr if e['ctx'].startswith('<bilgi> kaynak')]; old = [e for e in tr if not e['ctx'].startswith('<bilgi> kaynak')]
    tr = new + random.sample(old, min(len(old), int(os.environ.get('OLD', 24000))))
TR, VA = prep(tr), prep(va)
print('örnek', len(TR), len(VA), 'atılan', len(tr) - len(TR), 'ort. uzunluk', sum(len(c) + len(a) for c, a in TR) / len(TR), 'sözcük', len(T.vocab), flush=True)
def batch(ex):
    L = max(len(c) + len(a) for c, a in ex)
    x = torch.zeros(len(ex), L, dtype=torch.long); y = torch.full((len(ex), L), -100)
    for i, (c, a) in enumerate(ex):
        s = c + a; x[i, :len(s)] = torch.tensor(s)
        y[i, len(c) - 1:len(s) - 1] = torch.tensor(a)  # kayıp yalnızca cevap kısmında
    return x, y
m = LM(len(T.vocab), block=BLOCK)
if os.environ.get('INIT'): m.load_state_dict(torch.load(os.path.join(D, os.environ['INIT']))['sd']); print('başlangıç ağırlıkları yüklendi', flush=True)
print('parametre', sum(p.numel() for p in m.parameters()), flush=True)
EPOCHS = int(os.environ.get('EPOCHS', 12)); BS = 24
steps = EPOCHS * (len(TR) // BS); opt = torch.optim.AdamW(m.parameters(), lr=float(os.environ.get('LR', 1.5e-3)), weight_decay=0.01, betas=(0.9, 0.98))
lr = lambda i: float(os.environ.get('LR', 1.5e-3)) * min(1, i / 150) * (0.5 * (1 + math.cos(math.pi * min(1, i / steps))) * 0.9 + 0.1)
def val_loss():
    m.eval(); tot = n = 0
    with torch.no_grad():
        for i in range(0, len(VA), 32):
            x, y = batch(VA[i:i + 32]); lg = m(x)
            l = torch.nn.functional.cross_entropy(lg.view(-1, lg.size(-1)), y.view(-1), ignore_index=-100, reduction='sum')
            tot += l.item(); n += (y != -100).sum().item()
    m.train(); return tot / n
step = 0; t0 = time.time()
for ep in range(EPOCHS):
    # benzer uzunluktakileri bir arada toplayarak boşa hesabı azalt
    TR.sort(key=lambda e: len(e[0]) + len(e[1]) + random.random() * 20)
    bs = [TR[i:i + BS] for i in range(0, len(TR) - BS + 1, BS)]; random.shuffle(bs)
    for b in bs:
        for g in opt.param_groups: g['lr'] = lr(step)
        x, y = batch(b); lg = m(x)
        loss = torch.nn.functional.cross_entropy(lg.view(-1, lg.size(-1)), y.view(-1), ignore_index=-100)
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); step += 1
        if step % 50 == 0: print(f'adım {step}/{steps} kayıp {loss.item():.3f} süre {time.time() - t0:.0f}s', flush=True)
    print(f'--- tur {ep + 1}: sınama kaybı {val_loss():.3f} süre {time.time() - t0:.0f}s', flush=True)
    torch.save({'cfg': m.cfg, 'sd': m.state_dict()}, os.path.join(D, 'lm.pt'))
print('bitti')
