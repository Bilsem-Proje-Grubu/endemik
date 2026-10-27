"""finetune.py ile aynı bölmeyi yeniden kurar; sınama/doğrulama üzerinde tür başına başarıyı ve kendinden emin yanlışları listeler."""
import sys, os, runpy, re, csv, glob, random, numpy as np, torch, torchvision
ROOT, PT = sys.argv[1], sys.argv[2]; TAU = float(sys.argv[3]); T_ = float(sys.argv[4])
torch.set_num_threads(4); random.seed(0)
classes = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d))); K = len(classes); OTHER = classes.index('diger')
user = {}
for r in csv.DictReader(open(os.path.join(ROOT, 'credits.csv'))):
    m = re.match(r'\(c\)\s*([^,]+)', r['atif'] or ''); user[(r['sinif'], r['dosya'])] = (m.group(1).strip().lower() if m else 'x' + r['gozlem'])
samples = []
for ci, c in enumerate(classes):
    for f in sorted(glob.glob(os.path.join(ROOT, c, '*.jpg'))): samples.append((f, ci, user.get((c, os.path.basename(f)), 'x' + f)))
users = sorted({u for _, _, u in samples}); random.shuffle(users)
part = {u: ('train' if i % 20 < 14 else 'val' if i % 20 < 17 else 'test') for i, u in enumerate(users)}
import torchvision.transforms as T
tev = T.Compose([T.Resize(256), T.CenterCrop(224), T.ToTensor(), T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
from PIL import Image
net = torchvision.models.mobilenet_v3_large()
class Net(torch.nn.Module):
    def __init__(s): super().__init__(); s.f = net.features; s.p = net.avgpool; s.d = torch.nn.Dropout(0.2); s.h = torch.nn.Linear(960, K)
    def forward(s, x): return s.h(s.d(torch.flatten(s.p(s.f(x)), 1)))
m = Net(); m.load_state_dict(torch.load(PT)); m.eval()
items = [s for s in samples if part[s[2]] in ('val', 'test')]
L = []
with torch.no_grad():
    for i in range(0, len(items), 32): L.append(m(torch.stack([tev(Image.open(f).convert('RGB')) for f, _, _ in items[i:i + 32]])).numpy())
L = np.concatenate(L); Y = np.array([c for _, c, _ in items]); sp = np.array([part[u] for _, _, u in items])
P = (lambda e: e / e.sum(1, keepdims=True))(np.exp((L - L.max(1, keepdims=True)) / T_)); pred = P.argmax(1); conf = P.max(1)
np.savez(PT.replace('.pt', '_valtest.npz'), L=L, Y=Y, sp=sp, files=np.array([f for f, _, _ in items]))
acc = (conf >= TAU) & (pred != OTHER)
print(f'eşik {TAU}: tür başına (doğrulama+sınama) — foto / cevap verilen / doğru / YANLIŞ')
for c in range(K):
    if c == OTHER: continue
    mk = Y == c; n = mk.sum(); a = (acc & mk).sum(); ok = (acc & mk & (pred == c)).sum()
    print(f'{classes[c]:48s} {n:4d} {a:4d} {ok:4d} {a - ok:3d}')
print('\nkendinden emin yanlışlar (gerçek → tahmin, güven):')
for i in np.where(acc & (pred != Y))[0]: print(f'  {classes[Y[i]]} → {classes[pred[i]]}  %{100 * conf[i]:.0f}  [{sp[i]}]')
