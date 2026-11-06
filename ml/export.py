"""Eğitilmiş modeli tarayıcı için dışa aktarır: public/model/lm.json (ayarlar, sözcük listesi, şablon sözcükleri) + lm.bin (16 bit ağırlıklar)."""
import json, os, sys, numpy as np, torch
D = os.path.dirname(__file__); OUT = os.path.join(D, '..', 'public', 'model'); os.makedirs(OUT, exist_ok=True)
ck = torch.load(os.path.join(D, os.environ.get('CKPT', 'lm.pt'))); tj = json.load(open(os.path.join(D, os.environ.get('TOK', 'tok.json'))))
names = ['tok.weight', 'pos.weight'] + [f'blocks.{i}.{n}' for i in range(ck['cfg']['layers']) for n in
  ['ln1.weight', 'ln1.bias', 'qkv.weight', 'qkv.bias', 'proj.weight', 'proj.bias', 'ln2.weight', 'ln2.bias', 'f1.weight', 'f1.bias', 'f2.weight', 'f2.bias']] + ['ln.weight', 'ln.bias']
buf = []; layout = []; off = 0
for n in names:
    a = ck['sd'][n].numpy().astype(np.float16); buf.append(a.tobytes()); layout.append({'n': n, 'shape': list(a.shape), 'off': off}); off += a.size
open(os.path.join(OUT, 'lm.bin'), 'wb').write(b''.join(buf))
json.dump({'cfg': ck['cfg'], 'layout': layout, 'vocab': tj['vocab'], 'merges': tj['merges'], 'template': json.load(open(os.path.join(D, 'template_words.json'))), 'template_by_type': json.load(open(os.path.join(D, 'template_by_type.json')))},
          open(os.path.join(OUT, 'lm.json'), 'w'), ensure_ascii=False)
print('lm.bin', off * 2 // 1024, 'KB')
