// Araştırma verisi: anket, kontrol modu, CSV ve rapor. Kişisel veri toplanmaz; her şey cihazda kalır.
import { CONFIG } from '../config.js';
import { addDays, dayKey, daysBetween, weekKey } from './dates.js';
import { completionRate, minutesInRange, subjectOf } from './stats.js';

const R = CONFIG.research;

/** Kontrol modu (oyun kapalı, sade Pomodoro) şu an aktif mi? İlk 3 gün sonra kendiliğinden biter. */
export function controlActive(state, now) {
  const r = state.research;
  return !!(r.controlMode && r.controlStartedAt && now < r.controlStartedAt + R.controlDays * 86400000);
}

/** Kontrol modunu açar/kapatır (durumu değiştirir). */
export function setControlMode(state, on, now) {
  state.research.controlMode = on;
  state.research.controlStartedAt = on ? now : null;
}

/** Hangi anket sırada? 'baseline' | 'followup' | null. */
export function surveyDue(state, now) {
  if (!state.profile.onboarded) return null;
  const surveys = state.research.surveys;
  const base = surveys.find((s) => s.phase === 'baseline');
  if (!base) return 'baseline';
  const follow = surveys.find((s) => s.phase === 'followup');
  if (follow) return null;
  if (now - base.takenAt >= R.surveyGapDays * 86400000) return 'followup';
  return null;
}

/** Anket cevabını kaydeder. answers: 3 sayı (1-5). */
export function submitSurvey(state, phase, answers, now) {
  const clean = answers.map((a) => Math.max(1, Math.min(5, Math.round(Number(a) || 0))));
  if (clean.length !== R.questionCount || clean.some((a) => !a)) return false;
  state.research.surveys = state.research.surveys.filter((s) => s.phase !== phase);
  state.research.surveys.push({ id: `a_${phase}`, phase, takenAt: now, day: dayKey(now), answers: clean });
  return true;
}

// ---------- CSV ----------

const COLUMNS = [
  'katilimci_kodu', 'tur', 'tarih', 'saat', 'planlanan_dk', 'gercek_dk', 'durum', 'neden',
  'tema', 'ders_etiketi', 'mod', 'kazanilan_para', 'anket_asama', 'soru1', 'soru2', 'soru3',
];

/** Hücreyi CSV için kaçışlar. =,+,-,@ ile başlayanlara ' ekler (Excel formül enjeksiyonu koruması). */
export function csvCell(value) {
  let v = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[";\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Tek dosyada oturumlar + anketler. Ayraç ';' (Türkçe Excel), UTF-8 BOM'lu. */
export function buildCSV(state) {
  const code = state.profile.participantCode || '';
  const rows = [COLUMNS];
  for (const s of state.sessions) {
    const d = new Date(s.start);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    rows.push([
      code, 'oturum', s.day, `${hh}:${mm}`, s.plannedMin, s.actualMin,
      s.status === 'completed' ? 'tamamlandi' : 'yarim', s.reason || '',
      s.theme || '', subjectOf(s.task), s.mode, s.coins, '', '', '', '',
    ]);
  }
  for (const a of state.research.surveys) {
    rows.push([code, 'anket', a.day, '', '', '', '', '', '', '', '', '', a.phase === 'baseline' ? 'basta' : '2hafta', ...a.answers]);
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

// ---------- Rapor ----------

function avgPerDay(sessions, from, to) {
  const days = Math.max(1, daysBetween(from, to) + 1);
  return minutesInRange(sessions, from, to) / days;
}

/** Jüri raporu için özet sayılar. */
export function buildReport(state, now = Date.now()) {
  const today = dayKey(now);
  const sessions = state.sessions;
  const done = sessions.filter((s) => s.status === 'completed');
  const firstDay = sessions.length ? sessions.map((s) => s.day).sort()[0] : today;
  const activeDays = new Set(done.map((s) => s.day)).size;
  const totalMin = done.reduce((a, s) => a + s.actualMin, 0);
  const calendarDays = Math.max(1, daysBetween(firstDay, today) + 1);

  // Son 6 hafta (en eskiden yeniye)
  const thisWeek = weekKey(now);
  const weeks = [];
  for (let i = 5; i >= 0; i--) {
    const wk = addDays(thisWeek, -7 * i);
    weeks.push({ week: wk, minutes: minutesInRange(sessions, wk, addDays(wk, 6)) });
  }
  const last = weeks[weeks.length - 1].minutes;
  const prev = weeks[weeks.length - 2].minutes;
  const weekChangePct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;

  // Anket farkı
  const base = state.research.surveys.find((s) => s.phase === 'baseline');
  const follow = state.research.surveys.find((s) => s.phase === 'followup');
  let survey = { baseline: base || null, followup: follow || null, diffs: null, avgDiff: null };
  if (base && follow) {
    const diffs = follow.answers.map((a, i) => a - base.answers[i]);
    survey.diffs = diffs;
    survey.avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  }

  // Kontrol (sade) ve oyunlu dönem kıyası
  const modeAvg = (mode) => {
    const ss = sessions.filter((s) => s.mode === mode);
    if (!ss.length) return null;
    const days = ss.map((s) => s.day).sort();
    return { days: daysBetween(days[0], days[days.length - 1]) + 1, avgDaily: avgPerDay(ss, days[0], days[days.length - 1]) };
  };

  return {
    totalSessions: sessions.length,
    completedSessions: done.length,
    interruptedSessions: sessions.length - done.length,
    completionRate: completionRate(sessions),
    totalMinutes: totalMin,
    activeDays,
    calendarDays,
    avgDailyMinutes: totalMin / calendarDays,
    avgMinutesPerActiveDay: activeDays ? totalMin / activeDays : 0,
    weeks,
    weekChangePct,
    survey,
    control: modeAvg('control'),
    game: modeAvg('game'),
  };
}
