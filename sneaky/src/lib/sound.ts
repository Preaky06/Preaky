// Effets sonores synthétisés (aucun fichier audio à charger).

let ctx: AudioContext | null = null;
let muted = localStorage.getItem('taupe:muted') === '1';

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** À appeler sur un geste utilisateur pour débloquer l'audio sur iOS. */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
}

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  localStorage.setItem('taupe:muted', v ? '1' : '0');
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slide?: number } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
  const v = opts.vol ?? 0.15;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.2, at = 0, filter = 1200) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t0);
}

export const sfx = {
  tap: () => tone(660, 0.05, { type: 'triangle', vol: 0.08 }),
  tick: () => tone(1200, 0.04, { type: 'square', vol: 0.05 }),
  lock: () => {
    tone(420, 0.06, { type: 'square', vol: 0.08 });
    tone(840, 0.08, { type: 'triangle', vol: 0.08, at: 0.05 });
  },
  join: () => {
    tone(520, 0.08, { type: 'triangle', vol: 0.1 });
    tone(780, 0.12, { type: 'triangle', vol: 0.1, at: 0.08 });
  },
  success: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, at: i * 0.08 }));
  },
  fail: () => {
    tone(330, 0.25, { type: 'sawtooth', vol: 0.08, slide: 160 });
    tone(220, 0.35, { type: 'sawtooth', vol: 0.06, at: 0.18, slide: 110 });
  },
  scan: () => tone(300, 0.9, { type: 'sine', vol: 0.06, slide: 1400 }),
  reveal: () => {
    noise(0.15, 0.25, 0, 600);
    tone(110, 0.4, { type: 'sine', vol: 0.3 });
    tone(880, 0.3, { type: 'triangle', vol: 0.07, at: 0.05 });
  },
  mole: () => {
    tone(196, 0.5, { type: 'sawtooth', vol: 0.07 });
    tone(185, 0.6, { type: 'sawtooth', vol: 0.07, at: 0.25 });
    tone(98, 0.8, { type: 'sine', vol: 0.2, at: 0.1 });
  },
  siren: () => {
    for (let i = 0; i < 3; i++) {
      tone(650, 0.35, { type: 'sawtooth', vol: 0.06, at: i * 0.7, slide: 1250 });
      tone(1250, 0.35, { type: 'sawtooth', vol: 0.06, at: i * 0.7 + 0.35, slide: 650 });
    }
  },
  stamp: () => {
    noise(0.12, 0.35, 0, 900);
    tone(80, 0.25, { type: 'sine', vol: 0.35 });
  },
  drumroll: () => {
    for (let i = 0; i < 16; i++) noise(0.05, 0.06 + i * 0.006, i * 0.09, 500);
  },
  sabotage: () => {
    tone(1800, 0.06, { type: 'square', vol: 0.05 });
    tone(900, 0.06, { type: 'square', vol: 0.05, at: 0.07 });
    tone(450, 0.12, { type: 'square', vol: 0.05, at: 0.14 });
  },
  pop: () => tone(900, 0.06, { type: 'sine', vol: 0.08, slide: 1400 }),
};
