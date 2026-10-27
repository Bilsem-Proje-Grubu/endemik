"""MobileNetV3-large'ı bizim fotoğraflarımızla ince ayarlar ve dürüstçe ölçer.
 - bölme: fotoğrafı çeken kişiye göre %70 eğitim / %15 doğrulama / %15 sınama (aynı kişi iki yerde olmaz)
 - 'diger' sınıfı: Türkiye'de görülen başka canlılar + yapay boş/gürültülü/çizgisel görüntüler ('bunlardan biri değil' demeyi öğrenir)
 - doğrulamada sıcaklık ve 'emin değilim' eşiği seçilir; sınamada gerçek başarı raporlanır.
Kullanım: python3 finetune.py FOTO_KLASORU ÇIKIŞ_ÖN_EKİ [EPOCH]"""
import csv, glob, json, math, os, random, re, sys, time, numpy as np, torch, torchvision
from PIL import Image, ImageFilter
import torchvision.transforms as T
sys.path.insert(0, os.path.dirname(__file__))
import export_graph as E
torch.set_num_threads(4); torch.manual_seed(0); random.seed(0); np.random.seed(0)
ROOT, OUT = sys.argv[1], sys.argv[2]; EPOCHS = int(sys.argv[3]) if len(sys.argv) > 3 else 6
classes = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d))); K = len(classes); OTHER = classes.index('diger')
user = {}
for r in csv.DictReader(open(os.path.join(ROOT, 'credits.csv'))):
    m = re.match(r'\(c\)\s*([^,]+)', r['atif'] or ''); user[(r['sinif'], r['dosya'])] = (m.group(1).strip().lower() if m else 'x' + r['gozlem'])
samples = []
for ci, c in enumerate(classes):
    for f in sorted(glob.glob(os.path.join(ROOT, c, '*.jpg'))): samples.append((f, ci, user.get((c, os.path.basename(f)), 'x' + f)))
users = sorted({u for _, _, u in samples}); random.shuffle(users)
part = {u: ('train' if i % 20 < 14 else 'val' if i % 20 < 17 else 'test') for i, u in enumerate(users)}
split = {k: [s for s in samples if part[s[2]] == k] for k in ('train', 'val', 'test')}
print({k: len(v) for k, v in split.items()}, 'sınıf', K, flush=True)

class Syn:  # yapay "başka şey" görüntüleri
    def make(self):
        k = random.choice(['solid', 'grad', 'noise', 'blobs', 'blur'])
        a = np.zeros((256, 256, 3), np.uint8)
        if k == 'solid': a[:] = np.random.randint(0, 255, 3)
        elif k == 'grad': a = (np.linspace(np.random.randint(0, 255, 3), np.random.randint(0, 255, 3), 256)[None] * np.ones((256, 1, 1))).astype(np.uint8)
        elif k == 'noise': a = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        else:
            im = Image.fromarray(np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)).resize((8, 8)).resize((256, 256), Image.BICUBIC); a = np.array(im)
            if k == 'blur': a = np.array(Image.fromarray(a).filter(ImageFilter.GaussianBlur(5)))
        return Image.fromarray(a)
SYN_N = 250
norm = T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
ttr = T.Compose([T.RandomResizedCrop(224, scale=(0.4, 1.0)), T.RandomHorizontalFlip(), T.ColorJitter(0.3, 0.3, 0.3, 0.03), T.ToTensor(), norm])
tev = T.Compose([T.Resize(256), T.CenterCrop(224), T.ToTensor(), norm])
class DS(torch.utils.data.Dataset):
    def __init__(s, items, tf, syn=0): s.items, s.tf, s.syn, s.g = items, tf, syn, Syn()
    def __len__(s): return len(s.items) + s.syn
    def __getitem__(s, i):
        if i >= len(s.items): return s.tf(s.g.make()), OTHER
        f, c, _ = s.items[i]; return s.tf(Image.open(f).convert('RGB')), c
cnt = np.bincount([c for _, c, _ in split['train']] + [OTHER] * SYN_N, minlength=K)
cw = torch.tensor((cnt.sum() / (K * cnt.clip(1))) ** 0.5, dtype=torch.float32)
dl = lambda ds, sh: torch.utils.data.DataLoader(ds, batch_size=32, shuffle=sh, num_workers=3, persistent_workers=False)
net = torchvision.models.mobilenet_v3_large(weights=torchvision.models.MobileNet_V3_Large_Weights.IMAGENET1K_V1)
class Net(torch.nn.Module):
    def __init__(s):
        super().__init__(); s.f = net.features; s.p = net.avgpool; s.d = torch.nn.Dropout(0.2); s.h = torch.nn.Linear(960, K)
    def feat(s, x): return torch.flatten(s.p(s.f(x)), 1)
    def forward(s, x): return s.h(s.d(s.feat(x)))
m = Net()
opt = torch.optim.AdamW([{'params': m.f.parameters(), 'lr': 2e-4}, {'params': m.h.parameters(), 'lr': 2e-3}], weight_decay=1e-4)
trl = dl(DS(split['train'], ttr, SYN_N), True); total = EPOCHS * len(trl); step = 0; t0 = time.time()
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda i: 0.5 * (1 + math.cos(math.pi * min(1, i / total))) * min(1, (i + 1) / 30))
def logits_of(items):
    m.eval(); L, Y = [], []
    with torch.no_grad():
        for x, y in dl(DS(items, tev), False): L.append(m(x)); Y.append(y)
    return torch.cat(L).numpy(), torch.cat(Y).numpy()
for ep in range(EPOCHS):
    m.train()
    for x, y in trl:
        loss = torch.nn.functional.cross_entropy(m(x), y, weight=cw, label_smoothing=0.1)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step(); step += 1
        if step % 20 == 0: print(f'adım {step}/{total} kayıp {loss.item():.3f} süre {time.time() - t0:.0f}s', flush=True)
    Lv, Yv = logits_of(split['val']); print(f'--- tur {ep + 1}: doğrulama doğruluğu %{100 * (Lv.argmax(1) == Yv).mean():.1f} süre {time.time() - t0:.0f}s', flush=True)
    torch.save(m.state_dict(), OUT + '.pt')
# ---- sıcaklık ve eşik: doğrulamada; rapor: sınamada ----
Lv, Yv = logits_of(split['val']); Lt, Yt = logits_of(split['test'])
soft = lambda z, T_: (lambda e: e / e.sum(1, keepdims=True))(np.exp((z - z.max(1, keepdims=True)) / T_))
T_ = min([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4], key=lambda t: -np.log(soft(Lv, t)[np.arange(len(Yv)), Yv] + 1e-9).mean())
def report(L, Y, tau):
    P = soft(L, T_); pred = P.argmax(1); conf = P.max(1); sp = Y != OTHER; acc = (conf >= tau) & (pred != OTHER)
    cov = acc[sp].mean(); wrong = ((pred != Y) & acc & sp).sum() / max(1, (acc & sp).sum()); fa = acc[~sp].mean() if (~sp).any() else 0
    return cov, wrong, fa, ((pred == Y)[sp]).mean()
print(f'sıcaklık {T_}; sınama: tür {int((Yt != OTHER).sum())} fotoğraf, diğer {int((Yt == OTHER).sum())}')
print('eşik | kapsam | kabul edilenlerde yanlış | diğeri tür sanma | (eşiksiz tür doğruluğu)')
rows = {}
for tau in [0.5, 0.8, 0.9, 0.95, 0.97, 0.98, 0.99]:
    c, w, fa, a = report(Lt, Yt, tau); rows[tau] = (c, w, fa); print(f'{tau:.2f} | %{100 * c:5.1f} | %{100 * w:5.2f} | %{100 * fa:5.2f} | %{100 * a:5.1f}')
# eşik: doğrulamada kabul edilenlerde yanlış ≤ %0,5 ve diğeri tür sanma ≤ %1 olan en küçük eşik (en az 0,95)
tau = next((t for t in [0.95, 0.97, 0.98, 0.99, 0.995] if report(Lv, Yv, t)[1] <= 0.005 and report(Lv, Yv, t)[2] <= 0.01), 0.995)
print('seçilen eşik', tau, 'sınamada:', [round(float(x), 4) for x in report(Lt, Yt, tau)[:3]])
P = E.Packer(); ops = E.export_features(m.f, P)
W = m.h.weight.detach().numpy().astype(np.float32); b = m.h.bias.detach().numpy().astype(np.float32)
head = {'mu': [0.0] * 960, 'sd': [1.0] * 960, 'w': [[round(float(v), 5) for v in r] for r in W], 'b': [round(float(v), 5) for v in b], 'T': T_, 'classes': classes}
E.write(OUT, ops, P, {'dim': 960, 'tau': tau, 'head': head, 'sinama': {'esik': tau, 'kapsam': float(report(Lt, Yt, tau)[0]), 'yanlis': float(report(Lt, Yt, tau)[1]), 'diger_tur_sanma': float(report(Lt, Yt, tau)[2])}})
