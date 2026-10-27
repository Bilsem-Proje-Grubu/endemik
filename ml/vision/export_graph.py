"""MobileNetV3 gövdesini tarayıcıda çalışacak biçime dışa aktarır: işlem listesi (JSON) + 16 bit ağırlıklar (BIN).
BatchNorm katmanları evrişime katılır (katlanır). Çıktı: 'avgpool' sonrası öznitelik vektörü (ör. 960 sayı)."""
import json, numpy as np, torch

def act_of(seq):
    names = [type(m).__name__ for m in seq]
    return 'hs' if 'Hardswish' in names else 'relu' if 'ReLU' in names else 'none'

class Packer:
    def __init__(s): s.buf = []; s.n = 0
    def add(s, t):
        a = t.detach().cpu().numpy().astype(np.float16).ravel(); off = s.n; s.buf.append(a); s.n += a.size; return off

def fold(conv, bn, P):
    w = conv.weight.detach().float(); co = w.shape[0]
    if bn is not None:
        sc = bn.weight.detach() / torch.sqrt(bn.running_var + bn.eps); w = w * sc.view(-1, 1, 1, 1)
        b = bn.bias.detach() - bn.running_mean * sc
    else: b = conv.bias.detach() if conv.bias is not None else torch.zeros(co)
    g = conv.groups; k = conv.kernel_size[0]
    # düzen: 1x1 ve normal evrişim [çıkış][k][k][giriş]; derinlemesine [k][k][kanal]
    wt = w.permute(2, 3, 0, 1).reshape(k, k, co) if g > 1 else w.permute(0, 2, 3, 1)
    return dict(i=conv.in_channels, o=co, k=k, s=conv.stride[0], p=conv.padding[0], g=g, w=P.add(wt), b=P.add(b))

def conv_op(m, P):
    d = fold(m[0], m[1] if len(m) > 1 and type(m[1]).__name__ == 'BatchNorm2d' else None, P); d['op'] = 'conv'; d['act'] = act_of(m); return d

def export_features(features, P):
    ops = []
    for idx, blk in enumerate(features):
        if type(blk).__name__ == 'Conv2dNormActivation': ops.append(conv_op(blk, P)); continue
        res = bool(blk.use_res_connect)
        if res: ops.append({'op': 'save'})
        for m in blk.block:
            n = type(m).__name__
            if n == 'Conv2dNormActivation': ops.append(conv_op(m, P))
            elif n == 'SqueezeExcitation':
                c1, c2 = m.fc1, m.fc2
                ops.append({'op': 'se', 'c': c1.in_channels, 'q': c1.out_channels, 'w1': P.add(c1.weight.detach().squeeze(-1).squeeze(-1)), 'b1': P.add(c1.bias), 'w2': P.add(c2.weight.detach().squeeze(-1).squeeze(-1)), 'b2': P.add(c2.bias)})
        if res: ops.append({'op': 'add'})
    ops.append({'op': 'gap'})
    return ops

def write(prefix, ops, P, extra):
    open(prefix + '.bin', 'wb').write(b''.join(a.tobytes() for a in P.buf))
    json.dump({'ops': ops, **extra}, open(prefix + '.json', 'w'), ensure_ascii=False)
    print(prefix, 'ağırlık', P.n * 2 // 1024, 'KB, işlem', len(ops))
