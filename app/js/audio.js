// Sons synthétisés (aucun fichier à charger) + vibrations.
let ctx = null;
let soundOn = true;
let hapticsOn = true;

export function configureFeedback({ sound, haptics }) {
  soundOn = !!sound;
  hapticsOn = !!haptics;
}

function audio() {
  if (!soundOn) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export const unlockAudio = () => { audio(); };

function tone(freq, { dur = 0.12, type = 'sine', vol = 0.07, at = 0 } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// Gamme pentatonique : les notes successives restent agréables entre elles.
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

export const sfx = {
  tap: () => tone(760, { dur: 0.05, vol: 0.035 }),
  tick: (i = 0) => tone(NOTES[i % NOTES.length], { dur: 0.16, vol: 0.06, type: 'triangle' }),
  good: () => { tone(660, { dur: 0.1 }); tone(990, { dur: 0.16, at: 0.07 }); },
  bad: () => tone(196, { dur: 0.2, type: 'triangle', vol: 0.08 }),
  go: () => tone(880, { dur: 0.14, type: 'triangle' }),
  win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { dur: 0.22, at: i * 0.09, vol: 0.06 })),
};

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function buzz(pattern) {
  if (!hapticsOn || !canVibrate()) return;
  try { navigator.vibrate(pattern); } catch { /* refusé par le navigateur */ }
}
