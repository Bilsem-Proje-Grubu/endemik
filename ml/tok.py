"""Küçük BPE sözcük parçalayıcı (tokenizer), sıfırdan yazıldı. JS karşılığı: src/lm.js"""
import json, re, collections

SPECIAL = ['<pad>', '<bilgi>', '<soru>', '<cevap>', '<son>', '<unk>']

def words(text):
    # boşluk bir sonraki sözcüğe "▁" olarak yapışır
    return ['▁' + w for w in text.split()]

def train_bpe(texts, vocab_size=1800):
    wc = collections.Counter()
    for t in texts:
        for w in words(t): wc[w] += 1
    chars = sorted({c for w in wc for c in w})
    vocab = SPECIAL + chars
    seqs = {w: list(w) for w in wc}
    merges = []
    while len(vocab) < vocab_size:
        pairs = collections.Counter()
        for w, f in wc.items():
            s = seqs[w]
            for a, b in zip(s, s[1:]): pairs[(a, b)] += f
        if not pairs: break
        (a, b), n = pairs.most_common(1)[0]
        if n < 3: break
        merges.append((a, b)); vocab.append(a + b)
        for w, s in seqs.items():
            i, out = 0, []
            while i < len(s):
                if i + 1 < len(s) and s[i] == a and s[i + 1] == b: out.append(a + b); i += 2
                else: out.append(s[i]); i += 1
            seqs[w] = out
    return {'vocab': vocab, 'merges': merges}

class Tok:
    def __init__(self, d):
        self.vocab = d['vocab']; self.id = {t: i for i, t in enumerate(self.vocab)}
        self.rank = {tuple(m): i for i, m in enumerate(d['merges'])}
        self.cache = {}
    def word(self, w):
        if w in self.cache: return self.cache[w]
        s = list(w)
        while len(s) > 1:
            best = min(((self.rank.get((a, b), 1e9), i) for i, (a, b) in enumerate(zip(s, s[1:]))))
            if best[0] == 1e9: break
            i = best[1]; s = s[:i] + [s[i] + s[i + 1]] + s[i + 2:]
        self.cache[w] = s
        return s
    def encode(self, text):
        ids = []
        for part in re.split(r'(<bilgi>|<soru>|<cevap>|<son>)', text):
            if part in ('<bilgi>', '<soru>', '<cevap>', '<son>'): ids.append(self.id[part]); continue
            for w in words(part):
                ids += [self.id.get(t, self.id['<unk>']) for t in self.word(w)]
        return ids
    def decode(self, ids):
        out = ''
        for i in ids:
            t = self.vocab[i]
            if t in SPECIAL: out += ' ' + t + ' ' if t != '<pad>' else ''
            else: out += t.replace('▁', ' ')
        return out.strip()
