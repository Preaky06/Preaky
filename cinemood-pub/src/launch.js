/* CinéMood — « nouvelle version » (23,5 s) : 8 questions au lieu de 12, nouvelle interface.
   Mise en scène produit de l'interface réelle (captures du site, explainer/capture.mjs) :
   téléphone en 3D (projection orthographique : chaque surface plane devient une transformation
   affine exacte), vue éclatée de l'écran, ruban des huit écrans, carte de résultat qui se détache.
   Les aides de dessin (textes, ressorts, doigt…) viennent de mograph.js. */
'use strict';

const LDUR = 23.5;
/* version livrée : 18 s. Les scènes sont écrites sur 23,5 s ; LWARP les rejoue plus vite par morceaux
   [début, fin (temps des scènes), durée à l'écran]. L'impact du retournement tombe à 2,0 s, les coupes sur des temps. */
const LSDUR = 18;
const LWARP = [[0, 2.3, 2.0], [2.3, 3.6, 1.0], [3.6, 8.6, 4.0], [8.6, 13.6, 3.0], [13.6, 18.3, 3.5], [18.3, 23.5, 4.5]];
function warpL(t) {
  let a = 0;
  for (const [A, B, d] of LWARP) {
    if (t < a + d || B === LDUR) return A + (clamp(t - a, 0, d) / d) * (B - A);
    a += d;
  }
  return LDUR;
}
const SW = 412, SH = 880, BZ = 14, BW = SW + 2 * BZ, BH = SH + 2 * BZ, BR = 62, SRAD = 50, THICK = 26, GAP = 540;
const TXR = {};
let INF = {};
const TEXN = ['m_q1', 'm_q2', 'm_q3', 'm_q4', 'm_q5', 'm_q6', 'm_q7', 'm_q8', 'm_home', 'm_loading', 'm_results', 'm_card_1', 'm_card_1_bars0',
  'm_card_2', 'm_card_3', 'm_card_4', 'm_card_5', 'm_q1_opt', 'old_q'].concat([...Array(9).keys()].map((i) => `ticket_${i + 1}`));
async function loadLaunch() {
  INF = await (await fetch('tex/info.json')).json();
  await Promise.all(TEXN.map(async (n) => {
    const b = await (await fetch(`tex/${n}.png`)).blob();
    let bm = await createImageBitmap(b);
    if (/^(m_(q\d|home|loading|results|card_\d|card_1_bars0|q1_opt)|ticket_\d)$/.test(n)) {
      const c = mkCanvas(bm.width, bm.height), g = c.getContext('2d');
      g.filter = 'brightness(1.22) contrast(1.06) saturate(1.08)'; g.drawImage(bm, 0, 0); bm = await createImageBitmap(c);
    }
    TXR[n] = bm;
    if (/^m_(q\d|home|loading|results)$/.test(n)) TXR[n + '_h'] = await createImageBitmap(bm, { resizeWidth: 618, resizeHeight: 1320, resizeQuality: 'high' });
  }));
  const o = TXR.old_q, c = mkCanvas(o.width, o.height), g = c.getContext('2d');
  g.filter = 'grayscale(1) brightness(1.05) contrast(0.95)'; g.drawImage(o, 0, 0); TXR.old_grey = c;
  // sol pointillé (une seule image, posée en perspective)
  const D = mkCanvas(2400, 2400), dg = D.getContext('2d');
  for (let y = 24; y < 2400; y += 48) for (let x = 24; x < 2400; x += 48) {
    const r = Math.hypot(x - 1200, y - 1200) / 1200;
    if (r >= 1) continue;
    dg.fillStyle = `rgba(246,238,240,${0.2 * (1 - r) ** 1.6})`; dg.beginPath(); dg.arc(x, y, 1.7, 0, TAU); dg.fill();
  }
  TXR.dots = D;
}

/* ---------- 3D : rotation, projection orthographique, plans ---------- */
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/* repère : x à droite, y vers le bas, z vers le spectateur ; tangage > 0 : le haut part en arrière */
function rot(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  return (v) => {
    const x = cy * v[0] + sy * v[2], y = v[1], z = -sy * v[0] + cy * v[2];
    const y2 = cp * y - sp * z, z2 = sp * y + cp * z;
    return [cr * x - sr * y2, sr * x + cr * y2, z2];
  };
}
function rotInv(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  return (v) => {
    const x = cr * v[0] + sr * v[1], y = -sr * v[0] + cr * v[1], z = v[2];
    const y2 = cp * y + sp * z, z2 = -sp * y + cp * z;
    return [cy * x - sy * z2, y2, sy * x + cy * z2];
  };
}
let CAM = null;
function setCam(c) { CAM = Object.assign({}, c, { R: rot(c.yaw, c.pitch, c.roll), Ri: rotInv(c.yaw, c.pitch, c.roll) }); }
function proj(p) { const q = CAM.R(sub3(p, CAM.T)); return { x: CAM.ax + CAM.zoom * q[0], y: CAM.ay + CAM.zoom * q[1], z: q[2] }; }
function planeT(x, C, U, V) {
  const c = proj(C), u = CAM.R(U), v = CAM.R(V), z = CAM.zoom;
  x.setTransform(u[0] * z, u[1] * z, v[0] * z, v[1] * z, c.x, c.y);
}
const EX = [1, 0, 0], EY = [0, 1, 0], EZv = [0, 0, 1];
/* point du plan (U, V) de centre C, en coordonnées locales (lx, ly) et à la hauteur h le long de la normale */
function onPlane(C, U, V, lx, ly, h = 0) { return add3(add3(add3(C, mul3(U, lx)), mul3(V, ly)), mul3(norm3(cross3(U, V)), h)); }
function softRect(x, C, U, V, w, h, r, a, blur) {
  planeT(x, C, U, V);
  x.filter = `blur(${blur}px)`; rrp(x, -w / 2, -h / 2, w, h, r); x.fillStyle = `rgba(0,0,0,${a})`; x.fill(); x.filter = 'none';
}

/* ---------- téléphone ---------- */
function drawPhone(x, C, U, V, scr, o = {}) {
  const N = norm3(cross3(U, V));
  const a = o.alpha == null ? 1 : o.alpha;
  if (a <= 0) return;
  x.save(); x.globalAlpha = a;
  if (o.shadow !== false) softRect(x, onPlane(C, U, V, 40, 60, -90), U, V, BW, BH, BR, 0.55 * a, 34 * CAM.zoom);
  const K = 10;
  for (let k = K; k >= 1; k--) {
    planeT(x, add3(C, mul3(N, (-THICK * k) / K)), U, V);
    rrp(x, -BW / 2, -BH / 2, BW, BH, BR); x.fillStyle = k > K - 2 ? '#050405' : '#121014'; x.fill();
  }
  planeT(x, C, U, V);
  rrp(x, -BW / 2, -BH / 2, BW, BH, BR); x.fillStyle = '#100d10'; x.fill();
  const rim = x.createLinearGradient(-BW / 2, -BH / 2, BW / 2, BH / 2);
  rim.addColorStop(0, 'rgba(255,214,222,0.55)'); rim.addColorStop(0.35, 'rgba(255,255,255,0.12)'); rim.addColorStop(0.7, 'rgba(255,45,79,0.35)'); rim.addColorStop(1, 'rgba(255,45,79,0.75)');
  x.lineWidth = 3 / CAM.zoom; x.strokeStyle = rim; x.stroke();
  x.save();
  rrp(x, -SW / 2, -SH / 2, SW, SH, SRAD); x.clip();
  x.fillStyle = '#040303'; x.fillRect(-SW / 2, -SH / 2, SW, SH);
  if (scr) {
    if (o.fitTop) x.drawImage(scr, -SW / 2, -SH / 2, SW, (SW * scr.height) / scr.width);
    else x.drawImage(scr, -SW / 2, -SH / 2, SW, SH);
  }
  if (o.mix && o.mix.a > 0) { x.globalAlpha = a * o.mix.a; x.drawImage(o.mix.img, -SW / 2, -SH / 2, SW, SH); x.globalAlpha = a; }
  if (o.over) o.over(x);
  if (o.dim) { x.fillStyle = `rgba(4,3,3,${o.dim})`; x.fillRect(-SW / 2, -SH / 2, SW, SH); }
  // reflet qui glisse sur la vitre
  const gp = o.glare == null ? 0.5 : o.glare;
  const gg = x.createLinearGradient(-SW / 2 - 200, -SH / 2, SW / 2 + 200, SH / 2);
  gg.addColorStop(clamp(gp - 0.12), 'rgba(255,255,255,0)'); gg.addColorStop(clamp(gp), 'rgba(255,255,255,0.075)'); gg.addColorStop(clamp(gp + 0.12), 'rgba(255,255,255,0)');
  x.fillStyle = gg; x.fillRect(-SW / 2, -SH / 2, SW, SH);
  x.restore();
  rrp(x, -46, -SH / 2 + 11, 92, 27, 13.5); x.fillStyle = '#000'; x.fill();
  x.restore();
  resetCtx(x);
}
/* une image (ou un découpage d'image) posée dans un plan : (sx, sy, sw, sh) en px CSS de la capture (×3) */
function slab(x, C, U, V, img, w, h, o = {}) {
  const a = o.alpha == null ? 1 : o.alpha;
  if (a <= 0) return;
  x.save(); x.globalAlpha = a;
  planeT(x, C, U, V);
  rrp(x, -w / 2, -h / 2, w, h, o.r == null ? 8 : o.r); x.clip();
  if (o.src) x.drawImage(img, o.src[0] * 3, o.src[1] * 3, o.src[2] * 3, o.src[3] * 3, -w / 2, -h / 2, w, h);
  else x.drawImage(img, -w / 2, -h / 2, w, h);
  if (o.draw) o.draw(x);
  if (o.edge) { rrp(x, -w / 2, -h / 2, w, h, o.r == null ? 8 : o.r); x.lineWidth = 2 / CAM.zoom; x.strokeStyle = o.edge; x.stroke(); }
  x.restore();
  resetCtx(x);
}
function floor(x, a) {
  if (a <= 0) return;
  const C = [Math.round(CAM.T[0] / 48) * 48, Math.round(CAM.T[1] / 48) * 48, -110];
  x.save(); x.globalAlpha = a; planeT(x, C, EX, EY); x.drawImage(TXR.dots, -1200, -1200); x.restore(); resetCtx(x);
}
/* légende : un trait depuis un point de l'objet vers un texte */
function callout(x, p, dx, dy, label, t, t0) {
  const u = EZ.out(prog(t, t0, t0 + 0.45));
  if (u <= 0) return;
  const lw0 = textWidth(label, PORT ? 24 : 23, { fam: 'Archivo', wt: 700, track: 0.28 }) + 90;
  if (dx > 0 && p.x + dx + lw0 > W - 40) dx = W - 40 - lw0 - p.x; // la légende reste dans le cadre
  if (dx < 0 && p.x + dx - lw0 < 40) dx = 40 + lw0 - p.x;
  const ex = p.x + dx * u, ey = p.y + dy * u;
  x.save();
  x.strokeStyle = cream(0.7); x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(ex, ey); x.lineTo(ex + Math.sign(dx) * 26 * u, ey); x.stroke();
  disc(x, p.x, p.y, 5, C.red); x.strokeStyle = C.red; x.lineWidth = 1.5; x.beginPath(); x.arc(p.x, p.y, 10 + 4 * Math.sin(t * 6), 0, TAU); x.stroke();
  x.restore();
  const ls = PORT ? 24 : 23, lw = textWidth(label, ls, { fam: 'Archivo', wt: 700, track: 0.28 }), la = EZ.out(prog(t, t0 + 0.15, t0 + 0.5));
  if (la > 0) { x.fillStyle = `rgba(10,5,7,${0.82 * la})`; rrp(x, dx < 0 ? ex - 36 - lw - 18 : ex + 18, ey - 22, lw + 36, 42, 21); x.fill(); }
  kick(x, label, ex + Math.sign(dx) * 36, ey + 8, t, t0 + 0.2, null, { align: dx < 0 ? 'right' : 'left', color: cream(0.95), size: ls });
}

/* ---------- caméra : images clés ---------- */
function camAt(t) {
  // F : cadrages propres à chaque format (zoom par plan, point d'ancrage vertical en 9:16)
  const F = PORT ? { ax: 540, z: 0.84, iso: 1.32, iso2: 1.36, rib: 0.98, res: 1.02, end: 1.0, ay: [1210, 1270, 1270, 1250, 1250, 1110] }
    : { ax: 1270, z: 0.96, iso: 1.08, iso2: 1.12, rib: 0.76, res: 0.86, end: 0.94, ay: [560, 560, 560, 560, 560, 560] };
  const keys = [
    [0.0, { yaw: -0.24, pitch: 0.1, roll: 0.0, zoom: F.z, T: [0, 0, 0], ay: F.ay[0] }],
    [3.6, { yaw: -0.3, pitch: 0.12, roll: 0.0, zoom: F.z, T: [0, 0, 0], ay: F.ay[0] }],
    [4.6, { yaw: -0.62, pitch: 0.9, roll: 0.06, zoom: F.z * F.iso, T: [0, 10, 60], ay: F.ay[1] }],
    [8.3, { yaw: -0.7, pitch: 0.88, roll: 0.06, zoom: F.z * F.iso2, T: [0, 10, 60], ay: F.ay[1] }],
    [9.2, { yaw: -0.52, pitch: 0.6, roll: 0.0, zoom: F.z * F.rib, T: [-GAP, 0, 0], ay: F.ay[2] }],
    [12.5, { yaw: -0.46, pitch: 0.58, roll: 0.0, zoom: F.z * F.rib, T: [6 * GAP, 0, 0], ay: F.ay[2] }],
    [13.5, { yaw: -0.4, pitch: 0.48, roll: 0.0, zoom: F.z * F.res, T: [6 * GAP, 30, 0], ay: F.ay[3] }],
    [17.5, { yaw: -0.36, pitch: 0.44, roll: 0.0, zoom: F.z * F.res, T: [6 * GAP, 30, 0], ay: F.ay[4] }],
    [18.6, { yaw: -0.2, pitch: 0.06, roll: 0.0, zoom: F.z * F.end, T: [6 * GAP, 0, 0], ay: F.ay[5] }],
    [LDUR, { yaw: -0.14, pitch: 0.04, roll: 0.0, zoom: F.z * F.end * 1.02, T: [6 * GAP, 0, 0], ay: F.ay[5] }],
  ];
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, A] = keys[i], [t1, B] = keys[i + 1];
  const hold = (i === 0 || i === 2 || i === 6 || i === 8); // plans tenus : dérive lente et linéaire
  const u = hold ? prog(t, t0, t1) : EZ.inOut(prog(t, t0, t1));
  const c = { ax: F.ax };
  for (const k of ['yaw', 'pitch', 'roll', 'zoom', 'ay']) c[k] = lerp(A[k], B[k], u);
  c.T = lerp3(A.T, B.T, u);
  if (!PORT && t >= 18.0) c.ax = lerp(F.ax, 1320, EZ.inOut(prog(t, 18.0, 18.6)));
  return c;
}

/* ---------- les couches de l'écran de la question 1 (px CSS) ---------- */
const LAYERS = [
  { r: [0, 14, 412, 58], h: 70, d: 0.0 },
  { r: [0, 78, 412, 56], h: 105, d: 0.06 },
  { r: [0, 150, 412, 84], h: 150, d: 0.12 },
];
const TICK_Y = 241, TICK_STEP = 186;

/* ---------- le film ---------- */
function sLaunch(x, t) {
  setCam(camAt(t));
  bgFill(x, 'blk');
  // halo rouge derrière l'objet
  const hp = proj(CAM.T);
  const hg = x.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, (PORT ? 900 : 820) * CAM.zoom);
  hg.addColorStop(0, redA(0.34)); hg.addColorStop(0.45, redA(0.1)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  floor(x, 0.95 * EZ.out(prog(t, 0.2, 1.2)));
  if (t < 8.6) sceneIntroExplode(x, t);
  else if (t < 13.6) sceneRibbon(x, t);
  else sceneResult(x, t);
  textsLaunch(x, t);
}

/* 0–8,6 s : avant/après (le téléphone se retourne), puis vue éclatée de la question 1 */
function sceneIntroExplode(x, t) {
  // retournement : 0 → π/2 (ancienne interface), puis −π/2 → 0 (nouvelle)
  const f = prog(t, 1.6, 2.3), first = f < 0.5;
  const ang = first ? EZ.in(f * 2) * (Math.PI / 2) : -(1 - EZ.out((f - 0.5) * 2)) * (Math.PI / 2);
  const U = [Math.cos(ang), 0, -Math.sin(ang)], V = EY;
  const rise = PORT ? 0 : 0;
  const C = [0, rise, 0];
  const lift = (k) => spr(t - (4.55 + k * 0.07), 9, 6) * (1 - EZ.inOut(prog(t, 7.75, 8.35)));
  const exploded = t > 4.5 && t < 8.4;
  const scr = first ? TXR.old_grey : t > 8.3 ? TXR.m_q2 : TXR.m_q1;
  const ghost = exploded ? 0.72 * Math.min(1, lift(0) * 1.5) : 0;
  drawPhone(x, C, U, V, scr, {
    fitTop: first, dim: ghost, glare: ((t * 0.18) % 1.6) - 0.3,
    mix: t > 8.15 && t < 8.3 ? { img: TXR.m_q2, a: prog(t, 8.15, 8.3) } : null,
  });
  if (!exploded) return;
  // couches qui se soulèvent : en-tête, compteur, question
  const items = [];
  LAYERS.forEach((L, k) => {
    const u = lift(k);
    if (u <= 0.001) return;
    const [rx, ry, rw, rh] = L.r;
    items.push({ h: L.h * u, draw: () => {
      const h = L.h * u;
      softRect(x, onPlane(C, U, V, rx + rw / 2 - SW / 2 + 0.3 * h, ry + rh / 2 - SH / 2 + 0.4 * h, 0), U, V, rw, rh, 10, 0.5 * Math.min(1, h / 90), 14 * CAM.zoom);
      slab(x, onPlane(C, U, V, rx + rw / 2 - SW / 2, ry + rh / 2 - SH / 2, h), U, V, TXR.m_q1, rw, rh, { src: L.r, r: 6, edge: cream(0.1 * u) });
    } });
  });
  // tickets : la liste soulevée défile jusqu'à Rêveur (n° 9), qui monte et qu'on choisit
  const scroll = 8 * EZ.inOut(prog(t, 5.9, 6.9));
  const pick = EZ.out(prog(t, 6.95, 7.35)) * (1 - EZ.inOut(prog(t, 7.75, 8.3)));
  for (let i = 0; i < 9; i++) {
    const slot = i - scroll;
    const vis = 1;
    const u = lift(3 + Math.min(i, 3));
    let h = (190 + Math.min(i, 3) * 20) * u, ly = TICK_Y + slot * TICK_STEP + 86 - SH / 2;
    let a = vis * (i === 8 ? 1 : 1 - 0.75 * pick);
    if (i === 8) { h += 150 * pick; a = Math.max(a, pick); }
    const top = -SH / 2 + 240, bot = SH / 2 - 60;
    if (ly < top) a *= clamp(1 - (top - ly) / 160);
    if (ly > bot) a *= clamp(1 - (ly - bot) / 160);
    const img = i === 8 && t > 7.05 ? TXR.m_q1_opt : TXR[`ticket_${i + 1}`];
    items.push({ h, draw: () => {
      if (a <= 0) return;
      x.save(); x.globalAlpha = a;
      softRect(x, onPlane(C, U, V, 0.3 * h, ly + 0.4 * h, 0), U, V, 376, 172, 10, 0.5 * Math.min(1, h / 90), 16 * CAM.zoom);
      x.restore();
      slab(x, onPlane(C, U, V, 0, ly, h), U, V, img, 376, 173, { alpha: a, r: 8, edge: i === 8 && pick > 0 ? redA(0.9 * pick) : cream(0.08) });
    } });
  }
  items.sort((p, q) => p.h - q.h).forEach((it) => it.draw());
  // légendes
  const u0 = lift(1);
  if (u0 > 0.2 && t < 7.7) {
    const side = PORT ? 1 : 1;
    callout(x, proj(onPlane(C, U, V, 376 - SW / 2 + 12, 105 - SH / 2, LAYERS[1].h * u0)), 150 * side, -60, '01 / 8 · LE COMPTEUR', t, 5.15);
    callout(x, proj(onPlane(C, U, V, 120 - SW / 2, 205 - SH / 2, LAYERS[2].h * lift(2))), PORT ? -130 : -150, -40, 'LA QUESTION', t, 5.3);
    if (t < 6.9) callout(x, proj(onPlane(C, U, V, 340 - SW / 2, TICK_Y + 40 - SH / 2, 190 * lift(3))), 170, 30, 'UN TICKET PAR RÉPONSE', t, 5.45);
  }
  // Rêveur : appui
  const rp = proj(onPlane(C, U, V, 156, TICK_Y + (8 - scroll) * TICK_STEP + 86 - SH / 2 + 50, (190 + 60) * lift(6) + 150 * pick));
  if (t > 6.95 && t < 7.75) {
    finger(x, rp.x + 20, rp.y + 10, prog(t, 6.8, 6.95) * (1 - prog(t, 7.3, 7.5)), press(t, 7.12), false);
    ripple(x, rp.x + 20, rp.y + 10, t - 7.12, false);
  }
}

/* 8,6–13,6 s : les huit écrans en ruban, la caméra les passe en revue */
const QK = ['TON HUMEUR', 'TON ÉVASION', 'PLUS PRÉCISÉMENT', 'TON SEUIL', 'TON PUBLIC', 'TON TEMPS', 'TON ÉPOQUE', 'DERNIÈRE QUESTION'];
function sceneRibbon(x, t) {
  const out = EZ.inOut(prog(t, 12.6, 13.45));
  const list = [];
  for (let k = 0; k < 8; k++) {
    const home = (k - 1) * GAP;
    const sl = k === 1 ? 1 : EZ.out(prog(t, 8.65 + Math.abs(k - 1) * 0.07, 9.35 + Math.abs(k - 1) * 0.07));
    let px = lerp(0, home, sl);
    px = lerp(px, 6 * GAP, out * (k === 7 ? 0 : 1));
    const C = [px, 0, k === 7 ? 0 : -40 * out];
    const a = k === 7 ? 1 : (k === 1 ? 1 : clamp(sl * 1.4)) * (1 - prog(out, 0.6, 1));
    const p = proj(C);
    list.push({ k, C, a, z: p.z, p });
  }
  list.sort((p, q) => p.z - q.z);
  const focus = (CAM.T[0] + GAP) / GAP; // index (0..7) de l'écran au centre
  for (const it of list) {
    const d = Math.abs(it.k - focus);
    drawPhone(x, it.C, EX, EY, TXR[`m_q${it.k + 1}_h`], { mix: it.k === 7 && t > 13.3 ? { img: TXR.m_loading_h, a: prog(t, 13.3, 13.58) } : null, alpha: it.a, dim: clamp(d * 0.55, 0, 0.6) * (1 - out), glare: ((t * 0.2 + it.k * 0.17) % 1.6) - 0.3, shadow: true });
  }
  // nom de chaque question sous son écran
  for (const it of list) {
    if (it.a < 0.05 || t < 9.0) continue;
    const b = proj(onPlane(it.C, EX, EY, 0, BH / 2 + 70, 0));
    const d = Math.abs(it.k - focus), la = clamp(1.4 - d) * it.a * (1 - out);
    if (la <= 0.02) continue;
    x.save(); x.globalAlpha = la;
    drawText(x, `${String(it.k + 1).padStart(2, '0')}  ·  ${QK[it.k]}`, b.x, b.y, PORT ? 24 : 22, { fam: 'Archivo', wt: 700, track: 0.24, align: 'center', color: it.k === Math.round(focus) ? C.red : cream(0.7) });
    x.restore();
  }
}

/* 13,6–23,5 s : chargement, carte n°1 qui se détache, les quatre autres ; puis l'accueil */
function sceneResult(x, t) {
  const C = [6 * GAP, 0, 0];
  const scr = t < 14.3 ? TXR.m_loading : t < 18.3 ? TXR.m_results : TXR.m_home;
  const mix = t > 14.15 && t < 14.3 ? { img: TXR.m_results, a: prog(t, 14.15, 14.3) } : t > 18.15 && t < 18.3 ? { img: TXR.m_home, a: prog(t, 18.15, 18.3) } : null;
  drawPhone(x, C, EX, EY, scr, {
    mix, glare: ((t * 0.18) % 1.6) - 0.3, dim: 0.55 * EZ.out(prog(t, 14.5, 15.0)) * (1 - EZ.inOut(prog(t, 17.4, 18.2))),
    over: t < 14.3 ? (g) => { // la roue du chargement tourne
      const cx = 206 - SW / 2, cy = 387 - SH / 2;
      g.save(); g.beginPath(); g.arc(cx, cy, 38, 0, TAU); g.clip(); g.fillStyle = '#040303'; g.fillRect(cx - 40, cy - 40, 80, 80);
      g.translate(cx, cy); g.rotate(t * 7); g.drawImage(TXR.m_loading, (206 - 40) * 3, (387 - 40) * 3, 240, 240, -40, -40, 80, 80); g.restore();
    } : null,
  });
  // la carte n°1 sort de l'écran et se tourne vers nous
  const cu = EZ.inOut(prog(t, 14.45, 15.35)), back = EZ.inOut(prog(t, 17.4, 18.2));
  const cv = cu * (1 - back);
  if (cv > 0.001) {
    const cw = 384, ch = 1083, sc = PORT ? 0.92 : 0.84;
    const N = EZv, U1 = norm3(CAM.Ri(EX)), V1 = norm3(CAM.Ri(EY));
    const U = norm3(lerp3(EX, U1, cv)), V = norm3(lerp3(EY, V1, cv));
    const center = add3(onPlane(C, EX, EY, 0, 60 - 60 * cv, 260 * cv), [0, 0, 0]);
    // les quatre autres, en éventail derrière
    for (let j = 4; j >= 1; j--) {
      const fu = EZ.out(prog(t, 15.9 + (4 - j) * 0.09, 16.5 + (4 - j) * 0.09)) * (1 - back);
      if (fu <= 0.001) continue;
      const off = add3(add3(center, mul3(U, (PORT ? 70 : 110) * j * fu)), add3(mul3(V, -26 * j * fu), mul3(norm3(cross3(U, V)), -60 * j * fu)));
      softRect(x, add3(off, mul3(norm3(cross3(U, V)), -40)), U, V, cw * sc, ch * sc, 18, 0.4 * fu, 26 * CAM.zoom);
      slab(x, off, U, V, TXR[`m_card_${j + 1}`], cw * sc, (cw * sc * TXR[`m_card_${j + 1}`].height) / TXR[`m_card_${j + 1}`].width, { alpha: fu, r: 14, edge: cream(0.12) });
    }
    softRect(x, add3(center, mul3(norm3(cross3(U, V)), -50)), U, V, cw * sc, ch * sc, 18, 0.55 * cv, 30 * CAM.zoom);
    const bars = EZ.out(prog(t, 15.35, 16.1));
    slab(x, center, U, V, TXR.m_card_1_bars0, cw * sc, ch * sc, {
      alpha: clamp(cv * 3), r: 14, edge: redA(0.5),
      draw: (g) => { // les jauges se remplissent
        const B = INF.m_cardBox.bars;
        g.save(); g.beginPath();
        for (const b of B) g.rect((b.x - cw / 2) * sc, (b.y - 4 - ch / 2) * sc, b.w * (b.v / 100) * bars * sc, (b.h + 8) * sc);
        g.clip(); g.drawImage(TXR.m_card_1, -cw * sc / 2, -ch * sc / 2, cw * sc, ch * sc); g.restore();
      },
    });
    if (t > 15.2 && t < 17.3) {
      callout(x, proj(add3(add3(center, mul3(U, (330 - cw / 2) * sc)), mul3(V, (520 - ch / 2) * sc))), PORT ? 0 : 150, PORT ? -150 : -70, '96 % · LE MEILLEUR CHOIX', t, 15.25);
      if (PORT) callout(x, proj(add3(add3(center, mul3(U, (40 - cw / 2) * sc)), mul3(V, (760 - ch / 2) * sc))), -40, 170, 'POURQUOI LUI', t, 15.55);
    }
  }
  // fin : appui sur « Commencer »
  if (t > 20.6) {
    const p = proj(onPlane(C, EX, EY, 46 + 160 - SW / 2, 530 + 24 - SH / 2, 0));
    finger(x, p.x + 30, p.y + 6, prog(t, 20.7, 20.95) * (1 - prog(t, 21.6, 21.9)), press(t, 21.2), false);
    ripple(x, p.x + 30, p.y + 6, t - 21.2, false);
  }
}

/* ---------- textes ---------- */
function textsLaunch(x, t) {
  const L = PORT ? { x: CX, al: 'center', k: 205, n: 545, ns: 330, q: 655, qs: 96, s: 728 } : { x: 140, al: 'left', k: 240, n: 650, ns: 400, q: 770, qs: 100, s: 848 };
  const o = { align: L.al };
  // 1. 12 → 8
  const f = prog(t, 1.6, 2.3), first = f < 0.5, sy = first ? Math.cos(EZ.in(f * 2) * Math.PI / 2) : Math.cos((1 - EZ.out((f - 0.5) * 2)) * Math.PI / 2);
  kick(x, first ? 'AVANT' : 'MAINTENANT', L.x, L.k, t, 0.25, 3.55, Object.assign({ color: first ? cream(0.55) : C.red }, o));
  const na = t < 0.3 ? 0 : EZ.out(prog(t, 0.3, 0.8)) * (1 - prog(t, 3.55, 3.85));
  if (na > 0) {
    x.save(); x.globalAlpha = na;
    const ny = L.n - (L.ns * 0.36);
    x.translate(L.x, ny); x.scale(1, Math.max(0.02, sy)); x.translate(-L.x, -ny);
    if (first) drawText(x, '12', L.x, L.n, L.ns, { fam: 'Anton', align: L.al, color: 'rgba(0,0,0,0)', stroke: cream(0.75), lineWidth: 3, noFill: true });
    else drawText(x, '8', L.x, L.n, L.ns, { fam: 'Anton', align: L.al, color: C.red });
    x.restore();
    // le trait rouge qui barre le 12
    const s = EZ.out(prog(t, 1.25, 1.55));
    if (first && s > 0) {
      const w = textWidth('12', L.ns, { fam: 'Anton' }), x0 = L.al === 'center' ? L.x - w / 2 : L.x;
      x.save(); x.strokeStyle = C.red; x.lineWidth = 16; x.lineCap = 'round';
      x.beginPath(); x.moveTo(x0 - 20, L.n - L.ns * 0.2); x.lineTo(x0 - 20 + (w + 40) * s, L.n - L.ns * 0.2 - (L.ns * 0.36) * s); x.stroke(); x.restore();
    }
  }
  tl(x, 'QUESTIONS.', L.x, L.q, L.qs, t, 0.45, 3.55, o);
  para(x, 'au lieu de 12  ·  nouvelle interface', L.x, L.s, PORT ? 34 : 34, 900, t, 2.45, 3.5, Object.assign({ wt: 600, color: cream(0.72) }, o));
  // 2. vue éclatée
  const T2 = PORT ? { k: 205, y: [325, 430], s: 500, ts: 104 } : { k: 380, y: [500, 610], s: 690, ts: 112 };
  kick(x, 'NOUVELLE INTERFACE', L.x, T2.k, t, 4.3, 8.25, o);
  tl(x, 'PLUS CLAIRE.', L.x, T2.y[0], T2.ts, t, 4.38, 8.25, o);
  tl(x, [['PLUS RAPIDE.', C.red]], L.x, T2.y[1], T2.ts, t, 4.46, 8.3, o);
  para(x, 'Des tickets numérotés, un compteur, et tes réponses gardées en haut de l’écran.', L.x, T2.s, PORT ? 30 : 30, PORT ? 880 : 560, t, 4.7, 8.25, Object.assign({ color: cream(0.72) }, o));
  // 3. ruban
  if (!PORT && t > 8.4 && t < 13.7) { // les écrans s'effacent sous la colonne de texte
    const g = x.createLinearGradient(0, 0, 900, 0); g.addColorStop(0, 'rgba(8,4,6,0.96)'); g.addColorStop(0.62, 'rgba(8,4,6,0.85)'); g.addColorStop(1, 'rgba(8,4,6,0)');
    x.fillStyle = g; x.fillRect(0, 0, 900, H);
  }
  if (PORT && t > 8.4 && t < 13.7) {
    const g = x.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, 'rgba(8,4,6,0.96)'); g.addColorStop(0.7, 'rgba(8,4,6,0.85)'); g.addColorStop(1, 'rgba(8,4,6,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, 760);
  }
  const T3 = PORT ? { k: 205, n: 450, ns: 230, y: [565, 650], ts: [86, 66] } : { k: 300, n: 600, ns: 280, y: [730, 820], ts: [92, 70] };
  kick(x, 'TON PARCOURS', L.x, T3.k, t, 8.75, 13.35, o);
  const focus = clamp(Math.round((camAt(t).T[0] + GAP) / GAP), 0, 7);
  if (t > 8.85 && t < 13.65) {
    const a = EZ.out(prog(t, 8.85, 9.3)) * (1 - prog(t, 13.35, 13.65));
    const num = String(focus + 1).padStart(2, '0');
    x.save(); x.globalAlpha = a;
    const wn = textWidth(num, T3.ns, { fam: 'Anton' }), ws = textWidth(' / 8', T3.ns * 0.5, { fam: 'Anton' });
    const x0 = L.al === 'center' ? L.x - (wn + ws) / 2 : L.x;
    drawText(x, num, x0, T3.n, T3.ns, { fam: 'Anton', color: C.red });
    drawText(x, ' / 8', x0 + wn, T3.n, T3.ns * 0.5, { fam: 'Anton', color: cream(0.85) });
    x.restore();
  }
  tl(x, '8 QUESTIONS.', L.x, T3.y[0], T3.ts[0], t, 9.0, 13.35, o);
  tl(x, [['MOINS D’UNE MINUTE.', C.red]], L.x, T3.y[1], T3.ts[1], t, 9.1, 13.4, o);
  // 4. résultat
  const T4 = PORT ? { k: 205, y: [325, 425], s: 495, ts: 96 } : { k: 380, y: [500, 605], s: 680, ts: 96 };
  kick(x, 'TON RÉSULTAT', L.x, T4.k, t, 14.4, 17.6, o);
  tl(x, 'TON MEILLEUR CHOIX', L.x, T4.y[0], T4.ts, t, 14.48, 17.6, o);
  tl(x, [['+ 4 AUTRES.', C.red]], L.x, T4.y[1], T4.ts, t, 14.56, 17.65, o);
  para(x, 'Classés selon ton moment, chacun avec la raison de sa place.', L.x, T4.s, 30, PORT ? 880 : 560, t, 14.8, 17.6, Object.assign({ color: cream(0.72) }, o));
  // 5. fin
  const T5 = PORT ? { k: 190, w: 375, ws: 170, tg: 465, tgs: 50, pill: 1660 } : { k: 300, w: 520, ws: 190, tg: 612, tgs: 54, pill: 735 };
  kick(x, 'NOUVELLE VERSION  ·  8 QUESTIONS', L.x, T5.k, t, 18.8, null, o);
  const LW = layoutChars('CINÉMOOD', T5.ws, { fam: 'Anton' }), x0 = L.al === 'center' ? L.x - LW.w / 2 : L.x;
  LW.chars.forEach((c, i) => revealLine(x, c.ch, x0 + c.x, T5.w, T5.ws, (t - 18.85 - i * 0.04) / 0.55, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 }));
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['FILM.', C.red]], L.x, T5.tg, T5.tgs, t, 19.25, null, o);
  const url = 'cinem00d.com', us = 40, uo = { fam: 'Archivo', wt: 700 };
  const pw = textWidth(url, us, uo) + 130, ph = 86, pu = EZ.out(prog(t, 19.6, 19.95));
  if (pu > 0) {
    const px = L.al === 'center' ? CX - pw / 2 : L.x;
    rrp(x, L.al === 'center' ? CX - (pw / 2) * pu : px, T5.pill - ph / 2, pw * pu, ph, ph / 2);
    x.fillStyle = redA(0.1); x.fill(); x.lineWidth = 3; x.strokeStyle = C.red; x.stroke();
    const n = Math.floor(url.length * prog(t, 19.8, 20.4));
    let cx = px + 44;
    for (let i = 0; i < n; i++) { drawText(x, url[i], cx, T5.pill + us * 0.36, us, Object.assign({ color: i === 5 || i === 6 ? C.red : C.cream }, uo)); cx += textWidth(url.slice(0, i + 1), us, uo) - textWidth(url.slice(0, i), us, uo); }
    if (t < 20.5 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = C.cream; x.fillRect(cx + 3, T5.pill - 22, 3, 44); }
    const aa = EZ.out(prog(t, 20.45, 20.75));
    if (aa > 0) drawText(x, '→', px + pw - 64 - (1 - aa) * 20, T5.pill + us * 0.36, us, { fam: 'Archivo', wt: 700, color: redA(aa) });
  }
  if (PORT) para(x, 'Gratuit, sans inscription  ·  films fictifs, à titre d’illustration', CX, 1890, 19, 1000, t, 20.6, null, { align: 'center', color: cream(0.42) });
  else para(x, 'Gratuit, sans inscription  ·  interface réelle, films fictifs à titre d’illustration', L.x, 1015, 20, 1000, t, 20.6, null, { color: cream(0.42) });
}

/* ---------- rendu ---------- */
function launchBlurAt(t) {
  const fast = (t > 1.55 && t < 2.4) || (t > 3.6 && t < 4.7) || (t > 7.7 && t < 9.5) || (t > 12.5 && t < 13.7) || (t > 14.4 && t < 15.4) || (t > 17.3 && t < 18.7);
  return { n: fast ? 10 : 6, shutter: 0.55 };
}
function launchFx(t, ts) {
  const sh = { x: 0, y: 0 };
  let env = 0;
  for (const [t0, amp] of [[2.3, 12], [4.62, 3], [14.3, 3], [18.85, 5]]) {
    const u = t - t0;
    if (u <= 0 || u >= 0.4) continue;
    const k = (1 - u / 0.4) ** 2, s = shake(t, amp * k, 26, t0 * 7);
    sh.x += s.x; sh.y += s.y; env += amp * k;
  }
  return { shake: sh, env, vignette: 0.3, grain: 0.045, bloom: 0.26 + 0.5 * tri(t - 2.28, 0.5), fade: Math.max(1 - ts / 0.2, prog(ts, LSDUR - 0.4, LSDUR)) };
}
