import { describe, it, expect } from 'vitest';
import { THEMES, validateTheme } from '../src/themes/index.js';
import { THEME_IDS, CONFIG } from '../src/config.js';
import { totalPower, equippedIds } from '../src/core/economy.js';

// WCAG göreli parlaklık / kontrast
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('tema verisi', () => {
  it('dört tema var ve şemaya uyuyor', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
    for (const t of Object.values(THEMES)) expect(validateTheme(t)).toEqual([]);
  });

  it('her temada en az 40 ürün ve dört kademe de var', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.items.length).toBeGreaterThanOrEqual(40);
      for (const tier of ['bronze', 'silver', 'gold', 'legend']) expect(t.items.some((i) => i.tier === tier), `${t.id} ${tier}`).toBe(true);
    }
  });

  it('fiyatlar kademeye göre config ile uyumlu', () => {
    for (const t of Object.values(THEMES)) for (const i of t.items) expect(i.price).toBe(CONFIG.tiers[i.tier].price);
  });

  it('metinlerde TODO / boş alan yok', () => {
    for (const t of Object.values(THEMES)) {
      const json = JSON.stringify(t);
      expect(json).not.toMatch(/TODO|lorem|undefined|null/i);
      expect(Object.values(t.texts).every((v) => (Array.isArray(v) ? v.length > 0 : String(v).length > 0))).toBe(true);
      for (const r of ['win', 'draw', 'lose']) expect(t.weeklyEvent.resultTexts[r].length).toBeGreaterThan(0);
    }
  });

  it('seviyeler artan ve ulaşılabilir (azami güç son eşiği aşar)', () => {
    for (const t of Object.values(THEMES)) {
      const req = t.levels.map((l) => l.requiredPower);
      expect(req).toEqual([...req].sort((a, b) => a - b));
      expect(req[0]).toBe(0);
      expect(totalPower(t, t.items.map((i) => i.id))).toBeGreaterThan(req[req.length - 1]);
    }
  });

  it('palet kontrastı WCAG AA (düğme metni 4.5:1, birincil renk yüzeyde 4.5:1)', () => {
    const surfaces = { light: ['#ffffff', '#f4f6f8'], dark: ['#171c23', '#0d1116'] };
    for (const t of Object.values(THEMES)) {
      for (const mode of ['light', 'dark']) {
        const p = t.palette[mode];
        expect(contrast(p.primary, p.onPrimary), `${t.id} ${mode} düğme`).toBeGreaterThanOrEqual(4.5);
        for (const s of surfaces[mode]) expect(contrast(p.primary, s), `${t.id} ${mode} yüzey ${s}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('slot sınırı, kategori başına en iyi N ürünü seçer', () => {
    for (const t of Object.values(THEMES)) {
      const eq = equippedIds(t, t.items.map((i) => i.id));
      for (const c of t.categories) expect(eq[c.id].length).toBe(Math.min(c.slotLimit, t.items.filter((i) => i.category === c.id).length));
    }
  });
});
