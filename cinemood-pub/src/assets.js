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
  const pw = Math.round(420 * U), ph = Math.round(630 * U);
  POSTER_DEFS.forEach((d, idx) => {
    const c = mkCanvas(pw, ph), x = c.getContext('2d');
    const r = prng(500 + idx * 31);
    const stars = (n, ymax, a) => {
      for (let k = 0; k < n; k++) {
        const s = (0.6 + r() * 1.8) * U;
        x.fillStyle = `rgba(255,255,255,${a * (0.3 + r() * 0.7)})`;
        x.fillRect(r() * pw, r() * ph * ymax, s, s);
      }
    };
    let g;
    if (d.type === 'planet') {
      g = x.createLinearGradient(0, 0, 0, ph);
      g.addColorStop(0, '#060818'); g.addColorStop(0.45, '#1b0d33'); g.addColorStop(0.72, '#7a1f4f'); g.addColorStop(0.86, '#ff6b83'); g.addColorStop(1, '#2a0a18');
      x.fillStyle = g; x.fillRect(0, 0, pw, ph);
      stars(260, 0.7, 1);
      // planète annelée
      const px = pw * 0.62, py = ph * 0.3, pr = pw * 0.26;
      const pg = x.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
      pg.addColorStop(0, '#ffd6dc'); pg.addColorStop(0.5, '#e0577a'); pg.addColorStop(1, '#3a0d2a');
      x.save(); x.translate(px, py); x.rotate(-0.35);
      x.strokeStyle = 'rgba(255,200,210,0.55)'; x.lineWidth = 5 * U;
      x.beginPath(); x.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, Math.PI, Math.PI * 2); x.stroke();
      x.restore();
      x.fillStyle = pg; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
      x.save(); x.translate(px, py); x.rotate(-0.35);
      x.strokeStyle = 'rgba(255,200,210,0.75)'; x.lineWidth = 5 * U;
      x.beginPath(); x.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, 0, Math.PI); x.stroke();
      x.strokeStyle = 'rgba(255,200,210,0.3)'; x.lineWidth = 12 * U;
      x.beginPath(); x.ellipse(0, 0, pr * 1.55, pr * 0.36, 0, 0, Math.PI); x.stroke();
      x.restore();
      // crête + silhouette
      x.fillStyle = '#07040a';
      x.beginPath(); x.moveTo(0, ph * 0.8);
      x.lineTo(pw * 0.18, ph * 0.76); x.lineTo(pw * 0.34, ph * 0.79); x.lineTo(pw * 0.5, ph * 0.74);
      x.lineTo(pw * 0.7, ph * 0.785); x.lineTo(pw, ph * 0.75); x.lineTo(pw, ph); x.lineTo(0, ph); x.fill();
      x.fillRect(pw * 0.495, ph * 0.705, 6 * U, ph * 0.04);
      x.beginPath(); x.arc(pw * 0.498, ph * 0.7, 5 * U, 0, Math.PI * 2); x.fill();
    } else if (d.type === 'signal') {
      g = x.createLinearGradient(0, 0, 0, ph);
      g.addColorStop(0, '#03131a'); g.addColorStop(0.6, '#0b3a44'); g.addColorStop(1, '#021015');
      x.fillStyle = g; x.fillRect(0, 0, pw, ph);
      stars(160, 0.6, 0.9);
      x.strokeStyle = 'rgba(120,240,230,0.35)'; x.lineWidth = 3 * U;
      for (let k = 1; k < 7; k++) { x.beginPath(); x.arc(pw * 0.5, ph * 0.52, k * pw * 0.09, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
      x.fillStyle = '#020a0d';
      x.beginPath(); x.moveTo(pw * 0.5, ph * 0.5); x.lineTo(pw * 0.38, ph * 0.8); x.lineTo(pw * 0.62, ph * 0.8); x.fill();
      x.beginPath(); x.ellipse(pw * 0.5, ph * 0.5, pw * 0.16, pw * 0.07, -0.5, 0, Math.PI * 2); x.fill();
      x.fillRect(0, ph * 0.8, pw, ph * 0.2);
    } else if (d.type === 'orbit') {
      g = x.createLinearGradient(0, 0, 0, ph);
      g.addColorStop(0, '#05030a'); g.addColorStop(1, '#1a0805');
      x.fillStyle = g; x.fillRect(0, 0, pw, ph);
      stars(220, 0.75, 1);
      const pg = x.createRadialGradient(pw * 0.5, ph * 1.55, pw * 0.4, pw * 0.5, ph * 1.55, pw * 1.3);
      pg.addColorStop(0, '#ffb15c'); pg.addColorStop(0.75, '#c2410c'); pg.addColorStop(0.83, '#ff7a3d'); pg.addColorStop(0.86, 'rgba(255,140,80,0.4)'); pg.addColorStop(1, 'rgba(255,120,60,0)');
      x.fillStyle = pg; x.fillRect(0, 0, pw, ph);
      x.fillStyle = '#eee'; x.save(); x.translate(pw * 0.42, ph * 0.38); x.rotate(-0.4);
      x.fillRect(-20 * U, -4 * U, 40 * U, 8 * U); x.fillRect(-4 * U, -18 * U, 8 * U, 36 * U); x.restore();
    } else if (d.type === 'dunes') {
      g = x.createLinearGradient(0, 0, 0, ph);
      g.addColorStop(0, '#2b1b3d'); g.addColorStop(0.5, '#ff8a6b'); g.addColorStop(0.62, '#ffd3a1'); g.addColorStop(1, '#5a2a1e');
      x.fillStyle = g; x.fillRect(0, 0, pw, ph);
      x.fillStyle = 'rgba(255,245,235,0.9)';
      x.beginPath(); x.arc(pw * 0.3, ph * 0.22, pw * 0.07, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(pw * 0.42, ph * 0.17, pw * 0.035, 0, Math.PI * 2); x.fill();
      const cols = ['#b4583b', '#8a3c2a', '#5e2619', '#341209'];
      cols.forEach((cc, k) => {
        x.fillStyle = cc; x.beginPath(); const y0 = ph * (0.58 + k * 0.1);
        x.moveTo(0, y0);
        x.bezierCurveTo(pw * 0.3, y0 - ph * 0.08, pw * 0.6, y0 + ph * 0.06, pw, y0 - ph * 0.03);
        x.lineTo(pw, ph); x.lineTo(0, ph); x.fill();
      });
    } else {
      g = x.createLinearGradient(0, 0, 0, ph);
      g.addColorStop(0, '#020812'); g.addColorStop(1, '#06141c');
      x.fillStyle = g; x.fillRect(0, 0, pw, ph);
      stars(200, 0.7, 0.9);
      for (let k = 0; k < 3; k++) {
        const ag = x.createLinearGradient(0, ph * 0.1, 0, ph * 0.6);
        ag.addColorStop(0, 'rgba(80,255,200,0)'); ag.addColorStop(0.5, `rgba(80,255,200,${0.35 - k * 0.08})`); ag.addColorStop(1, 'rgba(80,160,255,0)');
        x.fillStyle = ag; x.beginPath(); x.moveTo(0, ph * (0.3 + k * 0.05));
        for (let s = 0; s <= 10; s++) x.lineTo((pw * s) / 10, ph * (0.25 + k * 0.06) + Math.sin(s * 0.9 + k) * ph * 0.05);
        x.lineTo(pw, ph * 0.6); x.lineTo(0, ph * 0.6); x.fill();
      }
      x.fillStyle = '#01060a';
      x.beginPath(); x.moveTo(0, ph * 0.78);
      for (let s = 0; s <= 8; s++) x.lineTo((pw * s) / 8, ph * (0.66 + r() * 0.12));
      x.lineTo(pw, ph); x.lineTo(0, ph); x.fill();
    }
    // titre de l'affiche
    const fade = x.createLinearGradient(0, ph * 0.7, 0, ph);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.85)');
    x.fillStyle = fade; x.fillRect(0, 0, pw, ph);
    const fs = fitSize(d.titre, pw * 0.82, 64 * U, { fam: 'Anton' });
    drawText(x, d.titre, pw / 2, ph * 0.9, fs, { fam: 'Anton', align: 'center', color: 'rgba(255,255,255,0.95)' });
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.fillRect(pw * 0.3, ph * 0.94, pw * 0.4, 2 * U);
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
