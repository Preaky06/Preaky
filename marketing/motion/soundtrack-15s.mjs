// Bande-son du motion design de 15 s : musique et bruitages synthétisés, sans échantillon externe (aucun droit à gérer).
// Les bruitages suivent les repères de timeline-15s.js, partagés avec l'animation.
// Usage : node marketing/motion/soundtrack-15s.mjs [sortie.wav]   → WAV 48 kHz stéréo 16 bits
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import("./timeline-15s.js"); // définit globalThis.EXPLISITE_TIMELINE
const TL = globalThis.EXPLISITE_TIMELINE;
const out = path.resolve(process.argv[2] || path.join(here, "explisite-15s.wav"));

const SR = 48000;
const DUR = TL.duration;
const N = Math.round(SR * DUR);
const dry = [new Float32Array(N), new Float32Array(N)];
const wet = [new Float32Array(N), new Float32Array(N)]; // envoi vers la réverbération
const BEAT = 60 / TL.bpm;

// --- outils ---
let seed = 12345;
const noise = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const TAU = Math.PI * 2;

// filtre à variables d'état (forme TPT), stable même quand la fréquence bouge à chaque échantillon
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, fc, q = 0.7) => {
    const g = Math.tan(Math.PI * clamp(fc, 20, SR * 0.45) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}

// ajoute un son : fn(i, tLocal) renvoie un échantillon mono ; pan de -1 à 1 (nombre ou fonction du temps)
function add(t0, dur, fn, { gain = 1, pan = 0, send = 0.15 } = {}) {
  const s0 = Math.max(0, Math.round(t0 * SR)), s1 = Math.min(N, Math.round((t0 + dur) * SR));
  for (let i = s0; i < s1; i++) {
    const lt = (i - Math.round(t0 * SR)) / SR;
    const v = fn(lt) * gain;
    const pn = typeof pan === "function" ? pan(lt) : pan;
    const l = Math.cos((pn + 1) * Math.PI / 4), r = Math.sin((pn + 1) * Math.PI / 4);
    dry[0][i] += v * l; dry[1][i] += v * r;
    wet[0][i] += v * l * send; wet[1][i] += v * r * send;
  }
}
const env = (lt, a, d) => (lt < a ? lt / a : Math.exp(-(lt - a) / d));
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const tri = (ph) => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5));

// --- instruments ---
function pad(t0, dur, notes, { gain = 0.05, cutoff = 1600, attack = 0.25, release = 0.6, send = 0.5 } = {}) {
  notes.forEach((m, ni) => {
    [-0.09, 0, 0.08].forEach((det, vi) => {
      const f = mtof(m + det), lp = svf(); let ph = Math.abs(noise());
      add(t0, dur + release * 2, (lt) => {
        ph += f / SR;
        const a = Math.min(1, lt / attack) * (lt > dur ? Math.exp(-(lt - dur) / (release / 3)) : 1);
        return lp(saw(ph), cutoff * (0.8 + 0.2 * Math.sin(lt * 1.3 + ni)), 0.6).lp * a;
      }, { gain, pan: (vi - 1) * 0.55, send });
    });
  });
}
function bell(t0, m, { gain = 0.12, decay = 1.4, pan = 0, send = 0.55 } = {}) {
  const f = mtof(m);
  add(t0, decay * 4, (lt) => {
    const e = env(lt, 0.002, decay);
    return (Math.sin(TAU * f * lt) + 0.42 * Math.sin(TAU * f * 2.76 * lt) * Math.exp(-lt * 3) + 0.2 * Math.sin(TAU * f * 5.4 * lt) * Math.exp(-lt * 6)) * e;
  }, { gain, pan, send });
}
function pluck(t0, m, { gain = 0.12, decay = 0.18, pan = 0, send = 0.25, bright = 3000 } = {}) {
  const f = mtof(m), lp = svf(); let ph = 0;
  add(t0, decay * 5, (lt) => { ph += f / SR; return lp(saw(ph) * 0.6 + tri(ph) * 0.4, bright * Math.exp(-lt * 8) + f * 1.5, 0.9).lp * env(lt, 0.003, decay); }, { gain, pan, send });
}
function kick(t0, gain = 0.5) {
  let ph = 0;
  add(t0, 0.45, (lt) => { const f = 45 + 110 * Math.exp(-lt * 28); ph += f / SR; return (Math.sin(TAU * ph) * env(lt, 0.002, 0.16) + (lt < 0.004 ? noise() * 0.4 : 0)); }, { gain, send: 0.02 });
}
function hat(t0, gain = 0.05, pan = 0.25) {
  const hp = svf();
  add(t0, 0.08, (lt) => hp(noise(), 8000, 0.8).hp * env(lt, 0.001, 0.018), { gain, pan, send: 0.08 });
}
function clap(t0, gain = 0.16) {
  const bp = svf();
  add(t0, 0.3, (lt) => {
    const burst = lt < 0.03 ? (Math.floor(lt / 0.009) % 2 ? 0.6 : 1) : 1;
    return bp(noise(), 1400, 1.1).bp * env(lt, 0.001, 0.07) * burst;
  }, { gain, pan: -0.1, send: 0.35 });
}
function bass(t0, m, len, gain = 0.2) {
  const f = mtof(m), lp = svf(); let ph = 0;
  add(t0, len + 0.05, (lt) => { ph += f / SR; const e = Math.min(1, lt / 0.005) * Math.exp(-lt / (len * 0.9)) * (lt > len ? Math.max(0, 1 - (lt - len) / 0.05) : 1);
    return (Math.sin(TAU * ph) * 0.8 + lp(saw(ph), 500, 0.8).lp * 0.5) * e; }, { gain, send: 0 });
}

// --- bruitages ---
function whoosh(t0, dur, { from = 300, to = 3000, gain = 0.22, panFrom = -0.6, panTo = 0.6, q = 1.2 } = {}) {
  const bp = svf();
  add(t0, dur, (lt) => {
    const x = lt / dur, e = Math.sin(Math.PI * Math.pow(x, 0.8)) ** 2;
    return bp(noise(), from * Math.pow(to / from, x), q).bp * e;
  }, { gain, pan: (lt) => panFrom + (panTo - panFrom) * (lt / dur), send: 0.3 });
}
function marker(t0, dur, gain = 0.1) {
  const bp = svf(), bp2 = svf();
  add(t0, dur + 0.05, (lt) => {
    const x = clamp(lt / dur, 0, 1), e = Math.sin(Math.PI * x) * (lt > dur ? 0 : 1);
    const f = 2200 + 1600 * x;
    const grain = 0.75 + 0.25 * Math.sin(TAU * 61 * lt);
    return (bp(noise(), f, 3).bp * 0.8 + bp2(noise(), f * 1.9, 5).bp * 0.4) * e * grain;
  }, { gain, pan: (lt) => -0.4 + 0.8 * (lt / dur), send: 0.15 });
}
function tick(t0, gain = 0.07) {
  const hp = svf(), pn = noise() * 0.8;
  add(t0, 0.05, (lt) => hp(noise(), 2500, 0.7).hp * env(lt, 0.0005, 0.006) + Math.sin(TAU * 1800 * lt) * env(lt, 0.0005, 0.004) * 0.3, { gain, pan: pn, send: 0.2 });
}
function thud(t0, gain = 0.32) {
  let ph = 0; const lp = svf();
  add(t0, 0.5, (lt) => { const f = 55 + 70 * Math.exp(-lt * 18); ph += f / SR; return Math.sin(TAU * ph) * env(lt, 0.002, 0.2) + lp(noise(), 600, 0.7).lp * env(lt, 0.001, 0.03); }, { gain, send: 0.12 });
}
function riser(t0, dur, gain = 0.12) {
  const bp = svf(); let ph = 0;
  add(t0, dur, (lt) => {
    const x = lt / dur, e = x * x;
    const f = 200 * Math.pow(12, x); ph += f / SR;
    return (bp(noise(), 400 * Math.pow(20, x), 1.5).bp * 0.8 + Math.sin(TAU * ph) * 0.25) * e;
  }, { gain, send: 0.35 });
}
function click(t0, gain = 0.18) {
  add(t0, 0.04, (lt) => (Math.sign(Math.sin(TAU * 2400 * lt)) * 0.5 + noise() * 0.5) * env(lt, 0.0003, 0.005), { gain, pan: 0.35, send: 0.1 });
}
function pop(t0, m, gain = 0.16, pan = 0) {
  let ph = 0; const f = mtof(m);
  add(t0, 0.25, (lt) => { const fr = f * (1 + 1.2 * Math.exp(-lt * 45)); ph += fr / SR; return Math.sin(TAU * ph) * env(lt, 0.001, 0.07); }, { gain, pan, send: 0.3 });
}
function drop(t0) {
  thud(t0, 0.3);
  const bp = svf();
  add(t0, 0.18, (lt) => bp(noise(), 1800, 0.8).bp * env(lt, 0.001, 0.035), { gain: 0.18, send: 0.2 });
}
function typing(t0, dur) {
  for (let t = t0; t < t0 + dur; t += 0.032 + Math.abs(noise()) * 0.02) tick(t, 0.035 + Math.abs(noise()) * 0.02);
}
function gauge(t0, dur) {
  let ph = 0;
  add(t0, dur, (lt) => {
    const x = lt / dur;
    const k = 1 - Math.exp(-6 * x) * Math.cos(3.2 * Math.PI * x);
    const f = 260 + 520 * k; ph += f / SR;
    return Math.sin(TAU * ph) * Math.sin(Math.PI * Math.min(1, x * 1.4)) * 0.6;
  }, { gain: 0.07, pan: 0.5, send: 0.3 });
}
function count(t0, dur) {
  let n = 0;
  for (let t = 0; t < dur; ) { const x = t / dur; tick(t0 + t, 0.05); pop(t0 + t, 84 + Math.floor(x * 7), 0.03, 0.4); n++; t += 0.03 + x * x * 0.09; }
}
function impact(t0) {
  kick(t0, 0.75);
  let ph = 0;
  add(t0, 2.5, (lt) => { ph += (36 + 30 * Math.exp(-lt * 6)) / SR; return Math.sin(TAU * ph) * env(lt, 0.003, 0.7); }, { gain: 0.35, send: 0.1 });
  const hp = svf();
  add(t0, 2.0, (lt) => hp(noise(), 6000, 0.6).hp * env(lt, 0.002, 0.35), { gain: 0.06, send: 0.25 });
}

// --- MUSIQUE ---
// 0 → 2 s : bourdon dissonant et murmure (le charabia) qui monte
{
  [40, 41, 47, 53].forEach((m, i) => {
    const f = mtof(m), lp = svf(); let ph = 0;
    add(0, 2.15, (lt) => { ph += f * (1 + 0.004 * Math.sin(lt * (5 + i))) / SR;
      const e = Math.min(1, lt / 0.6) * (lt > 1.95 ? Math.max(0, 1 - (lt - 1.95) / 0.2) : 1);
      return lp(saw(ph), 300 + lt * 500, 1.2).lp * e * (0.75 + 0.25 * Math.sin(TAU * 6 * lt)); }, { gain: 0.06, pan: (i - 1.5) * 0.35, send: 0.4 });
  });
  const bp = svf(), bp2 = svf();
  add(0, 2.05, (lt) => { const e = Math.min(1, lt / 0.4) * (lt > 1.9 ? Math.max(0, 1 - (lt - 1.9) / 0.15) : 1);
    const f1 = 500 + 300 * Math.sin(TAU * 3.1 * lt) + 200 * Math.sin(TAU * 7.3 * lt), f2 = 1400 + 500 * Math.sin(TAU * 4.7 * lt);
    return (bp(noise(), f1, 6).bp + bp2(noise(), f2, 8).bp * 0.6) * e * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 4.3 * lt))); }, { gain: 0.16, pan: (lt) => Math.sin(lt * 3) * 0.5, send: 0.3 });
}
// 2 s : la clarté — accord lumineux
pad(2.0, 1.0, [65, 69, 72, 76, 79], { gain: 0.03, cutoff: 3200, attack: 0.02, release: 1.2 });

// 3 → 13 s : groove à 120 BPM, accords d'une mesure sur deux
const CHORDS = [
  { t: 3, notes: [53, 57, 60, 64, 69], root: 41 }, // Fa maj7
  { t: 5, notes: [50, 57, 60, 64, 65], root: 38 }, // Ré m9
  { t: 7, notes: [46, 57, 62, 65, 69], root: 34 }, // Si♭ maj7
  { t: 9, notes: [48, 55, 60, 64, 69], root: 36 }, // Do 6
  { t: 11, notes: [53, 57, 60, 64, 67], root: 41 }, // Fa add9
];
CHORDS.forEach((c, i) => {
  const len = i === CHORDS.length - 1 ? 2.45 : 2;
  pad(c.t, len, c.notes.slice(1), { gain: 0.022, cutoff: 1500 + i * 250, attack: 0.15, release: 0.4 });
  for (let b = 0; b < len / (BEAT / 2) - 0.01; b++) {
    const t = c.t + b * BEAT / 2;
    if (t >= 13) break;
    bass(t, c.root + (b % 4 === 3 ? 12 : 0), BEAT / 2 * 0.85, b % 2 ? 0.11 : 0.16);
  }
});
for (let t = 3; t < 13 - 1e-6; t += BEAT) {
  kick(t, t < 5 ? 0.38 : 0.48);
  if (t >= 5) hat(t + BEAT / 2, 0.06, 0.3);
  if (t >= 7) hat(t + BEAT / 4, 0.025, -0.3), hat(t + BEAT * 0.75, 0.025, -0.3);
  const beatIndex = Math.round((t - 3) / BEAT);
  if (t >= 7 && beatIndex % 2 === 1) clap(t);
}
// arpège de progression pendant l'analyse (5 → 6,6 s) : il monte avec l'anneau
{
  const arp = [62, 65, 69, 72, 74, 77, 81, 84];
  for (let i = 0, t = 5.0; t < 6.6; i++, t += BEAT / 4) pluck(t, arp[i % arp.length] + (i >= 8 ? 0 : 0), { gain: 0.045, pan: i % 2 ? 0.4 : -0.4, decay: 0.12 });
}
// petite mélodie pendant le résultat
[[7.25, 72], [7.5, 76], [7.75, 79], [8.0, 81], [8.25, 79], [8.5, 76]].forEach(([t, m]) => pluck(t, m, { gain: 0.04, pan: 0.2, decay: 0.2 }));
// 13,5 s : signature — accord final qui résonne jusqu'à la fin
pad(13.5, 1.0, [53, 60, 65, 69, 72, 79], { gain: 0.03, cutoff: 2600, attack: 0.01, release: 1.4 });
bass(13.5, 29, 1.4, 0.22);
[[13.5, 77], [13.62, 81], [13.74, 84], [13.86, 88]].forEach(([t, m], i) => bell(t, m, { gain: 0.07, decay: 1.2, pan: -0.3 + i * 0.2 }));

// --- BRUITAGES (d'après la timeline) ---
for (const c of TL.sfx) {
  const { t } = c;
  switch (c.type) {
    case "tick": tick(t, 0.09); break;
    case "thud": thud(t); break;
    case "marker": marker(t, c.dur, 0.11); break;
    case "hl": marker(t, 0.16, 0.05); break;
    case "clarity": [77, 81, 84, 88].forEach((m, i) => bell(t + i * 0.035, m, { gain: 0.08, decay: 1.1, pan: -0.3 + i * 0.2 })); break;
    case "riser": riser(t, c.dur); break;
    case "whooshUp": whoosh(t - 0.15, 0.55, { from: 250, to: 4000, gain: 0.25 }); break;
    case "whooshDown": whoosh(t, 0.55, { from: 3000, to: 300, gain: 0.2, panFrom: 0.6, panTo: -0.1 }); break;
    case "whoosh": whoosh(t - 0.1, 0.45, { from: 400, to: 2600, gain: 0.18 }); break;
    case "whooshBig": whoosh(t - 0.1, 0.7, { from: 150, to: 5000, gain: 0.3, panFrom: -0.8, panTo: 0.8, q: 0.9 }); break;
    case "drop": drop(t); break;
    case "blip": pop(t, c.note, 0.1, 0.4); break;
    case "click": click(t); break;
    case "scanStart": {
      for (let k = 0; k < c.dur / 0.8 - 0.01; k++) whoosh(t + k * 0.8, 0.8, { from: 600, to: 3500, gain: 0.07, panFrom: -0.3, panTo: 0.3, q: 2 });
      break;
    }
    case "type": typing(t, c.dur); break;
    case "chime": bell(t, 84, { gain: 0.11 }); bell(t + 0.12, 89, { gain: 0.11 }); break;
    case "pop": pop(t, c.note, 0.16); break;
    case "gauge": gauge(t, c.dur); break;
    case "count": count(t, c.dur); break;
    case "check": click(t, 0.12); pluck(t, c.note, { gain: 0.08, decay: 0.25, bright: 5000 }); break;
    case "pass": whoosh(t, c.dur * 0.7, { from: 200, to: 900, gain: 0.12, panFrom: 0.9, panTo: -0.9, q: 0.8 }); whoosh(t + 0.3, c.dur * 0.7, { from: 300, to: 1200, gain: 0.1, panFrom: -0.9, panTo: 0.9, q: 0.8 }); break;
    case "impact": impact(t); break;
    case "sparkle": for (let k = 0; k < 9; k++) bell(t + k * 0.05, 91 + ((k * 5) % 12), { gain: 0.025, decay: 0.5, pan: Math.sin(k * 1.7) * 0.7 }); break;
  }
}

// --- réverbération (Schroeder) sur l'envoi ---
function reverb(input, offset) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ buf: new Float32Array(Math.round((d + offset) * SR / 44100)), i: 0, lp: 0 }));
  const aps = [556, 441, 341].map((d) => ({ buf: new Float32Array(Math.round((d + offset) * SR / 44100)), i: 0 }));
  const outB = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.12; let y = 0;
    for (const c of combs) { const o = c.buf[c.i]; c.lp = o * 0.7 + c.lp * 0.3; c.buf[c.i] = x + c.lp * 0.84; c.i = (c.i + 1) % c.buf.length; y += o; }
    for (const a of aps) { const o = a.buf[a.i]; const v = y + o * 0.5; a.buf[a.i] = v; a.i = (a.i + 1) % a.buf.length; y = o - v * 0.5; }
    outB[n] = y;
  }
  return outB;
}
const rv = [reverb(wet[0], 0), reverb(wet[1], 23)];

// --- mixage : réverb, compression douce, fondu final, normalisation ---
const mix = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let n = 0; n < N; n++) {
  const t = n / SR;
  const fade = t > DUR - 0.9 ? Math.max(0, (DUR - t) / 0.9) ** 1.5 : 1;
  const fin = Math.min(1, t / 0.03);
  for (let ch = 0; ch < 2; ch++) {
    const v = Math.tanh((dry[ch][n] + rv[ch][n] * 0.9) * 1.6) / 1.2;
    mix[ch][n] = v * fade * fin;
    peak = Math.max(peak, Math.abs(mix[ch][n]));
  }
}
const norm = Math.pow(10, -1 / 20) / peak;

const data = Buffer.alloc(44 + N * 4);
data.write("RIFF", 0); data.writeUInt32LE(36 + N * 4, 4); data.write("WAVE", 8);
data.write("fmt ", 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write("data", 36); data.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) for (let ch = 0; ch < 2; ch++) data.writeInt16LE(Math.round(clamp(mix[ch][n] * norm, -1, 1) * 32767), 44 + n * 4 + ch * 2);
writeFileSync(out, data);
console.log(`Bande-son écrite : ${path.relative(process.cwd(), out)} (${DUR} s, crête ${(20 * Math.log10(peak)).toFixed(1)} dB avant normalisation)`);
