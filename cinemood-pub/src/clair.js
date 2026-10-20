/* CinéMood — « nouvelle version », lisible (20,5 s) : 8 questions au lieu de 12.
   Tout est vu de face et en grand : une information à la fois, avec un zoom sur la zone de l'écran
   dont on parle (compteur, réponses gardées, tickets, score, « Pourquoi lui »), et les 8 questions écrites
   en entier. S'appuie sur launch.js (textures, téléphone) et mograph.js (textes, ressorts, doigt). */
'use strict';

const CDUR = 20.5;
/* zones de l'écran de la question 2 (px CSS, mesurées sur le site) */
const ZQ = { row: [10, 80, 392, 66], counter: [350, 92, 52, 26], chip: [68, 91, 66, 27], tickets: [18, 241, 376, 358], t2: [18, 427, 376, 172] };
/* zones de la carte n°1 (px CSS dans la carte 384 × 1082) */
const ZC = { score: [272, 538, 100, 74], why: [26, 734, 334, 106] };
const QL = [
  ['TON HUMEUR', 'Comment tu te sens ce soir ?'], ['TON ÉVASION', 'Tu as envie de partir où ?'], ['PLUS PRÉCISÉMENT', 'Quel ailleurs ?'],
  ['TON SEUIL', 'Tu te sens prêt à être secoué comment ?'], ['TON PUBLIC', 'Tu regardes avec qui ?'], ['TON TEMPS', 'Tu as combien de temps devant toi ?'],
  ['TON ÉPOQUE', 'Tu as envie d’un film de quelle époque ?'], ['DERNIÈRE QUESTION', 'Tu préfères un film connu, ou une découverte ?'],
];
const QT = (k) => 8.9 + k * 0.47; // instant où l'écran k s'affiche

/* ---------- vue : téléphone de face ; zooms sur une zone de l'écran ---------- */
const css2w = (x, y) => [x - SW / 2, y - SH / 2, 0];
function viewAt(t) {
  // [instant, centre visé (px CSS de l'écran), zoom, ancre écran]
  const P = PORT
    ? { full: [206, 470, 1.3, 540, 1240], row: [206, 113, 2.55, 540, 1020], tix: [206, 420, 2.6, 540, 1180], list: [206, 440, 0.78, 540, 1430], end: [206, 440, 1.02, 540, 1230] }
    : { full: [206, 440, 0.98, 1300, 540], row: [206, 113, 2.1, 1420, 540], tix: [206, 420, 2.2, 1360, 560], list: [206, 440, 0.88, 1430, 540], end: [206, 440, 0.94, 1330, 540] };
  const keys = [[0, P.full], [3.0, P.full], [3.5, P.row], [6.4, P.row], [6.9, P.tix], [8.4, P.tix], [8.9, P.list], [16.6, P.list], [17.1, P.end], [CDUR, P.end]];
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, A] = keys[i], [t1, B] = keys[i + 1], u = EZ.inOut(prog(t, t0, t1));
  const v = A.map((a, j) => lerp(a, B[j], u));
  return { yaw: 0, pitch: 0, roll: 0, zoom: v[2], T: css2w(v[0], v[1]), ax: v[3], ay: v[4] };
}
function scr2(rect) { // rectangle CSS de l'écran → rectangle à l'écran (vue de face)
  const a = proj(css2w(rect[0], rect[1])), b = proj(css2w(rect[0] + rect[2], rect[1] + rect[3]));
  return [a.x, a.y, b.x - a.x, b.y - a.y];
}
/* projecteur : assombrit tout sauf la zone, l'entoure de rouge */
function spot(x, R, a) {
  if (a <= 0) return;
  const [X, Y, w, h] = R, r = Math.min(18, h / 3);
  x.save();
  x.beginPath(); x.rect(0, 0, W, H); x.roundRect(X - 10, Y - 10, w + 20, h + 20, r);
  x.fillStyle = `rgba(6,3,4,${0.62 * a})`; x.fill('evenodd');
  rrp(x, X - 10, Y - 10, w + 20, h + 20, r); x.lineWidth = 4; x.strokeStyle = redA(0.95 * a); x.stroke();
  x.restore();
}
const lerpR = (A, B, u) => A.map((v, i) => lerp(v, B[i], u));

/* ---------- le film ---------- */
function sClair(x, t) {
  bgFill(x, 'blk');
  setCam(viewAt(t));
  const hg = x.createRadialGradient(CAM.ax, CAM.ay, 0, CAM.ax, CAM.ay, PORT ? 1100 : 900);
  hg.addColorStop(0, redA(0.26)); hg.addColorStop(0.5, redA(0.07)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  if (t < 12.8 || t >= 16.6) phoneClair(x, t);
  else cardClair(x, t);
  // fondu sombre derrière les textes : l'écran agrandi ne passe jamais sous un titre
  const g = PORT ? x.createLinearGradient(0, 0, 0, 560) : x.createLinearGradient(0, 0, 940, 0);
  g.addColorStop(0, 'rgba(8,4,6,0.94)'); g.addColorStop(0.72, 'rgba(8,4,6,0.82)'); g.addColorStop(1, 'rgba(8,4,6,0)');
  x.fillStyle = g;
  if (PORT) x.fillRect(0, 0, W, 560); else x.fillRect(0, 0, 940, H);
  captions(x, t);
}

function phoneClair(x, t) {
  // retournement (1,3–2,0 s) : 0 → π/2 (ancienne interface), −π/2 → 0 (nouvelle)
  const f = prog(t, 1.3, 2.0), first = f < 0.5;
  const ang = first ? EZ.in(f * 2) * (Math.PI / 2) : -(1 - EZ.out((f - 0.5) * 2)) * (Math.PI / 2);
  const U = [Math.cos(ang), 0, -Math.sin(ang)];
  let scr = first ? TXR.old_grey : TXR.m_q2, mix = null;
  if (t >= 8.4 && t < 12.8) {
    const k = clamp(Math.floor((t - QT(0)) / 0.47), 0, 7);
    scr = t < QT(0) ? TXR.m_q2 : TXR[`m_q${k + 1}`];
    if (t > 12.45) mix = { img: TXR.m_loading, a: prog(t, 12.45, 12.75) };
  }
  if (t >= 16.6) { scr = TXR.m_home; mix = t < 16.9 ? { img: TXR.m_results, a: 1 - prog(t, 16.6, 16.9) } : null; }
  const tap2 = t > 7.75 && t < 8.6;
  drawPhone(x, [0, 0, 0], U, EY, scr, {
    fitTop: first, mix, glare: ((t * 0.12) % 1.6) - 0.3,
    over: tap2 ? (g) => { const [rx, ry, rw, rh] = ZQ.t2; g.globalAlpha = prog(t, 7.75, 7.9); g.drawImage(TXR.m_q2_opt, rx - SW / 2, ry - SH / 2, rw, rh + 1); g.globalAlpha = 1; } : null,
  });
  // zooms commentés
  if (t > 3.45 && t < 8.55) {
    const a = EZ.out(prog(t, 3.45, 3.75)) * (1 - prog(t, 8.3, 8.55));
    let R;
    if (t < 6.4) R = lerpR(scr2(ZQ.counter), scr2(ZQ.chip), EZ.inOut(prog(t, 4.85, 5.25)));
    else R = lerpR(scr2(ZQ.chip), scr2(ZQ.t2), EZ.inOut(prog(t, 6.4, 6.9)));
    spot(x, R, a);
  }
  if (t > 7.4 && t < 8.6) {
    const R = scr2(ZQ.t2), px = R[0] + R[2] * 0.8, py = R[1] + R[3] * 0.62;
    finger(x, px, py, prog(t, 7.4, 7.55) * (1 - prog(t, 8.2, 8.4)), press(t, 7.75), false);
    ripple(x, px, py, t - 7.75, false);
  }
  if (t > 18.6) { // appui sur « Commencer »
    const R = scr2([46, 530, 320, 48]), px = R[0] + R[2] * 0.62, py = R[1] + R[3] * 0.5;
    finger(x, px, py, prog(t, 18.6, 18.8) * (1 - prog(t, 19.5, 19.8)), press(t, 19.1), false);
    ripple(x, px, py, t - 19.1, false);
  }
}

/* 12,8–16,6 s : la carte n°1 de face, puis zoom sur « Pourquoi lui », puis les quatre autres */
function cardClair(x, t) {
  const CW = 384, CH = 1082;
  const base = PORT ? { k: 1.18, cx: 540, cy: 1235 } : { k: 0.84, cx: 1330, cy: 545 };
  const why = PORT ? { k: 2.85, fx: 193, fy: 787, cx: 540, cy: 1230 } : { k: 2.45, fx: 193, fy: 787, cx: 1330, cy: 560 };
  const small = PORT ? { k: 0.78, cx: 540, cy: 980 } : { k: 0.72, cx: 1480, cy: 520 };
  // chargement bref, puis la carte sort de l'écran
  const show = EZ.out(prog(t, 12.95, 13.45));
  if (show < 1) {
    setCam(viewAt(12.79));
    drawPhone(x, [0, 0, 0], EX, EY, t < 12.95 ? TXR.m_loading : TXR.m_results, { alpha: 1 - show, mix: t < 12.95 ? null : null });
  }
  if (show <= 0) return;
  // trajectoire de la carte : de face → zoom sur « Pourquoi lui » → plus petite, avec les quatre autres
  const zIn = EZ.inOut(prog(t, 14.85, 15.3)), zOut = EZ.inOut(prog(t, 15.85, 16.25));
  const kb = lerp(0.35, base.k, show);
  let k = lerp(lerp(kb, why.k, zIn), small.k, zOut);
  // le point de la carte placé au centre : son centre, puis « Pourquoi lui »
  const fx = lerp(lerp(CW / 2, why.fx, zIn), CW / 2, zOut), fy = lerp(lerp(CH / 2, why.fy, zIn), CH / 2, zOut);
  const cx = lerp(lerp(base.cx, why.cx, zIn), small.cx, zOut), cy = lerp(lerp(base.cy, why.cy, zIn), small.cy, zOut);
  const X0 = cx - fx * k, Y0 = cy - fy * k;
  const toS = (r) => [X0 + r[0] * k, Y0 + r[1] * k, r[2] * k, r[3] * k];
  x.save(); x.globalAlpha = clamp(show * 1.6);
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 60; x.shadowOffsetY = 26;
  rrp(x, X0, Y0, CW * k, CH * k, 16 * k); x.fillStyle = '#0b0809'; x.fill();
  x.shadowColor = 'transparent';
  x.save(); rrp(x, X0, Y0, CW * k, CH * k, 16 * k); x.clip();
  x.drawImage(TXR.m_card_1_bars0, X0, Y0, CW * k, CH * k);
  const bars = EZ.out(prog(t, 13.45, 14.2)); // les jauges se remplissent
  x.beginPath(); for (const b of INF.m_cardBox.bars) x.rect(X0 + b.x * k, Y0 + (b.y - 4) * k, b.w * (b.v / 100) * bars * k, (b.h + 8) * k);
  x.clip(); x.drawImage(TXR.m_card_1, X0, Y0, CW * k, CH * k);
  x.restore();
  rrp(x, X0, Y0, CW * k, CH * k, 16 * k); x.lineWidth = 2; x.strokeStyle = redA(0.55); x.stroke();
  x.restore();
  // projecteur : le score, puis « Pourquoi lui »
  const sa = EZ.out(prog(t, 13.85, 14.1)) * (1 - prog(t, 14.7, 14.9));
  spot(x, toS(ZC.score), sa);
  const wa = EZ.out(prog(t, 15.15, 15.35)) * (1 - prog(t, 15.8, 16.0));
  spot(x, toS(ZC.why), wa);
  // les quatre autres
  const ALT = PORT ? { x0: 120, y: 1555, w: 190, gap: 26 } : { x0: 140, y: 690, w: 150, gap: 24 };
  for (let j = 0; j < 4; j++) {
    const u = EZ.out(prog(t, 16.0 + j * 0.07, 16.4 + j * 0.07));
    if (u <= 0) continue;
    const im = TXR[`m_card_${j + 2}`], w = ALT.w, h = w * 1.42, X = ALT.x0 + j * (w + ALT.gap), Y = ALT.y + (1 - u) * 60;
    x.save(); x.globalAlpha = u;
    rrp(x, X, Y, w, h, 10); x.clip();
    x.drawImage(im, 12 * 3, 12 * 3, 360 * 3, 511 * 3, X, Y, w, h); // l'affiche de la carte
    x.restore();
    x.save(); x.globalAlpha = u;
    drawText(x, `${FILMS[j + 1].m} %`, X + w / 2, Y + h + (PORT ? 52 : 44), PORT ? 40 : 34, { fam: 'Anton', align: 'center', color: C.red });
    x.restore();
  }
}

/* ---------- textes ---------- */
function captions(x, t) {
  const L = PORT ? { x: CX, al: 'center', k: 160, y1: 268, y2: 366, ts: 96, s: 440, sw: 940 } : { x: 140, al: 'left', k: 330, y1: 455, y2: 560, ts: 104, s: 640, sw: 620 };
  const o = { align: L.al };
  // 1. avant / maintenant
  const f = prog(t, 1.3, 2.0), first = f < 0.5, sy = first ? Math.cos(EZ.in(f * 2) * Math.PI / 2) : Math.cos((1 - EZ.out((f - 0.5) * 2)) * Math.PI / 2);
  kick(x, first ? 'AVANT' : 'MAINTENANT', L.x, L.k, t, 0.2, 2.85, Object.assign({ color: first ? cream(0.6) : C.red }, o));
  const na = EZ.out(prog(t, 0.25, 0.7)) * (1 - prog(t, 2.85, 3.1));
  if (na > 0) {
    x.save(); x.globalAlpha = na;
    const ny = L.y1 - L.ts * 0.36;
    x.translate(L.x, ny); x.scale(1, Math.max(0.02, sy)); x.translate(-L.x, -ny);
    const parts = first ? [['12', 'stroke'], [' QUESTIONS.', C.cream]] : [['8', C.red], [' QUESTIONS.', C.cream]];
    const ws = parts.map((p) => textWidth(p[0], L.ts, { fam: 'Anton' })), tot = ws[0] + ws[1];
    let x0 = L.al === 'center' ? L.x - tot / 2 : L.x;
    if (parts[0][1] === 'stroke') drawText(x, '12', x0, L.y1, L.ts, { fam: 'Anton', noFill: true, stroke: cream(0.85), lineWidth: 2.5 });
    else drawText(x, parts[0][0], x0, L.y1, L.ts, { fam: 'Anton', color: parts[0][1] });
    drawText(x, parts[1][0], x0 + ws[0], L.y1, L.ts, { fam: 'Anton', color: C.cream });
    const s = EZ.out(prog(t, 1.0, 1.25));
    if (first && s > 0) { x.strokeStyle = C.red; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0 - 10, L.y1 - L.ts * 0.3); x.lineTo(x0 - 10 + (ws[0] + 20) * s, L.y1 - L.ts * 0.3 - L.ts * 0.25 * s); x.stroke(); }
    x.restore();
  }
  para(x, 'Une nouvelle interface, plus claire.', L.x, L.y2, PORT ? 38 : 40, L.sw, t, 2.1, 2.85, Object.assign({ wt: 600, color: cream(0.85) }, o));
  // 2. l'interface, zone par zone
  const beats = [
    [3.5, 4.95, 'LE COMPTEUR', 'TU SAIS OÙ', [['TU EN ES.', C.red]]],
    [5.05, 6.4, 'TES RÉPONSES', 'ELLES RESTENT', [['AFFICHÉES.', C.red]]],
    [6.75, 8.3, 'LES TICKETS', 'UNE RÉPONSE,', [['UN APPUI.', C.red]]],
  ];
  for (const [a, b, kk, l1, l2] of beats) {
    kick(x, kk, L.x, L.k, t, a, b, o);
    tl(x, l1, L.x, L.y1, L.ts, t, a + 0.05, b, o);
    tl(x, l2, L.x, L.y2, L.ts, t, a + 0.12, b + 0.03, o);
  }
  // 3. les 8 questions, écrites en entier
  const Q = PORT ? { k: 130, t: 232, ts: 74, y0: 382, dy: 62, n: 34, q: 30, xn: 70, xq: 145 } : { k: 190, t: 290, ts: 76, y0: 392, dy: 74, n: 38, q: 31, xn: 140, xq: 215 };
  kick(x, 'LE PARCOURS', PORT ? CX : Q.xn, Q.k, t, 8.5, 12.65, { align: PORT ? 'center' : 'left' });
  tl(x, [['8 QUESTIONS. ', C.cream], ['MOINS D’UNE MINUTE.', C.red]], PORT ? CX : Q.xn, Q.t, PORT ? 62 : Q.ts, t, 8.55, 12.65, { align: PORT ? 'center' : 'left' });
  if (t > 8.8 && t < 12.95) {
    const out = prog(t, 12.6, 12.9);
    for (let k = 0; k < 8; k++) {
      const u = EZ.out(prog(t, QT(k) - 0.1, QT(k) + 0.2)) * (1 - out);
      if (u <= 0) continue;
      const cur = t >= QT(k) && (k === 7 || t < QT(k + 1));
      const y = Q.y0 + k * Q.dy, dx = (1 - u) * -30;
      x.save(); x.globalAlpha = u;
      drawText(x, String(k + 1).padStart(2, '0'), Q.xn + dx, y, Q.n, { fam: 'Anton', color: cur ? C.red : redA(0.55) });
      drawText(x, QL[k][1], Q.xq + dx, y, Q.q, { fam: 'Archivo', wt: 600, color: cur ? C.cream : cream(0.6) });
      x.restore();
    }
  }
  // 4. résultat
  const R4 = PORT ? { k: 160, y1: 268, y2: 366, ts: 92 } : { k: 300, y1: 420, y2: 520, ts: 96 };
  kick(x, 'TON RÉSULTAT', L.x, R4.k, t, 13.2, 16.5, o);
  tl(x, 'TON MEILLEUR CHOIX', L.x, R4.y1, R4.ts, t, 13.25, 14.75, o);
  tl(x, [['96 % POUR TON MOMENT.', C.red]], L.x, R4.y2, R4.ts * 0.72, t, 13.9, 14.75, o);
  tl(x, 'ET LA RAISON', L.x, R4.y1, R4.ts, t, 14.85, 15.85, o);
  tl(x, [['DE SON CHOIX.', C.red]], L.x, R4.y2, R4.ts, t, 14.92, 15.88, o);
  tl(x, 'PUIS 4 AUTRES,', L.x, R4.y1, R4.ts, t, 15.95, 16.5, o);
  tl(x, [['CLASSÉS POUR TOI.', C.red]], L.x, R4.y2, R4.ts, t, 16.02, 16.55, o);
  // 5. fin
  const E5 = PORT ? { k: 150, w: 330, ws: 160, tg: 418, tgs: 50 } : { k: 330, w: 545, ws: 196, tg: 640, tgs: 56 };
  kick(x, 'NOUVELLE VERSION  ·  8 QUESTIONS', L.x, E5.k, t, 16.9, null, o);
  const LW = layoutChars('CINÉMOOD', E5.ws, { fam: 'Anton' }), x0 = L.al === 'center' ? L.x - LW.w / 2 : L.x;
  LW.chars.forEach((c, i) => revealLine(x, c.ch, x0 + c.x, E5.w, E5.ws, (t - 16.95 - i * 0.04) / 0.55, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 }));
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['FILM.', C.red]], L.x, E5.tg, E5.tgs, t, 17.3, null, o);
  const url = 'cinem00d.com', us = PORT ? 44 : 42, uo = { fam: 'Archivo', wt: 700 };
  const pw = textWidth(url, us, uo) + 130, ph = PORT ? 92 : 88, py = PORT ? 1858 - 70 : 760, pu = EZ.out(prog(t, 17.6, 17.95));
  if (pu > 0) {
    const px = L.al === 'center' ? CX - pw / 2 : L.x;
    rrp(x, L.al === 'center' ? CX - (pw / 2) * pu : px, py - ph / 2, pw * pu, ph, ph / 2);
    x.fillStyle = 'rgba(10,5,7,0.9)'; x.fill(); x.lineWidth = 3; x.strokeStyle = C.red; x.stroke();
    const n = Math.floor(url.length * prog(t, 17.8, 18.35));
    let cx = px + 44;
    for (let i = 0; i < n; i++) { drawText(x, url[i], cx, py + us * 0.36, us, Object.assign({ color: i === 5 || i === 6 ? C.red : C.cream }, uo)); cx += textWidth(url.slice(0, i + 1), us, uo) - textWidth(url.slice(0, i), us, uo); }
    if (t < 18.45 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = C.cream; x.fillRect(cx + 3, py - 22, 3, 44); }
    const aa = EZ.out(prog(t, 18.4, 18.7));
    if (aa > 0) drawText(x, '→', px + pw - 64 - (1 - aa) * 20, py + us * 0.36, us, { fam: 'Archivo', wt: 700, color: redA(aa) });
  }
  if (!PORT) para(x, 'Gratuit, sans inscription  ·  interface réelle, films fictifs à titre d’illustration', L.x, 1015, 20, 1000, t, 18.5, null, { color: cream(0.42) });
  else para(x, 'Gratuit, sans inscription  ·  films fictifs, à titre d’illustration', CX, 1898, 19, 1000, t, 18.5, null, { align: 'center', color: cream(0.4) });
}

/* ---------- rendu ---------- */
function clairBlurAt(t) {
  const fast = (t > 1.25 && t < 2.1) || (t > 2.95 && t < 3.6) || (t > 6.35 && t < 7.0) || (t > 8.35 && t < 9.0) || (t > 12.9 && t < 13.5) || (t > 14.8 && t < 15.35) || (t > 15.8 && t < 16.3) || (t > 16.5 && t < 17.15);
  return { n: fast ? 8 : 5, shutter: 0.5 };
}
function clairFx(t) {
  const sh = { x: 0, y: 0 };
  let env = 0;
  for (const [t0, amp] of [[2.0, 10], [13.0, 3], [16.95, 4]]) {
    const u = t - t0;
    if (u <= 0 || u >= 0.4) continue;
    const k = (1 - u / 0.4) ** 2, s = shake(t, amp * k, 26, t0 * 7);
    sh.x += s.x; sh.y += s.y; env += amp * k;
  }
  return { shake: sh, env, vignette: 0.28, grain: 0.04, bloom: 0.2 + 0.45 * tri(t - 1.98, 0.5), fade: Math.max(1 - t / 0.2, prog(t, CDUR - 0.4, CDUR)) };
}
