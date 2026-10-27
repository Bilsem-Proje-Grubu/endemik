"""Aynı fotoğrafın birkaç görünümünü (orta, yatay çevrilmiş, yakınlaştırılmış) ayrı ayrı sınıflandırır; yalnızca hepsi aynı sınıfı yüksek güvenle söylerse cevap verir.
Doğrulama+sınama fotoğrafları üzerinde kapsam / yanlış oranı raporlar."""
import sys, os, re, csv, glob, random, numpy as np, torch, torchvision, torchvision.transforms as T
from PIL import Image
ROOT, PT, T_ = sys.argv[1], sys.argv[2], float(sys.argv[3]); torch.set_num_threads(4); random.seed(0)
d = np.load(PT.replace('.pt', '_valtest.npz'), allow_pickle=True); Y, sp, files = d['Y'], d['sp'], d['files']
classes = sorted(x for x in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, x))); K = len(classes); OTHER = classes.index('diger')
net = torchvision.models.mobilenet_v3_large()
class Net(torch.nn.Module):
    def __init__(s): super().__init__(); s.f = net.features; s.p = net.avgpool; s.d = torch.nn.Dropout(0.2); s.h = torch.nn.Linear(960, K)
    def forward(s, x): return s.h(s.d(torch.flatten(s.p(s.f(x)), 1)))
m = Net(); m.load_state_dict(torch.load(PT)); m.eval()
nm = T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
views = {'orta': T.Compose([T.Resize(256), T.CenterCrop(224), T.ToTensor(), nm]),
         'cevir': T.Compose([T.Resize(256), T.CenterCrop(224), T.RandomHorizontalFlip(1.0), T.ToTensor(), nm]),
         'yakin': T.Compose([T.Resize(320), T.CenterCrop(224), T.ToTensor(), nm]),
         'genis': T.Compose([T.Resize(224), T.CenterCrop(224), T.ToTensor(), nm])}
LG = {}
for name, tf in views.items():
    out = []
    with torch.no_grad():
        for i in range(0, len(files), 32): out.append(m(torch.stack([tf(Image.open(f).convert('RGB')) for f in files[i:i + 32]])).numpy())
    LG[name] = np.concatenate(out); print('görünüm', name, flush=True)
np.savez(PT.replace('.pt', '_tta.npz'), **LG, Y=Y, sp=sp)
soft = lambda z: (lambda e: e / e.sum(1, keepdims=True))(np.exp((z - z.max(1, keepdims=True)) / T_))
P = {k: soft(v) for k, v in LG.items()}; isp = Y != OTHER
def rule(names, tau, mode):
    preds = np.stack([P[k].argmax(1) for k in names]); confs = np.stack([P[k].max(1) for k in names])
    agree = (preds == preds[0]).all(0); mean = np.mean([P[k] for k in names], 0); pm = mean.argmax(1)
    if mode == 'min': ok = agree & (confs.min(0) >= tau) & (preds[0] != OTHER)
    else: ok = (mean.max(1) >= tau) & (pm != OTHER) & agree
    return ok, (preds[0] if mode == 'min' else pm)
print('kural | eşik | kapsam | kabul edilenlerde yanlış (sayı/toplam) | diğeri tür sanma')
for names in [['orta'], ['orta', 'cevir'], ['orta', 'cevir', 'yakin'], ['orta', 'cevir', 'yakin', 'genis']]:
    for tau in [0.9, 0.95, 0.97]:
        ok, pr = rule(names, tau, 'min'); cov = ok[isp].mean(); w = (ok & isp & (pr != Y)).sum(); a = (ok & isp).sum(); fa = ok[~isp].mean()
        print(f"{'+'.join(names):28s} {tau:.2f} | %{100 * cov:5.1f} | %{100 * w / max(1, a):4.2f} ({w}/{a}) | %{100 * fa:4.2f} ({(ok & ~isp).sum()}/{(~isp).sum()})")
