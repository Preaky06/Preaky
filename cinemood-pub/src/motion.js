/* CinéMood — version motion design (30 s, 120 BPM : 1 temps = 0,5 s).
   Tout est typographique : aplats de la marque, Anton + Archivo, transitions graphiques
   enchaînées sur le tempo, flou de mouvement sur chaque déplacement rapide. */
'use strict';

/* ---------- courbes d'accélération (cubic-bezier, comme en CSS / After Effects) ---------- */
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
  out: bezier(0.16, 1, 0.3, 1),      // décélération longue (expo)
  inOut: bezier(0.76, 0, 0.24, 1),   // départ et arrivée francs
  in: bezier(0.7, 0, 0.84, 0),
  soft: bezier(0.33, 1, 0.68, 1),
};
const P = { blk: '#0d0809', red: '#ff2d4f', pink: '#ff8fa1', ink: '#f6eef0', dark: '#14060a' };
const P_RGB = { red: [255, 45, 79], pink: [255, 143, 161], ink: [246, 238, 240], dark: [20, 6, 10], blk: [13, 8, 9] };

/* ---------- briques typographiques ---------- */
const M_ = () => (PORT ? W * 0.08 : W * 0.07);
function fill(x, col) { x.fillStyle = col; x.fillRect(0, 0, W, H); }
function capH(size) { return textAscent('H', size, { fam: 'Anton' }); }
function up(x, s, X, Y, size, p, o = {}) {
  revealLine(x, s, X, Y, size, p, Object.assign({ fam: 'Anton', ease: EZ.out, asc: 1.08 }, o));
}
function words(x, s, X, Y, size, t, o = {}) {
  return revealWords(x, s, X, Y, size, t, Object.assign({ fam: 'Anton', ease: EZ.out, dur: 0.6, stagger: 0.07, asc: 1.08 }, o));
}
function label(x, s, X, Y, t, o = {}) {
  const size = (o.size || 24) * U * (PORT ? 1.15 : 1);
  revealLine(x, s, X, Y, size, t / 0.5, Object.assign({ fam: 'Archivo', wt: 700, track: 0.28, ease: EZ.out, color: P.ink }, o, { size: undefined }));
}
/* mot qui défile verticalement (rouleau) : l'ancien sort par le haut, le nouveau entre par le bas */
function rollWord(x, list, starts, dur, X, Y, size, t, o = {}) {
  let i = -1;
  for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k;
  if (i < 0) return;
  const e = EZ.inOut(prog(t, starts[i], starts[i] + dur));
  const lh = size * 1.25;
  const asc = size * 1.05, desc = size * 0.3;
  let maxW = 0;
  for (const w of list) maxW = Math.max(maxW, textWidth(w, size, o));
  let x0 = X;
  if (o.align === 'center') x0 = X - maxW / 2;
  x.save();
  x.beginPath(); x.rect(x0 - size, Y - asc, maxW + size * 2, asc + desc); x.clip();
  const oo = Object.assign({ fam: 'Anton' }, o);
  if (i > 0 && e < 1) drawText(x, list[i - 1], X, Y - lh * e, size, oo);
  drawText(x, list[i], X, Y + lh * (1 - e), size, oo);
  x.restore();
}
/* compteur à rouleaux : chaque colonne tourne quand sa valeur change */
function odoPos(v, wgt) {
  const base = Math.floor(v / wgt);
  const r = ((v % wgt) + wgt) % wgt;
  return base + EZ.inOut(clamp((r - 0.6 * wgt) / (0.4 * wgt)));
}
function odoDigit(x, pos, mod, cx, Y, size, col) {
  const b = Math.floor(pos), fr = pos - b;
  const d0 = ((b % mod) + mod) % mod, d1 = (d0 + 1) % mod;
  const h = size * 1.08;
  drawText(x, String(d0), cx, Y - fr * h, size, { fam: 'Anton', align: 'center', color: col });
  if (fr > 0.001) drawText(x, String(d1), cx, Y + (1 - fr) * h, size, { fam: 'Anton', align: 'center', color: col });
}
function strokeWord(x, s, X, Y, size, col, lw, o = {}) {
  drawText(x, s, X, Y, size, Object.assign({ fam: 'Anton', stroke: col, lineWidth: lw, noFill: true }, o));
}

/* ---------- 1. le compteur (0–2) ---------- */
function m1Layout() {
  const y0 = CY - (PORT ? 90 : 40) * U;
  const size = PORT ? W * 0.36 : H * 0.36;
  return { y0, size, base: y0 + 62 * U + capH(size) };
}
function mCounter(x, t) {
  fill(x, P.blk);
  const L = m1Layout();
  const lw = (PORT ? W * 0.84 : W * 0.6) * EZ.inOut(prog(t, 0.05, 0.6));
  x.fillStyle = P.red;
  x.fillRect(CX - lw / 2, L.y0 - 1.5 * U, lw, 3 * U);
  label(x, 'TU PASSES', CX, L.y0 - 44 * U, t - 0.3, { align: 'center', size: 30 });
  // 00:00 → 30:00
  const v = 1800 * EZ.inOut(prog(t, 0.6, 1.6));
  const lock = prog(t, 1.6, 1.85);
  const col = t >= 1.6 ? P.red : P.ink;
  const pun = 1 + 0.05 * (1 - EZ.out(lock)) * (t >= 1.6 ? 1 : 0);
  const cell = textWidth('0', L.size, { fam: 'Anton' }) * 1.04;
  const colon = textWidth(':', L.size, { fam: 'Anton' }) * 1.3;
  const tot = cell * 4 + colon;
  const ap = EZ.out(prog(t, 0.45, 0.8));
  x.save();
  x.globalAlpha = ap;
  x.translate(CX, L.base - capH(L.size) / 2); x.scale(pun, pun); x.translate(-CX, -(L.base - capH(L.size) / 2));
  x.beginPath(); x.rect(CX - tot, L.base - capH(L.size) * 1.08, tot * 2, capH(L.size) * 1.16); x.clip();
  const yy = L.base + (1 - ap) * 40 * U;
  let cx0 = CX - tot / 2;
  const cols = [[600, 10], [60, 10], null, [10, 6], [1, 10]];
  for (const c of cols) {
    if (!c) { drawText(x, ':', cx0 + colon / 2, yy, L.size, { fam: 'Anton', align: 'center', color: col }); cx0 += colon; continue; }
    odoDigit(x, odoPos(v, c[0]), c[1], cx0 + cell / 2, yy, L.size, col);
    cx0 += cell;
  }
  x.restore();
  label(x, 'À CHERCHER QUOI REGARDER.', CX, L.base + 82 * U, t - 1.1, { align: 'center', size: 30 });
}

/* ---------- 2. les verbes (2–4), sur rouge ---------- */
const VERBS = ['SCROLLER.', 'HÉSITER.', 'SCROLLER.', 'ABANDONNER.'];
const VERB_T = [2.28, 2.75, 3.25, 3.75];
function mVerbs(x, t) {
  fill(x, P.red);
  const size = Math.min(PORT ? W * 0.22 : H * 0.32, fitSize('ABANDONNER.', W * 0.84, H, { fam: 'Anton' }));
  const ch = capH(size);
  const Y = CY + ch / 2;
  let i = 0;
  for (let k = 0; k < VERB_T.length; k++) if (t >= VERB_T[k]) i = k;
  // échos en contour qui défilent sans fin : le scroll
  const lh = size * 1.12;
  const scroll = ((t - 2.0) * lh * 1.8) % lh;
  x.save();
  for (let k = -5; k <= 5; k++) {
    if (k === 0) continue;
    const yy = Y + k * lh - scroll;
    const a = 0.22 * (1 - Math.abs(k) / 6);
    strokeWord(x, VERBS[i], CX, yy, size, `rgba(20,6,10,${a})`, 2.2 * U, { align: 'center' });
  }
  x.restore();
  rollWord(x, VERBS, VERB_T, 0.2, CX, Y, size, t, { align: 'center', color: P.dark });
}

/* ---------- 3. la question (4–6) ---------- */
function m3Lines() {
  return PORT ? [['ET SI ON', P.ink], ['PARTAIT DE', P.ink], ['TON MOMENT ?', P.red]] : [['ET SI ON PARTAIT', P.ink], ['DE TON MOMENT ?', P.red]];
}
function m3Layout() {
  const lines = m3Lines();
  const longest = lines.reduce((a, b) => (textWidth(a[0], 100, { fam: 'Anton' }) > textWidth(b[0], 100, { fam: 'Anton' }) ? a : b))[0];
  const size = Math.min(PORT ? W * 0.24 : H * 0.22, fitSize(longest, W * 0.86, H, { fam: 'Anton' }));
  const lh = size * 1.02;
  const y0 = CY - (lines.length - 1) * lh / 2 + capH(size) / 2;
  const last = lines[lines.length - 1][0];
  const L = layoutChars(last, size, { fam: 'Anton' });
  const q = L.chars[L.chars.length - 1];
  const yl = y0 + (lines.length - 1) * lh;
  return { lines, size, lh, y0, dot: { x: CX - L.w / 2 + q.x + q.w * 0.5, y: yl - size * 0.07, r: size * 0.07 } };
}
function mQuestion(x, t) {
  fill(x, P.blk);
  const L = m3Layout();
  x.save();
  const z = 1 + 0.025 * prog(t, 4.0, 6.0);
  x.translate(CX, CY); x.scale(z, z); x.translate(-CX, -CY);
  L.lines.forEach(([s, c], i) => words(x, s, CX, L.y0 + i * L.lh, L.size, t - 4.12 - i * 0.28, { align: 'center', color: c }));
  // le point du « ? » enfle : il va s'ouvrir sur la suite
  const pre = EZ.inOut(prog(t, 5.5, 5.72));
  if (pre > 0) {
    x.fillStyle = P.ink;
    x.beginPath(); x.arc(L.dot.x, L.dot.y, L.dot.r * (1 + 0.7 * pre), 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* ---------- 4. le logo (6–8), sur blanc cassé ---------- */
function logoLayout(scale = 1) {
  const size = (PORT ? fitSize('CINÉMOOD', W * 0.84, W, { fam: 'Anton' }) : fitSize('CINÉMOOD', W * 0.56, H, { fam: 'Anton' })) * scale;
  const L = layoutChars('CINÉMOOD', size, { fam: 'Anton' });
  return { size, L, x0: CX - L.w / 2 };
}
function drawLogo(x, base, t0, t, colA, colB, scale = 1) {
  const G = logoLayout(scale);
  const asc = textAscent('CINÉMOOD', G.size, { fam: 'Anton' });
  x.save();
  x.beginPath(); x.rect(G.x0 - G.size, base - asc * 1.1, G.L.w + G.size * 2, asc * 1.1 + G.size * 0.06); x.clip();
  for (const c of G.L.chars) {
    const e = EZ.out(prog(t, t0 + c.i * 0.035, t0 + c.i * 0.035 + 0.6));
    drawText(x, c.ch, G.x0 + c.x, base + (1 - e) * G.size * 1.1, G.size, { fam: 'Anton', color: c.i < 4 ? colA : colB });
  }
  x.restore();
  return G;
}
function m4Base() { const G = logoLayout(); return CY + capH(G.size) * 0.38; }
function mLogo(x, t) {
  fill(x, P.ink);
  const base = m4Base();
  // plongée dans le premier O de MOOD : son creux devient noir puis remplit l'écran
  const G = logoLayout();
  const o = G.L.chars[5];
  const ch = capH(G.size);
  const ox = G.x0 + o.x + o.w / 2, oy = base - ch * 0.5;
  const zt = prog(t, 7.6, 8.02);
  x.save();
  if (zt > 0) {
    const z = Math.exp(Math.log(90) * EZ.in(zt));
    const e2 = EZ.inOut(zt);
    x.translate(lerp(ox, CX, e2), lerp(oy, CY, e2)); x.scale(z, z); x.translate(-ox, -oy);
  }
  drawLogo(x, base, 6.08, t, P.dark, P.red);
  const ul = EZ.inOut(prog(t, 6.5, 6.9));
  x.fillStyle = P.red;
  x.fillRect(G.x0, base + 30 * U, G.L.w * ul, 10 * U);
  label(x, 'LE BON FILM POUR TON MOMENT.', CX, base + 110 * U, t - 6.75, { align: 'center', size: 26, color: 'rgba(20,6,10,0.72)' });
  const fillO = EZ.inOut(prog(t, 7.45, 7.62));
  if (fillO > 0) {
    x.fillStyle = P.blk;
    x.beginPath(); x.ellipse(ox, oy, o.w * 0.2 * fillO, ch * 0.34 * fillO, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* ---------- 5. 12 questions (8–9) ---------- */
function mTwelve(x, t) {
  fill(x, P.blk);
  const M = M_();
  const v = 1 + 11 * EZ.out(prog(t, 8.05, 8.55));
  let big, nx, ny, qx, qy, qs, lx, ly, al;
  if (PORT) {
    big = W * 0.56; nx = CX; ny = CY - 30 * U;
    qs = fitSize('QUESTIONS.', W * 0.84, W, { fam: 'Anton' }); qx = CX; qy = ny + qs * 1.15; lx = CX; ly = qy + 80 * U; al = 'center';
  } else {
    big = H * 0.56; ny = CY + capH(big) / 2;
    const w12 = textWidth('12', big, { fam: 'Anton' });
    nx = M + w12 / 2;
    qs = H * 0.2; qx = M + w12 + 50 * U; qy = CY + capH(qs) * 0.15; lx = qx; ly = qy + 70 * U; al = 'left';
  }
  const cell = textWidth('0', big, { fam: 'Anton' }) * 1.02;
  x.save();
  x.beginPath(); x.rect(nx - cell * 1.4, ny - capH(big) * 1.08, cell * 2.8, capH(big) * 1.16); x.clip();
  odoDigit(x, odoPos(v, 10), 10, nx - cell / 2, ny, big, P.red);
  odoDigit(x, odoPos(v, 1), 10, nx + cell / 2, ny, big, P.red);
  x.restore();
  up(x, 'QUESTIONS.', qx, qy, qs, (t - 8.1) / 0.6, { align: al, color: P.ink });
  label(x, 'UNE MINUTE, PAS PLUS.', lx, ly, t - 8.4, { align: al, size: 26, color: 'rgba(246,238,240,0.72)' });
}

/* ---------- 6. ton humeur, ton contexte, ton temps (9–10,5) ---------- */
const TON = ['HUMEUR,', 'CONTEXTE,', 'TEMPS.'];
const TON_T = [9.15, 9.62, 10.12];
function mTon(x, t) {
  fill(x, P.blk);
  const M = M_();
  if (PORT) {
    const size = fitSize('CONTEXTE,', W * 0.84, W, { fam: 'Anton' });
    const y1 = CY - 20 * U, y2 = y1 + size * 1.02;
    up(x, 'TON', CX, y1, size, (t - 9.05) / 0.6, { align: 'center', color: P.ink });
    rollWord(x, TON, TON_T, 0.22, CX, y2, size, t, { align: 'center', color: P.red });
    rollWord(x, ['01 / 03', '02 / 03', '03 / 03'], TON_T, 0.22, CX, y1 - size * 1.1, 26 * U, t, { fam: 'Archivo', wt: 700, track: 0.28, align: 'center', color: 'rgba(246,238,240,0.6)' });
  } else {
    const size = fitSize('TON CONTEXTE,', W * 0.86, H * 0.3, { fam: 'Anton' });
    const Y = CY + capH(size) / 2;
    up(x, 'TON', M, Y, size, (t - 9.05) / 0.6, { color: P.ink });
    const wx = M + textWidth('TON ', size, { fam: 'Anton' });
    rollWord(x, TON, TON_T, 0.22, wx, Y, size, t, { color: P.red });
    rollWord(x, ['01 / 03', '02 / 03', '03 / 03'], TON_T, 0.22, M, Y - capH(size) - 60 * U, 24 * U, t, { fam: 'Archivo', wt: 700, track: 0.28, color: 'rgba(246,238,240,0.6)' });
  }
}

/* ---------- 7. les humeurs (10,5–12,5), une toutes les doubles croches ---------- */
const MOODS_M = [
  ['RIRE', '01', P.red, P.dark], ['AVOIR PEUR', '02', P.blk, P.red], ['ÊTRE ÉMU', '04', P.pink, P.dark],
  ['RÉFLÉCHIR', '03', P.ink, P.dark], ['DE L’ADRÉNALINE', '05', P.red, P.ink], ['ÊTRE SURPRIS', '07', P.blk, P.ink],
  ['DÉCROCHER', '08', P.ink, P.red], ['M’ÉVADER', '06', P.blk, P.ink],
];
function moodSize(w) { return Math.min(PORT ? W * 0.3 : H * 0.4, fitSize(w, W * 0.86, H, { fam: 'Anton' })); }
function mMoods(x, t) {
  const k = Math.min(7, Math.floor((t - 10.5) / 0.25));
  const lt = t - 10.5 - k * 0.25;
  const [w, num, bg, fg] = MOODS_M[k];
  fill(x, bg);
  const size = moodSize(w);
  const e = EZ.out(prog(lt, 0, 0.18));
  const Y = CY + capH(size) / 2;
  x.save();
  const sc = lerp(1.14, 1, e);
  x.translate(CX, CY); x.scale(sc, sc); x.translate(-CX, -CY);
  drawText(x, w, CX, Y + (1 - e) * 26 * U, size, { fam: 'Anton', align: 'center', color: fg });
  x.restore();
  const fgc = fg === P.ink ? 'rgba(246,238,240,0.7)' : fg === P.red ? 'rgba(255,45,79,0.85)' : 'rgba(20,6,10,0.7)';
  drawText(x, 'CE SOIR, IL TE FAUT QUOI ?', CX, PORT ? H * 0.22 : H * 0.17, 24 * U * (PORT ? 1.15 : 1), { fam: 'Archivo', wt: 700, track: 0.28, align: 'center', color: fgc });
  drawText(x, num, CX, PORT ? H * 0.8 : H * 0.86, 24 * U * (PORT ? 1.15 : 1), { fam: 'Archivo', wt: 700, track: 0.28, align: 'center', color: fgc });
}

/* ---------- 8. le choix (12,5–14) ---------- */
function m8Geom() {
  const w = 'M’ÉVADER';
  const size = moodSize(w);
  const ww = textWidth(w, size, { fam: 'Anton' }), ch = capH(size);
  return { w, size, ww, ch, rx: ww / 2 + (PORT ? 60 : 90) * U, ry: ch / 2 + (PORT ? 70 : 80) * U, cy: CY };
}
function mChoice(x, t) {
  fill(x, P.blk);
  const G = m8Geom();
  x.save();
  const z = 1 + 0.04 * prog(t, 12.5, 13.6);
  x.translate(CX, CY); x.scale(z, z); x.translate(-CX, -CY);
  drawText(x, G.w, CX, CY + G.ch / 2, G.size, { fam: 'Anton', align: 'center', color: P.ink });
  // trait de marqueur qui entoure le choix, comme à la main
  const d = EZ.inOut(prog(t, 12.52, 12.98));
  if (d > 0) {
    x.save();
    x.translate(CX, CY); x.rotate(-0.045);
    x.strokeStyle = P.red; x.lineWidth = 8 * U; x.lineCap = 'round';
    x.beginPath(); x.ellipse(0, 0, G.rx, G.ry, 0, -Math.PI * 0.62, -Math.PI * 0.62 + Math.PI * 2.08 * d); x.stroke();
    x.restore();
  }
  label(x, '06 — PARTIR LOIN D’ICI', CX, CY + G.ry + (PORT ? 90 : 70) * U, t - 12.8, { align: 'center', size: 26, color: P.red });
  // le cercle se remplit et s'ouvre en grand : on passe au rouge
  const fl = EZ.inOut(prog(t, 13.55, 13.68));
  const gr = EZ.in(prog(t, 13.62, 14.0));
  if (fl > 0) {
    const k = 1 + gr * (Math.hypot(W, H) / Math.min(G.rx, G.ry)) * 1.2;
    x.save();
    x.translate(CX, CY); x.rotate(-0.045);
    x.globalAlpha = fl;
    x.fillStyle = P.red;
    x.beginPath(); x.ellipse(0, 0, G.rx * k, G.ry * k, 0, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  x.restore();
}

/* ---------- 9. les résultats (14–16), sur rouge ---------- */
const RES = [['L’ÉCHO DES ÉTOILES', 94], ['LE DERNIER SIGNAL', 89], ['ORBITE BASSE', 86], ['MER DE SABLE', 84], ['LES CARTOGRAPHES', 81]];
function m9Geom() {
  const M = M_();
  if (PORT) {
    const size = fitSize('ET EXPLIQUÉS.', W * 0.84, W, { fam: 'Anton' });
    const lh = size * 1.17;
    const y0 = H * 0.18 + capH(size);
    const rw = W * 0.84, rh = 112 * U, rx = M, ry0 = y0 + lh * 2 + size * 0.12 + 44 * U;
    return { size, lx: CX, al: 'center', y0, lh, rw, rh, rx, ry0, gap: 18 * U };
  }
  const size = fitSize('ET EXPLIQUÉS.', W * 0.46, H * 0.2, { fam: 'Anton' });
  const lh = size * 1.1;
  const y0 = CY - lh + capH(size) / 2;
  const rw = W * 0.36, rh = 108 * U, rx = W * 0.57, ry0 = CY - (rh * 5 + 18 * U * 4) / 2;
  return { size, lx: M, al: 'left', y0, lh, rw, rh, rx, ry0, gap: 18 * U };
}
function resRow(x, G, i, t, a = 1) {
  const e = EZ.out(prog(t, 15.12 + i * 0.07, 15.72 + i * 0.07));
  if (e <= 0) return;
  const X = G.rx + (1 - e) * W * 0.5, Y = G.ry0 + i * (G.rh + G.gap);
  x.save();
  x.globalAlpha = a * clamp(e * 2);
  x.fillStyle = P.dark;
  x.beginPath(); x.roundRect(X, Y, G.rw, G.rh, 16 * U); x.fill();
  if (i === 0) { x.strokeStyle = P.ink; x.lineWidth = 3 * U; x.stroke(); }
  const pad = 30 * U;
  drawText(x, String(i + 1).padStart(2, '0'), X + pad, Y + G.rh / 2 + 10 * U, 26 * U, { fam: 'Archivo', wt: 800, track: 0.1, color: 'rgba(255,45,79,0.9)' });
  const ts = Math.min(40 * U, fitSize(RES[i][0], G.rw * 0.55, 40 * U, { fam: 'Anton' }));
  drawText(x, RES[i][0], X + pad + 70 * U, Y + G.rh / 2 + ts * 0.36, ts, { fam: 'Anton', color: P.ink });
  const sc = Math.round(RES[i][1] * EZ.out(prog(t, 15.2 + i * 0.07, 15.9 + i * 0.07)));
  drawText(x, sc + '%', X + G.rw - pad, Y + G.rh / 2 + 18 * U, 52 * U, { fam: 'Anton', align: 'right', color: P.red });
  x.restore();
}
function mResults(x, t) {
  fill(x, P.red);
  const G = m9Geom();
  const L = [['CINQ FILMS,', 14.08, false], ['CLASSÉS', 14.55, true], ['ET EXPLIQUÉS.', 15.05, false]];
  L.forEach(([s, t0, outline], i) => {
    const Y = G.y0 + i * G.lh;
    if (outline) {
      const p = EZ.out(prog(t, t0, t0 + 0.6));
      x.save();
      x.beginPath(); x.rect(0, Y - G.size * 1.1, W, G.size * 1.4); x.clip();
      strokeWord(x, s, G.lx, Y + (1 - p) * G.size * 1.3, G.size, P.dark, 3 * U, { align: G.al });
      x.restore();
    } else up(x, s, G.lx, Y, G.size, (t - t0) / 0.6, { align: G.al, color: P.dark });
  });
  for (let i = 4; i >= 0; i--) resRow(x, G, i, t);
  // la ligne n°1 grandit jusqu'à devenir l'écran suivant
  const ex = EZ.inOut(prog(t, 15.85, 16.22));
  if (ex > 0) {
    const X = lerp(G.rx, 0, ex), Y = lerp(G.ry0, 0, ex), Wd = lerp(G.rw, W, ex), Hd = lerp(G.rh, H, ex);
    x.fillStyle = P.dark;
    x.beginPath(); x.roundRect(X, Y, Wd, Hd, lerp(16, 0, ex) * U); x.fill();
  }
}

/* ---------- 10. en une minute (16–18) ---------- */
function m10Geom() {
  if (PORT) {
    const r = W * 0.24;
    const ts = fitSize('EN UNE MINUTE.', W * 0.86, W, { fam: 'Anton' });
    return { cx: CX, cy: CY - H * 0.14, r, tx: CX, ty: CY + H * 0.12, ts, al: 'center' };
  }
  const r = H * 0.22;
  const ts = fitSize('EN UNE MINUTE.', W * 0.5, H * 0.24, { fam: 'Anton' });
  return { cx: W * 0.25, cy: CY, r, tx: W * 0.43, ty: CY + capH(ts) * 0.1, ts, al: 'left' };
}
function mMinute(x, t) {
  fill(x, P.dark);
  const G = m10Geom();
  // l'anneau se referme puis se resserre en point, qui s'étire en ligne
  const col = EZ.in(prog(t, 17.8, 17.98));
  const prg = EZ.inOut(prog(t, 16.15, 17.25));
  const pop = Math.sin(Math.PI * clamp((t - 17.25) / 0.25));
  const r = G.r * (1 - col * 0.97);
  x.save();
  x.globalAlpha = EZ.out(prog(t, 16.0, 16.25));
  x.strokeStyle = 'rgba(246,238,240,0.12)';
  x.lineWidth = 14 * U;
  x.beginPath(); x.arc(G.cx, G.cy, r, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = P.red;
  x.lineWidth = (14 + 10 * pop) * U * (1 - col) + 2 * U;
  x.lineCap = 'round';
  x.beginPath(); x.arc(G.cx, G.cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(prg, col)); x.stroke();
  if (col > 0) { x.fillStyle = P.red; x.beginPath(); x.arc(G.cx, G.cy, 10 * U * col + r * 0.0, 0, Math.PI * 2); x.fill(); }
  x.restore();
  // étincelles à la fermeture
  if (t > 17.25 && t < 17.55) {
    const p = (t - 17.25) / 0.3;
    x.save();
    x.strokeStyle = `rgba(255,45,79,${1 - p * p})`; x.lineWidth = 9 * U; x.lineCap = 'round';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
      const r0 = G.r * (1.12 + 0.45 * EZ.out(p)), r1 = r0 + 70 * U * (1 - EZ.out(p));
      x.beginPath(); x.moveTo(G.cx + Math.cos(a) * r0, G.cy + Math.sin(a) * r0); x.lineTo(G.cx + Math.cos(a) * r1, G.cy + Math.sin(a) * r1); x.stroke();
    }
    x.restore();
  }
  const s = Math.round(60 * prg);
  x.save();
  x.globalAlpha = 1 - col;
  drawText(x, '0:' + String(s).padStart(2, '0'), G.cx, G.cy + capH(G.r * 0.42) / 2, G.r * 0.42, { fam: 'Anton', align: 'center', color: P.ink });
  const out = EZ.in(prog(t, 17.75, 17.95));
  x.translate(-out * 80 * U, 0);
  x.globalAlpha = 1 - out;
  up(x, 'EN UNE MINUTE.', G.tx, G.ty, G.ts, (t - 16.12) / 0.6, { align: G.al, color: P.ink });
  up(x, 'PAS TRENTE.', G.tx, G.ty + G.ts * 1.05, G.ts, (t - 17.0) / 0.6, { align: G.al, color: P.red });
  x.restore();
  // le point devient une ligne verticale au centre de l'écran
  const ln = EZ.inOut(prog(t, 17.96, 18.12));
  if (ln > 0) {
    const lx = lerp(G.cx, CX, ln), ly = lerp(G.cy, CY, ln);
    x.fillStyle = P.red;
    const hh = lerp(20 * U, (PORT ? W : H) * 1.1, ln);
    if (PORT) x.fillRect(lx - hh / 2, ly - 3 * U, hh, 6 * U);
    else x.fillRect(lx - 3 * U, ly - hh / 2, 6 * U, hh);
  }
}

/* ---------- 11. mode duo (18–20), écran partagé ---------- */
function mDuo(x, t) {
  fill(x, P.dark);
  const op = EZ.inOut(prog(t, 18.1, 18.45));
  const out = EZ.inOut(prog(t, 19.85, 20.2));
  const halves = PORT
    ? [{ r: [0, CY - (H / 2) * op, W, (H / 2) * op], bg: P.ink, l: ['DEUX', 'HUMEURS.'], dx: -W * out, dy: 0 },
       { r: [0, CY, W, (H / 2) * op], bg: P.red, l: ['UN SEUL', 'FILM.'], dx: W * out, dy: 0 }]
    : [{ r: [CX - (W / 2) * op, 0, (W / 2) * op, H], bg: P.ink, l: ['DEUX', 'HUMEURS.'], dx: 0, dy: -H * out },
       { r: [CX, 0, (W / 2) * op, H], bg: P.red, l: ['UN SEUL', 'FILM.'], dx: 0, dy: H * out }];
  halves.forEach((h, i) => {
    x.save();
    x.translate(h.dx, h.dy);
    x.beginPath(); x.rect(...h.r); x.clip();
    x.fillStyle = h.bg; x.fillRect(...h.r);
    const hw = PORT ? W : W / 2, hcx = PORT ? CX : (i === 0 ? W / 4 : W * 0.75), hcy = PORT ? (i === 0 ? H / 4 : H * 0.75) : CY;
    const size = Math.min(PORT ? H * 0.14 : H * 0.24, fitSize('HUMEURS.', hw * 0.8, H, { fam: 'Anton' }));
    const y1 = hcy - size * 0.5 + capH(size) / 2;
    words(x, h.l[0], hcx, y1, size, t - 18.38 - i * 0.18, { align: 'center', color: P.dark });
    words(x, h.l[1], hcx, y1 + size * 1.02, size, t - 18.46 - i * 0.18, { align: 'center', color: P.dark });
    if (i === 0) label(x, '— MODE DUO', hcx, PORT ? H * 0.08 : H * 0.12, t - 18.5, { align: 'center', size: 24, color: 'rgba(20,6,10,0.7)' });
    x.restore();
  });
  // le trait rouge de l'anneau s'efface dans le filet central
  const rl = 1 - prog(t, 18.12, 18.4);
  if (rl > 0 && t >= 18.12) {
    x.fillStyle = `rgba(255,45,79,${rl})`;
    if (PORT) x.fillRect(0, CY - 3 * U, W, 6 * U); else x.fillRect(CX - 3 * U, 0, 6 * U, H);
  }
  // filet central
  if (op > 0 && out < 1) {
    x.fillStyle = P.dark;
    if (PORT) x.fillRect(0, CY - 2 * U, W, 4 * U); else x.fillRect(CX - 2 * U, 0, 4 * U, H);
  }
}

/* ---------- 12. gratuit (20–21) ---------- */
function mFree(x, t) {
  fill(x, P.blk);
  const size = Math.min(PORT ? W * 0.3 : H * 0.5, fitSize('GRATUIT.', W * 0.86, H, { fam: 'Anton' }));
  const Y = CY + capH(size) * 0.42;
  const e = EZ.out(prog(t, 20.0, 20.3));
  const ex = EZ.in(prog(t, 20.86, 21.06));
  x.save();
  const sc = lerp(1.4, 1, e) * (1 + ex * 5);
  x.translate(CX, CY); x.scale(sc, sc); x.translate(-CX, -CY);
  x.globalAlpha = clamp((t - 20.0) / 0.04) * (1 - ex);
  drawText(x, 'GRATUIT.', CX, Y, size, { fam: 'Anton', align: 'center', color: P.red });
  x.restore();
  x.save();
  x.globalAlpha = 1 - ex;
  label(x, 'PARCOURS ILLIMITÉS · CATALOGUE EN ACCÈS LIBRE', CX, Y + 90 * U, t - 20.3, { align: 'center', size: PORT ? 20 : 24, color: 'rgba(246,238,240,0.75)' });
  x.restore();
}

/* ---------- 13. sans inscription (21–22,5) ---------- */
function mNoAccount(x, t) {
  fill(x, P.blk);
  const fw = PORT ? W * 0.82 : W * 0.34, fh = (PORT ? 120 : 84) * U, fgap = (PORT ? 28 : 22) * U, fs = (PORT ? 44 : 32) * U;
  const fx = CX - fw / 2, fy = CY - (PORT ? 470 : 250) * U;
  const ap = EZ.out(prog(t, 21.02, 21.25));
  const strike = EZ.inOut(prog(t, 21.25, 21.45));
  const drop = EZ.in(prog(t, 21.5, 21.82));
  x.save();
  x.globalAlpha = ap * (1 - drop);
  x.translate(0, (1 - ap) * 30 * U + drop * 180 * U);
  x.translate(CX, fy + fh); x.rotate(drop * 0.1); x.translate(-CX, -(fy + fh));
  for (const [k, txt] of [[0, 'Créer un compte'], [1, 'Mot de passe']]) {
    const yy = fy + k * (fh + fgap);
    x.strokeStyle = 'rgba(246,238,240,0.35)'; x.lineWidth = 2 * U;
    x.beginPath(); x.roundRect(fx, yy, fw, fh, 12 * U); x.stroke();
    drawText(x, txt, fx + 30 * U, yy + fh / 2 + fs * 0.35, fs, { fam: 'Archivo', wt: 500, color: 'rgba(246,238,240,0.55)' });
  }
  // chaque champ est barré d'un trait rouge, l'un après l'autre
  const strike2 = EZ.inOut(prog(t, 21.33, 21.5));
  x.fillStyle = P.red;
  x.fillRect(fx - 24 * U, fy + fh / 2 - 3.5 * U, (fw + 48 * U) * strike, 7 * U);
  x.fillRect(fx - 24 * U, fy + fh + fgap + fh / 2 - 3.5 * U, (fw + 48 * U) * strike2, 7 * U);
  x.restore();
  const size = PORT ? fitSize('INSCRIPTION.', W * 0.86, W, { fam: 'Anton' }) : fitSize('SANS INSCRIPTION.', W * 0.86, H * 0.28, { fam: 'Anton' });
  const e = EZ.out(prog(t, 21.55, 21.85));
  x.save();
  x.globalAlpha = clamp((t - 21.55) / 0.04);
  const sc = lerp(1.25, 1, e);
  const yb = CY + (PORT ? 120 : 140) * U;
  x.translate(CX, yb); x.scale(sc, sc); x.translate(-CX, -yb);
  if (PORT) {
    drawText(x, 'SANS', CX, yb, size, { fam: 'Anton', align: 'center', color: P.ink });
    drawText(x, 'INSCRIPTION.', CX, yb + size * 1.02, size, { fam: 'Anton', align: 'center', color: P.ink });
  } else drawText(x, 'SANS INSCRIPTION.', CX, yb, size, { fam: 'Anton', align: 'center', color: P.ink });
  x.restore();
  label(x, 'AUCUN COMPTE DEMANDÉ.', CX, yb + (PORT ? size * 1.02 + 90 * U : 90 * U), t - 21.85, { align: 'center', size: 26, color: P.red });
}

/* ---------- 14. la promesse (22,5–25,5), sur rouge ---------- */
function m14Geom() {
  const lines = ['LE FILM', 'QUI COLLE', 'À TON MOMENT.'];
  const size = fitSize('À TON MOMENT.', W * (PORT ? 0.86 : 0.8), PORT ? W : H * 0.25, { fam: 'Anton' });
  const lh = size * 1.0;
  const y0 = CY - lh + capH(size) / 2;
  return { lines, size, lh, y0, x: PORT ? CX : M_(), al: PORT ? 'center' : 'left' };
}
function mPromise(x, t) {
  fill(x, P.red);
  const G = m14Geom();
  const sq = EZ.in(prog(t, 25.0, 25.22));
  const grow = EZ.inOut(prog(t, 25.2, 25.5));
  x.save();
  const z = 1 + 0.03 * prog(t, 22.5, 25.0);
  x.translate(CX, CY); x.scale(z, 1 - sq * 0.985); x.translate(-CX, -CY);
  G.lines.forEach((s, i) => up(x, s, G.x, G.y0 + i * G.lh, G.size, (t - 22.8 - i * 0.5) / 0.6, { align: G.al, color: P.dark }));
  x.restore();
  // le texte écrasé devient une barre noire qui envahit l'écran
  if (sq > 0.6) {
    const bw = lerp(W * 0.7, W, grow), bh = lerp(14 * U, H, grow);
    x.fillStyle = P.blk;
    x.fillRect(CX - bw / 2, CY - bh / 2, bw, bh);
  }
}

/* ---------- 15. signature (25,5–30) ---------- */
function mEnd(x, t) {
  fill(x, P.blk);
  const G = logoLayout(PORT ? 1 : 0.95);
  const base = CY - (PORT ? 160 : 70) * U;
  x.save();
  const z = 1 + 0.02 * prog(t, 25.5, 30);
  x.translate(CX, CY); x.scale(z, z); x.translate(-CX, -CY);
  drawLogo(x, base, 25.56, t, P.ink, P.red, PORT ? 1 : 0.95);
  const ul = EZ.inOut(prog(t, 26.0, 26.35));
  x.fillStyle = P.red;
  x.fillRect(G.x0, base + 28 * U, G.L.w * ul, 9 * U);
  // pastille d'adresse : le contour se dessine, l'adresse se tape
  const us = (PORT ? 64 : 54) * U;
  const url = 'cinem00d.com';
  const uw = textWidth(url, us, { fam: 'Archivo', wt: 700 });
  const pw = uw + 150 * U, ph = us * 1.9;
  const px = CX - pw / 2, py = base + (PORT ? 150 : 120) * U;
  const dr = EZ.inOut(prog(t, 26.45, 26.95));
  if (dr > 0) {
    const per = 2 * (pw + ph);
    x.save();
    x.strokeStyle = P.red; x.lineWidth = 3 * U;
    x.setLineDash([per * dr, per]);
    x.beginPath(); x.roundRect(px, py, pw, ph, ph / 2); x.stroke();
    x.restore();
  }
  const n = Math.floor(url.length * clamp((t - 26.58) / 0.5));
  let ux = CX - uw / 2 - 30 * U;
  const ub = py + ph / 2 + us * 0.36;
  for (let i = 0; i < n; i++) {
    const c = url[i];
    drawText(x, c, ux, ub, us, { fam: 'Archivo', wt: 700, color: i === 5 || i === 6 ? P.red : P.ink });
    ux += textWidth(c, us, { fam: 'Archivo', wt: 700 });
  }
  if (t > 26.5 && t < 27.6 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = P.red; x.fillRect(ux + 4 * U, ub - us * 0.78, 4 * U, us * 0.92); }
  const ar = EZ.out(prog(t, 27.05, 27.45));
  if (ar > 0) {
    x.save();
    x.globalAlpha = ar;
    drawText(x, '→', px + pw - 60 * U - (1 - ar) * 30 * U, ub, us, { fam: 'Archivo', wt: 700, align: 'center', color: P.red });
    x.restore();
  }
  label(x, 'GRATUIT  ·  SANS INSCRIPTION  ·  MODE DUO', CX, py + ph + 80 * U, t - 27.35, { align: 'center', size: PORT ? 20 : 22, color: 'rgba(246,238,240,0.6)' });
  x.restore();
}

/* ---------- transitions ---------- */
/* volet double (rose puis rouge) qui découvre le plan suivant */
function wipeH(x, t, a, drawA, drawB) {
  const e1 = EZ.inOut(prog(t, a, a + 0.3)), e2 = EZ.inOut(prog(t, a + 0.06, a + 0.36));
  drawA(x);
  x.fillStyle = P.pink; x.fillRect(0, 0, W * e1, H);
  x.save(); x.beginPath(); x.rect(0, 0, W * e2, H); x.clip(); drawB(x); x.restore();
}
function wipeV(x, t, a, drawA, drawB) {
  const e1 = EZ.inOut(prog(t, a, a + 0.3)), e2 = EZ.inOut(prog(t, a + 0.06, a + 0.36));
  drawA(x);
  x.fillStyle = P.pink; x.fillRect(0, H * (1 - e1), W, H * e1);
  x.save(); x.beginPath(); x.rect(0, H * (1 - e2), W, H * e2); x.clip(); drawB(x); x.restore();
}
/* lamelles horizontales qui partent en alternance */
function slices(x, t, a, drawA, drawB, n = 8) {
  drawB(x);
  const h = H / n;
  for (let i = 0; i < n; i++) {
    const e = EZ.inOut(prog(t, a + i * 0.02, a + 0.26 + i * 0.02));
    if (e >= 1) continue;
    x.save();
    x.beginPath(); x.rect(0, i * h - 0.5, W, h + 1); x.clip();
    x.translate((i % 2 ? 1 : -1) * W * 1.05 * e, 0);
    drawA(x);
    x.restore();
  }
}
/* iris : un disque qui part d'un point et découvre le plan suivant */
function iris(x, t, a, b, cx, cy, r0, drawA, drawB) {
  const e = EZ.inOut(prog(t, a, b));
  drawA(x);
  const r = lerp(r0, Math.hypot(W, H), e);
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip(); drawB(x); x.restore();
}
/* poussée verticale : le plan monte et le suivant arrive par le bas */
function pushUp(x, t, a, b, drawA, drawB) {
  const e = EZ.inOut(prog(t, a, b));
  const d = H * 1.02;
  x.save(); x.beginPath(); x.rect(0, -d * e, W, H); x.clip(); x.translate(0, -d * e); drawA(x); x.restore();
  x.save(); x.beginPath(); x.rect(0, d * (1 - e), W, H); x.clip(); x.translate(0, d * (1 - e)); drawB(x); x.restore();
}

/* ---------- montage ---------- */
const TIMELINE = [
  { a: 0.0, b: 2.0, fn: (x, lt, t) => mCounter(x, t) },
  { a: 2.0, b: 2.4, fn: (x, lt, t) => wipeH(x, t, 2.0, (c) => mCounter(c, t), (c) => mVerbs(c, t)) },
  { a: 2.4, b: 3.95, fn: (x, lt, t) => mVerbs(x, t) },
  { a: 3.95, b: 4.35, fn: (x, lt, t) => slices(x, t, 3.95, (c) => mVerbs(c, t), (c) => mQuestion(c, t)) },
  { a: 4.35, b: 5.72, fn: (x, lt, t) => mQuestion(x, t) },
  { a: 5.72, b: 6.12, fn: (x, lt, t) => { const L = m3Layout(); iris(x, t, 5.72, 6.12, L.dot.x, L.dot.y, L.dot.r * 1.7, (c) => mQuestion(c, t), (c) => mLogo(c, t)); } },
  { a: 6.12, b: 8.02, fn: (x, lt, t) => mLogo(x, t) },
  { a: 8.02, b: 8.95, fn: (x, lt, t) => mTwelve(x, t) },
  { a: 8.95, b: 9.3, fn: (x, lt, t) => pushUp(x, t, 8.95, 9.3, (c) => mTwelve(c, t), (c) => mTon(c, t)) },
  { a: 9.3, b: 10.5, fn: (x, lt, t) => mTon(x, t) },
  { a: 10.5, b: 12.5, fn: (x, lt, t) => mMoods(x, t) },
  { a: 12.5, b: 14.0, fn: (x, lt, t) => mChoice(x, t) },
  { a: 14.0, b: 16.22, fn: (x, lt, t) => mResults(x, t) },
  { a: 16.22, b: 18.12, fn: (x, lt, t) => mMinute(x, t) },
  { a: 18.12, b: 20.2, fn: (x, lt, t) => mDuo(x, t) },
  { a: 20.2, b: 21.0, fn: (x, lt, t) => mFree(x, t) },
  { a: 21.0, b: 22.4, fn: (x, lt, t) => mNoAccount(x, t) },
  { a: 22.4, b: 22.8, fn: (x, lt, t) => wipeV(x, t, 22.4, (c) => mNoAccount(c, t), (c) => mPromise(c, t)) },
  { a: 22.8, b: 25.5, fn: (x, lt, t) => mPromise(x, t) },
  { a: 25.5, b: 30.01, fn: (x, lt, t) => mEnd(x, t) },
];
/* le duo se retire sur le noir de « gratuit » : on dessine gratuit dessous */
TIMELINE[14].fn = (x, lt, t) => { if (t >= 19.85) mFree(x, Math.max(t, 20.0)); mDuoOver(x, t); };
function mDuoOver(x, t) {
  if (t < 19.85) { mDuo(x, t); return; }
  // pendant la sortie, seul ce qui reste des deux moitiés est dessiné
  const out = EZ.inOut(prog(t, 19.85, 20.2));
  x.save();
  if (PORT) { x.beginPath(); x.rect(-W * out, 0, W, CY); x.rect(W * out, CY, W, H / 2); x.clip(); }
  else { x.beginPath(); x.rect(0, -H * out, CX, H); x.rect(CX, H * out, CX, H); x.clip(); }
  mDuo(x, t);
  x.restore();
}

function motionBlurAt(t) {
  const W_ = (a, b) => t >= a && t < b;
  const win = [
    [0.95, 1.62, 16, 0.8], [2.0, 2.42, 12, 1], [3.95, 4.38, 16, 1], [5.5, 6.15, 24, 1], [7.55, 8.05, 24, 1],
    [8.05, 8.55, 8, 0.8], [8.95, 9.32, 16, 1], [13.55, 14.05, 16, 1], [15.1, 15.75, 8, 0.8], [15.85, 16.25, 12, 1],
    [17.75, 18.47, 12, 1], [19.85, 20.25, 16, 1], [20.85, 21.08, 16, 1], [21.48, 21.88, 8, 0.9], [22.4, 22.82, 12, 1],
    [25.0, 25.55, 12, 1], [25.55, 25.95, 6, 0.8],
  ];
  for (const [a, b, n, s] of win) if (W_(a, b)) return { n, shutter: s };
  for (const s0 of VERB_T.concat(TON_T)) if (W_(s0, s0 + 0.24)) return { n: 12, shutter: 1 };
  for (let k = 0; k < 8; k++) if (W_(10.5 + k * 0.25, 10.5 + k * 0.25 + 0.14)) return { n: 8, shutter: 0.8 };
  for (const s0 of [14.08, 14.55, 15.05, 16.12, 17.0, 22.8, 23.3, 23.8, 9.05, 8.1, 4.12, 4.4, 18.38, 18.56]) if (W_(s0, s0 + 0.22)) return { n: 6, shutter: 0.8 };
  if (W_(2.4, 3.95)) return { n: 2, shutter: 0.6 };
  return { n: 1, shutter: 0 };
}
function fxAt(t) {
  const fx = { letterbox: 0, grain: 0.05, vignette: 0.18, bloom: 0, chroma: 0, shake: { x: 0, y: 0 }, flash: 0, flashCol: [255, 255, 255], fade: 0 };
  for (const [ti, a] of [[6.0, 0.5], [14.0, 0.5], [20.0, 0.8], [21.55, 0.6], [25.5, 0.5]]) {
    const d = t - ti;
    if (d >= 0 && d < 0.25) { const s = shake(t, 8 * a * (1 - d / 0.25) ** 2, 30, ti); fx.shake.x += s.x; fx.shake.y += s.y; }
  }
  fx.fade = Math.max(1 - prog(t, 0, 0.1), EZ.in(prog(t, 29.3, 30)));
  return fx;
}
