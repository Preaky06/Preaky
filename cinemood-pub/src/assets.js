/* Textures et visuels générés procéduralement (aucune image externe). */
'use strict';

let WALL, TILES = [], POSTERS = [], STARS = [], DUST = [];

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* mur de briques sombre, éclairé plus tard par le néon */
function buildWall() {
  const w = Math.ceil(W * 1.25), h = Math.ceil(H * 1.25);
  WALL = mkCanvas(w, h);
  const x = WALL.getContext('2d');
  const r = prng(77);
  x.fillStyle = 'rgb(34,30,31)';
  x.fillRect(0, 0, w, h);
  const bh = 52 * U, bw = 156 * U, m = 5 * U;
  for (let row = 0, y = 0; y < h; row++, y += bh) {
    const off = (row % 2) * bw * 0.5;
    for (let xx = -bw; xx < w + bw; xx += bw) {
      const v = 70 + r() * 46;
      const warm = r() * 10;
      x.fillStyle = `rgb(${v + warm | 0},${v * 0.9 | 0},${v * 0.88 | 0})`;
      x.fillRect(xx + off + m / 2, y + m / 2, bw - m, bh - m);
      // biseau : haut clair, bas sombre
      x.fillStyle = 'rgba(255,255,255,0.07)';
      x.fillRect(xx + off + m / 2, y + m / 2, bw - m, 2 * U);
      x.fillStyle = 'rgba(0,0,0,0.22)';
      x.fillRect(xx + off + m / 2, y + bh - m / 2 - 3 * U, bw - m, 3 * U);
      // éclats
      for (let k = 0; k < 5; k++) {
        x.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.15})`;
        const s = (2 + r() * 7) * U;
        x.fillRect(xx + off + r() * bw, y + r() * bh, s, s * 0.7);
      }
    }
  }
  // grain de surface
  const pat = x.createPattern(GRAIN[3], 'repeat');
  x.globalCompositeOperation = 'overlay';
  x.globalAlpha = 0.55;
  x.fillStyle = pat;
  x.fillRect(0, 0, w, h);
  // taches d'humidité
  x.globalCompositeOperation = 'multiply';
  x.globalAlpha = 1;
  for (let k = 0; k < 14; k++) {
    const px = r() * w, py = r() * h, rr = (120 + r() * 380) * U;
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, 'rgba(90,80,80,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = g;
    x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  x.globalCompositeOperation = 'source-over';
}

/* vignettes « affiches » anonymes pour le mur du scroll infini */
const TILE_PAL = [
  ['#2a3446', '#6b7b99'], ['#3d2a2a', '#9a6b5a'], ['#24332e', '#5f8a78'], ['#3a3324', '#a08b5a'],
  ['#2e2638', '#7a6799'], ['#1f2b33', '#4f7c8f'], ['#3b2430', '#a05a78'], ['#2b2b2b', '#7d7d7d'],
  ['#332a20', '#b07a4a'], ['#1e2a24', '#3f6f5a'],
];
function buildTiles() {
  const tw = Math.round(170 * U), th = Math.round(255 * U);
  for (let i = 0; i < 40; i++) {
    const c = mkCanvas(tw, th), x = c.getContext('2d');
    const r = prng(1000 + i * 17);
    const pal = TILE_PAL[Math.floor(r() * TILE_PAL.length)];
    const g = x.createLinearGradient(0, 0, 0, th);
    g.addColorStop(0, pal[1]);
    g.addColorStop(1, pal[0]);
    x.fillStyle = g;
    x.fillRect(0, 0, tw, th);
    const type = i % 6;
    x.fillStyle = 'rgba(0,0,0,0.55)';
    if (type === 0) { // soleil + montagnes
      x.fillStyle = 'rgba(255,240,220,0.35)';
      x.beginPath(); x.arc(tw * (0.3 + r() * 0.4), th * 0.38, tw * (0.16 + r() * 0.12), 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.6)';
      x.beginPath(); x.moveTo(0, th * 0.62);
      for (let k = 0; k <= 6; k++) x.lineTo((tw * k) / 6, th * (0.5 + r() * 0.16));
      x.lineTo(tw, th); x.lineTo(0, th); x.fill();
    } else if (type === 1) { // silhouette
      x.fillStyle = 'rgba(0,0,0,0.6)';
      const px = tw * (0.35 + r() * 0.3);
      x.beginPath(); x.arc(px, th * 0.42, tw * 0.09, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(px - tw * 0.2, th); x.quadraticCurveTo(px - tw * 0.18, th * 0.52, px, th * 0.52);
      x.quadraticCurveTo(px + tw * 0.18, th * 0.52, px + tw * 0.2, th); x.fill();
    } else if (type === 2) { // grande lettre
      setFont(x, th * 0.62, 'Anton');
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.textAlign = 'center';
      x.fillText('ABCDEFGHJKLMNPRSTVXZ'[Math.floor(r() * 20)], tw / 2, th * 0.66);
    } else if (type === 3) { // ville
      x.fillStyle = 'rgba(0,0,0,0.6)';
      let xx = 0;
      while (xx < tw) { const bw = tw * (0.08 + r() * 0.12), bh = th * (0.15 + r() * 0.35); x.fillRect(xx, th * 0.72 - bh, bw, bh + th); xx += bw; }
      x.fillStyle = 'rgba(255,230,180,0.35)';
      for (let k = 0; k < 30; k++) x.fillRect(r() * tw, th * (0.45 + r() * 0.25), 2 * U, 3 * U);
    } else if (type === 4) { // anneaux
      x.strokeStyle = 'rgba(255,255,255,0.18)';
      x.lineWidth = 3 * U;
      for (let k = 1; k < 6; k++) { x.beginPath(); x.arc(tw / 2, th * 0.4, k * tw * 0.09, 0, Math.PI * 2); x.stroke(); }
    } else { // faisceau
      x.fillStyle = 'rgba(255,255,255,0.12)';
      x.beginPath(); x.moveTo(tw * 0.5, 0); x.lineTo(tw * 0.15, th); x.lineTo(tw * 0.85, th); x.fill();
    }
    const fade = x.createLinearGradient(0, th * 0.55, 0, th);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.78)');
    x.fillStyle = fade;
    x.fillRect(0, 0, tw, th);
    x.fillStyle = 'rgba(255,255,255,0.55)';
    x.fillRect(tw * 0.1, th * 0.84, tw * (0.4 + r() * 0.4), 9 * U);
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.fillRect(tw * 0.1, th * 0.9, tw * (0.25 + r() * 0.25), 6 * U);
    TILES.push(c);
  }
}

/* affiches des résultats (titres fictifs) */
const POSTER_DEFS = [
  { titre: 'L’ÉCHO DES ÉTOILES', meta: '2019 · 2h04 · Science-fiction, Aventure · ★ 7.9/10', score: 94, type: 'planet', badge: '★ Meilleur match' },
  { titre: 'LE DERNIER SIGNAL', meta: '2016 · 1h58 · Science-fiction · ★ 7.6/10', score: 89, type: 'signal', badge: 'Match n°2' },
  { titre: 'ORBITE BASSE', meta: '2021 · 1h52 · Science-fiction · ★ 7.4/10', score: 86, type: 'orbit', badge: 'Match n°3' },
  { titre: 'MER DE SABLE', meta: '2014 · 2h07 · Aventure · ★ 7.5/10', score: 84, type: 'dunes', badge: 'Match n°4' },
  { titre: 'LES CARTOGRAPHES', meta: '2018 · 1h49 · Aventure · ★ 7.3/10', score: 81, type: 'aurora', badge: 'Match n°5' },
];
function buildPosters() {
  // affiches éditoriales : un aplat, une lumière, une typographie — rien de figuratif
  const pw = Math.round(420 * U), ph = Math.round(630 * U);
  const pal = [
    { bg: ['#0a1330', '#1b2556'], acc: [255, 150, 160], ink: '#f3e9e4', kind: 'moon' },
    { bg: ['#06221f', '#0e3b36'], acc: [150, 240, 220], ink: '#e8f3ef', kind: 'line' },
    { bg: ['#1c0703', '#5a1a08'], acc: [255, 150, 70], ink: '#f7e6d8', kind: 'arc' },
    { bg: ['#3d1b14', '#b8644a'], acc: [255, 214, 170], ink: '#fff1e4', kind: 'bands' },
    { bg: ['#07140f', '#123326'], acc: [180, 255, 200], ink: '#e9f5ee', kind: 'grid' },
  ];
  POSTER_DEFS.forEach((d, idx) => {
    const c = mkCanvas(pw, ph), x = c.getContext('2d');
    const P = pal[idx];
    const g = x.createLinearGradient(0, 0, pw * 0.3, ph);
    g.addColorStop(0, P.bg[1]); g.addColorStop(1, P.bg[0]);
    x.fillStyle = g; x.fillRect(0, 0, pw, ph);
    x.save();
    if (P.kind === 'moon') {
      const cx = pw * 0.5, cy = ph * 0.42, r = pw * 0.3;
      const halo = x.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.4);
      halo.addColorStop(0, rgba(P.acc, 0.35)); halo.addColorStop(1, rgba(P.acc, 0));
      x.fillStyle = halo; x.fillRect(0, 0, pw, ph);
      const body = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      body.addColorStop(0, rgba(mixc(P.acc, [255, 255, 255], 0.5), 1)); body.addColorStop(1, rgba(P.acc, 0.85));
      x.fillStyle = body; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.fillStyle = P.bg[0]; x.fillRect(0, ph * 0.6, pw, ph);
      x.fillStyle = rgba(P.acc, 0.5); x.fillRect(0, ph * 0.6, pw, 1.5 * U);
    } else if (P.kind === 'line') {
      x.fillStyle = rgba(P.acc, 0.9); x.fillRect(pw * 0.5 - 1.5 * U, ph * 0.12, 3 * U, ph * 0.5);
      for (let k = 1; k <= 5; k++) {
        x.strokeStyle = rgba(P.acc, 0.32 - k * 0.05); x.lineWidth = 2 * U;
        x.beginPath(); x.arc(pw * 0.5, ph * 0.12, k * pw * 0.11, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
      }
      x.fillStyle = rgba(P.acc, 1); x.beginPath(); x.arc(pw * 0.5, ph * 0.12, 5 * U, 0, Math.PI * 2); x.fill();
    } else if (P.kind === 'arc') {
      const R = pw * 1.1, cy = ph * 0.78 + R;
      const atm = x.createRadialGradient(pw * 0.5, cy, R * 0.98, pw * 0.5, cy, R * 1.12);
      atm.addColorStop(0, rgba(P.acc, 0.9)); atm.addColorStop(1, rgba(P.acc, 0));
      x.fillStyle = atm; x.fillRect(0, 0, pw, ph);
      x.fillStyle = '#120402'; x.beginPath(); x.arc(pw * 0.5, cy, R, 0, Math.PI * 2); x.fill();
    } else if (P.kind === 'bands') {
      for (let k = 0; k < 6; k++) {
        const y = ph * (0.46 + k * 0.075);
        x.fillStyle = rgba(mixc([90, 30, 20], P.acc, 0.5 - k * 0.08), 1);
        x.fillRect(0, y, pw, ph);
      }
      x.fillStyle = rgba(P.acc, 0.95); x.beginPath(); x.arc(pw * 0.68, ph * 0.3, pw * 0.07, 0, Math.PI * 2); x.fill();
    } else {
      x.strokeStyle = rgba(P.acc, 0.14); x.lineWidth = 1.2 * U;
      for (let k = 0; k <= 12; k++) { x.beginPath(); x.moveTo((pw * k) / 12, 0); x.lineTo((pw * k) / 12, ph); x.stroke(); }
      for (let k = 0; k <= 18; k++) { x.beginPath(); x.moveTo(0, (ph * k) / 18); x.lineTo(pw, (ph * k) / 18); x.stroke(); }
      x.strokeStyle = rgba(P.acc, 0.7); x.lineWidth = 2.5 * U;
      x.beginPath(); x.moveTo(pw * 0.15, ph * 0.62);
      x.bezierCurveTo(pw * 0.35, ph * 0.3, pw * 0.6, ph * 0.7, pw * 0.82, ph * 0.28); x.stroke();
      x.fillStyle = rgba(P.acc, 1); x.beginPath(); x.arc(pw * 0.82, ph * 0.28, 6 * U, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    // grain + vignette : l'affiche a une matière
    x.globalCompositeOperation = 'overlay';
    x.globalAlpha = 0.35;
    x.fillStyle = x.createPattern(GRAIN[(idx + 2) % GRAIN.length], 'repeat');
    x.fillRect(0, 0, pw, ph);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    const vg = x.createRadialGradient(pw / 2, ph / 2, pw * 0.3, pw / 2, ph / 2, ph * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = vg; x.fillRect(0, 0, pw, ph);
    // typographie : titre serré en bas, bloc de crédits
    const words = d.titre.split(' ');
    const ts = fitSize(words.reduce((a, b) => (a.length > b.length ? a : b)), pw * 0.84, 92 * U, { fam: 'Anton' });
    let y = ph * 0.9 - (words.length - 1) * ts * 0.94;
    for (const wd of words) { drawText(x, wd, pw * 0.08, y, ts, { fam: 'Anton', color: P.ink }); y += ts * 0.94; }
    x.fillStyle = rgba(hexc(P.ink), 0.55);
    for (let k = 0; k < 3; k++) x.fillRect(pw * 0.08, ph * 0.07 + k * 9 * U, pw * (0.5 - k * 0.12), 3 * U);
    drawText(x, 'UN FILM DE', pw * 0.92, ph * 0.075, 10 * U, { fam: 'Archivo', wt: 600, track: 0.2, align: 'right', color: rgba(hexc(P.ink), 0.6) });
    d.canvas = c;
    POSTERS.push(c);
  });
}

function buildStars() {
  const r = prng(4242);
  for (let i = 0; i < 900; i++) STARS.push({ x: r() * 2 - 1, y: r() * 2 - 1, z: r(), b: 0.4 + r() * 0.6 });
  const r2 = prng(99);
  for (let i = 0; i < 220; i++) DUST.push({ x: r2(), y: r2(), s: 0.5 + r2() * 2.2, sp: 0.2 + r2(), ph: r2() * 10 });
}

function setupAssets() {
  buildWall();
  buildTiles();
  buildPosters();
  buildStars();
}
