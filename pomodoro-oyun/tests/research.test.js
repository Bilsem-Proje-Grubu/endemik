import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/core/storage.js';
import { buildCSV, buildReport, csvCell, controlActive, setControlMode, submitSurvey, surveyDue } from '../src/core/research.js';
import { applyCompletion } from '../src/core/economy.js';
import { setup } from './helpers.js';

const DAY = 86400000;
const T = (d, h = 10) => new Date(2025, 0, d, h, 0, 0).getTime();

describe('araştırma: CSV', () => {
  it('UTF-8 BOM ile başlar, ; ayraçlıdır, Türkçe karakterler bozulmaz', () => {
    const st = defaultState();
    st.profile.participantCode = 'K07';
    st.sessions.push({ id: 'a', day: '2025-01-06', start: T(6), plannedMin: 25, actualMin: 25, status: 'completed', reason: null, theme: 'cafe', task: 'Türkçe - şiir', coins: 125, mode: 'game', hour: 10 });
    const csv = buildCSV(st);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('katilimci_kodu;tur;tarih');
    expect(csv).toContain('K07;oturum;2025-01-06;10:00;25;25;tamamlandi;;cafe;Türkçe;game;125');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('anket satırları aynı dosyada', () => {
    const st = defaultState();
    submitSurvey(st, 'baseline', [2, 3, 4], T(6));
    expect(buildCSV(st)).toContain(';anket;2025-01-06;;;;;;;;;;basta;2;3;4');
  });

  it('formül enjeksiyonuna ve ayraç/tırnağa karşı kaçışlar', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@x')).toBe("'@x");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('o "x"')).toBe('"o ""x"""');
    expect(csvCell(null)).toBe('');
  });

  it('görev adının tamamı değil sadece ders etiketi dışa aktarılır', () => {
    const st = defaultState();
    st.sessions.push({ id: 'a', day: '2025-01-06', start: T(6), plannedMin: 25, actualMin: 25, status: 'completed', theme: 'cafe', task: 'Matematik - Ayşe ile ödev', coins: 0, mode: 'game', hour: 10 });
    expect(buildCSV(st)).not.toContain('Ayşe');
  });
});

describe('araştırma: anket', () => {
  it('başlangıçta baştaki, 2 hafta sonra ikinci anket sırada', () => {
    const st = defaultState();
    expect(surveyDue(st, T(6))).toBeNull(); // henüz tanıtım bitmedi
    st.profile.onboarded = true;
    expect(surveyDue(st, T(6))).toBe('baseline');
    submitSurvey(st, 'baseline', [2, 2, 2], T(6));
    expect(surveyDue(st, T(6) + 13 * DAY)).toBeNull();
    expect(surveyDue(st, T(6) + 14 * DAY)).toBe('followup');
    submitSurvey(st, 'followup', [4, 3, 5], T(6) + 14 * DAY);
    expect(surveyDue(st, T(6) + 30 * DAY)).toBeNull();
  });

  it('geçersiz cevaplar reddedilir, aralık 1-5 ile sınırlanır', () => {
    const st = defaultState();
    expect(submitSurvey(st, 'baseline', [1, 2], 1)).toBe(false);
    expect(submitSurvey(st, 'baseline', [0, 3, 3], 1)).toBe(false);
    expect(submitSurvey(st, 'baseline', [9, 3, 3], 1)).toBe(true);
    expect(st.research.surveys[0].answers[0]).toBe(5);
  });
});

describe('araştırma: kontrol modu', () => {
  it('3 gün sonra kendiliğinden biter; para verilmez, oturum "control" etiketli', () => {
    const { ctrl, clock, store } = setup();
    store.update((s) => setControlMode(s, true, clock.now()));
    expect(controlActive(store.get(), clock.now())).toBe(true);
    ctrl.start('');
    clock.advance(25 * 60000);
    ctrl.tick();
    expect(store.get().wallet.coins).toBe(0);
    expect(store.get().sessions[0].mode).toBe('control');
    expect(controlActive(store.get(), clock.now() + 3 * DAY + 1)).toBe(false);
  });
});

describe('araştırma: rapor', () => {
  it('ortalama, tamamlama oranı, haftalık değişim ve anket farkı', () => {
    const st = defaultState();
    const add = (day, status = 'completed') => st.sessions.push({ id: day + status + Math.random(), day, start: T(1), plannedMin: 25, actualMin: 25, status, theme: 'cafe', task: '', coins: 0, mode: 'game', hour: 10 });
    add('2024-12-30'); add('2024-12-31'); // geçen hafta 50 dk
    add('2025-01-06'); add('2025-01-06'); add('2025-01-07'); add('2025-01-07', 'interrupted'); // bu hafta 75 dk
    submitSurvey(st, 'baseline', [2, 2, 3], T(1));
    submitSurvey(st, 'followup', [4, 3, 3], T(15));
    const r = buildReport(st, T(8));
    expect(r.completedSessions).toBe(5);
    expect(r.interruptedSessions).toBe(1);
    expect(r.completionRate).toBeCloseTo(5 / 6);
    expect(r.weekChangePct).toBe(50);
    expect(r.survey.diffs).toEqual([2, 1, 0]);
    expect(r.survey.avgDiff).toBeCloseTo(1);
    expect(r.activeDays).toBe(4);
  });

  it('veri yokken çökmez', () => {
    const r = buildReport(defaultState(), T(8));
    expect(r.completionRate).toBeNull();
    expect(r.avgDailyMinutes).toBe(0);
  });
});

describe('günlük kayıt', () => {
  it('uç durum: eksik daily kaydı otomatik oluşur', () => {
    const st = defaultState();
    applyCompletion(st, { plannedMin: 25, actualMin: 25, task: '', now: T(6) });
    expect(st.daily['2025-01-06'].completed).toBe(1);
  });
});
