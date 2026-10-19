/* CinéMood — motion design du site (44 s, 120 BPM : 1 temps = 0,5 s).
   L'interface est la vraie (captures du site, explainer/capture.mjs) ; les films sont fictifs.
   Récit : le problème (30 min à chercher), la promesse (une minute), le site, les trois
   étapes du parcours, le temps gagné, le mode Duo, la gratuité, l'appel à l'action. */
'use strict';

const DUR = 44;
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
const EZ = { out: bezier(0.16, 1, 0.3, 1), inOut: bezier(0.76, 0, 0.24, 1), in: bezier(0.7, 0, 0.84, 0), soft: bezier(0.33, 1, 0.68, 1) };
const P = { bg: '#070506', blk: '#030203', red: '#ff2d4f', ink: '#f6eef0', dark: '#14060a', card: '#120a0d' };
const ink = (a) => `rgba(246,238,240,${a})`;
const red = (a) => `rgba(255,45,79,${a})`;

/* ---------- textures : captures du site et affiches fictives ---------- */
const TEX = {};
const POST = [];
let INFO = {};
const TEX_LIST = ['d_home', 'd_card_1', 'd_card_1_bars0', 'd_card_2', 'd_card_3', 'd_card_4', 'd_card_5', 'm_home', 'm_q2', 'm_q2_hover', 'm_q5',
  'm_q5_hover', 'm_q6', 'm_q6_hover', 'm_q8', 'm_loading', 'm_results_full', 'm_q1_opt', 'btn_duo',
  'ticket_1', 'ticket_2', 'ticket_3', 'ticket_4', 'ticket_5', 'ticket_6', 'ticket_7', 'ticket_8', 'ticket_9'];
const POSTER_IDS = [...Array(8).keys()].map((i) => 9001 + i).concat([...Array(38).keys()].map((i) => 9101 + i));
async function bitmap(url) { const r = await fetch(url); return createImageBitmap(await r.blob()); }
async function loadTextures() {
  INFO = await (await fetch('tex/info.json')).json();
  await Promise.all(TEX_LIST.map(async (n) => { TEX[n] = await bitmap(`tex/${n}.png`); }));
  const imgs = await Promise.all(POSTER_IDS.map((id) => bitmap(`img/cm${id}.png`)));
  imgs.forEach((im, i) => { POST[i] = im; });
  buildWall();
}
const posterOf = (id) => POST[POSTER_IDS.indexOf(id)];

/* ---------- briques ---------- */
function capH(size) { return textAscent('H', size, { fam: 'Anton' }); }
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function up(x, s, X, Y, size, p, o = {}) { revealLine(x, s, X, Y, size, p, Object.assign({ fam: 'Anton', ease: EZ.out, asc: 1.12 }, o)); }
function label(x, s, X, Y, t, o = {}) {
  const size = (o.size || 24) * U;
  revealLine(x, s, X, Y, size, t / 0.5, Object.assign({ fam: 'Archivo', wt: 700, track: 0.28, ease: EZ.out, color: ink(0.75) }, o, { size: undefined }));
}
function wrap(s, size, maxW, o) {
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textWidth(t, size, o) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur);
  return lines;
}
function para(x, s, X, Y, size, maxW, t, o = {}) { // paragraphe révélé ligne à ligne
  const oo = Object.assign({ fam: 'Archivo', wt: 500, color: ink(0.72) }, o);
  const lines = wrap(s, size, maxW, oo), lh = size * (o.lh || 1.42);
  lines.forEach((l, i) => revealLine(x, l, X, Y + i * lh, size, (t - i * 0.07) / 0.6, Object.assign({ ease: EZ.out, asc: 1.05, desc: 0.32 }, oo)));
  return lines.length * lh;
}
function shadowBox(x, X, Y, w, h, r, blur, a = 0.6) {
  x.save();
  x.shadowColor = `rgba(0,0,0,${a})`; x.shadowBlur = blur; x.shadowOffsetY = blur * 0.35;
  x.fillStyle = '#0b0809'; rr(x, X, Y, w, h, r); x.fill();
  x.restore();
}
function chip(x, s, X, Y, size, o = {}) {
  const w = textWidth(s, size, { fam: 'Archivo', wt: 500 }) + size * 1.4, h = size * 2.1;
  x.save();
  x.globalAlpha *= o.a == null ? 1 : o.a;
  x.fillStyle = o.fill || ink(0.04); rr(x, X, Y - h / 2, w, h, 3 * U); x.fill();
  x.strokeStyle = o.stroke || ink(0.16); x.lineWidth = 1.5 * U; x.stroke();
  drawText(x, s, X + size * 0.7, Y + size * 0.36, size, { fam: 'Archivo', wt: 500, color: o.color || ink(0.7) });
  x.restore();
  return w;
}
function ripple(x, px, py, age, k = 1) {
  if (age < 0 || age > 0.55) return;
  const u = age / 0.55;
  x.save();
  x.fillStyle = `rgba(255,255,255,${0.32 * (1 - u)})`;
  x.beginPath(); x.arc(px, py, (18 + 46 * EZ.out(u)) * k * U, 0, Math.PI * 2); x.fill();
  x.strokeStyle = `rgba(255,255,255,${0.6 * (1 - u)})`; x.lineWidth = 3 * U;
  x.beginPath(); x.arc(px, py, (24 + 70 * EZ.out(u)) * k * U, 0, Math.PI * 2); x.stroke();
  x.restore();
}
function cursor(x, px, py, s = 1, a = 1) {
  if (a <= 0) return;
  x.save(); x.globalAlpha *= a; x.translate(px, py); x.scale(1.5 * U * s, 1.5 * U * s);
  x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 26); x.lineTo(7, 20); x.lineTo(11.5, 30); x.lineTo(15.5, 28); x.lineTo(11, 18.5); x.lineTo(19, 18.5); x.closePath();
  x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
  x.fillStyle = '#fff'; x.fill();
  x.shadowColor = 'transparent'; x.strokeStyle = '#111'; x.lineWidth = 1.4; x.stroke();
  x.restore();
}

/* téléphone : écran 412×880 (CSS) ; renvoie la géométrie de l'écran */
function phoneGeom(cx, cy, h) {
  const sh = h * 0.958, sw = (sh * 412) / 880, bz = (h - sh) / 2, w = sw + 2 * bz;
  return { X: cx - w / 2, Y: cy - h / 2, w, h, SX: cx - sw / 2, SY: cy - h / 2 + bz, SW: sw, SH: sh, k: sw / 412, r: w * 0.14 };
}
function phone(x, g, draw, o = {}) {
  x.save();
  if (o.rot) { x.translate(g.X + g.w / 2, g.Y + g.h / 2); x.rotate(o.rot); x.translate(-(g.X + g.w / 2), -(g.Y + g.h / 2)); }
  shadowBox(x, g.X, g.Y, g.w, g.h, g.r, 90 * U, 0.75);
  x.fillStyle = '#0b0b0d'; rr(x, g.X, g.Y, g.w, g.h, g.r); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 2.5 * U; x.stroke();
  x.save(); rr(x, g.SX, g.SY, g.SW, g.SH, g.r * 0.82); x.clip();
  x.fillStyle = P.bg; x.fillRect(g.SX, g.SY, g.SW, g.SH);
  draw(x, g);
  x.restore();
  x.fillStyle = '#000'; rr(x, g.SX + g.SW * 0.36, g.SY + g.SH * 0.012, g.SW * 0.28, g.SH * 0.03, g.SH * 0.015); x.fill();
  x.restore();
}
function screen(x, g, im, dx = 0, a = 1, srcY = 0) { // image d'écran pleine taille (412 CSS de large)
  if (!im || a <= 0) return;
  x.save(); x.globalAlpha *= a;
  const sh = (g.SH / g.SW) * im.width;
  x.drawImage(im, 0, srcY, im.width, Math.min(sh, im.height - srcY), g.SX + dx, g.SY, g.SW, Math.min(g.SH, ((im.height - srcY) * g.SW) / im.width));
  x.restore();
}
/* fenêtre de navigateur ; renvoie la géométrie du contenu */
function browserGeom(cx, cy, w, im) {
  const ch = (w * im.height) / im.width, bh = Math.round(w * 0.034), h = bh + ch;
  return { X: cx - w / 2, Y: cy - h / 2, w, h, bh, CY0: cy - h / 2 + bh, f: w / 1440 };
}
function browser(x, g, im) {
  const r = g.w * 0.011;
  shadowBox(x, g.X, g.Y, g.w, g.h, r, 110 * U, 0.8);
  x.save(); rr(x, g.X, g.Y, g.w, g.h, r); x.clip();
  x.fillStyle = '#171315'; x.fillRect(g.X, g.Y, g.w, g.bh);
  for (let k = 0; k < 3; k++) { x.fillStyle = ink(0.22); x.beginPath(); x.arc(g.X + g.bh * (0.62 + k * 0.48), g.Y + g.bh / 2, g.bh * 0.14, 0, Math.PI * 2); x.fill(); }
  const pw = g.w * 0.32, ph = g.bh * 0.62;
  x.fillStyle = ink(0.07); rr(x, g.X + g.w / 2 - pw / 2, g.Y + (g.bh - ph) / 2, pw, ph, ph / 2); x.fill();
  drawText(x, 'cinem00d.com', g.X + g.w / 2, g.Y + g.bh / 2 + g.bh * 0.13, g.bh * 0.36, { fam: 'Archivo', wt: 500, align: 'center', color: ink(0.72) });
  x.drawImage(im, g.X, g.CY0, g.w, g.h - g.bh);
  x.restore();
  x.strokeStyle = ink(0.1); x.lineWidth = 1.5 * U; rr(x, g.X, g.Y, g.w, g.h, r); x.stroke();
}
/* ticket du questionnaire, déchirable le long de la perforation (58 % de la hauteur) */
function ticket(x, im, cx, cy, w, o = {}) {
  const h = (w * im.height) / im.width, r = (24 * w) / im.width, perf = 0.58;
  x.save();
  x.translate(cx, cy); x.rotate(o.rot || 0); const s = o.s || 1; x.scale(s, s);
  x.globalAlpha *= o.a == null ? 1 : o.a;
  if (o.shadow) shadowBox(x, -w / 2, -h / 2, w, h, r, o.shadow, 0.7);
  if (!o.tear) { x.save(); rr(x, -w / 2, -h / 2, w, h, r); x.clip(); x.drawImage(im, -w / 2, -h / 2, w, h); x.restore(); }
  else {
    x.save(); rr(x, -w / 2, -h / 2, w, h * perf + 2, [r, r, 0, 0]); x.clip(); x.drawImage(im, -w / 2, -h / 2, w, h); x.restore();
    const e = o.tear;
    x.save();
    x.translate(-w * 0.32, -h / 2 + h * perf);
    x.rotate(e * 0.42);
    x.translate(w * 0.32, e * e * 520 * U);
    x.globalAlpha *= 1 - e * 0.9;
    rr(x, -w / 2, 0, w, h * (1 - perf), [0, 0, r, r]); x.clip();
    x.drawImage(im, 0, im.height * perf, im.width, im.height * (1 - perf), -w / 2, 0, w, h * (1 - perf));
    x.restore();
  }
  x.restore();
  return h;
}

/* compteur à rouleaux (minutes:secondes) */
function odoPos(v, wgt) {
  const base = Math.floor(v / wgt), r = ((v % wgt) + wgt) % wgt;
  return base + EZ.inOut(clamp((r - 0.6 * wgt) / (0.4 * wgt)));
}
function odoDigit(x, pos, mod, cx, Y, size, col) {
  const b = Math.floor(pos), fr = pos - b, d0 = ((b % mod) + mod) % mod, d1 = (d0 + 1) % mod, h = size * 1.08;
  drawText(x, String(d0), cx, Y - fr * h, size, { fam: 'Anton', align: 'center', color: col });
  if (fr > 0.001) drawText(x, String(d1), cx, Y + (1 - fr) * h, size, { fam: 'Anton', align: 'center', color: col });
}
function clock(x, v, cx, base, size, col) {
  const cell = textWidth('0', size, { fam: 'Anton' }) * 1.04, colon = textWidth(':', size, { fam: 'Anton' }) * 1.3, tot = cell * 4 + colon;
  x.save();
  x.beginPath(); x.rect(cx - tot, base - capH(size) * 1.1, tot * 2, capH(size) * 1.2); x.clip();
  let x0 = cx - tot / 2;
  for (const c of [[600, 10], [60, 10], null, [10, 6], [1, 10]]) {
    if (!c) { drawText(x, ':', x0 + colon / 2, base, size, { fam: 'Anton', align: 'center', color: col }); x0 += colon; continue; }
    odoDigit(x, odoPos(v, c[0]), c[1], x0 + cell / 2, base, size, col);
    x0 += cell;
  }
  x.restore();
}

/* ---------- mur d'affiches incliné (comme l'accueil du site) ---------- */
let WPOS = null;
function buildWall() {
  WPOS = new Float32Array(DUR * 240 + 2);
  let s = 0;
  for (let i = 0; i < WPOS.length; i++) {
    const t = i / 240;
    const v = (380 + 1100 * EZ.inOut(prog(t, 0.2, 1.6))) * (1 - EZ.inOut(prog(t, 3.3, 4.7)));
    s += v / 240; WPOS[i] = s;
  }
}
function wall(x, t, a) {
  if (a <= 0) return;
  const pw = (PORT ? 190 : 205) * U, ph = pw * 1.5, gap = 16 * U, ncol = PORT ? 9 : 12, nrow = 8;
  const span = ncol * (pw + gap), colH = nrow * (ph + gap);
  const s = WPOS[Math.min(WPOS.length - 1, Math.max(0, Math.round(t * 240)))] * U;
  x.save(); x.globalAlpha *= a;
  x.translate(CX, CY); x.rotate(-0.122);
  for (let c = 0; c < ncol; c++) {
    const X = -span / 2 + c * (pw + gap), dir = c % 2 ? 1 : -1;
    const off = (((s * dir + c * 211 * U) % colH) + colH) % colH;
    for (let r = 0; r < nrow; r++) {
      const Y = ((r * (ph + gap) + off) % colH) - colH / 2;
      x.drawImage(POST[(c * 7 + r * 3) % POST.length], X, Y, pw, ph);
    }
  }
  x.restore();
}
function darkCenter(x, a) {
  const g = x.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.62);
  g.addColorStop(0, `rgba(3,2,3,${0.93 * a})`); g.addColorStop(0.45, `rgba(3,2,3,${0.76 * a})`); g.addColorStop(1, `rgba(3,2,3,${0.32 * a})`);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}
function warmBg(x) {
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W * 0.75, -H * 0.1, 0, W * 0.75, -H * 0.1, Math.max(W, H) * 0.9);
  g.addColorStop(0, 'rgba(255,45,79,0.10)'); g.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}

/* ---------- mise en page ---------- */
let LAY = null;
function lay() {
  if (LAY) return LAY;
  LAY = PORT
    ? { tx: 84 * U, tw: 912 * U, ty: 190 * U, num: 120 * U, title: 92 * U, body: 38 * U, vx: CX, vy: 1270 * U }
    : { tx: 140 * U, tw: 600 * U, ty: 190 * U, num: 150 * U, title: 78 * U, body: 30 * U, vx: 1310 * U, vy: 560 * U };
  return LAY;
}
/* le titre « Ton humeur choisit ton cinéma », proportions de celui du site */
function headLayout(scale = 1) {
  const s1 = fitSize('TON HUMEUR CHOISIT TON', (PORT ? 900 : 1120) * U * scale, 200 * U, { fam: 'Anton' });
  const w1 = textWidth('TON HUMEUR CHOISIT TON', s1, { fam: 'Anton' });
  const s2 = fitSize('CINÉMA', w1 * 0.746, 400 * U, { fam: 'Anton' });
  const b1 = CY - capH(s2) * 0.5, b2 = b1 + capH(s2) * 1.446;
  return { s1, s2, w1, b1, b2, top: b1 - capH(s1), bottom: b2, cx: CX, cy: (b1 - capH(s1) + b2) / 2 };
}
function neonLevels(t, t0) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const ti = t0 + [0.05, 0.3, 0.12, 0.42, 0.2, 0.36][i];
    if (t < ti) return 0;
    if (t < ti + 0.32) return flick(t, i * 3 + 1, 1.4);
    return 0.92 + 0.08 * flick(t, i + 9, 0.25);
  });
}
function headline(x, t, H0, t0, a = 1) {
  if (a <= 0) return;
  x.save(); x.globalAlpha *= a;
  const kl = H0.top - 56 * U;
  x.fillStyle = P.red;
  const kw = textWidth('8 QUESTIONS · UNE MINUTE', 22 * U, { fam: 'Archivo', wt: 600, track: 0.24 });
  const lw = 34 * U * EZ.out(prog(t, t0, t0 + 0.5));
  x.fillRect(CX - kw / 2 - 20 * U - lw, kl - 8 * U, lw, 2.5 * U);
  x.fillRect(CX + kw / 2 + 20 * U, kl - 8 * U, lw, 2.5 * U);
  label(x, '8 QUESTIONS · UNE MINUTE', CX, kl, t - t0, { align: 'center', size: 22, wt: 600, track: 0.24, color: P.red });
  up(x, 'TON HUMEUR CHOISIT TON', CX, H0.b1, H0.s1, (t - t0 - 0.12) / 0.6, { align: 'center', color: P.ink });
  drawNeon(x, 'CINÉMA', CX, H0.b2, H0.s2, neonLevels(t, t0 + 0.4), { align: 'center' });
  x.restore();
}

/* ---------- 1. le problème (0–5) ---------- */
function counterLay() { const size = (PORT ? 230 : 300) * U; return { size, base: CY + capH(size) * 0.5 - (PORT ? 60 : 30) * U }; }
function sProblem(x, t) {
  x.fillStyle = P.blk; x.fillRect(0, 0, W, H);
  const dim = prog(t, 3.5, 4.8);
  wall(x, t, 0.62 * EZ.out(prog(t, 0, 0.9)) * (1 - 0.55 * dim));
  if (dim > 0) { x.save(); x.globalCompositeOperation = 'saturation'; x.fillStyle = `rgba(128,128,128,${dim})`; x.fillRect(0, 0, W, H); x.restore(); }
  darkCenter(x, 1);
  const C = counterLay();
  const v = t < 4.3 ? 1800 * EZ.inOut(prog(t, 0.8, 3.2)) : lerp(1800, 60, EZ.inOut(prog(t, 4.3, 5.0)));
  const col = t < 3.2 ? P.ink : t < 4.3 ? P.red : rgba(mixc([255, 45, 79], [246, 238, 240], prog(t, 4.4, 4.9)), 1);
  const pulse = t >= 3.2 ? 1 + 0.06 * (1 - EZ.out(prog(t, 3.2, 3.7))) : 1;
  const ap = EZ.out(prog(t, 0.3, 0.8));
  x.save();
  x.globalAlpha = ap;
  x.translate(CX, C.base - capH(C.size) / 2); x.scale(pulse, pulse); x.translate(-CX, -(C.base - capH(C.size) / 2));
  clock(x, v, CX, C.base + (1 - ap) * 30 * U, C.size, col);
  x.restore();
  const out = EZ.in(prog(t, 4.05, 4.35));
  x.save(); x.globalAlpha = 1 - out;
  label(x, 'TU PASSES', CX, C.base - capH(C.size) - 54 * U, t - 0.4, { align: 'center', size: 28 });
  const s2 = (PORT ? 62 : 70) * U;
  up(x, 'À CHERCHER QUOI REGARDER.', CX, C.base + s2 * 1.5, s2, (t - 1.3) / 0.7, { align: 'center', color: P.ink });
  x.restore();
}

/* ---------- 2. la promesse (5–8) ---------- */
function sPromise(x, t) {
  x.fillStyle = P.blk; x.fillRect(0, 0, W, H);
  const wa = 0.28 * (1 - prog(t, 5.0, 5.9));
  if (wa > 0) { wall(x, 4.9, wa); x.save(); x.globalCompositeOperation = 'saturation'; x.fillStyle = 'gray'; x.fillRect(0, 0, W, H); x.restore(); darkCenter(x, 1); }
  const C = counterLay();
  const ex = EZ.in(prog(t, 6.15, 6.6));
  if (ex < 1) {
    x.save();
    x.globalAlpha = 1 - ex;
    const z = 1 + ex * 0.9;
    x.translate(CX, CY); x.scale(z, z); x.translate(-CX, -CY);
    clock(x, 60, CX, C.base, C.size, P.ink);
    label(x, 'ET SI ÇA PRENAIT', CX, C.base - capH(C.size) - 54 * U, t - 5.05, { align: 'center', size: 28 });
    const s2 = (PORT ? 80 : 90) * U;
    up(x, 'UNE MINUTE ?', CX, C.base + s2 * 1.45, s2, (t - 5.4) / 0.6, { align: 'center', color: P.red });
    x.restore();
  }
  if (t >= 6.45) headline(x, t, headLayout(), 6.5);
}

/* raccord : le titre devient celui du vrai site (8–8,6) */
function siteTarget() {
  if (PORT) {
    const g = phoneGeom(CX, CY, 1640 * U), s = g.SW / 1236;
    return { kind: 'phone', g, line: { cx: g.SX + (77 + 1074 / 2) * s, by: g.SY + 1001 * s, w: 1074 * s } };
  }
  const g = browserGeom(CX, CY, 1440 * U, TEX.d_home), s = g.w / 2160;
  return { kind: 'browser', g, line: { cx: g.X + (558 + 1037 / 2) * s, by: g.CY0 + 533 * s, w: 1037 * s } };
}
function drawSite(x, T, im) {
  if (T.kind === 'browser') browser(x, T.g, im || TEX.d_home);
  else phone(x, T.g, (c, g) => screen(c, g, im || TEX.m_home));
}
function sMatch(x, t) {
  x.fillStyle = P.blk; x.fillRect(0, 0, W, H);
  const H0 = headLayout(), T = siteTarget();
  const k = T.line.w / H0.w1;
  const e = EZ.inOut(prog(t, 8.0, 8.6));
  const z = Math.exp(lerp(Math.log(1 / k), 0, e));
  const tc = { x: T.line.cx, y: T.line.by };
  const c = { x: lerp(tc.x, CX, e), y: lerp(tc.y, CY, e) }, s = { x: CX, y: lerp(H0.b1, CY, e) };
  x.save();
  x.translate(s.x, s.y); x.scale(z, z); x.translate(-c.x, -c.y);
  x.globalAlpha = EZ.out(prog(t, 8.02, 8.4));
  drawSite(x, T);
  x.globalAlpha = 1 - prog(t, 8.25, 8.55);
  x.translate(tc.x, tc.y); x.scale(k, k); x.translate(-CX, -H0.b1);
  headline(x, t, H0, 6.5);
  x.restore();
}

/* ---------- 3. le site, on clique « Commencer » (8,6–11,3) ---------- */
function sSite(x, t) {
  x.fillStyle = P.blk; x.fillRect(0, 0, W, H);
  const T = siteTarget();
  const sb = PORT ? INFO.m_start : INFO.d_start;
  const f = T.kind === 'browser' ? T.g.f : T.g.k, ox = T.kind === 'browser' ? T.g.X : T.g.SX, oy = T.kind === 'browser' ? T.g.CY0 : T.g.SY;
  const bt = { x: ox + sb.x * f, y: oy + sb.y * f, w: sb.width * f, h: sb.height * f };
  const bc = { x: bt.x + bt.w / 2, y: bt.y + bt.h / 2 };
  const push = 1 + 0.05 * EZ.inOut(prog(t, 8.6, 10.4));
  const zt = prog(t, 10.55, 11.3), zz = Math.exp(Math.log(30) * EZ.in(zt));
  const z = push * zz;
  const fx = lerp(CX, bc.x, EZ.inOut(prog(t, 8.6, 10.6))), fy = lerp(CY, bc.y, EZ.inOut(prog(t, 8.6, 10.6)));
  x.save();
  x.translate(fx, fy); x.scale(z, z); x.translate(-fx, -fy);
  drawSite(x, T);
  // survol et appui sur le bouton
  const hov = prog(t, 10.0, 10.2), press = t > 10.35 && t < 10.5 ? 1 : 0;
  if (hov > 0) { x.save(); x.globalAlpha = 0.18 * hov; x.fillStyle = '#fff'; rr(x, bt.x, bt.y, bt.w, bt.h, bt.h / 2); x.fill(); x.restore(); }
  if (zz > 2.5) { x.fillStyle = P.red; rr(x, bt.x - 1, bt.y - 1, bt.w + 2, bt.h + 2, bt.h / 2); x.fill(); }
  x.restore();
  if (zt > 0.6) { x.fillStyle = red(EZ.in(prog(zt, 0.6, 1))); x.fillRect(0, 0, W, H); }
  // pointeur (bureau) ou doigt (téléphone)
  const sx = (px) => (px - fx) * z + fx, sy = (py) => (py - fy) * z + fy;
  const m = EZ.inOut(prog(t, 9.25, 10.15));
  const cx0 = W * 0.86, cy0 = H * 0.94, tx = sx(bc.x + bt.w * 0.18), ty = sy(bc.y + bt.h * 0.1);
  const ca = EZ.out(prog(t, 9.2, 9.5)) * (1 - prog(t, 10.6, 10.8));
  if (!PORT) cursor(x, lerp(cx0, tx, m) + Math.sin(m * Math.PI) * 60 * U, lerp(cy0, ty, m), press ? 0.88 : 1, ca);
  ripple(x, sx(bc.x), sy(bc.y), t - 10.35, PORT ? 1.4 : 1);
}

/* ---------- texte d'étape (colonne de gauche / haut en vertical) ---------- */
function stepText(x, t, st) {
  const L = lay();
  if (t < st.t0) return;
  const out = EZ.in(prog(t, st.t1 - 0.4, st.t1));
  if (out >= 1) return;
  x.save(); x.globalAlpha *= 1 - out; x.translate(-out * 90 * U, 0);
  let y = L.ty + capH(L.num);
  const a = t - st.t0;
  revealLine(x, st.num, L.tx, y, L.num, a / 0.6, { fam: 'Anton', ease: EZ.out, stroke: P.red, lineWidth: 2.5 * U, noFill: true, asc: 1.05 });
  y += 34 * U;
  for (let i = 0; i < st.title.length; i++) {
    y += L.title * (i === 0 ? 1 : 1.04);
    up(x, st.title[i], L.tx, y, L.title, (a - 0.12 - i * 0.08) / 0.6, { color: P.ink });
  }
  y += 50 * U;
  if (st.body) {
    const bodyOut = st.bodyEnd ? EZ.in(prog(t, st.bodyEnd - 0.3, st.bodyEnd)) : 0;
    x.save(); x.globalAlpha *= 1 - bodyOut;
    para(x, st.body, L.tx, y, L.body, L.tw, a - 0.35);
    x.restore();
  }
  if (st.after) st.after(x, t, L, y);
  x.restore();
}
/* trait rouge : le bouton qui a rempli l'écran se replie en filet vertical à côté des étapes */
function accentLine(x, t) {
  const L = lay();
  const e = EZ.inOut(prog(t, 11.3, 11.8)), out = EZ.in(prog(t, 30.1, 30.6));
  if (out >= 1) return;
  const lx = L.tx - 44 * U, ly = L.ty + 8 * U, lh = (PORT ? 120 : 150) * U;
  const X = lerp(0, lx, e), Y = lerp(0, ly, e), w = lerp(W, 5 * U, e), h = lerp(H, lh, e) * (1 - out);
  x.fillStyle = P.red; x.fillRect(X, Y, w, h);
}

/* ---------- 4. étape 1 : ton humeur, puis 7 questions (11,3–18) ---------- */
const STEP1 = {
  t0: 11.55, t1: 18.1, num: '01', title: ['TU DIS COMMENT', 'TU TE SENS.'], body: 'Heureux, triste, amoureux, crevé… Neuf humeurs, une seule à choisir.', bodyEnd: 14.1,
  after(x, t, L, y) {
    if (t < 14.1) return;
    const items = [['TON ENVIE PRÉCISE', 14.2, 15.0], ['AVEC QUI TU REGARDES', 15.0, 16.0], ['LE TEMPS QUE TU AS', 16.0, 17.0], ['L’ÉPOQUE, CONNU OU PAS', 17.0, 18.2]];
    label(x, '7 QUESTIONS QUI S’ADAPTENT À TOI', L.tx, y, t - 14.15, { size: PORT ? 24 : 21, color: red(0.95) });
    items.forEach(([s, a, b], i) => {
      const yy = y + (PORT ? 66 : 60) * U + i * (PORT ? 64 : 58) * U;
      const on = t >= a && t < b ? 1 : 0, done = t >= b ? 1 : 0;
      const col = on ? P.ink : done ? ink(0.55) : ink(0.3);
      revealLine(x, (done ? '✓  ' : '→  ') + s, L.tx, yy, (PORT ? 40 : 34) * U, (t - 14.25 - i * 0.07) / 0.5, { fam: 'Anton', ease: EZ.out, color: col });
    });
  },
};
function ticketSlots() {
  const L = lay(), tw = (PORT ? 318 : 352) * U, cw = (PORT ? 332 : 368) * U, chh = (PORT ? 162 : 178) * U;
  const cx = PORT ? CX : L.vx, cy = PORT ? 1080 * U : L.vy + 10 * U;
  return [...Array(9).keys()].map((i) => ({ x: cx + ((i % 3) - 1) * cw, y: cy + (Math.floor(i / 3) - 1) * chh, rot: (rnd(i + 3) - 0.5) * 0.07, w: tw }));
}
function sTickets(x, t) {
  const S = ticketSlots();
  const sel = 8;
  const lift = EZ.out(prog(t, 13.05, 13.45)), tear = EZ.in(prog(t, 13.62, 14.05)), leave = EZ.in(prog(t, 13.75, 14.1));
  for (let i = 0; i < 9; i++) {
    if (i === sel) continue;
    const s = S[i], d = EZ.out(prog(t, 12.0 + i * 0.07, 12.6 + i * 0.07));
    if (d <= 0) continue;
    const X = lerp(s.x + 900 * U, s.x, d), Y = lerp(s.y + 700 * U, s.y, d) + leave * 60 * U;
    ticket(x, TEX['ticket_' + (i + 1)], X, Y, s.w, { rot: lerp(0.35, s.rot, d), a: (1 - 0.72 * lift) * (1 - leave), s: 1 - 0.05 * lift - 0.2 * leave, shadow: 30 * U });
  }
  const s = S[sel], d = EZ.out(prog(t, 12.0 + sel * 0.07, 12.6 + sel * 0.07));
  if (d > 0) {
    const L = lay(), tx = PORT ? CX : L.vx, ty = PORT ? 1060 * U : L.vy;
    const X = lerp(lerp(s.x + 900 * U, s.x, d), tx, lift), Y = lerp(lerp(s.y + 700 * U, s.y, d), ty, lift);
    const sc = 1 + 0.42 * lift;
    const im = t >= 13.25 ? TEX.m_q1_opt : TEX.ticket_9;
    const go = EZ.in(prog(t, 13.9, 14.15));
    ticket(x, im, X - go * 300 * U, Y - go * 420 * U, s.w, { rot: lerp(lerp(0.35, s.rot, d), 0, lift) - go * 0.2, s: sc * (1 - go * 0.55), shadow: 60 * U, tear: tear, a: 1 - go });
    if (t >= 13.3 && t < 13.62) {
      const h = (s.w * TEX.ticket_9.height) / TEX.ticket_9.width * sc;
      ripple(x, X + s.w * sc * 0.42, Y + h * 0.28, t - 13.35, 1.1);
    }
  }
}
const PHONE_SEQ = [
  { im: 'm_q2', hov: 'm_q2_hover', opt: 'm_q2_opt', a: 14.05, h: 14.55, tap: 14.7 },
  { im: 'm_q5', hov: 'm_q5_hover', opt: 'm_q5_opt', a: 15.05, h: 15.5, tap: 15.65 },
  { im: 'm_q6', hov: 'm_q6_hover', opt: 'm_q6_opt', a: 16.05, h: 16.5, tap: 16.65 },
  { im: 'm_q8', hov: null, opt: null, a: 17.05, h: 99, tap: 17.45 },
  { im: 'm_loading', hov: null, opt: null, a: 17.8, h: 99, tap: 99 },
];
function phoneLay(t) {
  const L = lay();
  const h = (PORT ? 980 : 880) * U, cx = PORT ? CX : L.vx - 30 * U, cy = PORT ? 1400 * U : L.vy + 10 * U;
  const inn = EZ.out(prog(t, 13.95, 14.6)), out = EZ.in(prog(t, 18.0, 18.45));
  return { g: phoneGeom(cx + out * (PORT ? 0 : 520) * U, cy + (1 - inn) * 900 * U + out * (PORT ? 900 : -60) * U, h * (1 - 0.25 * out)), rot: (1 - inn) * 0.12 - out * 0.08, a: 1 - out };
}
function sQuestions(x, t) {
  if (t < 13.95) return;
  const P0 = phoneLay(t);
  x.save(); x.globalAlpha *= P0.a;
  phone(x, P0.g, (c, g) => {
    let i = 0;
    for (let k = 0; k < PHONE_SEQ.length; k++) if (t >= PHONE_SEQ[k].a) i = k;
    const cur = PHONE_SEQ[i], nxt = PHONE_SEQ[i + 1];
    const sw = nxt ? EZ.inOut(prog(t, nxt.a - 0.25, nxt.a)) : 0;
    const dx = -sw * g.SW;
    screen(c, g, TEX[cur.im], dx);
    if (cur.hov) screen(c, g, TEX[cur.hov], dx, EZ.out(prog(t, cur.h, cur.h + 0.15)));
    if (nxt && sw > 0) screen(c, g, TEX[nxt.im], dx + g.SW);
    const ob = cur.opt ? INFO[cur.opt] : { x: 18, y: 560, width: 376, height: 172 };
    ripple(c, g.SX + dx + (ob.x + ob.width * 0.82) * g.k, g.SY + (ob.y + ob.height * 0.75) * g.k, t - cur.tap, 1);
  }, { rot: P0.rot });
  // compteur de questions et chronomètre
  const qn = t < 15.05 ? 2 : t < 16.05 ? 5 : t < 17.05 ? 6 : 8;
  const g = P0.g;
  const ax = PORT ? 150 * U : g.X + g.w + 70 * U, ay = PORT ? 1060 * U : g.Y + 170 * U;
  const ca = EZ.out(prog(t, 14.3, 14.7));
  x.globalAlpha *= ca;
  label(x, 'QUESTION', ax, ay - (PORT ? 130 : 150) * U, 1, { size: 20, align: PORT ? 'center' : 'left' });
  const ns = (PORT ? 110 : 140) * U;
  drawText(x, String(qn).padStart(2, '0'), ax, ay, ns, { fam: 'Anton', color: P.red, align: PORT ? 'center' : 'left' });
  drawText(x, '/ 8', ax + (PORT ? 0 : textWidth('00', ns, { fam: 'Anton' }) + 14 * U), ay + (PORT ? 60 * U : 0), (PORT ? 40 : 54) * U, { fam: 'Anton', color: ink(0.45), align: PORT ? 'center' : 'left' });
  const rcx = PORT ? W - 150 * U : ax + 90 * U, rcy = PORT ? 1010 * U : ay + 250 * U, rr0 = (PORT ? 78 : 92) * U;
  const secs = lerp(6, 52, EZ.soft(prog(t, 14.1, 18.0)));
  x.strokeStyle = ink(0.12); x.lineWidth = 9 * U; x.beginPath(); x.arc(rcx, rcy, rr0, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = P.red; x.lineCap = 'round'; x.beginPath(); x.arc(rcx, rcy, rr0, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * secs) / 60); x.stroke(); x.lineCap = 'butt';
  drawText(x, '0:' + String(Math.round(secs)).padStart(2, '0'), rcx, rcy + capH(rr0 * 0.5) / 2, rr0 * 0.5, { fam: 'Anton', align: 'center', color: P.ink });
  label(x, 'MOINS D’UNE MINUTE', rcx - (PORT ? 18 : 0) * U, rcy + rr0 + 50 * U, t - 14.6, { size: PORT ? 15 : 18, align: 'center', color: ink(0.6) });
  x.restore();
}

/* ---------- 5. étape 2 : chaque film est vérifié deux fois (18–24) ---------- */
const STEP2 = {
  t0: 18.25, t1: 24.1, num: '02', title: ['CHAQUE FILM EST', 'VÉRIFIÉ DEUX FOIS.'],
  body: 'Par ses genres, puis par ses mots-clés. Ce qui ne colle pas à ton envie est écarté, même s’il est populaire.',
};
/* 16 candidats : 8 retenus, 6 écartés au genre, 2 aux mots-clés (dont un très populaire) */
const CANDS = [[9101, 1], [9001, 0], [9105, 1], [9002, 0], [9003, 0], [9129, 2, 1], [9004, 0], [9109, 1], [9005, 0], [9006, 0], [9007, 0], [9008, 0]];
function convLay() {
  const L = lay();
  if (PORT) return { vert: true, x: CX, a0: 700 * U, g1: 1000 * U, g2: 1290 * U, tray: 1610 * U, pw: 150 * U, speed: 760 * U };
  return { vert: false, y: L.vy + 30 * U, a0: 790 * U, g1: 1100 * U, g2: 1420 * U, tray: 1690 * U, pw: 168 * U, speed: 700 * U };
}
function sFilter(x, t) {
  if (t < 18.2) return;
  const C = convLay(), ph = C.pw * 1.5;
  const fade = EZ.out(prog(t, 18.3, 18.8)) * (1 - EZ.in(prog(t, 23.75, 24.1)));
  x.save(); x.globalAlpha *= fade;
  // portes
  const gates = [[C.g1, '1 · GENRES'], [C.g2, '2 · MOTS-CLÉS']];
  for (const [gp, name] of gates) {
    const flash = CANDS.some((c, i) => { const p = candPos(C, t, i); return Math.abs(p - gp) < C.pw * 0.5; }) ? 1 : 0;
    x.save();
    x.shadowColor = red(0.9); x.shadowBlur = (18 + 22 * flash) * U;
    x.fillStyle = red(0.55 + 0.45 * flash);
    if (C.vert) x.fillRect(C.x - 300 * U, gp - 2 * U, 600 * U, 4 * U); else x.fillRect(gp - 2 * U, C.y - ph * 0.85, 4 * U, ph * 1.7);
    x.restore();
    const lx = C.vert ? C.x - 300 * U : gp, ly = C.vert ? gp - 22 * U : C.y - ph * 0.85 - 26 * U;
    label(x, name, lx, ly, t - 18.5, { size: 19, color: P.red, align: C.vert ? 'left' : 'center' });
  }
  // le tapis
  x.fillStyle = ink(0.1);
  if (C.vert) x.fillRect(C.x - 1 * U, C.a0, 2 * U, C.tray - C.a0); else x.fillRect(C.a0, C.y + ph * 0.5 + 18 * U, C.tray - C.a0 + 80 * U, 2 * U);
  // candidats
  let kept = 0;
  CANDS.forEach((c, i) => {
    const p = candPos(C, t, i);
    if (p === null) return;
    const [id, verdict, popular] = c;
    const gate = verdict === 1 ? C.g1 : verdict === 2 ? C.g2 : null;
    let X = C.vert ? C.x : p, Y = C.vert ? p : C.y, rot = 0, a = clamp((p - C.a0) / (60 * U));
    let drop = 0;
    if (gate !== null && p > gate) {
      const tg = (gate - C.a0) / C.speed + candT0(i), dt = t - tg;
      drop = clamp(dt / 0.55);
      if (C.vert) { X = C.x + (i % 2 ? 1 : -1) * EZ.in(drop) * 380 * U; Y = gate; } else { X = gate; Y = C.y + EZ.in(drop) * 420 * U; }
      rot = (i % 2 ? 1 : -1) * drop * 0.5; a *= 1 - drop;
    }
    if (verdict === 0 && p >= C.tray) { kept++; const k = kept - 1; if (C.vert) { Y = C.tray + k * 6 * U; X = C.x + (k - 3.5) * 10 * U; } else { X = C.tray + k * 9 * U; Y = C.y - k * 4 * U; } rot = (k - 3.5) * 0.018; }
    if (a <= 0) return;
    x.save(); x.globalAlpha *= a; x.translate(X, Y); x.rotate(rot);
    shadowBox(x, -C.pw / 2, -ph / 2, C.pw, ph, 6 * U, 24 * U, 0.6);
    x.save(); rr(x, -C.pw / 2, -ph / 2, C.pw, ph, 6 * U); x.clip(); x.drawImage(posterOf(id), -C.pw / 2, -ph / 2, C.pw, ph); x.restore();
    if (popular) { x.fillStyle = P.ink; rr(x, -C.pw / 2 + 6 * U, -ph / 2 + 6 * U, 92 * U, 24 * U, 12 * U); x.fill(); drawText(x, '★ TOP 10', -C.pw / 2 + 52 * U, -ph / 2 + 23 * U, 13 * U, { fam: 'Archivo', wt: 800, align: 'center', color: P.dark }); }
    if (drop > 0) { // écarté
      x.fillStyle = red(0.25); rr(x, -C.pw / 2, -ph / 2, C.pw, ph, 6 * U); x.fill();
      x.fillStyle = P.red; x.beginPath(); x.arc(0, 0, 26 * U, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 5 * U; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-9 * U, -9 * U); x.lineTo(9 * U, 9 * U); x.moveTo(9 * U, -9 * U); x.lineTo(-9 * U, 9 * U); x.stroke();
    }
    x.restore();
  });
  // compteur et conclusion
  const cx = C.vert ? W - 150 * U : C.tray + 40 * U, cy = C.vert ? 1640 * U : C.y - ph * 0.85 - 26 * U;
  label(x, 'RETENUS', cx, cy - (C.vert ? 120 : 0) * U, t - 18.6, { size: 19, align: 'center' });
  drawText(x, String(kept), cx, C.vert ? cy : C.y + ph * 0.5 + 110 * U, (C.vert ? 90 : 96) * U, { fam: 'Anton', align: 'center', color: P.red });
  const fin = EZ.out(prog(t, 22.9, 23.4));
  if (fin > 0) {
    const s = (PORT ? 48 : 46) * U;
    up(x, '8 FILMS PASSENT TES FILTRES.', C.vert ? CX : (C.a0 + C.tray) / 2 + 40 * U, C.vert ? 1880 * U - 40 * U : C.y + ph * 0.5 + 200 * U, s, fin, { align: 'center', color: P.ink });
  }
  // les filtres, en clair
  if (!C.vert) {
    const chips = ['genres : Science-fiction ou Aventure', 'durée 105–130 min (cible 117)', 'note ≥ 6.2', '150+ votes'];
    let cx0 = C.a0 - 20 * U, cy0 = C.y - ph * 0.85 - 120 * U;
    chips.forEach((s, i) => { const a = EZ.out(prog(t, 18.7 + i * 0.08, 19.2 + i * 0.08)); x.save(); x.globalAlpha *= a; cx0 += chip(x, s, cx0, cy0 + (1 - a) * 14 * U, 19 * U) + 12 * U; x.restore(); });
  }
  x.restore();
}
const candT0 = (i) => 18.5 + i * 0.31;
function candPos(C, t, i) { const dt = t - candT0(i); if (dt < 0) return null; return Math.min(C.tray, C.a0 + dt * C.speed); }

/* ---------- 6. étape 3 : ton meilleur choix, et 4 autres (24–30,6) ---------- */
const STEP3 = {
  t0: 24.2, t1: 30.4, num: '03', title: ['TON MEILLEUR CHOIX,', 'ET 4 AUTRES.'],
  body: 'Le film qui te correspond le mieux, puis quatre alternatives, chacune avec la raison de sa place.',
};
function callout(x, rect, text, t0, t, side = 'above') {
  const a = EZ.out(prog(t, t0, t0 + 0.35));
  if (a <= 0) return;
  x.save(); x.globalAlpha *= a;
  x.shadowColor = red(0.9); x.shadowBlur = 24 * U;
  x.strokeStyle = P.red; x.lineWidth = 3.5 * U;
  const pad = 8 * U * (2 - a);
  rr(x, rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2, 10 * U); x.stroke();
  x.restore();
  const ty = side === 'above' ? rect.y - 22 * U : rect.y + rect.h + 44 * U;
  x.save(); x.globalAlpha *= a;
  const w = textWidth(text, 19 * U, { fam: 'Archivo', wt: 800, track: 0.2 }) + 30 * U;
  const lx = Math.min(rect.x, W - w - 30 * U);
  x.fillStyle = P.red; rr(x, lx, ty - 30 * U, w, 42 * U, 21 * U); x.fill();
  drawText(x, text, lx + 15 * U, ty - 2 * U, 19 * U, { fam: 'Archivo', wt: 800, track: 0.2, color: '#fff' });
  x.restore();
}
function sResults(x, t) {
  if (t < 23.85) return;
  const L = lay();
  if (PORT) return sResultsPort(x, t);
  const inA = EZ.out(prog(t, 23.9, 24.6)), toB = EZ.inOut(prog(t, 27.9, 28.6)), out = EZ.in(prog(t, 30.15, 30.6));
  const cw = lerp(1000 * U, 700 * U, toB), card = TEX.d_card_1, f = cw / 1276;
  const ch = 453.86 * f;
  const cx = L.vx + 10 * U, cy = lerp(L.vy - 40 * U, 300 * U, toB);
  x.save(); x.globalAlpha *= 1 - out; x.translate(-out * 200 * U, 0);
  const X = cx - cw / 2, Y = cy - ch / 2;
  x.save(); x.globalAlpha *= inA; const sc = lerp(0.82, 1, inA);
  x.translate(cx, cy); x.scale(sc, sc); x.translate(-cx, -cy);
  shadowBox(x, X, Y, cw, ch, 6 * U, 70 * U, 0.75);
  x.drawImage(TEX.d_card_1_bars0, X, Y, cw, ch);
  const bars = INFO.d_cardBox.bars, bx0 = bars[0].x, bx1 = bars[0].x + bars[0].w;
  const wipe = lerp(bx0, bx1, EZ.out(prog(t, 24.55, 25.6)));
  x.save(); x.beginPath(); x.rect(X + (bx0 - 2) * f, Y + (bars[0].y - 8) * f, (wipe - bx0 + 2) * f, (bars[bars.length - 1].y - bars[0].y + 16) * f); x.clip();
  x.drawImage(card, X, Y, cw, ch); x.restore();
  x.restore();
  if (toB < 0.05) {
    callout(x, { x: X + 1126 * f, y: Y + 14 * f, w: 132 * f, h: 72 * f }, '96 % DE CORRESPONDANCE', 25.7, t, 'below');
    const wy = INFO.d_why.y - INFO.d_card1.y, wx = INFO.d_why.x - INFO.d_card1.x;
    callout(x, { x: X + wx * f, y: Y + wy * f, w: INFO.d_why.width * f, h: INFO.d_why.height * f }, 'LA RAISON DE SA PLACE', 26.75, t, 'below');
  }
  // les 4 alternatives
  for (let k = 0; k < 4; k++) {
    const e = EZ.out(prog(t, 28.25 + k * 0.09, 28.9 + k * 0.09));
    if (e <= 0) continue;
    const im = TEX['d_card_' + (k + 2)], aw = 222 * U, ah = (aw * 900) / im.width;
    const ax = L.vx + (k - 1.5) * 242 * U, ay = 750 * U;
    x.save(); x.globalAlpha *= e; x.translate(0, (1 - e) * 120 * U);
    shadowBox(x, ax - aw / 2, ay - ah / 2, aw, ah, 6 * U, 40 * U, 0.7);
    x.save(); rr(x, ax - aw / 2, ay - ah / 2, aw, ah, 6 * U); x.clip();
    x.drawImage(im, 0, 0, im.width, 900, ax - aw / 2, ay - ah / 2, aw, ah);
    const fg = x.createLinearGradient(0, ay + ah / 2 - 80 * U, 0, ay + ah / 2); fg.addColorStop(0, 'rgba(7,5,6,0)'); fg.addColorStop(1, 'rgba(7,5,6,1)');
    x.fillStyle = fg; x.fillRect(ax - aw / 2, ay + ah / 2 - 80 * U, aw, 80 * U);
    x.restore(); x.restore();
  }
  x.restore();
}
function sResultsPort(x, t) {
  const inA = EZ.out(prog(t, 23.9, 24.6)), out = EZ.in(prog(t, 30.15, 30.6));
  const g = phoneGeom(CX, 1300 * U + (1 - inA) * 700 * U, 1080 * U);
  const im = TEX.m_results_full, k3 = im.width / 412;
  const keys = [[24.0, 330], [25.1, 330], [25.6, 409 + 300], [26.6, 409 + 300], [27.1, 409 + 560], [27.9, 409 + 560], [28.5, 1500], [29.4, 1500], [30.0, 2600]];
  let sy = keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0]) sy = lerp(keys[i][1], keys[i + 1][1], EZ.inOut(prog(t, keys[i][0], keys[i + 1][0])));
  x.save(); x.globalAlpha *= inA * (1 - out);
  phone(x, g, (c, gg) => screen(c, gg, im, 0, 1, sy * k3));
  const toS = (cssY) => g.SY + (cssY - sy) * g.k;
  if (t > 25.6 && t < 26.7) callout(x, { x: g.SX + 300 * g.k, y: toS(409 + 395), w: 100 * g.k, h: 50 * g.k }, '96 % DE CORRESPONDANCE', 25.85, t, 'below');
  if (t > 27.1 && t < 27.95) callout(x, { x: g.SX + 21 * g.k, y: toS(409 + 731), w: 342 * g.k, h: 117 * g.k }, 'LA RAISON DE SA PLACE', 27.3, t, 'above');
  if (t > 28.5) { const a = EZ.out(prog(t, 28.6, 28.9)); x.globalAlpha *= a; chip(x, '+ 4 ALTERNATIVES', CX - 160 * U, g.Y - 40 * U, 26 * U, { fill: P.red, stroke: P.red, color: '#fff' }); }
  x.restore();
}

/* ---------- 7. le temps gagné (30,6–36,4) ---------- */
function sTime(x, t) {
  const a = EZ.out(prog(t, 30.55, 31.0)), out = EZ.in(prog(t, 36.0, 36.4));
  if (a <= 0) return;
  x.save(); x.globalAlpha *= a * (1 - out);
  const ax0 = (PORT ? 90 : 330) * U, ax1 = (PORT ? 990 : 1740) * U, pm = (ax1 - ax0) / 40;
  const r1 = (PORT ? 800 : 470) * U, r2 = (PORT ? 1070 : 680) * U, bh = (PORT ? 86 : 82) * U;
  const ty = (PORT ? 330 : 190) * U;
  label(x, 'LE TEMPS GAGNÉ', PORT ? CX : ax0, ty, t - 30.6, { size: 22, color: P.red, align: PORT ? 'center' : 'left' });
  const hs = (PORT ? 84 : 74) * U;
  if (PORT) { up(x, 'TA SOIRÉE,', CX, ty + 30 * U + hs, hs, (t - 30.7) / 0.6, { align: 'center', color: P.ink }); up(x, 'AVANT ET APRÈS.', CX, ty + 30 * U + hs * 2.1, hs, (t - 30.8) / 0.6, { align: 'center', color: P.ink }); }
  else up(x, 'TA SOIRÉE, AVANT ET APRÈS.', ax0, ty + 30 * U + hs, hs, (t - 30.7) / 0.6, { color: P.ink });
  const m = 30 * EZ.inOut(prog(t, 31.5, 33.7));
  const filmGrow = EZ.out(prog(t, 33.6, 34.3));
  const X = (min) => ax0 + min * pm;
  // rangée 1 : sans CinéMood
  label(x, 'SANS CINÉMOOD', ax0, r1 - 24 * U, t - 30.9, { size: 20, color: ink(0.7) });
  x.fillStyle = ink(0.06); x.fillRect(ax0, r1, ax1 - ax0, bh);
  if (m > 0) {
    x.save(); x.beginPath(); x.rect(ax0, r1, X(Math.min(m, 30)) - ax0, bh); x.clip();
    x.fillStyle = ink(0.13); x.fillRect(ax0, r1, ax1 - ax0, bh);
    x.strokeStyle = ink(0.12); x.lineWidth = 3 * U;
    for (let k = -10; k < 120; k++) { x.beginPath(); x.moveTo(ax0 + k * 22 * U, r1 + bh); x.lineTo(ax0 + k * 22 * U + bh, r1); x.stroke(); }
    if (X(Math.min(m, 30)) - ax0 > 420 * U) drawText(x, '30 MIN À CHERCHER QUOI REGARDER', ax0 + 22 * U, r1 + bh / 2 + 9 * U, 24 * U, { fam: 'Archivo', wt: 700, track: 0.06, color: ink(0.75) });
    x.restore();
  }
  if (filmGrow > 0) { x.fillStyle = P.red; x.fillRect(X(30), r1, (ax1 - X(30)) * filmGrow, bh); drawText(x, '▶ FILM', X(30) + 20 * U, r1 + bh / 2 + 9 * U, 24 * U, { fam: 'Archivo', wt: 800, color: '#fff' }); }
  // rangée 2 : avec CinéMood
  label(x, 'AVEC CINÉMOOD', ax0, r2 - 24 * U, t - 31.0, { size: 20, color: P.red });
  x.fillStyle = ink(0.06); x.fillRect(ax0, r2, ax1 - ax0, bh);
  if (m > 0) {
    x.fillStyle = ink(0.45); x.fillRect(ax0, r2, X(Math.min(m, 1)) - ax0, bh);
    if (m > 1) {
      x.fillStyle = P.red; x.fillRect(X(1), r2, X(m) - X(1) + (ax1 - X(30)) * filmGrow, bh);
      if (X(m) - X(1) > 400 * U) drawText(x, '▶ LE FILM COMMENCE', X(1) + 22 * U, r2 + bh / 2 + 9 * U, 24 * U, { fam: 'Archivo', wt: 800, color: '#fff' });
    }
    label(x, '1 MIN', X(0.5), r2 + bh + 34 * U, 1, { size: 17, align: 'center', color: ink(0.7) });
  }
  // axe du temps
  const ay = r2 + bh + (PORT ? 110 : 95) * U;
  for (let k = 0; k <= 4; k++) {
    const xx = X(k * 10);
    x.fillStyle = ink(0.25); x.fillRect(xx - 1 * U, ay - 26 * U, 2 * U, 12 * U);
    drawText(x, `21:${String(k * 10).padStart(2, '0')}`, xx, ay, 20 * U, { fam: 'Archivo', wt: 600, align: 'center', color: ink(0.5) });
  }
  // tête de lecture
  if (m > 0 && m < 30.01 && t < 34.2) {
    const px = X(m);
    x.fillStyle = P.ink; x.fillRect(px - 1.5 * U, r1 - 40 * U, 3 * U, r2 + bh - r1 + 50 * U);
    const tl = `21:${String(Math.floor(m)).padStart(2, '0')}`;
    x.fillStyle = P.ink; rr(x, px - 48 * U, r1 - 84 * U, 96 * U, 40 * U, 20 * U); x.fill();
    drawText(x, tl, px, r1 - 56 * U, 22 * U, { fam: 'Archivo', wt: 800, align: 'center', color: P.dark });
  }
  // l'écart
  const gp = EZ.out(prog(t, 34.1, 34.6));
  if (gp > 0) {
    const yb = r1 + bh + (r2 - r1 - bh) / 2;
    x.strokeStyle = P.ink; x.lineWidth = 3 * U;
    x.beginPath(); x.moveTo(X(1), yb); x.lineTo(lerp(X(1), X(30), gp), yb); x.stroke();
    x.beginPath(); x.moveTo(X(1), yb - 10 * U); x.lineTo(X(1), yb + 10 * U); x.moveTo(X(30), yb - 10 * U); x.lineTo(X(30), yb + 10 * U); x.globalAlpha *= gp; x.stroke();
    drawText(x, '29 MIN', (X(1) + X(30)) / 2, yb - 12 * U, 26 * U, { fam: 'Anton', align: 'center', color: P.ink });
  }
  const bs = (PORT ? 96 : 104) * U, by = (PORT ? 1500 : 960) * U;
  if (PORT) { up(x, '29 MINUTES', CX, by, bs, (t - 34.5) / 0.6, { align: 'center', color: P.red }); up(x, 'DE FILM EN PLUS.', CX, by + bs * 1.05, bs, (t - 34.6) / 0.6, { align: 'center', color: P.ink }); }
  else up(x, '29 MINUTES DE FILM EN PLUS.', CX, by, bs, (t - 34.5) / 0.6, { align: 'center', color: P.red });
  x.restore();
}

/* ---------- 8. mode Duo, gratuit (36,4–40,2) ---------- */
function sDuo(x, t) {
  const a = EZ.out(prog(t, 36.4, 36.8)), out = EZ.in(prog(t, 38.45, 38.75));
  if (a <= 0 || out >= 1) return;
  x.save(); x.globalAlpha *= a * (1 - out);
  const ty = (PORT ? 420 : 210) * U;
  label(x, 'MODE DUO', CX, ty, t - 36.45, { size: 22, color: P.red, align: 'center' });
  const hs = (PORT ? 96 : 92) * U;
  up(x, 'DEUX HUMEURS.', CX, ty + 30 * U + hs, hs, (t - 36.55) / 0.6, { align: 'center', color: P.ink });
  up(x, 'UN SEUL FILM.', CX, ty + 30 * U + hs * 2.08, hs, (t - 37.7) / 0.6, { align: 'center', color: P.red });
  const cy = (PORT ? 1140 : 640) * U, tw = (PORT ? 470 : 500) * U;
  const m1 = EZ.out(prog(t, 36.7, 37.35)), mg = EZ.inOut(prog(t, 37.45, 37.8));
  const off = lerp((PORT ? 250 : 290) * U, 0, mg);
  if (mg < 1) {
    ticket(x, TEX.ticket_9, lerp(-tw, CX - off, m1), cy + (PORT ? -120 : 0) * U * (1 - mg), tw, { rot: lerp(-0.4, -0.06, m1) * (1 - mg), shadow: 50 * U, a: 1 - mg, s: 1 - mg * 0.3 });
    ticket(x, TEX.ticket_2, lerp(W + tw, CX + off, m1), cy + (PORT ? 120 : 0) * U * (1 - mg), tw, { rot: lerp(0.4, 0.06, m1) * (1 - mg), shadow: 50 * U, a: 1 - mg, s: 1 - mg * 0.3 });
  }
  const r = EZ.out(prog(t, 37.7, 38.1));
  if (r > 0) {
    x.save(); x.globalAlpha *= r;
    const bw = (PORT ? 640 : 640) * U, bh2 = 220 * U, bx = CX - bw / 2, by = cy - bh2 / 2;
    x.translate(CX, cy); x.scale(lerp(0.85, 1, r), lerp(0.85, 1, r)); x.translate(-CX, -cy);
    shadowBox(x, bx, by, bw, bh2, 10 * U, 60 * U, 0.7);
    x.fillStyle = P.card; rr(x, bx, by, bw, bh2, 10 * U); x.fill();
    x.strokeStyle = red(0.6); x.lineWidth = 2 * U; x.stroke();
    drawText(x, '94%', bx + 44 * U, by + 130 * U, 110 * U, { fam: 'Anton', color: P.red });
    drawText(x, 'DUO', bx + 46 * U, by + 176 * U, 20 * U, { fam: 'Archivo', wt: 700, track: 0.2, color: ink(0.5) });
    drawText(x, 'RÊVEUR · 96 %', bx + bw - 44 * U, by + 96 * U, 30 * U, { fam: 'Archivo', wt: 700, align: 'right', color: P.ink });
    drawText(x, 'AMOUREUX · 91 %', bx + bw - 44 * U, by + 146 * U, 30 * U, { fam: 'Archivo', wt: 700, align: 'right', color: P.ink });
    x.restore();
  }
  const ps = (PORT ? 38 : 32) * U, pt = 'Chacun répond de son côté. Le film doit convenir à vous deux.';
  para(x, pt, CX - Math.min(textWidth(pt, ps, { fam: 'Archivo', wt: 500 }), (PORT ? 860 : 1400) * U) / 2, (PORT ? 1440 : 880) * U, ps, (PORT ? 860 : 1400) * U, t - 37.95);
  x.restore();
}
function sFree(x, t) {
  if (t < 38.65) return;
  const out = EZ.in(prog(t, 40.0, 40.3));
  x.save(); x.globalAlpha *= 1 - out;
  const s1 = fitSize('GRATUIT.', W * 0.8, (PORT ? 300 : 330) * U, { fam: 'Anton' });
  const e1 = EZ.out(prog(t, 38.7, 39.0)), e2 = EZ.out(prog(t, 39.25, 39.55));
  const b = CY + capH(s1) * 0.3;
  x.save(); x.globalAlpha *= clamp((t - 38.7) / 0.04);
  x.translate(CX, b - capH(s1) / 2); x.scale(lerp(1.3, 1, e1), lerp(1.3, 1, e1)); x.translate(-CX, -(b - capH(s1) / 2));
  drawText(x, 'GRATUIT.', CX, b, s1, { fam: 'Anton', align: 'center', color: P.red });
  x.restore();
  if (t >= 39.25) {
    const s2 = s1 * 0.32;
    x.save(); x.globalAlpha *= clamp((t - 39.25) / 0.04);
    x.translate(CX, b + s2 * 1.4); x.scale(lerp(1.3, 1, e2), lerp(1.3, 1, e2)); x.translate(-CX, -(b + s2 * 1.4));
    drawText(x, 'SANS INSCRIPTION.', CX, b + s2 * 1.7, s2, { fam: 'Anton', align: 'center', color: P.ink });
    x.restore();
  }
  x.restore();
}

/* ---------- 9. appel à l'action (40,2–44) ---------- */
function sEnd(x, t) {
  if (t < 40.2) return;
  const H0 = headLayout(PORT ? 0.92 : 0.7);
  const lift = (PORT ? 150 : 60) * U;
  // le logo
  const ls = (PORT ? 110 : 86) * U, lw = textWidth('CINÉMOOD', ls, { fam: 'Anton' }), lb = H0.top - lift - (PORT ? 150 : 120) * U;
  const pl = (t - 40.3) / 0.6;
  up(x, 'CINÉ', CX - lw / 2, lb, ls, pl, { color: P.ink });
  up(x, 'MOOD', CX - lw / 2 + textWidth('CINÉ', ls, { fam: 'Anton' }), lb, ls, pl - 0.12, { color: P.red });
  x.save(); x.translate(0, -lift);
  headline(x, t, H0, 40.55);
  x.restore();
  const by = H0.bottom - lift + (PORT ? 190 : 130) * U;
  const us = (PORT ? 60 : 48) * U, url = 'cinem00d.com';
  const uw = textWidth(url, us, { fam: 'Archivo', wt: 700 }), pw = uw + 150 * U, ph = us * 1.9;
  const dr = EZ.inOut(prog(t, 41.0, 41.5));
  if (dr > 0) {
    x.save(); x.strokeStyle = P.red; x.lineWidth = 3 * U; const per = 2 * (pw + ph);
    x.setLineDash([per * dr, per]); rr(x, CX - pw / 2, by, pw, ph, ph / 2); x.stroke(); x.restore();
  }
  const n = Math.floor(url.length * clamp((t - 41.1) / 0.5));
  let ux = CX - uw / 2 - 30 * U;
  const ub = by + ph / 2 + us * 0.36;
  for (let i = 0; i < n; i++) { drawText(x, url[i], ux, ub, us, { fam: 'Archivo', wt: 700, color: i === 5 || i === 6 ? P.red : P.ink }); ux += textWidth(url[i], us, { fam: 'Archivo', wt: 700 }); }
  if (t > 41.0 && t < 42.3 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = P.red; x.fillRect(ux + 4 * U, ub - us * 0.78, 4 * U, us * 0.92); }
  const ar = EZ.out(prog(t, 41.6, 42.0));
  if (ar > 0) { x.save(); x.globalAlpha = ar; drawText(x, '→', CX + pw / 2 - 60 * U - (1 - ar) * 30 * U, ub, us, { fam: 'Archivo', wt: 700, align: 'center', color: P.red }); x.restore(); }
  label(x, '8 QUESTIONS  ·  UNE MINUTE  ·  GRATUIT, SANS INSCRIPTION', CX, by + ph + 76 * U, t - 41.8, { size: PORT ? 19 : 21, align: 'center', color: ink(0.6) });
  x.save(); x.globalAlpha = EZ.out(prog(t, 42.0, 42.6)) * 0.42;
  drawText(x, 'Interface réelle de cinem00d.com · films et affiches fictifs, à titre d’illustration', CX, H - (PORT ? 90 : 46) * U, (PORT ? 22 : 18) * U, { fam: 'Archivo', wt: 500, align: 'center', color: P.ink });
  x.restore();
}

/* ---------- montage ---------- */
const TIMELINE = [
  { a: 0, b: 5.0, fn: (x, lt, t) => sProblem(x, t) },
  { a: 5.0, b: 8.0, fn: (x, lt, t) => sPromise(x, t) },
  { a: 8.0, b: 8.6, fn: (x, lt, t) => sMatch(x, t) },
  { a: 8.6, b: 11.3, fn: (x, lt, t) => sSite(x, t) },
  { a: 11.3, b: 40.2, fn: (x, lt, t) => {
    warmBg(x);
    if (t < 30.7) {
      accentLine(x, t);
      stepText(x, t, STEP1); stepText(x, t, STEP2); stepText(x, t, STEP3);
      if (t < 14.2) sTickets(x, t);
      sQuestions(x, t); sFilter(x, t); sResults(x, t);
    }
    sTime(x, t); sDuo(x, t); sFree(x, t);
  } },
  { a: 40.2, b: DUR + 0.01, fn: (x, lt, t) => { warmBg(x); sEnd(x, t); } },
];

function motionBlurAt(t) {
  const W_ = (a, b) => t >= a && t < b;
  const win = [
    [0.8, 3.2, 6, 0.8], [4.3, 5.0, 16, 1], [6.15, 6.6, 12, 1], [8.0, 8.6, 12, 1], [10.5, 11.35, 16, 1], [11.3, 11.85, 12, 1],
    [12.0, 13.2, 8, 0.9], [13.6, 14.15, 10, 1], [13.95, 14.6, 8, 0.9], [14.8, 15.05, 10, 1], [15.8, 16.05, 10, 1], [16.8, 17.05, 10, 1],
    [17.55, 17.8, 10, 1], [18.0, 18.5, 10, 1], [18.45, 23.6, 4, 0.8], [23.85, 24.65, 8, 0.9], [27.9, 29.3, 8, 0.9], [30.1, 31.0, 8, 0.9],
    [31.5, 33.7, 4, 0.8], [36.0, 36.8, 8, 0.9], [36.7, 37.8, 8, 0.9], [38.4, 39.0, 10, 1], [39.2, 39.6, 10, 1], [40.0, 40.4, 8, 1],
  ];
  for (const [a, b, n, s] of win) if (W_(a, b)) return { n, shutter: s };
  return { n: 1, shutter: 0 };
}
function fxAt(t) {
  const fx = { letterbox: 0, grain: 0.04, vignette: 0.22, bloom: 0, chroma: 0, shake: { x: 0, y: 0 }, flash: 0, flashCol: [255, 255, 255], fade: 0 };
  if ((t > 6.4 && t < 8.6) || t > 40.2) fx.bloom = 0.12;
  for (const [ti, a] of [[3.2, 0.5], [11.3, 0.5], [38.7, 0.8], [39.25, 0.5]]) {
    const d = t - ti;
    if (d >= 0 && d < 0.25) { const s = shake(t, 8 * a * (1 - d / 0.25) ** 2, 30, ti); fx.shake.x += s.x; fx.shake.y += s.y; }
  }
  fx.fade = Math.max(1 - prog(t, 0, 0.15), EZ.in(prog(t, 43.3, 44)));
  return fx;
}
