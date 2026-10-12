// Affiches et fonds fictifs du catalogue (aucune image de film réelle) :
//   node ugc/posters.mjs <dossier>  → cm<id>.png (500×750), cmb<id>.png (1280×720), hero.png
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FILMS } from './catalog.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'src/fonts', f)).toString('base64');

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage();
await page.setContent(`<style>@font-face{font-family:Anton;src:url(${font('anton.woff2')})}
@font-face{font-family:Archivo;font-weight:600;src:url(${font('archivo-600.woff2')})}</style><div style="font-family:Anton">a</div><div style="font-family:Archivo;font-weight:600">a</div>`);
await page.evaluate(() => document.fonts.ready);

const jobs = FILMS.map((f) => ({ id: f.id, title: f.title, director: f.director, pal: f.palette, hero: f.hero, genre: f.genre_ids[0] }));
const imgs = await page.evaluate((jobs) => {
  const HERO = [
    { bg: ['#0a1330', '#1d2a5e'], acc: [255, 160, 170], ink: '#f3e9e4', kind: 'moon' },
    { bg: ['#06221f', '#0f4039'], acc: [150, 240, 220], ink: '#e8f3ef', kind: 'line' },
    { bg: ['#1c0703', '#5e1c08'], acc: [255, 150, 70], ink: '#f7e6d8', kind: 'arc' },
    { bg: ['#3d1b14', '#b8644a'], acc: [255, 214, 170], ink: '#fff1e4', kind: 'bands' },
    { bg: ['#07140f', '#143628'], acc: [180, 255, 200], ink: '#e9f5ee', kind: 'grid' },
    { bg: ['#2a1608', '#a8682c'], acc: [255, 226, 160], ink: '#fff4e2', kind: 'caravan' },
    { bg: ['#050b1c', '#10224a'], acc: [120, 255, 200], ink: '#e6fff6', kind: 'aurora' },
    { bg: ['#12081f', '#3a1d5c'], acc: [230, 200, 255], ink: '#f6eeff', kind: 'moons' },
  ];
  const BY_GENRE = {
    35: { bg: ['#d9822b', '#f5c04a'], acc: [255, 255, 240], ink: '#2a1504', kind: 'sun' },
    27: { bg: ['#050203', '#2b0508'], acc: [220, 30, 40], ink: '#f2e4e4', kind: 'door' },
    18: { bg: ['#1c2733', '#4d6377'], acc: [230, 220, 200], ink: '#f4efe7', kind: 'window' },
    53: { bg: ['#041417', '#0f3a40'], acc: [120, 230, 230], ink: '#e2f6f6', kind: 'lines' },
    16: { bg: ['#3e8bd6', '#9ad1ff'], acc: [255, 236, 120], ink: '#10233a', kind: 'bubble' },
    14: { bg: ['#1a0b2e', '#52307a'], acc: [255, 210, 120], ink: '#f8eedd', kind: 'castle' },
    80: { bg: ['#0b0b0b', '#2c2a20'], acc: [250, 205, 40], ink: '#f5efd8', kind: 'stripes' },
    10749: { bg: ['#4a0f24', '#d4567a'], acc: [255, 220, 230], ink: '#fff0f4', kind: 'hearts' },
    36: { bg: ['#2b1d10', '#7a5a34'], acc: [240, 214, 170], ink: '#f7ecdb', kind: 'window' },
    10402: { bg: ['#120a24', '#5a1f78'], acc: [255, 120, 200], ink: '#fbe9f6', kind: 'rings' },
    10752: { bg: ['#1c1f12', '#4c5230'], acc: [230, 220, 170], ink: '#f2efdf', kind: 'lines' },
    9648: { bg: ['#06150f', '#1d3b2c'], acc: [200, 240, 210], ink: '#e8f4ec', kind: 'keyhole' },
    28: { bg: ['#1a0604', '#7a2210'], acc: [255, 180, 80], ink: '#fff0e0', kind: 'arc' },
    12: { bg: ['#0c2433', '#2f7090'], acc: [255, 230, 170], ink: '#f2f7fa', kind: 'bands' },
    878: { bg: ['#060b18', '#1b2d55'], acc: [160, 210, 255], ink: '#eaf2ff', kind: 'moon' },
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function art(x, w, h, P, r) {
    const g = x.createLinearGradient(0, 0, w * 0.3, h);
    g.addColorStop(0, P.bg[1]); g.addColorStop(1, P.bg[0]);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const k = P.kind, m = Math.min(w, h);
    if (k === 'moon') {
      const cx = w * 0.5, cy = h * 0.4, R = m * 0.3;
      const halo = x.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.4);
      halo.addColorStop(0, rgba(P.acc, 0.35)); halo.addColorStop(1, rgba(P.acc, 0));
      x.fillStyle = halo; x.fillRect(0, 0, w, h);
      const b = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      b.addColorStop(0, 'rgba(255,245,240,1)'); b.addColorStop(1, rgba(P.acc, 0.9));
      x.fillStyle = b; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
      x.fillStyle = P.bg[0]; x.fillRect(0, h * 0.6, w, h);
      for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; x.fillRect(r() * w, r() * h * 0.6, 1.5, 1.5); }
    } else if (k === 'line') {
      x.fillStyle = rgba(P.acc, 0.9); x.fillRect(w * 0.5 - 2, h * 0.12, 4, h * 0.5);
      for (let i = 1; i <= 6; i++) { x.strokeStyle = rgba(P.acc, 0.36 - i * 0.05); x.lineWidth = 3; x.beginPath(); x.arc(w * 0.5, h * 0.12, i * m * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); }
      x.fillStyle = rgba(P.acc, 1); x.beginPath(); x.arc(w * 0.5, h * 0.12, 7, 0, Math.PI * 2); x.fill();
    } else if (k === 'arc') {
      const R = w * 1.1, cy = h * 0.78 + R;
      const atm = x.createRadialGradient(w * 0.5, cy, R * 0.98, w * 0.5, cy, R * 1.12);
      atm.addColorStop(0, rgba(P.acc, 0.9)); atm.addColorStop(1, rgba(P.acc, 0));
      x.fillStyle = atm; x.fillRect(0, 0, w, h);
      x.fillStyle = '#120402'; x.beginPath(); x.arc(w * 0.5, cy, R, 0, Math.PI * 2); x.fill();
    } else if (k === 'bands' || k === 'caravan') {
      for (let i = 0; i < 6; i++) {
        x.fillStyle = rgba([Math.round(90 + i * 18), Math.round(40 + i * 14), Math.round(25 + i * 8)], 1);
        x.beginPath(); x.moveTo(0, h * (0.5 + i * 0.075));
        for (let s = 0; s <= 8; s++) x.lineTo((w * s) / 8, h * (0.48 + i * 0.075) + Math.sin(s * 1.3 + i) * h * 0.02);
        x.lineTo(w, h); x.lineTo(0, h); x.fill();
      }
      x.fillStyle = rgba(P.acc, 0.95); x.beginPath(); x.arc(w * 0.68, h * 0.28, m * 0.08, 0, Math.PI * 2); x.fill();
      if (k === 'caravan') {
        x.fillStyle = 'rgba(30,12,4,0.9)';
        for (let i = 0; i < 5; i++) { const px = w * (0.2 + i * 0.1), py = h * 0.5 - i * h * 0.006; x.fillRect(px, py - h * 0.03, w * 0.012, h * 0.03); x.beginPath(); x.arc(px + w * 0.006, py - h * 0.036, w * 0.008, 0, Math.PI * 2); x.fill(); }
      }
    } else if (k === 'grid') {
      x.strokeStyle = rgba(P.acc, 0.15); x.lineWidth = 1.2;
      for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo((w * i) / 12, 0); x.lineTo((w * i) / 12, h); x.stroke(); }
      for (let i = 0; i <= 18; i++) { x.beginPath(); x.moveTo(0, (h * i) / 18); x.lineTo(w, (h * i) / 18); x.stroke(); }
      x.strokeStyle = rgba(P.acc, 0.75); x.lineWidth = 3;
      x.beginPath(); x.moveTo(w * 0.15, h * 0.62); x.bezierCurveTo(w * 0.35, h * 0.3, w * 0.6, h * 0.7, w * 0.82, h * 0.28); x.stroke();
      x.fillStyle = rgba(P.acc, 1); x.beginPath(); x.arc(w * 0.82, h * 0.28, 8, 0, Math.PI * 2); x.fill();
    } else if (k === 'aurora') {
      for (let i = 0; i < 4; i++) {
        const gg = x.createLinearGradient(0, h * 0.1, 0, h * 0.6);
        gg.addColorStop(0, rgba(P.acc, 0)); gg.addColorStop(0.5, rgba(i % 2 ? [190, 120, 255] : P.acc, 0.32)); gg.addColorStop(1, rgba(P.acc, 0));
        x.fillStyle = gg; x.beginPath(); x.moveTo(0, h * (0.2 + i * 0.05));
        for (let s = 0; s <= 10; s++) x.lineTo((w * s) / 10, h * (0.18 + i * 0.06) + Math.sin(s * 0.9 + i * 2) * h * 0.06);
        x.lineTo(w, h * 0.62); x.lineTo(0, h * 0.62); x.fill();
      }
      x.fillStyle = '#02050d'; x.beginPath(); x.moveTo(0, h * 0.66);
      for (let s = 0; s <= 6; s++) x.lineTo((w * s) / 6, h * (0.6 + r() * 0.06)); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    } else if (k === 'moons') {
      for (let i = 0; i < 7; i++) { const R = m * (0.04 + i * 0.012); x.fillStyle = rgba(P.acc, 0.35 + i * 0.09); x.beginPath(); x.arc(w * (0.18 + i * 0.11), h * (0.42 - Math.sin(i / 6 * Math.PI) * 0.16), R, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#0a0414'; x.fillRect(0, h * 0.62, w, h);
    } else if (k === 'sun') {
      x.fillStyle = rgba(P.acc, 0.9); x.beginPath(); x.arc(w * 0.5, h * 0.36, m * 0.24, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(80,30,0,0.25)'; x.fillRect(0, h * 0.58, w, h);
    } else if (k === 'door') {
      x.fillStyle = rgba(P.acc, 0.85); x.fillRect(w * 0.42, h * 0.3, w * 0.16, h * 0.3);
      x.fillStyle = '#000'; x.fillRect(w * 0.47, h * 0.42, w * 0.06, h * 0.18);
    } else if (k === 'window') {
      x.fillStyle = rgba(P.acc, 0.8); x.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.34);
      x.fillStyle = P.bg[0]; x.fillRect(w * 0.495, h * 0.2, w * 0.01, h * 0.34); x.fillRect(w * 0.3, h * 0.365, w * 0.4, h * 0.008);
    } else if (k === 'lines') {
      x.strokeStyle = rgba(P.acc, 0.5); x.lineWidth = 2;
      for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(0, h * (0.1 + i * 0.035)); x.lineTo(w, h * (0.05 + i * 0.04)); x.stroke(); }
    } else if (k === 'bubble') {
      for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`; x.beginPath(); x.arc(r() * w, h * (0.15 + r() * 0.45), m * (0.04 + r() * 0.1), 0, Math.PI * 2); x.fill(); }
    } else if (k === 'castle') {
      x.fillStyle = 'rgba(10,4,20,0.9)';
      [[0.2, 0.36], [0.35, 0.28], [0.5, 0.2], [0.65, 0.3], [0.8, 0.38]].forEach(([px, py]) => { x.fillRect(w * (px - 0.04), h * py, w * 0.08, h); x.beginPath(); x.moveTo(w * (px - 0.05), h * py); x.lineTo(w * px, h * (py - 0.08)); x.lineTo(w * (px + 0.05), h * py); x.fill(); });
      x.fillStyle = rgba(P.acc, 0.9); x.beginPath(); x.arc(w * 0.75, h * 0.14, m * 0.05, 0, Math.PI * 2); x.fill();
    } else if (k === 'stripes') {
      x.fillStyle = rgba(P.acc, 0.9); for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(w * (i * 0.2 - 0.2), h * 0.6); x.lineTo(w * (i * 0.2 - 0.1), h * 0.6); x.lineTo(w * (i * 0.2 + 0.1), h * 0.4); x.lineTo(w * (i * 0.2), h * 0.4); x.fill(); }
    } else if (k === 'hearts' || k === 'rings') {
      x.strokeStyle = rgba(P.acc, 0.5); x.lineWidth = 3;
      for (let i = 1; i < 8; i++) { x.beginPath(); x.arc(w * 0.5, h * 0.38, i * m * 0.05, 0, Math.PI * 2); x.stroke(); }
    } else if (k === 'keyhole') {
      x.fillStyle = rgba(P.acc, 0.85); x.beginPath(); x.arc(w * 0.5, h * 0.32, m * 0.09, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(w * 0.46, h * 0.34); x.lineTo(w * 0.54, h * 0.34); x.lineTo(w * 0.57, h * 0.52); x.lineTo(w * 0.43, h * 0.52); x.fill();
    }
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(id, 0, 0);
    const vg = x.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
  }
  function poster(j) {
    const w = 500, h = 750, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = rnd(j.id * 97);
    const P = j.hero ? HERO[j.pal] : (BY_GENRE[j.genre] || BY_GENRE[18]);
    art(x, w, h, P, r);
    const fade = x.createLinearGradient(0, h * 0.55, 0, h); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.55)');
    if (P.ink !== '#2a1504' && P.ink !== '#10233a') { x.fillStyle = fade; x.fillRect(0, 0, w, h); }
    const words = j.title.toUpperCase().split(' ');
    const lines = []; let cur = '';
    x.font = '100px Anton';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (x.measureText(t).width > 1.5 * 100 * 2.6 && cur) { lines.push(cur); cur = wd; } else cur = t; }
    lines.push(cur);
    let size = 120;
    for (const l of lines) { x.font = `${size}px Anton`; while (x.measureText(l).width > w * 0.84) { size -= 2; x.font = `${size}px Anton`; } }
    x.fillStyle = P.ink; x.textBaseline = 'alphabetic';
    let y = h * 0.92 - (lines.length - 1) * size * 0.95;
    for (const l of lines) { x.font = `${size}px Anton`; x.fillText(l, w * 0.08, y); y += size * 0.95; }
    x.font = '600 15px Archivo'; x.globalAlpha = 0.7; x.textAlign = 'left';
    x.fillText(('UN FILM DE ' + j.director).toUpperCase().split('').join(' '), w * 0.08, h * 0.07);
    return c.toDataURL('image/png');
  }
  function backdrop(j) {
    const w = 1280, h = 720, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = rnd(j.id * 131);
    art(x, w, h, j.hero ? HERO[j.pal] : (BY_GENRE[j.genre] || BY_GENRE[18]), r);
    return c.toDataURL('image/png');
  }
  function hero() {
    const w = 1280, h = 720, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = rnd(4242);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a0c10'); g.addColorStop(1, '#050304');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const beam = x.createRadialGradient(w * 0.72, h * 0.18, 10, w * 0.72, h * 0.18, w * 0.7);
    beam.addColorStop(0, 'rgba(255,190,170,0.55)'); beam.addColorStop(0.4, 'rgba(255,45,79,0.12)'); beam.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = beam; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const R = 2 + r() * 14; x.fillStyle = `rgba(255,${150 + r() * 80 | 0},${120 + r() * 60 | 0},${0.05 + r() * 0.25})`; x.beginPath(); x.arc(r() * w, h * (0.45 + r() * 0.5), R, 0, Math.PI * 2); x.fill(); }
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }
  const out = {};
  for (const j of jobs) { out['cm' + j.id] = poster(j); out['cmb' + j.id] = backdrop(j); }
  out.hero = hero();
  return out;
}, jobs);
for (const [k, v] of Object.entries(imgs)) fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
console.log(`${Object.keys(imgs).length} images → ${OUT}`);
await browser.close();
