/* CinéMood — motion design (41 s, 120 BPM : 1 temps = 0,5 s).
   Tout est dessiné en formes vectorielles (aucune capture) : l'horloge du temps perdu, les neuf
   humeurs, les cartes de questions, le tri des films, la carte de résultat, le temps gagné.
   Chaque plan se transforme en le suivant : l'horloge devient le O de CINÉMOOD, on plonge dans le
   second O, l'humeur choisie devient le premier point de progression, etc.
   Rendu à la définition native (1920×1080 ou 1080×1920) : les cotes sont en pixels. */
'use strict';

const DUR = 41;
const TAU = Math.PI * 2;

/* ---------- courbes ---------- */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (sx(t) < x) lo = t; else hi = t; }
    return sy(t);
  };
}
const EZ = {
  out: bezier(0.16, 1, 0.3, 1), inOut: bezier(0.76, 0, 0.24, 1), in: bezier(0.7, 0, 0.84, 0),
  soft: bezier(0.33, 1, 0.68, 1), anti: bezier(0.6, -0.28, 0.25, 1),
};
/* ressort amorti : 0 → 1 avec un léger dépassement (pop) */
function spr(dt, w = 15, z = 7.5) { return dt <= 0 ? 0 : 1 - Math.exp(-z * dt) * Math.cos(w * dt); }
/* impulsion triangulaire de largeur w */
function tri(d, w) { return d <= 0 || d >= w ? 0 : 1 - Math.abs((2 * d) / w - 1); }
function press(t, tp) { return tri(t - tp + 0.07, 0.22); }

/* ---------- palette ---------- */
const C = {
  blk: '#0c0709', face: '#170b10', red: '#ff2d4f', pink: '#ff8fa1', cream: '#f6eef0', ink: '#1a0b10', card: '#fffafb',
};
const ink = (a) => `rgba(26,11,16,${a})`;
const cream = (a) => `rgba(246,238,240,${a})`;
const redA = (a) => `rgba(255,45,79,${a})`;
const BGS = { blk: ['#1c0f14', '#070405'], cream: ['#fbf6f7', '#eadde1'], red: ['#ff4464', '#e2133a'] };
function bgFill(x, k) {
  const g = x.createRadialGradient(CX, CY * 0.92, 0, CX, CY, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, BGS[k][0]);
  g.addColorStop(1, BGS[k][1]);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
}
/* remplit une région (chemin courant, repère courant) avec le fond k, en coordonnées écran */
function fillRegion(x, k) {
  x.save();
  x.clip();
  x.setTransform(1, 0, 0, 1, 0, 0);
  bgFill(x, k);
  x.restore();
}

/* ---------- typographie ---------- */
/* une ligne (ou des morceaux de couleurs différentes) qui monte à t0 et repart vers le haut à t1 */
function tl(x, s, X, Y, size, t, t0, t1, o = {}) {
  if (t < t0) return 0;
  const q = t1 == null ? 0 : prog(t, t1, t1 + (o.outD || 0.34));
  if (q >= 1) return 0;
  const parts = typeof s === 'string' ? [[s, o.color || C.cream]] : s;
  const fo = Object.assign({ fam: 'Anton', asc: 1.12, desc: 0.3 }, o);
  const ws = parts.map((p) => textWidth(p[0], size, fo));
  const total = ws.reduce((a, b) => a + b, 0);
  let x0 = o.align === 'center' ? X - total / 2 : o.align === 'right' ? X - total : X;
  parts.forEach((p, i) => {
    const oo = Object.assign({}, fo, { align: 'left', color: p[1] || o.color || C.cream });
    if (q > 0) revealLine(x, p[0], x0, Y, size, 1 - q, Object.assign(oo, { ease: (v) => 1 - EZ.in(1 - v), dir: -1 }));
    else revealLine(x, p[0], x0, Y, size, (t - t0 - i * (o.stag || 0)) / (o.inD || 0.6), Object.assign(oo, { ease: o.ease || EZ.out }));
    x0 += ws[i];
  });
  return total;
}
function kick(x, s, X, Y, t, t0, t1, o = {}) {
  return tl(x, s, X, Y, o.size || 24, t, t0, t1, Object.assign({ fam: 'Archivo', wt: 700, track: 0.28, asc: 1.0, desc: 0.35, color: C.red, inD: 0.5 }, o));
}
function wrapText(s, size, maxW, o) {
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (textWidth(tt, size, o) > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
  lines.push(cur);
  return lines;
}
function para(x, s, X, Y, size, maxW, t, t0, t1, o = {}) {
  const fo = Object.assign({ fam: 'Archivo', wt: 500, color: cream(0.75), asc: 1.0, desc: 0.32 }, o);
  const lines = wrapText(s, size, maxW, fo), lh = size * (o.lh || 1.38);
  lines.forEach((l, i) => tl(x, l, X, Y + i * lh, size, t, t0 + i * 0.06, t1, fo));
  return lines.length * lh;
}
/* texte centré verticalement sur Y (hauteur des capitales) */
function textMid(x, s, X, Y, size, o = {}) {
  const asc = textAscent('H', size, o);
  return drawText(x, s, X, Y + asc / 2, size, o);
}

/* ---------- formes ---------- */
function rrc(x, cx, cy, w, h) { const r = Math.max(0, Math.min(w, h) / 2); x.roundRect(cx - w / 2, cy - h / 2, Math.max(0, w), Math.max(0, h), r); }
function rrp(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
function disc(x, cx, cy, r, col) { if (r <= 0) return; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fillStyle = col; x.fill(); }
const ang = (m) => -Math.PI / 2 + (m / 60) * TAU;
function sector(x, cx, cy, r, m0, m1) { x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, ang(m0), ang(m1), m1 < m0); x.closePath(); }
function heartPath(x, cx, cy, s) {
  x.beginPath();
  x.moveTo(cx, cy + s * 0.9);
  x.bezierCurveTo(cx - s * 1.7, cy - s * 0.15, cx - s * 0.65, cy - s * 1.35, cx, cy - s * 0.42);
  x.bezierCurveTo(cx + s * 0.65, cy - s * 1.35, cx + s * 1.7, cy - s * 0.15, cx, cy + s * 0.9);
  x.closePath();
}
function star(x, cx, cy, r, col) {
  if (r <= 0) return;
  x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fillStyle = col; x.fill();
}
function crescent(x, cx, cy, r, col) {
  if (r <= 0) return;
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
  x.beginPath(); x.rect(cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4); x.arc(cx + r * 0.48, cy - r * 0.3, r * 0.86, 0, TAU, true);
  x.fillStyle = col; x.fill();
  x.restore();
}
function playTri(x, cx, cy, s, col) {
  if (s <= 0) return;
  x.beginPath(); x.moveTo(cx - s * 0.42, cy - s * 0.56); x.lineTo(cx + s * 0.62, cy); x.lineTo(cx - s * 0.42, cy + s * 0.56); x.closePath();
  x.fillStyle = col; x.lineJoin = 'round'; x.lineWidth = s * 0.16; x.strokeStyle = col; x.fill(); x.stroke();
}
function check(x, cx, cy, s, p, col) { // coche tracée progressivement
  if (p <= 0) return;
  const pts = [[-0.5, 0], [-0.15, 0.36], [0.55, -0.4]];
  const l1 = Math.hypot(0.35, 0.36), l2 = Math.hypot(0.7, 0.76), L = (l1 + l2) * clamp(p);
  x.beginPath(); x.moveTo(cx + pts[0][0] * s, cy + pts[0][1] * s);
  if (L <= l1) { const u = L / l1; x.lineTo(cx + lerp(pts[0][0], pts[1][0], u) * s, cy + lerp(pts[0][1], pts[1][1], u) * s); }
  else { x.lineTo(cx + pts[1][0] * s, cy + pts[1][1] * s); const u = (L - l1) / l2; x.lineTo(cx + lerp(pts[1][0], pts[2][0], u) * s, cy + lerp(pts[1][1], pts[2][1], u) * s); }
  x.strokeStyle = col; x.lineWidth = s * 0.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke();
}
function cross(x, cx, cy, s, a, col) {
  if (a <= 0) return;
  x.save(); x.globalAlpha *= a; x.strokeStyle = col; x.lineWidth = s * 0.22; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx - s / 2, cy - s / 2); x.lineTo(cx + s / 2, cy + s / 2); x.moveTo(cx + s / 2, cy - s / 2); x.lineTo(cx - s / 2, cy + s / 2); x.stroke();
  x.restore();
}
/* doigt (appui sur écran tactile) et onde de l'appui */
function finger(x, px, py, a, pr, dark) {
  if (a <= 0) return;
  x.save(); x.globalAlpha *= clamp(a);
  const r = 31 * (1 - 0.2 * pr);
  x.beginPath(); x.arc(px, py, r, 0, TAU);
  x.fillStyle = dark ? 'rgba(26,11,16,0.2)' : 'rgba(255,255,255,0.32)'; x.fill();
  x.lineWidth = 3; x.strokeStyle = dark ? 'rgba(26,11,16,0.6)' : 'rgba(255,255,255,0.9)'; x.stroke();
  x.restore();
}
function ripple(x, px, py, age, dark) {
  if (age <= 0 || age > 0.5) return;
  const u = age / 0.5;
  x.save(); x.globalAlpha = (1 - u) * 0.75; x.lineWidth = 4 * (1 - u) + 1;
  x.strokeStyle = dark ? C.ink : '#fff';
  x.beginPath(); x.arc(px, py, 30 + 64 * EZ.out(u), 0, TAU); x.stroke();
  x.restore();
}

/* ---------- humeurs : un visage par humeur, en traits arrondis ---------- */
const MOODS = [['heureux', 'HEUREUX'], ['amoureux', 'AMOUREUX'], ['triste', 'TRISTE'], ['fatigue', 'FATIGUÉ'], ['enerve', 'ÉNERVÉ'],
  ['temeraire', 'TÉMÉRAIRE'], ['blase', 'BLASÉ'], ['curieux', 'CURIEUX'], ['reveur', 'RÊVEUR']];
function face(x, cx, cy, r, kind, o = {}) {
  const a = o.feat == null ? 1 : o.feat;
  if (a <= 0 || r <= 0) return;
  x.save();
  x.translate(cx, cy);
  if (o.rot) x.rotate(o.rot);
  x.scale(r, r);
  x.globalAlpha *= clamp(a);
  const col = o.line || C.cream;
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 0.075; x.lineCap = 'round'; x.lineJoin = 'round';
  const bl = clamp(o.blink || 0);
  const ln = (x0, y0, x1, y1) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
  const arc = (ax, ay, ar, a0, a1, fill) => { x.beginPath(); x.arc(ax, ay, ar, a0 * Math.PI, a1 * Math.PI); if (fill) x.fill(); else x.stroke(); };
  const eye = (ex, ey, er = 0.085) => {
    if (bl > 0.55) ln(ex - er * 1.2, ey, ex + er * 1.2, ey);
    else { x.beginPath(); x.ellipse(ex, ey, er, er * Math.max(0.15, 1 - bl * 1.5), 0, 0, TAU); x.fill(); }
  };
  const eyes = (y = -0.12, er) => { eye(-0.32, y, er); eye(0.32, y, er); };
  switch (kind) {
    case 'heureux': eyes(); arc(0, 0.02, 0.42, 0.22, 0.78); break;
    case 'amoureux':
      for (const s of [-1, 1]) { heartPath(x, s * 0.32, -0.12, 0.15); x.fillStyle = o.heart || C.pink; x.fill(); }
      x.fillStyle = col; arc(0, 0.1, 0.3, 0.2, 0.8); break;
    case 'triste':
      eyes(-0.08); ln(-0.5, -0.3, -0.2, -0.4); ln(0.5, -0.3, 0.2, -0.4); arc(0, 0.56, 0.28, 1.2, 1.8);
      x.beginPath(); x.moveTo(-0.34, 0.0); x.quadraticCurveTo(-0.24, 0.13, -0.34, 0.19); x.quadraticCurveTo(-0.44, 0.13, -0.34, 0.0);
      x.fillStyle = o.heart || C.pink; x.fill(); break;
    case 'fatigue':
      for (const s of [-1, 1]) { ln(s * 0.32 - 0.13, -0.12, s * 0.32 + 0.13, -0.12); arc(s * 0.32, -0.12, 0.13, 0.05, 0.95); }
      x.beginPath(); x.ellipse(0, 0.32, 0.085, 0.105, 0, 0, TAU); x.stroke();
      x.lineWidth = 0.055;
      for (const [zx, zy, zs] of [[0.6, -0.6, 0.1], [0.82, -0.84, 0.07]]) { x.beginPath(); x.moveTo(zx - zs, zy - zs); x.lineTo(zx + zs, zy - zs); x.lineTo(zx - zs, zy + zs); x.lineTo(zx + zs, zy + zs); x.stroke(); }
      break;
    case 'enerve': eyes(-0.06); ln(-0.52, -0.42, -0.16, -0.26); ln(0.52, -0.42, 0.16, -0.26); arc(0, 0.64, 0.32, 1.26, 1.74); break;
    case 'temeraire':
      eyes(-0.1); ln(-0.5, -0.37, -0.17, -0.3); ln(0.5, -0.37, 0.17, -0.3);
      x.beginPath(); x.moveTo(-0.34, 0.13); x.lineTo(0.34, 0.13); x.arc(0, 0.13, 0.34, 0, Math.PI); x.closePath(); x.fill(); break;
    case 'blase':
      for (const s of [-1, 1]) { arc(s * 0.32, -0.1, 0.1, 0, 1, true); ln(s * 0.32 - 0.15, -0.1, s * 0.32 + 0.15, -0.1); }
      ln(-0.2, 0.32, 0.22, 0.27); break;
    case 'curieux':
      eyes(-0.08); arc(-0.32, -0.27, 0.15, 1.15, 1.85); ln(0.18, -0.35, 0.47, -0.31);
      x.beginPath(); x.arc(0.06, 0.3, 0.085, 0, TAU); x.stroke(); break;
    case 'reveur': arc(-0.32, -0.16, 0.12, 0.1, 0.9); arc(0.32, -0.16, 0.12, 0.1, 0.9); arc(0, 0.08, 0.26, 0.22, 0.78); break;
  }
  x.restore();
}

/* ---------- horloge ---------- */
/* intérieur : cadran, secteurs (temps écoulé), graduations, aiguilles ; ri = rayon intérieur */
function clockInner(x, cx, cy, ri, o) {
  if (o.face) disc(x, cx, cy, ri, o.face);
  for (const p of o.pies || []) {
    if (p[1] - p[0] <= 0.001) continue;
    sector(x, cx, cy, ri * 0.9 * (o.pieK == null ? 1 : o.pieK), p[0], p[1]);
    x.fillStyle = p[2]; x.fill();
  }
  const tk = o.ticks == null ? 1 : o.ticks;
  x.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const v = clamp(tk * 12 - i);
    if (v <= 0) break;
    const a = (i / 12) * TAU - Math.PI / 2, major = i % 3 === 0;
    const r1 = ri * 0.86, r0 = r1 - ri * (major ? 0.15 : 0.08) * v;
    x.strokeStyle = cream(major ? 0.7 : 0.4); x.lineWidth = ri * (major ? 0.035 : 0.025);
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.stroke();
  }
  const hk = o.hands == null ? 1 : o.hands;
  if (hk > 0) {
    const m = o.m || 0, ha = ang(45 + m / 12), ma = ang(m);
    x.strokeStyle = o.handCol || C.cream;
    x.lineWidth = ri * 0.06;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ha) * ri * 0.46 * hk, cy + Math.sin(ha) * ri * 0.46 * hk); x.stroke();
    x.lineWidth = ri * 0.042;
    x.beginPath(); x.moveTo(cx - Math.cos(ma) * ri * 0.1 * hk, cy - Math.sin(ma) * ri * 0.1 * hk); x.lineTo(cx + Math.cos(ma) * ri * 0.76 * hk, cy + Math.sin(ma) * ri * 0.76 * hk); x.stroke();
    disc(x, cx, cy, ri * 0.065 * Math.min(1, hk * 1.5), C.red);
  }
}
function drawClock(x, cx, cy, R, rw, o) {
  if (R <= 0) return;
  const ri = Math.max(1, R - rw / 2);
  clockInner(x, cx, cy, ri, o);
  x.beginPath(); x.arc(cx, cy, R + rw / 2, 0, TAU); x.arc(cx, cy, ri, 0, TAU, true);
  x.fillStyle = o.ring || C.cream; x.fill();
}
const hhmm = (m) => `21:${String(Math.round(m)).padStart(2, '0')}`;

/* contour du O d'Anton (fraction de la taille, origine du glyphe, ligne de base) : la forme d'arrivée de l'horloge */
let GO = null;
function measureO() {
  const S = 400, c = mkCanvas(S * 1.2, S * 1.4), g = c.getContext('2d', { willReadFrequently: true });
  const ox = S * 0.1, by = S * 1.1;
  g.fillStyle = '#fff'; g.font = `400 ${S}px Anton`; g.textBaseline = 'alphabetic';
  g.fillText('O', ox, by);
  const d = g.getImageData(0, 0, c.width, c.height).data, cw = c.width, ch = c.height;
  const A = (X, Y) => d[(Y * cw + X) * 4 + 3];
  let l = cw, r = 0, tp = ch, b = 0;
  for (let Y = 0; Y < ch; Y++) for (let X = 0; X < cw; X++) if (A(X, Y) > 127) { if (X < l) l = X; if (X > r) r = X; if (Y < tp) tp = Y; if (Y > b) b = Y; }
  const my = Math.round((tp + b) / 2), mx = Math.round((l + r) / 2);
  let il = l; while (il < r && A(il, my) > 127) il++;
  let ir = r; while (ir > l && A(ir, my) > 127) ir--;
  let it = tp; while (it < b && A(mx, it) > 127) it++;
  let ib = b; while (ib > tp && A(mx, ib) > 127) ib--;
  const fx = (v) => (v - ox) / S, fy = (v) => (v - by) / S;
  GO = { ol: fx(l), or: fx(r + 1), ot: fy(tp), ob: fy(b + 1), il: fx(il), ir: fx(ir + 1), it: fy(it), ib: fy(ib + 1) };
}

/* ---------- affiches ---------- */
const SCH = [['#1d2a5c', '#ffcf6b'], ['#0f5e63', '#9fe3d0'], ['#5b3a8c', '#ffb3c7'], ['#f26a3d', '#2b0b14'], ['#14213d', '#ff5c77'],
  ['#2f7d4f', '#f6eef0'], ['#7a2850', '#ffd6a5'], ['#e9c46a', '#1a0b10'], ['#264653', '#e9c46a'], ['#9b2226', '#fcd5ce']];
function poster(x, X, Y, w, h, id) {
  const s = SCH[Math.floor(rnd(id * 1.37 + 0.5) * SCH.length)], m = Math.floor(rnd(id * 3.71 + 1.3) * 6);
  x.save();
  rrp(x, X, Y, w, h, w * 0.06); x.fillStyle = s[0]; x.fill(); x.clip();
  x.fillStyle = s[1]; x.strokeStyle = s[1];
  const cx = X + w / 2;
  if (m === 0) { x.beginPath(); x.arc(cx, Y + h * 0.4, w * 0.26, 0, TAU); x.fill(); }
  else if (m === 1) { x.beginPath(); x.moveTo(X - 2, Y + h * 0.66); x.lineTo(X + w * 0.36, Y + h * 0.3); x.lineTo(X + w * 0.62, Y + h * 0.52); x.lineTo(X + w * 0.8, Y + h * 0.38); x.lineTo(X + w + 2, Y + h * 0.6); x.lineTo(X + w + 2, Y + h * 0.7); x.lineTo(X - 2, Y + h * 0.7); x.fill(); }
  else if (m === 2) { x.globalAlpha = 0.85; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(X - w, Y + h * (0.1 + k * 0.16)); x.lineTo(X + w * 2, Y + h * (0.1 + k * 0.16) - w); x.lineWidth = h * 0.045; x.stroke(); } }
  else if (m === 3) { x.lineWidth = w * 0.04; for (let k = 1; k < 5; k++) { x.beginPath(); x.arc(cx, Y + h * 0.45, k * w * 0.09, 0, TAU); x.stroke(); } }
  else if (m === 4) crescent(x, cx, Y + h * 0.4, w * 0.25, s[1]);
  else { x.fillRect(X, Y + h * 0.45, w, h * 0.2); x.beginPath(); x.arc(cx, Y + h * 0.45, w * 0.16, Math.PI, TAU); x.fill(); }
  x.globalAlpha = 0.9; x.fillStyle = s[1];
  rrp(x, X + w * 0.12, Y + h * 0.77, w * 0.66, h * 0.05, h * 0.025); x.fill();
  rrp(x, X + w * 0.12, Y + h * 0.85, w * 0.42, h * 0.035, h * 0.018); x.fill();
  x.restore();
}
/* les cinq films du résultat (fictifs) */
const FILMS = [
  { t: ['L’ÉCHO', 'DES', 'ÉTOILES'], bg: ['#0c0f30', '#3b1c5f'], m: 96, by: 'INÈS CALVAR' },
  { t: ['LE', 'DERNIER', 'SIGNAL'], bg: ['#062326', '#10494c'], m: 94, by: 'TOMAS REYHL' },
  { t: ['CAP SUR', 'L’AURORE'], bg: ['#0f1434', '#2b2d6e'], m: 92, by: 'RAFAEL CUENCA' },
  { t: ['LES', 'CARTOGRAPHES'], bg: ['#08261a', '#15482f'], m: 92, by: 'HANA SEO' },
  { t: ['LA', 'SEPTIÈME', 'LUNE'], bg: ['#170b2c', '#3d1f66'], m: 91, by: 'KENJI ARIMA' },
];
function film(x, X, Y, w, h, k) {
  const F = FILMS[k];
  x.save();
  rrp(x, X, Y, w, h, w * 0.045); x.clip();
  const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, F.bg[0]); g.addColorStop(1, F.bg[1]);
  x.fillStyle = g; x.fillRect(X, Y, w, h);
  const cx = X + w / 2;
  if (k === 0) {
    for (let i = 0; i < 26; i++) disc(x, X + rnd(i * 3.1) * w, Y + rnd(i * 5.7) * h * 0.6, w * (0.004 + rnd(i * 1.3) * 0.006), cream(0.4 + 0.5 * rnd(i)));
    const pg = x.createRadialGradient(X + w * 0.48, Y + h * 0.3, 0, X + w * 0.56, Y + h * 0.36, w * 0.32);
    pg.addColorStop(0, '#ffe1e7'); pg.addColorStop(1, '#f08aa4');
    x.beginPath(); x.arc(X + w * 0.56, Y + h * 0.36, w * 0.31, 0, TAU); x.fillStyle = pg; x.fill();
    x.fillStyle = 'rgba(12,15,48,0.92)'; x.fillRect(X, Y + h * 0.5, w, h * 0.5);
    x.fillStyle = 'rgba(240,138,164,0.35)'; x.fillRect(X, Y + h * 0.5, w, h * 0.006);
  } else if (k === 1) {
    x.strokeStyle = '#7ee0c8'; x.lineWidth = w * 0.012;
    for (let i = 1; i <= 4; i++) { x.globalAlpha = 1 - i * 0.18; x.beginPath(); x.arc(cx, Y + h * 0.22, i * w * 0.1, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke(); }
    x.globalAlpha = 1; x.beginPath(); x.moveTo(cx, Y + h * 0.22); x.lineTo(cx, Y + h * 0.6); x.stroke(); disc(x, cx, Y + h * 0.22, w * 0.025, '#7ee0c8');
  } else if (k === 2) {
    for (let j = 0; j < 3; j++) {
      x.beginPath(); x.moveTo(X, Y + h * 0.6);
      for (let i = 0; i <= 20; i++) x.lineTo(X + (i / 20) * w, Y + h * (0.24 + j * 0.1) + Math.sin(i * 0.6 + j * 1.7) * h * 0.04);
      x.lineTo(X + w, Y + h * 0.6); x.closePath();
      x.fillStyle = ['rgba(110,231,200,0.35)', 'rgba(150,120,240,0.35)', 'rgba(255,143,161,0.3)'][j]; x.fill();
    }
  } else if (k === 3) {
    x.strokeStyle = 'rgba(160,240,190,0.25)'; x.lineWidth = Math.max(1, w * 0.006);
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(X + (i * w) / 8, Y); x.lineTo(X + (i * w) / 8, Y + h * 0.62); x.stroke(); }
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(X, Y + (i * h * 0.62) / 8); x.lineTo(X + w, Y + (i * h * 0.62) / 8); x.stroke(); }
    x.strokeStyle = '#c8f5d6'; x.lineWidth = w * 0.014;
    x.beginPath(); x.moveTo(X + w * 0.15, Y + h * 0.52); x.bezierCurveTo(X + w * 0.45, Y + h * 0.55, X + w * 0.5, Y + h * 0.2, X + w * 0.82, Y + h * 0.16); x.stroke();
    disc(x, X + w * 0.82, Y + h * 0.16, w * 0.03, '#c8f5d6');
  } else {
    for (let i = 0; i < 5; i++) disc(x, X + w * (0.22 + i * 0.15), Y + h * (0.5 - i * 0.07), w * (0.06 + i * 0.03), `rgba(201,167,245,${0.35 + i * 0.13})`);
  }
  // titre
  const fs = Math.min(h * 0.15, ...F.t.map((l) => fitSize(l, w * 0.84, 999, { fam: 'Anton' })));
  F.t.forEach((l, i) => drawText(x, l, X + w * 0.08, Y + h * 0.93 - (F.t.length - 1 - i) * fs * 0.98, fs, { fam: 'Anton', color: C.cream }));
  if (w >= 140) drawText(x, 'UN FILM DE ' + F.by, X + w * 0.08, Y + h * 0.075, w * 0.034, { fam: 'Archivo', wt: 700, track: 0.12, color: cream(0.7) });
  x.restore();
}

/* =====================================================================
   A. Le problème (0–5 s) : un catalogue qui défile, l'horloge tourne, 30 min plus tard, rien.
   ===================================================================== */
function layA() {
  return PORT ? { cx: CX, cy: 690, R: 270, rw: 18, tx: CX, al: 'center', y1: 1290, y2: 1315, s1: 116, s2: 210 }
    : { cx: 560, cy: 520, R: 280, rw: 18, tx: 980, al: 'left', y1: 500, y2: 420, s1: 124, s2: 220 };
}
function scrollA(t) { return 240 * t + 2600 * Math.pow(prog(t, 0.4, 3.6), 2.6); }
function minA(t) { return t < 4.3 ? 30 * EZ.inOut(prog(t, 0.9, 2.75)) : lerp(30, 1, EZ.inOut(prog(t, 4.3, 4.95))); }
function catalog(x, t) {
  const a = EZ.out(prog(t, 0.1, 0.9));
  if (a <= 0) return;
  const pw = 150, ph = 225, step = pw + 30, rows = PORT ? 7 : 4, rowH = ph + 36;
  const y0 = CY - ((rows - 1) * rowH) / 2;
  let sc = scrollA(Math.min(t, 3.55));
  if (t > 3.55) sc += (2350 * (1 - Math.exp(-(t - 3.55) * 3))) / 3;
  x.save(); x.globalAlpha = 0.42 * a;
  for (let r = 0; r < rows; r++) {
    const dir = r % 2 ? -1 : 1, yc = y0 + r * rowH;
    const off = rnd(r * 13.1 + 2) * step * 7 + dir * sc * (0.8 + 0.4 * rnd(r * 3.3 + 1));
    const q = off / step, fl = Math.floor(q), fr = q - fl, n = Math.ceil(W / step) + 2;
    for (let k = -1; k < n; k++) {
      const id = r * 1000 + ((((k - fl) % 997) + 997) % 997);
      let px = (k - 1 + fr) * step, py = yc - ph / 2, rot = 0;
      if (t > 3.45) {
        const d = t - 3.45 - rnd(id * 1.7) * 0.4;
        if (d > 0) { py += 0.5 * 4200 * d * d; rot = (rnd(id * 2.3) - 0.5) * d * 5; px += (rnd(id * 4.1) - 0.5) * 300 * d; }
      }
      if (py > H + 60) continue;
      x.save(); x.translate(px + pw / 2, py + ph / 2); x.rotate(rot); poster(x, -pw / 2, -ph / 2, pw, ph, id); x.restore();
    }
  }
  x.restore();
}
function sA(x, t) {
  bgFill(x, 'blk');
  const L = layA();
  catalog(x, t);
  // voile sous le texte
  const g = PORT ? x.createLinearGradient(0, 1040, 0, 1210) : x.createLinearGradient(830, 0, 1010, 0);
  g.addColorStop(0, 'rgba(10,5,7,0)'); g.addColorStop(1, 'rgba(10,5,7,0.9)');
  x.fillStyle = g;
  if (PORT) x.fillRect(0, 1040, W, H - 1040); else x.fillRect(830, 0, W - 830, H);
  // halo sombre autour de l'horloge (l'heure se lit sur le catalogue)
  const hg = x.createRadialGradient(L.cx, L.cy + 40, L.R * 0.6, L.cx, L.cy + 40, L.R * 1.75);
  hg.addColorStop(0, 'rgba(10,5,7,0.85)'); hg.addColorStop(1, 'rgba(10,5,7,0)');
  x.fillStyle = hg; x.fillRect(L.cx - L.R * 2, L.cy - L.R * 2, L.R * 4, L.R * 4.2);
  // horloge
  const s = spr(t - 0.08, 13, 7), m = minA(t);
  drawClock(x, L.cx, L.cy, L.R * s, L.rw * Math.min(1, s), { m, ticks: prog(t, 0.4, 0.9), hands: EZ.out(prog(t, 0.55, 1.0)), pies: [[0, m, C.red]], face: C.face, ring: C.cream });
  tl(x, hhmm(m), L.cx, L.cy + L.R + 92, 46, t, 0.7, null, { fam: 'Archivo', wt: 700, track: 0.12, align: 'center', color: cream(0.72) });
  // texte
  const o = { align: L.al };
  tl(x, 'ON REGARDE QUOI', L.tx, L.y1, L.s1, t, 0.45, 2.2, o);
  tl(x, 'CE SOIR ?', L.tx, L.y1 + L.s1 * 1.06, L.s1, t, 0.55, 2.25, o);
  tl(x, [['30 MIN', C.red]], L.tx, L.y2, L.s2, t, 2.35, 4.2, o);
  tl(x, 'PLUS TARD…', L.tx, L.y2 + L.s1 * 1.12, L.s1, t, 2.5, 4.25, o);
  tl(x, 'TOUJOURS RIEN.', L.tx, L.y2 + L.s1 * 2.22, L.s1, t, 3.05, 4.3, o);
}

/* =====================================================================
   B. La promesse (5–8,75 s) : « 1 minute ? », l'horloge devient le O de CINÉMOOD,
   le second O cligne de l'œil et on plonge dedans.
   ===================================================================== */
function layW() {
  const size = PORT ? 196 : 250, base = PORT ? CY + 30 : CY + 40;
  const L = layoutChars('CINÉMOOD', size, { fam: 'Anton' });
  const x0 = CX - L.w / 2;
  const oRect = (i) => {
    const gx = x0 + L.chars[i].x;
    return {
      cx: gx + ((GO.ol + GO.or) / 2) * size, cy: base + ((GO.ot + GO.ob) / 2) * size, ow: (GO.or - GO.ol) * size, oh: (GO.ob - GO.ot) * size,
      icx: gx + ((GO.il + GO.ir) / 2) * size, icy: base + ((GO.it + GO.ib) / 2) * size, iw: (GO.ir - GO.il) * size, ih: (GO.ib - GO.it) * size,
    };
  };
  return { size, base, L, x0, o1: oRect(5), o2: oRect(6) };
}
function sB(x, t) {
  bgFill(x, 'blk');
  const LA = layA(), WM = layW(), o2 = WM.o2;
  const zu = prog(t, 8.15, 8.75);
  x.save();
  if (zu > 0) {
    const kEnd = 1.25 * Math.max(W / o2.iw, H / Math.max(8, o2.ih - o2.iw));
    const k = Math.exp(Math.log(kEnd) * EZ.in(zu)), f = EZ.inOut(zu);
    x.translate(lerp(o2.icx, CX, f), lerp(o2.icy, CY, f)); x.scale(k, k); x.translate(-o2.icx, -o2.icy);
  }
  const o = { align: LA.al };
  tl(x, 'ET SI ÇA PRENAIT', LA.tx, LA.y1, LA.s1, t, 5.0, 6.22, o);
  tl(x, [['1 MINUTE ?', C.red]], LA.tx, LA.y1 + LA.s1 * 1.14, LA.s1 * 1.1, t, 5.12, 6.28, o);
  // l'horloge se transforme en O
  const e = EZ.anti(prog(t, 6.35, 6.95));
  if (e < 1) {
    const R = LA.R, rw = LA.rw;
    const from = { cx: LA.cx, cy: LA.cy, ow: 2 * R + rw, oh: 2 * R + rw, icx: LA.cx, icy: LA.cy, iw: 2 * R - rw, ih: 2 * R - rw };
    const g = {};
    for (const k in from) g[k] = lerp(from[k], WM.o1[k], e);
    const ia = 1 - prog(e, 0.05, 0.6);
    if (ia > 0) {
      x.save();
      x.beginPath(); rrc(x, g.icx, g.icy, g.iw, g.ih); x.clip();
      x.globalAlpha = ia;
      x.beginPath(); rrc(x, g.icx, g.icy, g.iw, g.ih); x.fillStyle = C.face; x.fill();
      const ri = Math.min(g.iw, g.ih) / 2;
      const pulse = 0.75 + 0.25 * Math.cos((t - 5.0) * TAU * 2);
      clockInner(x, g.icx, g.icy, ri, { m: 1, pies: [[0, 1, redA(t < 6.35 ? pulse : 1)]] });
      x.restore();
    }
    x.beginPath(); rrc(x, g.cx, g.cy, g.ow, g.oh); rrc(x, g.icx, g.icy, g.iw, g.ih);
    x.fillStyle = rgba(mixc(INK, RED, EZ.inOut(prog(e, 0.15, 0.85))), 1); x.fill('evenodd');
    if (t < 6.35) tl(x, hhmm(1), LA.cx, LA.cy + LA.R + 92, 46, t, -1, 6.1, { fam: 'Archivo', wt: 700, track: 0.12, align: 'center', color: cream(0.72) });
  }
  // CINÉMOOD
  WM.L.chars.forEach((c, i) => {
    if (i === 5 && e < 1) return;
    const st = 6.72 + Math.abs(i - 5) * 0.035;
    revealLine(x, c.ch, WM.x0 + c.x, WM.base, WM.size, i === 5 ? 1 : (t - st) / 0.5, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 });
  });
  kick(x, 'CINEM00D.COM', CX, WM.base - textAscent('É', WM.size, { fam: 'Anton' }) - (PORT ? 34 : 40), t, 7.5, null, { align: 'center', color: cream(0.55), size: PORT ? 22 : 24 });
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['CINÉMA.', C.red]], CX, WM.base + (PORT ? 112 : 126), PORT ? 54 : 62, t, 7.3, null, { align: 'center' });
  // le creux du second O s'allume, puis on plonge dedans
  const fu = EZ.out(prog(t, 7.9, 8.15));
  if (fu > 0) {
    x.save();
    x.beginPath(); rrc(x, o2.icx, o2.icy, o2.iw, o2.ih); x.clip();
    x.beginPath(); x.arc(o2.icx, o2.icy, fu * o2.ih * 0.6, 0, TAU);
    fillRegion(x, 'cream');
    x.restore();
  }
  x.restore();
}

/* =====================================================================
   C. Étape 1 (8,75–12,9 s) : les neuf humeurs ; on choisit « Rêveur ».
   ===================================================================== */
function layC() {
  return PORT ? { tx: CX, al: 'center', ky: 300, t1: 420, ts: 100, sy: 600, gx: 540, gy: 1175, dx: 300, dy: 312, r: 94, ls: 26, hx: 540, hy: 1120, hr: 230, hl: 120, hs: 84 }
    : { tx: 150, al: 'left', ky: 380, t1: 500, ts: 104, sy: 690, gx: 1350, gy: 515, dx: 232, dy: 238, r: 76, ls: 22, hx: 1350, hy: 480, hr: 190, hl: 102, hs: 72 };
}
function moodPos(L, i) { const col = i % 3, row = (i / 3) | 0; return [L.gx + (col - 1) * L.dx, L.gy + (row - 1) * L.dy, col, row]; }
function sC(x, t) {
  bgFill(x, 'cream');
  const L = layC();
  const o = { align: L.al, color: C.ink };
  kick(x, 'ÉTAPE 1 · TON HUMEUR', L.tx, L.ky, t, 8.85, 12.15, { align: L.al });
  tl(x, 'COMMENT TU TE', L.tx, L.t1, L.ts, t, 8.9, 12.2, o);
  tl(x, 'SENS CE SOIR ?', L.tx, L.t1 + L.ts * 1.06, L.ts, t, 8.98, 12.25, o);
  para(x, 'Neuf humeurs, une seule à choisir.', L.tx, L.sy, 34, 760, t, 9.15, 12.25, { align: L.al, wt: 600, color: ink(0.6) });
  const [sx0, sy0] = moodPos(L, 8);
  const tapX = sx0 + L.r * 0.18, tapY = sy0 + L.r * 0.22;
  const hero = EZ.inOut(prog(t, 10.75, 11.4));
  MOODS.forEach(([k, name], i) => {
    let [px, py, col, row] = moodPos(L, i);
    const t0 = 8.95 + (row + col) * 0.07 + i * 0.012;
    let s = spr(t - t0, 14, 7);
    if (s <= 0) return;
    const sel = i === 8;
    if (!sel) { const d = Math.hypot(col - 2, row - 2); s *= 1 - EZ.in(prog(t, 10.6 + d * 0.05, 10.95 + d * 0.05)); if (s <= 0.002) return; }
    const rot = (1 - Math.min(1, s)) * -0.5;
    py += Math.sin((t + i * 0.7) * 2.4) * 4 * (1 - prog(t, 10.6, 10.9));
    let r = L.r;
    if (sel) { px = lerp(px, L.hx, hero); py = lerp(py, L.hy, hero); r = lerp(r, L.hr, hero); }
    const R = r * s * (1 - (sel ? press(t, 10.3) : 0) * 0.08);
    x.save();
    x.shadowColor = 'rgba(90,20,40,0.22)'; x.shadowBlur = R * 0.35; x.shadowOffsetY = R * 0.14;
    disc(x, px, py, R, C.ink);
    x.restore();
    if (sel && t > 10.3) {
      x.save(); x.beginPath(); x.arc(px, py, R, 0, TAU); x.clip();
      disc(x, tapX + (px - sx0), tapY + (py - sy0), EZ.out(prog(t, 10.3, 10.62)) * R * 2.3, C.red);
      x.restore();
    }
    const blink = tri(t - (9.9 + rnd(i * 4.3) * 1.6), 0.16) + (sel ? tri(t - 11.75, 0.16) : 0);
    face(x, px, py, R, k, { line: C.cream, blink, rot, feat: sel ? 1 - prog(t, 12.28, 12.48) : 1 });
    const la = clamp((t - t0 - 0.1) / 0.3) * clamp(s) * (sel ? 1 - prog(t, 10.7, 10.9) : 1);
    if (la > 0) drawText(x, name, px, py + R + L.ls * 1.75, L.ls, { fam: 'Archivo', wt: 700, track: 0.14, align: 'center', color: ink(0.72 * la) });
  });
  // le choix grandi : Rêveur, la tête ailleurs
  tl(x, 'RÊVEUR', L.hx, L.hy + L.hr + L.hl, L.hs, t, 11.2, 12.2, { align: 'center', color: C.ink });
  para(x, 'la tête ailleurs', L.hx, L.hy + L.hr + L.hl + (PORT ? 56 : 50), 32, 600, t, 11.3, 12.2, { align: 'center', wt: 600, color: ink(0.55) });
  const ha = prog(t, 11.15, 11.55) * (1 - prog(t, 12.2, 12.4));
  if (ha > 0) {
    for (let j = 0; j < 4; j++) {
      const a = t * 0.55 + (j * TAU) / 4 - 0.6, rr = L.hr * 1.3;
      const sx = L.hx + Math.cos(a) * rr, sy = L.hy + Math.sin(a) * rr * 0.92;
      if (j === 0) crescent(x, sx, sy, 30 * ha, C.red);
      else star(x, sx, sy, (13 + 5 * Math.sin(t * 7 + j)) * ha, j === 2 ? C.red : C.ink);
    }
  }
  // doigt
  const fa = prog(t, 9.7, 9.95) * (1 - prog(t, 10.55, 10.8)), fp = EZ.inOut(prog(t, 9.7, 10.26));
  finger(x, lerp(PORT ? W * 0.85 : W + 40, tapX, fp), lerp(H + 60, tapY, fp) - Math.sin(fp * Math.PI) * 60, fa, press(t, 10.3), true);
  ripple(x, tapX, tapY, t - 10.3, true);
  // le rouge du choix envahit l'écran ; il reste un point
  const iu = EZ.in(prog(t, 12.4, 12.9));
  if (iu > 0) {
    const far = Math.hypot(Math.max(L.hx, W - L.hx), Math.max(L.hy, H - L.hy)) * 1.03;
    x.beginPath(); x.arc(L.hx, L.hy, lerp(L.hr, far, iu), 0, TAU); fillRegion(x, 'red');
  }
  disc(x, L.hx, L.hy, 13 * spr(t - 12.42, 14, 7), C.cream);
}

/* =====================================================================
   D. Étape 2 (12,9–19,2 s) : sept questions en cartes, une réponse par temps.
   ===================================================================== */
const QS = [
  { k: 'TON ÉVASION', q: 'Tu as envie de partir où ?', o: ['Dans un monde magique', 'Dans l’espace', 'Dans le futur', 'Dans un dessin animé'], s: 1, a: 13.3, tp: 13.9 },
  { k: 'PLUS PRÉCISÉMENT', q: 'Quel ailleurs ?', o: ['L’espace', 'Un futur sombre', 'Une idée vertigineuse', 'La SF pure'], s: 0, a: 14.3, tp: 14.8 },
  { k: 'TON SEUIL', q: 'Tu te sens prêt à être secoué comment ?', o: ['Pas du tout', 'Un peu', 'Beaucoup', 'À fond'], s: 1, a: 15.12, tp: 15.56 },
  { k: 'TON PUBLIC', q: 'Tu regardes avec qui ?', o: ['Seul', 'À deux', 'Entre amis', 'En famille'], s: 1, a: 15.86, tp: 16.24 },
  { k: 'TON TEMPS', q: 'Tu as combien de temps devant toi ?', o: ['Moins de 1h25', '1h25 – 1h45', '1h45 – 2h10', '2h10 – 2h40'], s: 2, a: 16.5, tp: 16.84 },
  { k: 'TON ÉPOQUE', q: 'Tu as envie d’un film de quelle époque ?', o: ['Très récent', 'Les années 2010', 'Années 80 – 90', 'Peu importe'], s: 3, a: 17.08, tp: 17.38 },
  { k: 'DERNIÈRE QUESTION', q: 'Tu préfères un film connu, ou une découverte ?', o: ['Un film très connu', 'Un film culte', 'Une découverte', 'Peu importe'], s: 3, a: 17.6, tp: 17.9 },
];
QS.forEach((q, i) => { q.b = i + 1 < QS.length ? QS[i + 1].a : 18.12; });
function layD() {
  return PORT ? { tx: CX, al: 'center', ky: 300, ty: 412, ts: 94, sy: 482, cx: 540, cy: 1040, cw: 880, ch: 690, dy: 188, sw: [CX - 190, 1630], swl: CX - 110, qs: 58, ph: 78, ps: 30, pad: 58 }
    : { tx: 150, al: 'left', ky: 380, ty: 505, ts: 116, sy: 700, cx: 1300, cy: 600, cw: 780, ch: 600, dy: 196, sw: [212, 862], swl: 296, qs: 54, ph: 72, ps: 29, pad: 56 };
}
/* géométrie des réponses d'une carte (repère de la carte, centre = 0,0) */
function cardGeom(L, q) {
  const qlines = wrapText(q.q, L.qs, L.cw - 2 * L.pad, { fam: 'Anton' });
  const qy = -L.ch / 2 + L.pad + 34 + L.qs * 1.05;
  const py0 = qy + (qlines.length - 1) * L.qs * 1.06 + L.qs * 0.62;
  const gap = PORT ? 18 : 14;
  return { qlines, qy, pills: q.o.map((_, i) => ({ x: -L.cw / 2 + L.pad, y: py0 + i * (L.ph + gap), w: L.cw - 2 * L.pad, h: L.ph })) };
}
function qcard(x, L, q, cx, cy, rot, a, t) {
  if (a <= 0) return;
  const G = cardGeom(L, q);
  x.save();
  x.translate(cx, cy); x.rotate(rot); x.globalAlpha *= a;
  x.save(); x.shadowColor = 'rgba(110,0,24,0.35)'; x.shadowBlur = 50; x.shadowOffsetY = 24;
  rrp(x, -L.cw / 2, -L.ch / 2, L.cw, L.ch, 34); x.fillStyle = C.card; x.fill(); x.restore();
  drawText(x, q.k, -L.cw / 2 + L.pad, -L.ch / 2 + L.pad + 14, PORT ? 22 : 20, { fam: 'Archivo', wt: 700, track: 0.26, color: C.red });
  G.qlines.forEach((l, i) => drawText(x, l, -L.cw / 2 + L.pad, G.qy + i * L.qs * 1.06, L.qs, { fam: 'Anton', color: C.ink }));
  const dt = t - q.tp;
  G.pills.forEach((p, i) => {
    const sel = i === q.s && dt > 0;
    rrp(x, p.x, p.y, p.w, p.h, p.h / 2); x.lineWidth = 2.5; x.strokeStyle = ink(0.16); x.stroke();
    drawText(x, q.o[i], p.x + 30, p.y + p.h / 2 + L.ps * 0.36, L.ps, { fam: 'Archivo', wt: 600, color: C.ink });
    if (sel) {
      const fx = p.x + p.w * 0.3, fy = p.y + p.h / 2;
      x.save(); rrp(x, p.x, p.y, p.w, p.h, p.h / 2); x.clip();
      x.beginPath(); x.arc(fx, fy, EZ.out(clamp(dt / 0.28)) * p.w * 0.85, 0, TAU); x.clip();
      x.fillStyle = C.red; x.fillRect(p.x, p.y, p.w, p.h);
      drawText(x, q.o[i], p.x + 30, p.y + p.h / 2 + L.ps * 0.36, L.ps, { fam: 'Archivo', wt: 600, color: C.cream });
      x.restore();
      check(x, p.x + p.w - p.h * 0.55, p.y + p.h / 2, p.h * 0.34, (dt - 0.1) / 0.2, C.cream);
    }
  });
  x.restore();
}
function tapPoint(L, q) { const p = cardGeom(L, q).pills[q.s]; return [L.cx + p.x + p.w * 0.3, L.cy + p.y + p.h / 2]; }
function dotPos(L, k) { return [L.cx + (k - 3.5) * 46, L.dy]; }
function dotTime(k) { return k === 0 ? 13.12 : QS[k - 1].tp + 0.04; }
function sD(x, t) {
  bgFill(x, 'red');
  const L = layD(), LC = layC();
  // texte
  const o = { align: L.al };
  kick(x, 'ÉTAPE 2 · TON MOMENT', L.tx, L.ky, t, 13.0, 18.0, { align: L.al, color: cream(0.85) });
  if (PORT) tl(x, [['7 QUESTIONS ', C.cream], ['RAPIDES.', C.ink]], L.tx, L.ty, L.ts, t, 13.05, 18.0, o);
  else { tl(x, '7 QUESTIONS', L.tx, L.ty, L.ts, t, 13.05, 18.0, o); tl(x, [['RAPIDES.', C.ink]], L.tx, L.ty + L.ts * 1.0, L.ts, t, 13.12, 18.05, o); }
  para(x, 'Elles s’adaptent à ton humeur.', L.tx, L.sy, PORT ? 32 : 32, 700, t, 13.25, 18.0, { align: L.al, wt: 600, color: cream(0.85) });
  if (PORT) tl(x, [['8 RÉPONSES. ', C.cream], ['C’EST TOUT.', C.ink]], L.tx, L.ty + 30, 86, t, 18.2, null, o);
  else { tl(x, '8 RÉPONSES.', L.tx, L.ty, L.ts, t, 18.2, null, o); tl(x, [['C’EST TOUT.', C.ink]], L.tx, L.ty + L.ts, L.ts, t, 18.28, null, o); }
  // chrono
  const ss = spr(t - 13.2, 13, 7) * (1 - EZ.in(prog(t, 18.3, 18.55)));
  if (ss > 0) {
    const [scx, scy] = L.sw, r = 56 * ss, el = 48 * prog(t, 13.2, 18.0);
    x.lineCap = 'round';
    x.lineWidth = 8; x.strokeStyle = cream(0.28); x.beginPath(); x.arc(scx, scy, r, 0, TAU); x.stroke();
    x.strokeStyle = C.cream; x.beginPath(); x.arc(scx, scy, r, -Math.PI / 2, -Math.PI / 2 + (el / 60) * TAU); x.stroke();
    x.fillStyle = C.cream; rrp(x, scx - 9 * ss, scy - r - 20 * ss, 18 * ss, 12 * ss, 3); x.fill();
    textMid(x, `0:${String(Math.floor(el)).padStart(2, '0')}`, scx, scy, 36 * ss, { fam: 'Anton', align: 'center', color: C.cream });
  }
  kick(x, 'MOINS D’UNE MINUTE', L.swl, L.sw[1] + 9, t, 13.35, 18.3, { color: cream(0.9), size: 22 });
  // paquet de cartes
  const gk = spr(t - 13.3, 12, 7) * (1 - EZ.in(prog(t, 18.1, 18.35)));
  if (gk > 0) {
    for (const [dy, sc, al] of [[52, 0.9, 0.28], [26, 0.95, 0.5]]) {
      x.save(); x.translate(L.cx, L.cy + dy * gk); x.scale(sc * gk, sc * gk); x.globalAlpha = al;
      rrp(x, -L.cw / 2, -L.ch / 2, L.cw, L.ch, 34); x.fillStyle = C.card; x.fill(); x.restore();
    }
  }
  QS.forEach((q) => {
    if (t < q.a || t > q.b + 0.34) return;
    const u = EZ.out(prog(t, q.a, q.a + 0.42)), v = EZ.in(prog(t, q.b, q.b + 0.32));
    const cy = L.cy + (1 - u) * (PORT ? 1150 : 800) - v * (PORT ? 150 : 1050);
    if (PORT && v > 0) { x.save(); x.translate(L.cx, L.cy); x.scale(1 - 0.16 * v, 1 - 0.16 * v); x.translate(-L.cx, -L.cy); }
    qcard(x, L, q, L.cx + (1 - u) * 60 - v * 40, cy, (1 - u) * 0.07 - v * (PORT ? 0.03 : 0.09), 1 - prog(v, PORT ? 0.2 : 0.65, 1), t);
    if (PORT && v > 0) x.restore();
  });
  // doigt : d'une réponse à la suivante
  const fa = prog(t, 13.55, 13.75) * (1 - prog(t, 17.98, 18.2));
  if (fa > 0) {
    let fx, fy;
    const k = QS.findIndex((q) => t < q.tp + 0.08);
    if (k === 0) { const [tx, ty] = tapPoint(L, QS[0]); const u = EZ.inOut(prog(t, 13.55, 13.86)); fx = lerp(PORT ? W * 0.8 : W + 40, tx, u); fy = lerp(H + 60, ty, u); }
    else if (k > 0) {
      const [ax, ay] = tapPoint(L, QS[k - 1]), [bx, by] = tapPoint(L, QS[k]);
      const u = EZ.inOut(prog(t, QS[k - 1].tp + 0.08, QS[k].tp - 0.04));
      fx = lerp(ax, bx, u); fy = lerp(ay, by, u) - Math.sin(u * Math.PI) * 40;
    } else { const [ax, ay] = tapPoint(L, QS[6]); const u = EZ.in(prog(t, 17.98, 18.3)); fx = lerp(ax, W + 60, u); fy = lerp(ay, H + 60, u); }
    const pr = Math.max(...QS.map((q) => press(t, q.tp)));
    finger(x, fx, fy, fa, pr, false);
  }
  QS.forEach((q) => { const [tx, ty] = tapPoint(L, q); ripple(x, tx, ty, t - q.tp, false); });
  // points de progression
  const conv = EZ.in(prog(t, 18.5, 18.85)), P = [L.cx, L.cy];
  for (let k = 0; k < 8; k++) {
    const pop = spr(t - (12.92 + k * 0.03), 14, 7);
    if (pop <= 0) continue;
    let [dx, dy] = dotPos(L, k);
    dx = lerp(dx, P[0], conv); dy = lerp(dy, P[1], conv);
    const fill = spr(t - dotTime(k), 16, 8);
    if (conv < 0.98) { x.lineWidth = 3; x.strokeStyle = cream(0.65); x.beginPath(); x.arc(dx, dy, 10 * pop, 0, TAU); x.stroke(); }
    if (fill > 0) disc(x, dx, dy, 10 * fill * (1 + 0.6 * conv), C.cream);
  }
  // le point de l'humeur rejoint la première pastille
  if (t < 13.14) {
    const u = EZ.inOut(prog(t, 12.9, 13.12)), [ex, ey] = dotPos(L, 0);
    disc(x, lerp(LC.hx, ex, u), lerp(LC.hy, ey, u) - Math.sin(u * Math.PI) * 120, lerp(13, 10, u), C.cream);
  }
  const iu = EZ.in(prog(t, 18.78, 19.2));
  if (iu > 0) { x.beginPath(); x.arc(P[0], P[1], iu * Math.hypot(W, H), 0, TAU); fillRegion(x, 'blk'); }
}

/* =====================================================================
   E. Étape 3 (19,2–23,8 s) : chaque film passe deux portes, genres puis mots-clés.
   ===================================================================== */
function layE() {
  return PORT ? { tx: CX, al: 'center', ky: 255, ty: 372, ts: 90, sy: 545, sw: 880, ax0: 150, ax1: 930, g1: 960, g2: 1215, tray: 1530, top: 655, pw: 104, ph: 156, tw: 130, th: 195, sp: 164 }
    : { tx: 150, al: 'left', ky: 330, ty: 450, ts: 100, sy: 745, sw: 560, ax0: 1010, ax1: 1730, g1: 360, g2: 590, tray: 850, pw: 92, ph: 138, tw: 110, th: 165, sp: 136 };
}
let FALL = null, FALLW = 0;
function fallers(L) {
  if (FALL && FALLW === W) return FALL;
  const acc = [2, 6, 10, 14, 18], rej2 = [4, 8, 12, 16, 20], axc = (L.ax0 + L.ax1) / 2;
  FALL = [];
  for (let i = 0; i < 22; i++) {
    const a = acc.indexOf(i), fate = a >= 0 ? 0 : rej2.includes(i) ? 2 : 1;
    let px = lerp(L.ax0 + L.pw * 0.7, L.ax1 - L.pw * 0.7, rnd(i * 7.31 + 3));
    if (fate === 0) px = axc + (a - 2) * L.sp + (rnd(i * 1.9) - 0.5) * 40;
    FALL.push({ i, fate, slot: a, px, t0: 19.62 + i * 0.1 + (rnd(i * 2.9) - 0.5) * 0.04, rot0: (rnd(i * 5.1) - 0.5) * 0.45,
      side: PORT ? (px > axc ? 1 : -1) : 1, vx: 650 + rnd(i * 8.7) * 450, id: 300 + i * 17, popular: i === 12 });
  }
  FALLW = W;
  return FALL;
}
const FALL_V = 1400, FALL_H = 760;
function fallState(L, p, t) {
  const th1 = p.t0 + FALL_H / FALL_V, th2 = th1 + (L.g2 - L.g1) / FALL_V;
  const yAt = (tt) => L.g1 - FALL_H + FALL_V * (tt - p.t0);
  const sway = Math.sin((t - p.t0) * 5 + p.i) * 8;
  let X = p.px + sway, Y = yAt(t), rot = p.rot0 * Math.cos((t - p.t0) * 3), w = L.pw, h = L.ph, grey = 0, rej = 0;
  const kick2 = (th, gy) => {
    const d = t - th;
    X = p.px + Math.sin((th - p.t0) * 5 + p.i) * 8 + p.side * p.vx * d;
    Y = gy - 320 * d + 0.5 * 3600 * d * d;
    rot = p.rot0 + p.side * 6 * d;
    grey = clamp(d / 0.12); rej = d;
  };
  if (p.fate === 1 && t > th1) kick2(th1, L.g1);
  else if (p.fate === 2 && t > th2) kick2(th2, L.g2);
  else if (p.fate === 0 && t > th2) {
    const b = EZ.out(prog(t, th2, th2 + 0.42)), axc = (L.ax0 + L.ax1) / 2;
    X = lerp(X, axc + (p.slot - 2) * L.sp, b); Y = lerp(Math.min(Y, L.tray), L.tray, b); rot *= 1 - b;
    w = lerp(L.pw, L.tw, b); h = lerp(L.ph, L.th, b);
  }
  return { X, Y, rot, w, h, grey, rej, th1, th2 };
}
/* positions d'arrivée des cinq films dans la scène F (carte n°1 et quatre alternatives) */
function fTargets(F) {
  const r = [{ cx: F.pos[0] + F.pos[2] / 2, cy: F.pos[1] + F.pos[3] / 2, w: F.pos[2], h: F.pos[3] }];
  for (let j = 0; j < 4; j++) r.push({ cx: F.alts.x + j * F.alts.step + F.alts.w / 2, cy: F.alts.y + F.alts.h / 2, w: F.alts.w, h: F.alts.h });
  return r;
}
function sE(x, t) {
  bgFill(x, 'blk');
  const L = layE(), F = layF(), axc = (L.ax0 + L.ax1) / 2;
  const o = { align: L.al };
  kick(x, 'ÉTAPE 3 · LE TRI', L.tx, L.ky, t, 19.3, 23.05, { align: L.al });
  if (PORT) {
    tl(x, 'CHAQUE FILM EST', L.tx, L.ty, L.ts, t, 19.35, 23.05, o);
    tl(x, [['VÉRIFIÉ ', C.cream], ['DEUX FOIS.', C.red]], L.tx, L.ty + L.ts * 1.04, L.ts, t, 19.43, 23.1, o);
  } else {
    tl(x, 'CHAQUE FILM', L.tx, L.ty, L.ts, t, 19.35, 23.05, o);
    tl(x, 'EST VÉRIFIÉ', L.tx, L.ty + L.ts * 1.04, L.ts, t, 19.43, 23.08, o);
    tl(x, [['DEUX FOIS.', C.red]], L.tx, L.ty + L.ts * 2.08, L.ts, t, 19.51, 23.1, o);
  }
  para(x, 'Par ses genres, puis par ses mots-clés. Ce qui ne colle pas à ton envie est écarté, même s’il est populaire.', L.tx, L.sy, PORT ? 30 : 30, L.sw, t, 19.7, 23.05, { align: L.al });
  // portes
  const ga = 1 - prog(t, 23.0, 23.3);
  [[L.g1, '1 · GENRES', 19.45], [L.g2, '2 · MOTS-CLÉS', 19.6]].forEach(([gy, lab, t0]) => {
    const a = EZ.out(prog(t, t0, t0 + 0.5)) * ga;
    if (a <= 0) return;
    x.save(); x.globalAlpha = ga;
    x.strokeStyle = cream(0.38); x.lineWidth = 3; x.setLineDash([16, 10]); x.lineDashOffset = -t * 60;
    x.beginPath(); x.moveTo(L.ax0, gy); x.lineTo(lerp(L.ax0, L.ax1, a), gy); x.stroke(); x.setLineDash([]);
    x.restore();
    kick(x, lab, L.ax0, gy - 22, t, t0 + 0.1, 23.0, { color: cream(0.72), size: 20 });
  });
  // plateau
  const tk = EZ.out(prog(t, 19.5, 19.9)) * (1 - prog(t, 23.0, 23.25));
  if (tk > 0) {
    x.save(); x.globalAlpha = tk; x.strokeStyle = cream(0.22); x.lineWidth = 2.5; x.setLineDash([10, 8]);
    for (let k = 0; k < 5; k++) { rrp(x, axc + (k - 2) * L.sp - L.tw / 2, L.tray - L.th / 2, L.tw, L.th, L.tw * 0.05); x.stroke(); }
    x.restore();
  }
  const P = fallers(L);
  const kept = P.filter((p) => p.fate === 0 && t > fallState(L, p, t).th2 + 0.42).length;
  const ly = L.tray + L.th / 2 + (PORT ? 70 : 58);
  kick(x, `RETENUS · ${kept} / 5`, axc, ly, t, 19.9, 22.5, { align: 'center', color: cream(0.7), size: 20 });
  tl(x, [['5 FILMS ', C.cream], ['POUR TOI.', C.red]], axc, ly + 8, PORT ? 54 : 46, t, 22.6, 23.0, { align: 'center' });
  // éclairs aux portes
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const p of P) {
    const s = fallState(L, p, t);
    for (const [th, gy, bad] of [[s.th1, L.g1, p.fate === 1], [s.th2, L.g2, p.fate === 2]]) {
      if (gy === L.g2 && p.fate === 1) continue;
      const f = tri(t - th + 0.02, 0.3);
      if (f <= 0) continue;
      const fx = p.px + Math.sin((th - p.t0) * 5 + p.i) * 8;
      const g = x.createRadialGradient(fx, gy, 0, fx, gy, 120);
      g.addColorStop(0, bad ? redA(0.8 * f) : cream(0.55 * f)); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(fx - 120, gy - 120, 240, 240);
    }
  }
  x.restore();
  // affiches qui tombent (les cinq retenues glissent ensuite vers la scène F)
  const tg = fTargets(F);
  const mv = (k) => EZ.inOut(prog(t, 23.18 + k * 0.025, 23.7 + k * 0.025));
  const iu = EZ.in(prog(t, 23.22, 23.78));
  if (iu > 0) { x.beginPath(); x.arc(tg[0].cx, tg[0].cy, iu * Math.hypot(W, H) * 1.05, 0, TAU); fillRegion(x, 'cream'); }
  if (PORT) { x.save(); x.beginPath(); x.rect(0, L.top, W, H - L.top); x.clip(); }
  for (const p of P) {
    if (t < p.t0) continue;
    const s = fallState(L, p, t);
    if (s.Y > H + 200 || s.X < -200 || s.X > W + 200) continue;
    let { X, Y, w, h, rot } = s;
    if (p.fate === 0) {
      const m = mv(p.slot), T = tg[p.slot];
      X = lerp(X, T.cx, m); Y = lerp(Y, T.cy, m); w = lerp(w, T.w, m); h = lerp(h, T.h, m);
    }
    x.save(); x.translate(X, Y); x.rotate(rot);
    if (p.fate === 0) film(x, -w / 2, -h / 2, w, h, p.slot);
    else poster(x, -w / 2, -h / 2, w, h, p.id);
    if (p.popular && s.grey < 1) {
      x.globalAlpha = 1 - s.grey;
      rrp(x, -w / 2 + 6, -h / 2 + 6, 62, 22, 11); x.fillStyle = C.red; x.fill();
      drawText(x, 'TOP 10', -w / 2 + 37, -h / 2 + 22, 13, { fam: 'Archivo', wt: 800, align: 'center', color: C.cream });
      x.globalAlpha = 1;
    }
    if (s.grey > 0) { rrp(x, -w / 2, -h / 2, w, h, w * 0.06); x.fillStyle = `rgba(20,16,18,${0.62 * s.grey})`; x.fill(); cross(x, 0, 0, w * 0.42, s.grey, C.red); }
    x.restore();
  }
  if (PORT) x.restore();
}

/* =====================================================================
   F. Étape 4 (23,8–28,55 s) : le meilleur choix, sa raison, quatre alternatives.
   ===================================================================== */
function layF() {
  if (PORT) return { tx: CX, al: 'center', ky: 280, t1: 395, ts: 96, card: [70, 590, 940, 740], pos: [110, 628, 360, 540], dx: 500, by: 672, tis: 60, my: 878, mw: 460,
    ring: [548, 1012], why: [110, 1196, 860, 112], alts: { x: 90, y: 1385, w: 150, h: 225, step: 190 }, altText: [CX, 1740] };
  return { tx: 150, al: 'left', ky: 380, t1: 490, ts: 86, sub: 668, card: [820, 200, 980, 570], pos: [852, 260, 300, 450], dx: 1190, by: 300, tis: 66, my: 442, mw: 580,
    ring: [1238, 535], why: [1190, 600, 580, 142], alts: { x: 822, y: 805, w: 104, h: 156, step: 150 }, altText: [1440, 868] };
}
function sF(x, t) {
  bgFill(x, 'cream');
  const L = layF(), tg = fTargets(L);
  const o = { align: L.al, color: C.ink };
  kick(x, 'ÉTAPE 4 · TON FILM', L.tx, L.ky, t, 23.95, null, { align: L.al });
  tl(x, 'TON FILM,', L.tx, L.t1, L.ts, t, 24.0, null, o);
  tl(x, [['ET POURQUOI LUI.', C.red]], L.tx, L.t1 + L.ts * 1.06, L.ts, t, 24.08, null, o);
  if (!PORT) para(x, 'Le film qui colle le mieux à ton moment, avec la raison de sa place.', L.tx, L.sub, 30, 560, t, 24.3, null, { color: ink(0.6) });
  // carte n°1 : elle s'ouvre à partir de l'affiche
  const cu = EZ.out(prog(t, 23.84, 24.32));
  const [cX, cY, cW, cH] = L.card, [pX, pY, pW, pH] = L.pos;
  x.save(); x.shadowColor = 'rgba(90,20,40,0.2)'; x.shadowBlur = 60; x.shadowOffsetY = 24;
  rrp(x, lerp(pX, cX, cu), lerp(pY, cY, cu), lerp(pW, cW, cu), lerp(pH, cH, cu), 28); x.fillStyle = C.card; x.fill(); x.restore();
  const bs = spr(t - 24.15, 14, 7);
  if (bs > 0) {
    const bw = textWidth('★  LE MEILLEUR CHOIX', 18, { fam: 'Archivo', wt: 700, track: 0.2 }) + 32;
    x.save(); x.translate(L.dx, L.by); x.scale(bs, bs);
    rrp(x, 0, -17, bw, 34, 17); x.fillStyle = C.red; x.fill();
    drawText(x, '★  LE MEILLEUR CHOIX', 16, 7, 18, { fam: 'Archivo', wt: 700, track: 0.2, color: C.cream });
    x.restore();
  }
  const od = { color: C.ink };
  if (PORT) { tl(x, 'L’ÉCHO DES', L.dx, 762, L.tis, t, 24.2, null, od); tl(x, 'ÉTOILES', L.dx, 762 + L.tis * 1.04, L.tis, t, 24.26, null, od); }
  else tl(x, 'L’ÉCHO DES ÉTOILES', L.dx, 392, L.tis, t, 24.2, null, od);
  para(x, '2019 · 2h04 · Science-fiction, Aventure', L.dx, L.my, 24, L.mw, t, 24.35, null, { color: ink(0.55) });
  // score
  const rs = spr(t - 24.45, 13, 7);
  if (rs > 0) {
    const [rx, ry] = L.ring, v = EZ.out(prog(t, 24.5, 25.4));
    x.lineCap = 'round'; x.lineWidth = 9;
    x.strokeStyle = ink(0.1); x.beginPath(); x.arc(rx, ry, 46 * rs, 0, TAU); x.stroke();
    x.strokeStyle = C.red; x.beginPath(); x.arc(rx, ry, 46 * rs, -Math.PI / 2, -Math.PI / 2 + v * 0.96 * TAU); x.stroke();
    textMid(x, `${Math.round(96 * v)}%`, rx, ry, 30 * rs, { fam: 'Anton', align: 'center', color: C.ink });
  }
  kick(x, 'DE CORRESPONDANCE', L.ring[0] + 66, L.ring[1] + 8, t, 24.6, null, { size: 18, color: ink(0.6) });
  // pourquoi lui
  const [wx, wy, ww, wh] = L.why, wb = EZ.out(prog(t, 25.3, 25.6));
  if (wb > 0) {
    x.fillStyle = redA(0.07 * wb); rrp(x, wx, wy, ww, wh, 10); x.fill();
    x.fillStyle = C.red; x.fillRect(wx, wy, 6, wh * wb);
  }
  kick(x, 'POURQUOI LUI', wx + 26, wy + 34, t, 25.38, null, { size: 18 });
  para(x, 'De la science-fiction mêlée d’aventure · une intensité moyenne, exactement ton niveau · 2h04, pile ta durée.', wx + 26, wy + 70, PORT ? 24 : 22, ww - 48, t, 25.45, null, { wt: 600, color: ink(0.8), lh: 1.36 });
  // les cinq affiches (arrivées depuis la scène E)
  const xp = EZ.in(prog(t, 27.95, 28.55));
  for (let k = 4; k >= 0; k--) {
    const T = tg[k];
    if (k === 0 && xp > 0) continue;
    film(x, T.cx - T.w / 2, T.cy - T.h / 2, T.w, T.h, k);
    if (k > 0) tl(x, [[`${FILMS[k].m}%`, C.red]], T.cx, T.cy + T.h / 2 + 46, PORT ? 40 : 34, t, 26.3 + k * 0.07, null, { align: 'center' });
  }
  if (PORT) para(x, '+ 4 alternatives, chacune avec sa raison.', L.altText[0], L.altText[1], 30, 900, t, 26.6, null, { align: 'center', wt: 600, color: ink(0.65) });
  else { para(x, '+ 4 alternatives,', L.altText[0], L.altText[1], 28, 400, t, 26.6, null, { wt: 600, color: ink(0.65) }); para(x, 'chacune avec sa raison.', L.altText[0], L.altText[1] + 40, 28, 400, t, 26.66, null, { wt: 600, color: ink(0.65) }); }
  // lecture : l'affiche n°1 devient l'écran
  const T = tg[0], pb = spr(t - 27.35, 13, 7) * (1 - xp);
  const cover = Math.max(W, H / 1.5) * 1.08;
  const ew = lerp(T.w, cover, xp), eh = ew * 1.5, ecx = lerp(T.cx, CX, xp), ecy = lerp(T.cy, CY, xp);
  if (xp > 0) {
    film(x, ecx - ew / 2, ecy - eh / 2, ew, eh, 0);
    x.fillStyle = `rgba(8,4,6,${EZ.in(prog(t, 28.08, 28.52))})`; x.fillRect(0, 0, W, H);
  }
  if (pb > 0) {
    x.save(); x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 30;
    disc(x, ecx, ecy, 54 * pb, cream(0.95)); x.restore();
    playTri(x, ecx + 4 * pb, ecy, 30 * pb, C.red);
  }
  const fa = prog(t, 27.45, 27.6) * (1 - prog(t, 27.95, 28.1)), fp = EZ.inOut(prog(t, 27.45, 27.82));
  finger(x, lerp(W + 40, T.cx + 14, fp), lerp(H + 60, T.cy + 16, fp), fa, press(t, 27.86), true);
  ripple(x, T.cx + 14, T.cy + 16, t - 27.86, false);
}

/* =====================================================================
   G. Le temps gagné (28,55–33,6 s) : deux horloges, 30 min contre 1 min.
   ===================================================================== */
function layG() {
  return PORT ? { ky: 205, c: [[540, 525], [540, 1170]], R: 200, hy: [1660, 1768], hs: 100 }
    : { ky: 135, c: [[CX - 390, 450], [CX + 390, 450]], R: 205, hy: [962], hs: 92 };
}
function layH() {
  return PORT ? { r: 170, start: [[CX - 230, 1010], [CX + 230, 1010]], end: [[CX - 118, 1010], [CX + 118, 1010]], ky: 372, ty: [482, 594], ts: 110, gy: 930, gs: 250, sy: 1150, ss: 84 }
    : { r: 160, start: [[CX - 300, 655], [CX + 300, 655]], end: [[CX - 112, 655], [CX + 112, 655]], ky: 255, ty: [378], ts: 100, gy: 515, gs: 300, sy: 762, ss: 92 };
}
function sG(x, t) {
  bgFill(x, 'blk');
  const L = layG(), LH = layH();
  kick(x, 'LE TEMPS GAGNÉ', CX, L.ky, t, 28.7, 32.7, { align: 'center' });
  const m1 = 30 * EZ.inOut(prog(t, 29.1, 30.7));
  const m2 = t < 29.5 ? EZ.out(prog(t, 29.1, 29.35)) : lerp(1, 30, EZ.inOut(prog(t, 29.5, 30.7)));
  ['SANS CINÉMOOD', 'AVEC CINÉMOOD'].forEach((lab, j) => {
    const [cx, cy] = L.c[j];
    kick(x, lab, cx, cy + L.R + 62, t, 28.95 + j * 0.08, 32.7, { align: 'center', color: j ? C.red : cream(0.7) });
  });
  tl(x, '30 MIN À CHERCHER', L.c[0][0], L.c[0][1] + L.R + 132, 50, t, 30.65, 32.72, { align: 'center' });
  tl(x, '1 MIN À CHERCHER', L.c[1][0], L.c[1][1] + L.R + 132, 50, t, 29.38, 32.72, { align: 'center' });
  if (PORT) { tl(x, [['29 MINUTES', C.red]], CX, L.hy[0], L.hs, t, 31.0, 32.75, { align: 'center' }); tl(x, 'DE FILM EN PLUS.', CX, L.hy[1], L.hs, t, 31.08, 32.8, { align: 'center' }); }
  else tl(x, [['29 MINUTES', C.red], [' DE FILM EN PLUS.', C.cream]], CX, L.hy[0], L.hs, t, 31.0, 32.75, { align: 'center' });
  // le rouge monte (transition vers le mode Duo), derrière les horloges
  const wu = EZ.inOut(prog(t, 33.0, 33.55));
  if (wu > 0) {
    const top = lerp(H + 260, -260, wu);
    x.beginPath(); x.moveTo(0, top + 140); x.lineTo(W, top - 140); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); fillRegion(x, 'red');
  }
  // horloges → visages
  const mo = EZ.inOut(prog(t, 32.95, 33.5)), hk = 1 - EZ.in(prog(t, 32.8, 33.0)), fm = prog(t, 32.95, 33.15), feat = prog(t, 33.05, 33.3);
  for (let j = 0; j < 2; j++) {
    const s = spr(t - (28.75 + j * 0.1), 13, 7);
    if (s <= 0) continue;
    const cx = lerp(L.c[j][0], LH.start[j][0], mo), cy = lerp(L.c[j][1], LH.start[j][1], mo), R = lerp(L.R, LH.r, mo) * s;
    const pies = j ? [[0, Math.min(m2, 1), C.red], [1, m2, C.pink]] : [[0, m1, C.red]];
    drawClock(x, cx, cy, R, 16 * Math.min(1, s), { m: j ? m2 : m1, ticks: prog(t, 28.85, 29.2) * hk, hands: hk * EZ.out(prog(t, 28.9, 29.2)), pieK: hk, pies, face: rgba(mixc([23, 11, 16], INK, fm), 1), ring: C.cream });
    if (j === 1 && m2 > 6 && hk > 0) playTri(x, cx + Math.cos(ang((1 + m2) / 2)) * R * 0.5, cy + Math.sin(ang((1 + m2) / 2)) * R * 0.5, R * 0.16 * hk * prog(m2, 6, 12), C.ink);
    if (j === 1) { const d = t - 29.36; if (d > 0 && d < 0.6) { x.save(); x.globalAlpha = 1 - d / 0.6; x.strokeStyle = C.cream; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, R + 14 + d * 160, 0, TAU); x.stroke(); x.restore(); } }
    face(x, cx, cy, R, j ? 'fatigue' : 'heureux', { line: C.ink, feat });
  }
}

/* =====================================================================
   H. Mode Duo, gratuit, sans inscription (33,6–36,9 s).
   ===================================================================== */
function sH(x, t) {
  bgFill(x, 'red');
  const L = layH();
  const ap = spr(t - 33.62, 10, 5.5), du = EZ.in(prog(t, 34.85, 35.2));
  const P = [0, 1].map((j) => [lerp(L.start[j][0], L.end[j][0], ap), lerp(L.start[j][1], L.end[j][1], ap) + du * H * 0.9]);
  if (du < 1) {
    for (let j = 0; j < 2; j++) {
      disc(x, P[j][0], P[j][1], L.r, C.cream);
    }
    const la = prog(t, 34.18, 34.38) * (1 - du);
    if (la > 0) {
      x.save(); x.beginPath(); x.arc(P[0][0], P[0][1], L.r, 0, TAU); x.clip();
      x.globalAlpha = la; disc(x, P[1][0], P[1][1], L.r, C.ink); x.restore();
    }
    for (let j = 0; j < 2; j++) {
      const bl = tri(t - (34.6 + j * 0.15), 0.16);
      face(x, P[j][0] + (j ? 26 : -26) * prog(t, 34.1, 34.4), P[j][1], L.r * 0.82, j ? 'fatigue' : 'heureux', { line: C.ink, blink: bl, rot: (j ? 1 : -1) * du * 0.6 });
    }
    playTri(x, (P[0][0] + P[1][0]) / 2 + 4, P[0][1], 34 * spr(t - 34.3, 14, 7) * (1 - du), C.cream);
  }
  kick(x, 'MODE DUO', CX, L.ky, t, 33.7, 34.8, { align: 'center', color: cream(0.9) });
  if (PORT) { tl(x, 'DEUX HUMEURS.', CX, L.ty[0], L.ts, t, 33.75, 34.8, { align: 'center' }); tl(x, [['UN SEUL FILM.', C.ink]], CX, L.ty[1], L.ts, t, 33.85, 34.85, { align: 'center' }); }
  else tl(x, [['DEUX HUMEURS. ', C.cream], ['UN SEUL FILM.', C.ink]], CX, L.ty[0], L.ts, t, 33.75, 34.8, { align: 'center' });
  const gu = prog(t, 35.12, 35.38);
  if (gu > 0) {
    x.save(); x.translate(CX, L.gy); const sc = lerp(1.7, 1, EZ.out(gu)); x.scale(sc, sc); x.rotate(lerp(-0.07, 0, EZ.out(gu)));
    x.globalAlpha = clamp(gu * 3);
    textMid(x, 'GRATUIT.', 0, 0, L.gs, { fam: 'Anton', align: 'center', color: C.ink });
    x.restore();
  }
  tl(x, 'SANS INSCRIPTION.', CX, L.sy, L.ss, t, 35.75, null, { align: 'center' });
  const bu = EZ.inOut(prog(t, 36.45, 36.9));
  if (bu > 0) {
    const xr = lerp(-320, W + 320, bu);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(xr + 160, 0); x.lineTo(xr - 160, H); x.lineTo(0, H); x.closePath(); fillRegion(x, 'blk');
  }
}

/* =====================================================================
   I. Fin (36,9–41 s) : CINÉMOOD, la promesse, l'adresse.
   ===================================================================== */
function sI(x, t) {
  bgFill(x, 'blk');
  const L = PORT ? { size: 190, base: 915, tg: 1028, tgs: 54, pill: 1150 } : { size: 230, base: 588, tg: 690, tgs: 58, pill: 805 };
  L.ky = L.base - textAscent('É', L.size, { fam: 'Anton' }) - 40;
  const g = x.createRadialGradient(CX, L.base - L.size * 0.35, 0, CX, L.base - L.size * 0.35, L.size * 2.6);
  g.addColorStop(0, redA(0.13 * prog(t, 37.0, 37.8))); g.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  kick(x, '8 QUESTIONS  ·  1 MINUTE', CX, L.ky, t, 37.35, null, { align: 'center' });
  const LW = layoutChars('CINÉMOOD', L.size, { fam: 'Anton' }), x0 = CX - LW.w / 2;
  LW.chars.forEach((c, i) => revealLine(x, c.ch, x0 + c.x, L.base, L.size, (t - 37.0 - i * 0.045) / 0.6, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 }));
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['CINÉMA.', C.red]], CX, L.tg, L.tgs, t, 37.5, null, { align: 'center' });
  // adresse tapée dans sa pastille
  const url = 'cinem00d.com', us = PORT ? 40 : 40, uo = { fam: 'Archivo', wt: 700 };
  const tw = textWidth(url, us, uo), pw = tw + 130, ph = 86, pu = EZ.out(prog(t, 37.95, 38.32));
  if (pu > 0) {
    rrp(x, CX - (pw / 2) * pu, L.pill - ph / 2, pw * pu, ph, ph / 2);
    x.fillStyle = redA(0.08); x.fill(); x.lineWidth = 3; x.strokeStyle = C.red; x.stroke();
    const n = Math.floor(url.length * prog(t, 38.15, 38.75)), tx = CX - pw / 2 + 44;
    let cx = tx;
    for (let i = 0; i < n; i++) { const r = drawText(x, url[i], cx, L.pill + us * 0.36, us, Object.assign({ color: i === 5 || i === 6 ? C.red : C.cream }, uo)); cx += textWidth(url.slice(0, i + 1), us, uo) - textWidth(url.slice(0, i), us, uo); }
    if (t < 38.85 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = C.cream; x.fillRect(cx + 3, L.pill - 22, 3, 44); }
    const aa = EZ.out(prog(t, 38.8, 39.1));
    if (aa > 0) drawText(x, '→', CX + pw / 2 - 64 + (1 - aa) * -20, L.pill + us * 0.36, us, { fam: 'Archivo', wt: 700, color: redA(aa) });
  }
  if (PORT) {
    para(x, 'Gratuit, sans inscription', CX, 1785, 22, 900, t, 39.0, null, { align: 'center', color: cream(0.5) });
    para(x, 'Films et affiches fictifs, à titre d’illustration', CX, 1820, 20, 900, t, 39.05, null, { align: 'center', color: cream(0.35) });
  } else para(x, 'Gratuit, sans inscription  ·  films et affiches fictifs, à titre d’illustration', CX, 1012, 20, 1400, t, 39.0, null, { align: 'center', color: cream(0.4) });
}

/* ---------- montage ---------- */
const TIMELINE = [
  { a: 0, b: 5.0, fn: (x, l, t) => sA(x, t) },
  { a: 5.0, b: 8.75, fn: (x, l, t) => sB(x, t) },
  { a: 8.75, b: 12.9, fn: (x, l, t) => sC(x, t) },
  { a: 12.9, b: 19.2, fn: (x, l, t) => sD(x, t) },
  { a: 19.2, b: 23.8, fn: (x, l, t) => sE(x, t) },
  { a: 23.8, b: 28.55, fn: (x, l, t) => sF(x, t) },
  { a: 28.55, b: 33.6, fn: (x, l, t) => sG(x, t) },
  { a: 33.6, b: 36.9, fn: (x, l, t) => sH(x, t) },
  { a: 36.9, b: DUR, fn: (x, l, t) => sI(x, t) },
];

/* flou de mouvement : 8 sous-images sur les passages rapides, 4 ailleurs */
const MBW = [[2.3, 5.0, 8], [6.3, 7.0, 8], [8.1, 8.8, 16], [10.7, 11.45, 8], [12.35, 13.25, 12], [13.25, 18.4, 8], [18.45, 19.25, 12], [19.6, 22.65, 8],
  [23.15, 23.85, 12], [27.9, 28.6, 12], [32.8, 33.9, 16], [34.8, 35.45, 8], [36.35, 37.0, 16]];
function motionBlurAt(t) {
  for (const [a, b, n] of MBW) if (t >= a && t < b) return { n, shutter: 0.6 };
  return { n: 4, shutter: 0.5 };
}
function fxAt(t) {
  const sh = { x: 0, y: 0 };
  let env = 0;
  for (const [t0, amp] of [[0.14, 7], [6.95, 9], [13.12, 4], [33.75, 7], [35.38, 16], [37.05, 5]]) {
    const u = t - t0;
    if (u <= 0 || u >= 0.4) continue;
    const k = (1 - u / 0.4) ** 2, s = shake(t, amp * k, 26, t0 * 7);
    sh.x += s.x; sh.y += s.y; env += amp * k;
  }
  const dark = t < 8.75 || (t >= 19.2 && t < 23.8) || (t >= 28.55 && t < 33.6) || t >= 36.9;
  return { shake: sh, env, vignette: dark ? 0.3 : 0.08, grain: 0.05, fade: Math.max(1 - t / 0.12, prog(t, 40.4, 41)) };
}
