/* CinéMood — version 15 s, sur les textes de la version du site du 20 octobre :
   « Heureux, triste, amoureux, crevé ? Dis comment tu te sens : CinéMood te trouve le film qui va avec.
   Ton meilleur choix + 4 autres, en une minute. Gratuit, sans inscription. » et le nouveau titre
   « Ton humeur choisit ton film ». Deux scènes neuves (l'accroche, la minute) ; les autres viennent de
   mograph.js, accélérées par morceaux comme dans short.js. */
'use strict';

Object.assign(TXT.C, { kick: 'TON HUMEUR', lines: ['DIS COMMENT', 'TU TE SENS.'] });
Object.assign(TXT.E, { kick: 'LE TRI', port: ['ON TE TROUVE LE FILM', [['QUI VA AVEC.', C.red]]], land: ['ON TE TROUVE', 'LE FILM', [['QUI VA AVEC.', C.red]]],
  sub: 'Chaque film est vérifié deux fois : par ses genres, puis par ses mots-clés.' });
Object.assign(TXT.F, { kick: 'TON RÉSULTAT', lines: ['TON MEILLEUR CHOIX', [['+ 4 AUTRES.', C.red]]], tsLand: 74, sub: 'Chacun avec la raison de sa place.',
  alt: ['Classés selon', 'ton moment.'] });
Object.assign(TXT.I, { kick: 'EN UNE MINUTE  ·  GRATUIT  ·  SANS INSCRIPTION', tag: [['TON HUMEUR CHOISIT TON ', C.cream], ['FILM.', C.red]] });

/* ---------- accroche (0–3 s) : quatre humeurs, une par temps, puis le titre du site ---------- */
const HOOK = [
  { k: 'heureux', w: 'HEUREUX ?', bg: C.cream, face: C.ink, line: C.cream, col: C.ink },
  { k: 'triste', w: 'TRISTE ?', bg: C.red, face: C.cream, line: C.ink, col: C.cream },
  { k: 'amoureux', w: 'AMOUREUX ?', bg: C.pink, face: C.ink, line: C.cream, col: C.ink },
  { k: 'fatigue', w: 'CREVÉ ?', bg: C.blk, face: C.cream, line: C.ink, col: C.cream },
];
function sHook(x, t) {
  const fy = PORT ? 760 : 430, fr = PORT ? 190 : 150, wy = PORT ? 1185 : 812, ws = PORT ? 168 : 168;
  const rowY = PORT ? 560 : 290, rowR = PORT ? 70 : 60, rowDx = PORT ? 190 : 165;
  const reg = EZ.inOut(prog(t, 2.0, 2.35));
  x.fillStyle = C.cream; x.fillRect(0, 0, W, H);
  HOOK.forEach((h, k) => {
    const s0 = k * 0.5;
    if (t < s0) return;
    // le fond de l'humeur s'ouvre depuis le visage
    const iu = k === 0 ? 1 : EZ.out(prog(t, s0, s0 + 0.2));
    x.beginPath(); x.arc(CX, fy, iu * Math.hypot(W, H), 0, TAU); x.fillStyle = h.bg; x.fill();
  });
  const cur = Math.min(3, Math.floor(t / 0.5));
  HOOK.forEach((h, k) => {
    const s0 = k * 0.5, pop = spr(t - s0, 14, 7);
    if (pop <= 0) return;
    if (k < cur && t < 2.0) return; // les humeurs précédentes sont recouvertes
    // à 2 s, les quatre visages se rangent en ligne
    const tx = CX + (k - 1.5) * rowDx;
    const rp = k === 3 ? reg : spr(t - (2.0 + k * 0.05), 14, 7);
    const big = k === cur && t < 2.0;
    let cx = CX, cy = fy, r = fr * pop;
    if (t >= 2.0) {
      if (k === 3) { cx = lerp(CX, tx, reg); cy = lerp(fy, rowY, reg); r = lerp(fr, rowR, reg); }
      else { cx = tx; cy = rowY; r = rowR * rp; }
    } else if (!big) return;
    const fill = t >= 2.0 ? [C.cream, C.red, C.pink, C.cream][k] : h.face;
    const line = t >= 2.0 ? C.ink : h.line;
    disc(x, cx, cy, r, fill);
    face(x, cx, cy, r, h.k, { line, rot: (1 - Math.min(1, pop)) * -0.4, heart: C.red });
  });
  HOOK.forEach((h, k) => {
    const s0 = k * 0.5;
    if (Math.min(3, Math.floor(t / 0.5)) !== k && !(k === 3 && t >= 2.0)) return;
    tl(x, h.w, CX, wy, ws, t, s0 + 0.03, k === 3 ? 2.0 : null, { align: 'center', color: h.col, inD: 0.32, outD: 0.2 });
  });
  // le titre du site
  const ty = PORT ? 960 : 600, ts = PORT ? 150 : 140;
  if (PORT) {
    tl(x, 'TON HUMEUR', CX, ty, ts, t, 2.12, null, { align: 'center' });
    tl(x, [['CHOISIT', C.red]], CX, ty + ts * 1.05, ts, t, 2.2, null, { align: 'center' });
    tl(x, [['TON FILM.', C.red]], CX, ty + ts * 2.1, ts, t, 2.28, null, { align: 'center' });
  } else {
    tl(x, 'TON HUMEUR', CX, ty, ts, t, 2.12, null, { align: 'center' });
    tl(x, [['CHOISIT TON FILM.', C.red]], CX, ty + ts * 1.06, ts, t, 2.2, null, { align: 'center' });
  }
  const cu = EZ.in(prog(t, 2.62, 3.0));
  if (cu > 0) { x.beginPath(); x.arc(CX, rowY, cu * Math.hypot(W, H) * 1.05, 0, TAU); fillRegion(x, 'cream'); }
}

/* ---------- en une minute (1,25 s) : le chrono fait le tour ---------- */
function sMinute(x, t) {
  bgFill(x, 'blk');
  const cy = PORT ? 800 : 420, r = PORT ? 230 : 205;
  const s = spr(t, 13, 7), v = EZ.inOut(prog(t, 0.1, 0.88));
  x.lineCap = 'round';
  x.lineWidth = 22 * s; x.strokeStyle = cream(0.14); x.beginPath(); x.arc(CX, cy, r * s, 0, TAU); x.stroke();
  if (v > 0) { x.strokeStyle = C.red; x.beginPath(); x.arc(CX, cy, r * s, -Math.PI / 2, -Math.PI / 2 + v * TAU); x.stroke(); }
  x.fillStyle = C.cream; rrp(x, CX - 26 * s, cy - r * s - 62 * s, 52 * s, 30 * s, 8); x.fill();
  x.fillRect(CX - 7 * s, cy - r * s - 36 * s, 14 * s, 26 * s);
  const sec = Math.round(60 * v);
  textMid(x, sec >= 60 ? '1:00' : `0:${String(sec).padStart(2, '0')}`, CX, cy, (PORT ? 150 : 130) * s, { fam: 'Anton', align: 'center', color: C.cream });
  const d = t - 0.88;
  if (d > 0 && d < 0.4) { x.save(); x.globalAlpha = 1 - d / 0.4; x.strokeStyle = C.red; x.lineWidth = 6; x.beginPath(); x.arc(CX, cy, r + 30 + d * 260, 0, TAU); x.stroke(); x.restore(); }
  if (PORT) { tl(x, 'EN UNE', CX, 1290, 170, t, 0.12, null, { align: 'center' }); tl(x, [['MINUTE.', C.red]], CX, 1470, 170, t, 0.2, null, { align: 'center' }); }
  else tl(x, [['EN UNE ', C.cream], ['MINUTE.', C.red]], CX, 860, 150, t, 0.12, null, { align: 'center' });
}

/* ---------- montage : d = durée à l'écran ; p = morceaux [début, fin (temps de la scène), vitesse relative] ---------- */
const SDUR = 15;
const SCENES = [
  { d: 3.0, fn: sHook, p: [[0, 3.0, 1]] },
  { d: 2.0, fn: sC, p: [[8.75, 12.35, 1]] },
  { d: 2.0, fn: sE, p: [[19.2, 23.8, 1]] },
  { d: 2.5, fn: sF, p: [[23.8, 26.9, 2.0], [26.9, 27.35, 3.0], [27.35, 28.55, 1.8]] },
  { d: 1.25, fn: sMinute, p: [[0, 1.25, 1]] },
  { d: 1.0, fn: sH, p: [[35.2, 36.9, 1]] },
  { d: 3.25, fn: sI, p: [[36.9, 40.6, 1]] },
];
const PIECES = [];
(() => {
  let t = 0;
  SCENES.forEach((sc, si) => {
    const nat = sc.p.reduce((a, [A, B, v]) => a + (B - A) / v, 0);
    for (const [A, B, v] of sc.p) { const d = (((B - A) / v) * sc.d) / nat; PIECES.push({ a: t, b: t + d, A, B, fn: sc.fn, si }); t += d; }
  });
})();
function pieceAt(t) { for (const p of PIECES) if (t < p.b) return p; return PIECES[PIECES.length - 1]; }
function warpT(tk, tc) {
  const pc = pieceAt(tc), pk = pieceAt(tk), p = pk.si === pc.si ? pk : pc;
  return { T: p.A + ((clamp(tk, p.a, p.b - 1e-6) - p.a) / (p.b - p.a)) * (p.B - p.A), fn: p.fn };
}
const OWN = [sHook, sMinute];
function shortBlurAt(t) {
  const w = warpT(t, t);
  if (OWN.includes(w.fn)) return { n: 8, shutter: 0.55 };
  return { n: Math.max(8, motionBlurAt(w.T).n), shutter: 0.55 };
}
function shortFx(t) {
  const w = warpT(t, t);
  const fx = OWN.includes(w.fn) ? { shake: { x: 0, y: 0 }, env: 0, vignette: w.fn === sMinute ? 0.3 : 0.06, grain: 0.05 } : fxAt(w.T);
  fx.fade = Math.max(1 - t / 0.06, prog(t, SDUR - 0.35, SDUR));
  return fx;
}
