"""Fotoğraflardan özellik çıkarır (önceden eğitilmiş MobileNetV3, ImageNet; dondurulmuş) ve diske kaydeder.
Her fotoğraf için orijinal + yatay çevrilmiş hâli çıkarılır."""
import os, sys, glob, numpy as np, torch, torchvision
from PIL import Image
torch.set_num_threads(4)
ROOT, OUT, ARCH = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else 'large')
W = {'large': torchvision.models.MobileNet_V3_Large_Weights.IMAGENET1K_V1, 'small': torchvision.models.MobileNet_V3_Small_Weights.IMAGENET1K_V1}[ARCH]
net = (torchvision.models.mobilenet_v3_large if ARCH == 'large' else torchvision.models.mobilenet_v3_small)(weights=W).eval()
body = torch.nn.Sequential(net.features, net.avgpool, torch.nn.Flatten())
tf = W.transforms()
classes = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)))
X, Y, F = [], [], []
for ci, c in enumerate(classes):
    files = sorted(glob.glob(os.path.join(ROOT, c, '*.jpg')))
    for i in range(0, len(files), 32):
        ims = [Image.open(f).convert('RGB') for f in files[i:i + 32]]
        batch = torch.stack([tf(im) for im in ims] + [tf(im.transpose(Image.FLIP_LEFT_RIGHT)) for im in ims])
        with torch.no_grad(): z = body(batch).numpy()
        n = len(ims); X += list(z[:n]) + list(z[n:]); Y += [ci] * (2 * n); F += [os.path.basename(f) for f in files[i:i + 32]] * 2
    print(c, len(files), flush=True)
np.savez(OUT, X=np.array(X, dtype=np.float32), y=np.array(Y), f=np.array(F), classes=np.array(classes))
print('özellik', np.array(X).shape)
