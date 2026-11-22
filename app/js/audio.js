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
  pop: (i = 0) => { tone(NOTES[i % NOTES.length] * (1 + Math.floor(i / NOTES.length)), { dur: 0.09, type: 'sine', vol: 0.07 }); noise({ dur: 0.05, vol: 0.05, freq: 3000 }); },
  slice: () => noise({ dur: 0.12, vol: 0.08, freq: 5000, sweep: 1200 }),
  whoosh: () => noise({ dur: 0.25, vol: 0.04, freq: 900, sweep: 2600 }),
  thud: () => tone(120, { dur: 0.09, type: 'triangle', vol: 0.08 }),
  boing: () => { tone(330, { dur: 0.12, type: 'square', vol: 0.03 }); tone(495, { dur: 0.12, type: 'square', vol: 0.03, at: 0.05 }); },
  plop: () => { tone(260, { dur: 0.08, vol: 0.08 }); tone(180, { dur: 0.12, vol: 0.07, at: 0.06 }); },
  splash: () => noise({ dur: 0.35, vol: 0.07, freq: 1500, sweep: 400 }),
  coin: () => { tone(988, { dur: 0.08, type: 'square', vol: 0.035 }); tone(1319, { dur: 0.18, type: 'square', vol: 0.035, at: 0.07 }); },
  levelup: () => [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, { dur: 0.18, at: i * 0.07, vol: 0.06, type: 'triangle' })),
  tug: () => { tone(150, { dur: 0.1, type: 'sawtooth', vol: 0.035 }); noise({ dur: 0.08, vol: 0.04, freq: 700 }); },
  bang: () => { noise({ dur: 0.3, vol: 0.12, freq: 1800, sweep: 200 }); tone(90, { dur: 0.25, type: 'triangle', vol: 0.09 }); },
};

// Bruit filtré (claquements, tranches, éclaboussures).
function noise({ dur = 0.1, vol = 0.05, freq = 2000, sweep = 0, at = 0 } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function buzz(pattern) {
  if (!hapticsOn || !canVibrate()) return;
  try { navigator.vibrate(pattern); } catch { /* refusé par le navigateur */ }
}
