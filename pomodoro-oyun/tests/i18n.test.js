import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import tr from '../src/i18n/tr.json';
import { BADGE_IDS } from '../src/core/achievements.js';

const SRC = join(import.meta.dirname, '../src');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const has = (key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), tr) !== undefined;

describe('metinler (i18n)', () => {
  const files = walk(SRC).filter((f) => f.endsWith('.js') && !f.endsWith('i18n/index.js'));

  it('kodda kullanılan tüm sabit metin anahtarları tr.json içinde var', () => {
    const missing = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/\bt(?:List)?\('([a-zA-Z0-9_.]+)'/g)) if (!has(m[1])) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('her rozetin adı ve ipucu var', () => {
    for (const id of BADGE_IDS) {
      expect(has(`badges.${id}.name`), id).toBe(true);
      expect(has(`badges.${id}.hint`), id).toBe(true);
    }
    expect(BADGE_IDS.length).toBeGreaterThanOrEqual(25);
  });

  it('en az 30 cesaret mesajı ve ipuçları var', () => {
    expect(tr.growth.length).toBeGreaterThanOrEqual(30);
    expect(tr.tips.break.length).toBeGreaterThanOrEqual(8);
  });

  it('arayüzde cinsiyete göre ayrım yok', () => {
    const all = [JSON.stringify(tr), ...files.map((f) => readFileSync(f, 'utf8'))].join('\n').toLowerCase();
    expect(all).not.toMatch(/kızlar için|erkekler için|kız teması|erkek teması|for girls|for boys/);
  });

  it('karanlık tasarım ifadeleri yok (kayıp korkusu, "dönmezsen")', () => {
    const text = JSON.stringify(tr).toLowerCase();
    expect(text).not.toMatch(/dönmezsen|seni özledi|geri alınacak|kaybedeceksin|loot|liderlik tablosu: /);
  });
});
