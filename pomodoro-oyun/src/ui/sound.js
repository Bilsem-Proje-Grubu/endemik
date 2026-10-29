// Sesler Web Audio API ile kodla üretilir: telifsiz, dosya gerektirmez.
let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Her ses: [frekans, başlangıç(sn), süre(sn)] notaları
const SOUNDS = {
  start: [[523, 0, 0.12], [659, 0.1, 0.16]],
  done: [[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.35]],
  coin: [[988, 0, 0.07], [1319, 0.07, 0.25]],
  buy: [[440, 0, 0.1], [587, 0.1, 0.1], [880, 0.2, 0.25]],
  levelup: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.12], [1319, 0.48, 0.4]],
  warn: [[330, 0, 0.18], [262, 0.2, 0.25]],
  breakEnd: [[784, 0, 0.15], [659, 0.18, 0.2]],
  tap: [[600, 0, 0.04]],
};

/** Sesi çalar (ayar kapalıysa sessiz kalır). */
export function play(name) {
  if (!enabled) return;
  const notes = SOUNDS[name];
  const ac = audio();
  if (!notes || !ac) return;
  const t0 = ac.currentTime;
  for (const [freq, start, dur] of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.05);
  }
}

/** Titreşim (destekleyen cihazlarda, ayar açıksa). */
export function vibrate(pattern, on) {
  if (on && navigator.vibrate) navigator.vibrate(pattern);
}
