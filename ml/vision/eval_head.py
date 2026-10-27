"""Kendi eğittiğimiz sınıflandırma başlığını dürüstçe ölçer.
 - Fotoğrafı çeken kişiye göre bölünür (aynı kişinin fotoğrafları hem eğitimde hem sınamada olmaz: sızıntı yok)
 - Emin değilse 'bilmiyorum' diyen eşik: hangi eşikte, yanlış ama kendinden emin cevap oranı ne kadar?
Kullanım: python3 eval_head.py ozellik.npz credits.csv"""
import csv, re, sys, random, numpy as np, torch
torch.manual_seed(0); random.seed(0); np.random.seed(0)
d = np.load(sys.argv[1], allow_pickle=True); X, y, F, classes = d['X'], d['y'], d['f'], list(d['classes'])
user = {}
for r in csv.DictReader(open(sys.argv[2])):
    m = re.match(r'\(c\)\s*([^,]+)', r['atif'] or ''); user[(r['sinif'], r['dosya'])] = (m.group(1).strip().lower() if m else 'bilinmeyen-' + r['gozlem'])
G = np.array([user.get((classes[c], f), 'x-' + f) for c, f in zip(y, F)])
OTHER = classes.index('diger'); K = len(classes)
mu, sd = X.mean(0), X.std(0) + 1e-6
def fit(Xtr, ytr, epochs=400, wd=1e-3):
    Xt = torch.tensor((Xtr - mu) / sd); yt = torch.tensor(ytr)
    cw = torch.tensor(len(ytr) / (K * np.bincount(ytr, minlength=K).clip(1)), dtype=torch.float32)
    W = torch.zeros(Xt.shape[1], K, requires_grad=True); b = torch.zeros(K, requires_grad=True)
    opt = torch.optim.Adam([W, b], lr=0.01, weight_decay=wd)
    for _ in range(epochs):
        opt.zero_grad(); loss = torch.nn.functional.cross_entropy(Xt @ W + b, yt, weight=cw); loss.backward(); opt.step()
    return W.detach(), b.detach()
def logits(m, Xs): return (torch.tensor((Xs - mu) / sd) @ m[0] + m[1]).numpy()
# kullanıcıya göre 5 katlı çapraz doğrulama
users = sorted(set(G)); random.shuffle(users); fold = {u: i % 5 for i, u in enumerate(users)}; fi = np.array([fold[u] for u in G])
oof = np.zeros((len(y), K), dtype=np.float32)
for k in range(5):
    tr, te = fi != k, fi == k
    oof[te] = logits(fit(X[tr], y[tr]), X[te])
def soft(z, T=1.0): e = np.exp((z - z.max(1, keepdims=True)) / T); return e / e.sum(1, keepdims=True)
# sıcaklık ayarı (güven değerlerinin dürüst olması için)
best = min((float(-np.log(soft(oof, T)[np.arange(len(y)), y] + 1e-9).mean()), T) for T in [0.5, 0.75, 1, 1.5, 2, 3, 4])
T = best[1]; P = soft(oof, T); pred = P.argmax(1); conf = P.max(1)
sp = y != OTHER
print(f'sınıf {K} (diger dahil), örnek {len(y)}; sıcaklık {T}')
print('Eşiksiz doğruluk: türler', f'%{100 * (pred[sp] == y[sp]).mean():.1f}', '| diger', f'%{100 * (pred[~sp] == OTHER).mean():.1f}')
print('eşik | kapsam(tür fotoğraflarına cevap verme) | kabul edilenlerde YANLIŞ oranı | "diger" fotoğrafını türmüş gibi kabul oranı')
rows = []
for tau in [0.5, 0.7, 0.8, 0.9, 0.95, 0.97, 0.99]:
    acc = (conf >= tau) & (pred != OTHER)
    cov = acc[sp].mean(); wrong = ((pred != y) & acc & sp).sum() / max(1, (acc & sp).sum()); fa = acc[~sp].mean()
    rows.append((tau, cov, wrong, fa)); print(f'{tau:.2f} | %{100 * cov:5.1f} | %{100 * wrong:4.2f} | %{100 * fa:4.2f}')
print('\nTür başına (eşik 0.90): fotoğraf sayısı / doğru cevap oranı / yanlış cevap oranı')
for c in range(K):
    if c == OTHER: continue
    m = y == c; acc = (conf >= 0.9) & (pred != OTHER)
    print(f'{classes[c]:42s} {m.sum() // 2:4d}  doğru %{100 * ((pred == c) & acc & m).sum() / m.sum():5.1f}  yanlış %{100 * ((pred != c) & acc & m).sum() / m.sum():4.1f}')
np.savez(sys.argv[1].replace('.npz', '_oof.npz'), P=P, y=y, pred=pred)
