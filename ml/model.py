"""Küçük dil modeli (decoder-only transformer), sıfırdan yazıldı."""
import math, torch, torch.nn as nn, torch.nn.functional as F

class Block(nn.Module):
    def __init__(s, d, h, ff):
        super().__init__(); s.h = h; s.ln1 = nn.LayerNorm(d); s.ln2 = nn.LayerNorm(d)
        s.qkv = nn.Linear(d, 3 * d); s.proj = nn.Linear(d, d); s.f1 = nn.Linear(d, ff); s.f2 = nn.Linear(ff, d)
    def forward(s, x):
        B, T, C = x.shape
        q, k, v = s.qkv(s.ln1(x)).split(C, dim=2)
        q, k, v = [t.view(B, T, s.h, C // s.h).transpose(1, 2) for t in (q, k, v)]
        a = F.scaled_dot_product_attention(q, k, v, is_causal=True).transpose(1, 2).reshape(B, T, C)
        x = x + s.proj(a)
        return x + s.f2(F.gelu(s.f1(s.ln2(x))))

class LM(nn.Module):
    def __init__(s, vocab, d=128, h=4, layers=4, ff=512, block=448):
        super().__init__(); s.block = block
        s.cfg = dict(vocab=vocab, d=d, h=h, layers=layers, ff=ff, block=block)
        s.tok = nn.Embedding(vocab, d); s.pos = nn.Embedding(block, d)
        s.blocks = nn.ModuleList([Block(d, h, ff) for _ in range(layers)]); s.ln = nn.LayerNorm(d)
        s.apply(s._init)
    def _init(s, m):
        if isinstance(m, (nn.Linear, nn.Embedding)): nn.init.normal_(m.weight, 0, 0.02)
        if isinstance(m, nn.Linear) and m.bias is not None: nn.init.zeros_(m.bias)
    def forward(s, x):
        T = x.shape[1]
        h = s.tok(x) + s.pos(torch.arange(T, device=x.device))
        for b in s.blocks: h = b(h)
        return s.ln(h) @ s.tok.weight.T  # giriş ve çıkış gömmesi paylaşılır
    @torch.no_grad()
    def generate(s, ids, stop, max_new=160, temp=0.0, topk=8):
        x = torch.tensor([ids])
        for _ in range(max_new):
            lg = s(x[:, -s.block:])[0, -1]
            if temp <= 0: n = int(lg.argmax())
            else:
                v, i = lg.topk(topk); p = F.softmax(v / temp, -1); n = int(i[torch.multinomial(p, 1)])
            if n == stop: break
            x = torch.cat([x, torch.tensor([[n]])], 1)
        return x[0, len(ids):].tolist()
