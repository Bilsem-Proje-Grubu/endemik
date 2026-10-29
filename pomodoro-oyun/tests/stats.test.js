import { describe, it, expect } from 'vitest';
import * as S from '../src/core/stats.js';
import { BADGE_IDS, evaluate, buildContext } from '../src/core/achievements.js';
import { defaultState } from '../src/core/storage.js';
import { THEMES } from '../src/themes/index.js';

const sess = (day, min = 25, extra = {}) => ({ id: day + min + Math.random(), day, start: new Date(`${day}T10:00:00`).getTime(), hour: 10, plannedMin: min, actualMin: min, status: 'completed', reason: null, task: '', mode: 'game', coins: 100, ...extra });

describe('istatistikler', () => {
  const sessions = [
    sess('2025-01-06', 25, { task: 'Matematik - türev' }),
    sess('2025-01-06', 25, { task: 'Matematik - limit', hour: 20 }),
    sess('2025-01-07', 45, { task: 'Fizik - kuvvet' }),
    sess('2025-01-07', 25, { status: 'interrupted', actualMin: 10 }),
    sess('2025-01-12', 25),
  ];

  it('ders etiketi tireden önceki kısımdır', () => {
    expect(S.subjectOf('Matematik - türev')).toBe('Matematik');
    expect(S.subjectOf('Fizik: dinamik')).toBe('Fizik');
    expect(S.subjectOf('')).toBe('');
  });

  it('günlük / haftalık / aylık toplam sadece tamamlananları sayar', () => {
    expect(S.minutesOnDay(sessions, '2025-01-07')).toBe(45);
    const t = S.totals(sessions, '2025-01-08');
    expect(t.week).toBe(25 + 25 + 45 + 25); // 6-12 Ocak haftası
    expect(t.today).toBe(0);
    expect(t.month).toBe(120);
  });

  it('haftalık çubuklar Pzt-Paz ve gelecek günleri işaretler', () => {
    const bars = S.weekBars(sessions, '2025-01-08');
    expect(bars).toHaveLength(7);
    expect(bars[0].minutes).toBe(50);
    expect(bars[3].future).toBe(true);
    expect(bars[2].isToday).toBe(true);
  });

  it('derse göre dağılım büyükten küçüğe', () => {
    const b = S.subjectBreakdown(sessions);
    expect(b[0]).toMatchObject({ subject: 'Matematik', minutes: 50 });
    expect(b.find((x) => x.subject === '')).toBeTruthy();
  });

  it('en verimli saat dilimi', () => {
    expect(S.bestBucket(sessions).id).toBe('morning'); // 3 oturum saat 10'da (sabah)
  });

  it('dünle kıyas', () => {
    expect(S.compareYesterday(sessions, '2025-01-07')).toMatchObject({ today: 45, yesterday: 50, diff: -5 });
  });

  it('ısı haritası: son sütun bu hafta, seviye dakikaya göre', () => {
    const cols = S.heatmap(sessions, '2025-01-12', 4);
    expect(cols).toHaveLength(4);
    expect(cols[3][6].day).toBe('2025-01-12');
    expect(cols[3][6].level).toBeGreaterThan(0);
    expect(cols[3][0].minutes).toBe(50);
  });

  it('tamamlama oranı', () => {
    expect(S.completionRate(sessions)).toBeCloseTo(4 / 5);
    expect(S.completionRate([])).toBeNull();
  });
});

describe('rozetler', () => {
  it('en az 25 rozet, hepsi çabaya bağlı (hedef sayıları pozitif)', () => {
    expect(BADGE_IDS.length).toBeGreaterThanOrEqual(25);
  });

  it('ilk Pomodoro ve sabah rozeti; ikinci kez verilmez', () => {
    const st = defaultState();
    st.sessions.push(sess('2025-01-06', 25, { hour: 7 }));
    const first = evaluate(st, THEMES, 1);
    expect(first).toContain('first');
    expect(first).toContain('morning');
    expect(evaluate(st, THEMES, 2)).toEqual([]);
  });

  it('hafta sonu ve 45 dakika rozetleri', () => {
    const st = defaultState();
    st.sessions.push(sess('2025-01-11', 45)); // cumartesi
    const got = evaluate(st, THEMES, 1);
    expect(got).toEqual(expect.arrayContaining(['weekend', 'long45']));
  });

  it('geri dönüş rozeti: 3 gün ara sonrası çalışma', () => {
    const st = defaultState();
    st.sessions.push(sess('2025-01-06'), sess('2025-01-10'));
    expect(buildContext(st, THEMES).comeback).toBe(true);
  });
});
