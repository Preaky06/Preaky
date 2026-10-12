/* CinéMood — film publicitaire
   Moteur de rendu déterministe : chaque image est calculée à partir du temps t,
   ce qui permet un rendu image par image sans aucune saccade. */
'use strict';

const FPS = 60;
const DURATION = 30;

const COL = {
  bg: '#100a0d',
  red: '#ff2d4f',
  redHi: '#ff6b83',
  pink: '#ff8fa1',
  ink: '#f6eef0',
};
const RED = [255, 45, 79];
const INK = [246, 238, 240];

/* globales de format, fixées par setup() */
let W = 1920, H = 1080, U = 1, PORT = false, CX = 960, CY = 540;
let MAIN, MX;      // canvas visible (sortie)
let SB, SX;        // tampon de scène
let MB, MM;        // contexte de mesure
let TMP, TX, TMP2, T2X;
let HB, HX, HB2, H2X; // demi-résolution (lueurs)
let QB, QX, QB2, Q2X; // quart de résolution (bloom)

/* ---------- outils ---------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: x => x,
  inQuad: x => x * x,
  outQuad: x => 1 - (1 - x) * (1 - x),
  inCubic: x => x * x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuint: x => 1 - Math.pow(1 - x, 5),
  inOutQuint: x => (x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2),
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outBackSoft: x => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  smooth: x => x * x * (3 - 2 * x),
};
function rnd(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function rnd2(i, j) { return rnd(i * 157.31 + j * 71.97); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i), rnd(i + 1), u) * 2 - 1; }
function fbm1(x) { return noise1(x) * 0.6 + noise1(x * 2.13 + 7.1) * 0.3 + noise1(x * 4.37 + 3.3) * 0.1; }
function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function mixc(a, b, t) { return [lerp(a[0], b[0], t) | 0, lerp(a[1], b[1], t) | 0, lerp(a[2], b[2], t) | 0]; }
function hexc(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
function resetCtx(c) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
  c.shadowBlur = 0;
  c.shadowColor = 'transparent';
  c.letterSpacing = '0px';
}
function clearCanvas(c, ctx) { resetCtx(ctx); ctx.clearRect(0, 0, c.width, c.height); }

/* ---------- typographie ---------- */
function setFont(ctx, size, fam, wt) {
  ctx.font = `${wt || 400} ${size}px ${fam || 'Anton'}`;
}
/* largeur réelle d'une chaîne (tracking en em, sans l'espace final ajouté par letterSpacing) */
function textWidth(s, size, o = {}) {
  setFont(MM, size, o.fam, o.wt);
  MM.letterSpacing = ((o.track || 0) * size) + 'px';
  const w = MM.measureText(s).width - (s.length ? (o.track || 0) * size : 0);
  MM.letterSpacing = '0px';
  return w;
}
/* taille de police qui fait tenir s dans maxW */
function fitSize(s, maxW, maxSize, o = {}) {
  const w = textWidth(s, 100, o);
  return Math.min(maxSize, (100 * maxW) / Math.max(1, w));
}
function drawText(ctx, s, x, y, size, o = {}) {
  setFont(ctx, size, o.fam, o.wt);
  const tr = (o.track || 0) * size;
  ctx.letterSpacing = tr + 'px';
  const w = ctx.measureText(s).width - (s.length ? tr : 0);
  let x0 = x;
  if (o.align === 'center') x0 = x - w / 2;
  else if (o.align === 'right') x0 = x - w;
  ctx.textAlign = 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  if (o.color) ctx.fillStyle = o.color;
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lineWidth || 1; ctx.strokeText(s, x0, y); }
  if (!o.noFill) ctx.fillText(s, x0, y);
  ctx.letterSpacing = '0px';
  return { x: x0, w };
}
/* hauteur réelle au-dessus de la ligne de base (accents compris) */
function textAscent(s, size, o = {}) {
  setFont(MM, size, o.fam, o.wt);
  return MM.measureText(s).actualBoundingBoxAscent;
}
/* positions individuelles des lettres (crénage conservé via la mesure des préfixes) */
function layoutChars(s, size, o = {}) {
  setFont(MM, size, o.fam, o.wt);
  const tr = (o.track || 0) * size;
  MM.letterSpacing = tr + 'px';
  const chars = [];
  for (let i = 0; i < s.length; i++) {
    const x = MM.measureText(s.slice(0, i)).width;
    const w = MM.measureText(s[i]).width - tr;
    chars.push({ ch: s[i], x, w, i });
  }
  const w = MM.measureText(s).width - (s.length ? tr : 0);
  MM.letterSpacing = '0px';
  return { chars, w };
}
/* ligne révélée par un masque : le texte monte depuis sous la ligne de base */
function revealLine(ctx, s, x, y, size, p, o = {}) {
  if (p <= 0) return;
  const e = (o.ease || E.outQuint)(clamp(p));
  const w = textWidth(s, size, o);
  let x0 = x;
  if (o.align === 'center') x0 = x - w / 2;
  else if (o.align === 'right') x0 = x - w;
  const asc = size * (o.asc || 1.0), desc = size * (o.desc || 0.28);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - size * 0.5, y - asc, w + size, asc + desc);
  ctx.clip();
  ctx.translate(0, (1 - e) * (asc + desc) * (o.dir || 1));
  drawText(ctx, s, x0, y, size, Object.assign({}, o, { align: 'left' }));
  ctx.restore();
}
/* mots révélés un par un ; renvoie la largeur totale */
function revealWords(ctx, s, x, y, size, t, o = {}) {
  const words = s.split(' ');
  const sp = textWidth(' ', size, o) + (o.track || 0) * size;
  const ws = words.map(wd => textWidth(wd, size, o));
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let x0 = x;
  if (o.align === 'center') x0 = x - total / 2;
  else if (o.align === 'right') x0 = x - total;
  const stag = o.stagger == null ? 0.06 : o.stagger, dur = o.dur || 0.55;
  words.forEach((wd, i) => {
    const p = clamp((t - i * stag) / dur);
    const col = o.colors && o.colors[i] ? o.colors[i] : o.color;
    revealLine(ctx, wd, x0, y, size, p, Object.assign({}, o, { align: 'left', color: col }));
    x0 += ws[i] + sp;
  });
  return total;
}

/* ---------- sprites et passes ---------- */
let DOT; // point lumineux doux
function buildDot() {
  DOT = mkCanvas(64, 64);
  const c = DOT.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
}
const TINTED = {};
function tintedDot(key, col) {
  if (TINTED[key]) return TINTED[key];
  const c = mkCanvas(64, 64), x = c.getContext('2d');
  x.drawImage(DOT, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = rgba(col, 1);
  x.fillRect(0, 0, 64, 64);
  TINTED[key] = c;
  return c;
}

/* lueur : la source (demi-résolution, transparente) est floutée puis ajoutée */
function glowFromHalf(ctx, radii, alphas) {
  resetCtx(H2X);
  for (let k = 0; k < radii.length; k++) {
    H2X.clearRect(0, 0, HB2.width, HB2.height);
    H2X.filter = `blur(${Math.max(0.5, radii[k] * U * 0.5)}px)`;
    H2X.drawImage(HB, 0, 0);
    H2X.filter = 'none';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alphas[k];
    ctx.drawImage(HB2, 0, 0, W, H);
    ctx.restore();
  }
}
function halfCtxLike(ctx) {
  clearCanvas(HB, HX);
  const m = ctx.getTransform();
  HX.setTransform(m.a * 0.5, m.b * 0.5, m.c * 0.5, m.d * 0.5, m.e * 0.5, m.f * 0.5);
  return HX;
}

/* ---------- néon ---------- */
/* levels : intensité par lettre (0 éteinte, 1 allumée). cols : couleur par lettre */
function drawNeon(ctx, s, x, y, size, levels, o = {}) {
  const L = layoutChars(s, size, o);
  let x0 = x;
  if (o.align === 'center') x0 = x - L.w / 2;
  else if (o.align === 'right') x0 = x - L.w;
  const cols = o.cols || s.split('').map(() => RED);
  const fam = o.fam || 'Anton';
  setFont(ctx, size, fam, o.wt);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0px';
  // 1. tubes éteints (verre sombre)
  ctx.save();
  for (const c of L.chars) {
    if (c.ch === ' ') continue;
    const col = cols[c.i];
    ctx.fillStyle = rgba(mixc(col, [20, 6, 10], 0.82), 0.92);
    ctx.fillText(c.ch, x0 + c.x, y);
    ctx.strokeStyle = 'rgba(255,220,226,0.07)';
    ctx.lineWidth = Math.max(1, size * 0.006);
    ctx.strokeText(c.ch, x0 + c.x, y);
  }
  ctx.restore();
  // 2. source de lueur
  const hx = halfCtxLike(ctx);
  setFont(hx, size, fam, o.wt);
  hx.textBaseline = 'alphabetic';
  let any = false;
  for (const c of L.chars) {
    const lv = levels[c.i] || 0;
    if (lv <= 0.003 || c.ch === ' ') continue;
    any = true;
    hx.fillStyle = glowColor(cols[c.i], lv);
    hx.fillText(c.ch, x0 + c.x, y);
  }
  if (any) {
    const gs = (o.glow || 1) * size / 260;
    glowFromHalf(ctx, [6 * gs, 22 * gs, 64 * gs, 150 * gs], [0.85, 0.7, 0.5, 0.25].map(a => a * (o.glowAlpha || 1)));
  }
  // 3. tube allumé : remplissage + cœur brûlant
  ctx.save();
  for (const c of L.chars) {
    const lv = levels[c.i] || 0;
    if (lv <= 0.003 || c.ch === ' ') continue;
    const col = cols[c.i];
    const hot = mixc(col, [255, 240, 244], col === INK || (col[0] > 230 && col[1] > 200) ? 0.75 : 0.42);
    ctx.globalAlpha = lv;
    ctx.fillStyle = rgba(col, 1);
    ctx.fillText(c.ch, x0 + c.x, y);
    ctx.globalAlpha = lv * 0.85;
    ctx.strokeStyle = rgba(hot, 1);
    ctx.lineWidth = Math.max(1, size * 0.014);
    ctx.strokeText(c.ch, x0 + c.x, y);
  }
  ctx.restore();
  return { x: x0, w: L.w, chars: L.chars };
}
/* une lettre blanche rayonne en rose pâle, sans saturer l'image */
function glowColor(col, lv) {
  const light = col[1] > 150;
  return light ? rgba([255, 150, 172], lv * 0.42) : rgba(col, lv);
}
/* scintillement d'un tube : renvoie 0..1, déterministe */
function flick(t, seed, rate = 1) {
  const n = noise1(t * 23 * rate + seed * 31.7);
  const n2 = noise1(t * 61 * rate + seed * 11.3);
  return n > 0.55 || n2 > 0.72 ? 0.18 + 0.2 * rnd(Math.floor(t * 60) + seed) : 1;
}

/* ---------- grain, vignette, bloom ---------- */
const GRAIN = [];
function buildGrain() {
  const n = 256;
  for (let k = 0; k < 8; k++) {
    const c = mkCanvas(n, n), x = c.getContext('2d');
    const im = x.createImageData(n, n);
    let seed = k * 9301 + 49297;
    const r = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < n * n; i++) {
      const g = (r() + r() + r() + r() - 2) * 0.5; // ≈ gaussien
      const v = clamp(128 + g * 150, 0, 255);
      im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    GRAIN.push(c);
  }
}
function applyGrain(ctx, f, amount) {
  if (amount <= 0) return;
  const g = GRAIN[f % GRAIN.length];
  const pat = ctx.createPattern(g, 'repeat');
  const s = Math.max(1, U * 1.15);
  pat.setTransform(new DOMMatrix([s, 0, 0, s, rnd(f) * 256 * s, rnd(f + 7) * 256 * s]));
  ctx.save();
  resetCtx(ctx);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function applyVignette(ctx, amount) {
  if (amount <= 0) return;
  const r = Math.hypot(W, H) / 2;
  const g = ctx.createRadialGradient(CX, CY, r * 0.35, CX, CY, r * 1.02);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, `rgba(0,0,0,${0.35 * amount})`);
  g.addColorStop(1, `rgba(0,0,0,${0.85 * amount})`);
  ctx.save();
  resetCtx(ctx);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function applyBloom(ctx, src, amount) {
  if (amount <= 0) return;
  clearCanvas(QB, QX);
  QX.filter = 'brightness(0.62) contrast(4)';
  QX.drawImage(src, 0, 0, QB.width, QB.height);
  QX.filter = 'none';
  const passes = [[3, 0.55], [9, 0.45]];
  for (const [r, a] of passes) {
    clearCanvas(QB2, Q2X);
    Q2X.filter = `blur(${r * U * 0.25 * 4}px)`;
    Q2X.drawImage(QB, 0, 0);
    Q2X.filter = 'none';
    ctx.save();
    resetCtx(ctx);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * amount;
    ctx.drawImage(QB2, 0, 0, W, H);
    ctx.restore();
  }
}
/* aberration chromatique : séparation des canaux par multiplication puis addition */
function chromaCopy(ctx, src, amt, ox, oy, sc) {
  const d = amt * U;
  resetCtx(ctx);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const chans = [[[255, 0, 0], -d], [[0, 255, 0], 0], [[0, 0, 255], d]];
  for (const [c, dx] of chans) {
    clearCanvas(TMP2, T2X);
    T2X.drawImage(src, 0, 0);
    T2X.globalCompositeOperation = 'multiply';
    T2X.fillStyle = rgba(c, 1);
    T2X.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    drawScaled(ctx, TMP2, ox + dx, oy, sc + Math.abs(dx) / W * 0.5);
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawScaled(ctx, img, ox, oy, sc) {
  const w = W * sc, h = H * sc;
  ctx.drawImage(img, CX - w / 2 + ox, CY - h / 2 + oy, w, h);
}

/* ---------- caméra ---------- */
function camera(ctx, o) {
  // o : {z (zoom), x, y (décalage en px), r (rotation rad), ox, oy (centre)}
  const ox = o.ox == null ? CX : o.ox, oy = o.oy == null ? CY : o.oy;
  ctx.translate(ox + (o.x || 0), oy + (o.y || 0));
  if (o.r) ctx.rotate(o.r);
  const z = o.z || 1;
  ctx.scale(z, z);
  ctx.translate(-ox, -oy);
}
function shake(t, amp, freq = 9, seed = 0) {
  return { x: fbm1(t * freq + seed) * amp * U, y: fbm1(t * freq + 40 + seed) * amp * U, r: fbm1(t * freq * 0.7 + 90 + seed) * amp * 0.0006 };
}

/* panneau en perspective (rotation autour de l'axe vertical) par bandes verticales */
function drawPanelY(ctx, img, dx, dy, dw, dh, angle, o = {}) {
  const N = o.strips || 96;
  const f = o.focal || 2.2; // distance focale relative à la largeur
  const sw = img.width / N;
  const half = dw / 2;
  const ccx = dx + half, ccy = dy + dh / 2;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const proj = (u) => { // u ∈ [-1,1] le long du panneau
    const X = u * half * ca, Z = u * half * sa;
    const k = (f * dw) / (f * dw + Z);
    return { x: ccx + X * k, k };
  };
  for (let i = 0; i < N; i++) {
    const u0 = -1 + (2 * i) / N, u1 = -1 + (2 * (i + 1)) / N;
    const p0 = proj(u0), p1 = proj(u1);
    const k = (p0.k + p1.k) / 2;
    const h = dh * k;
    const x0 = Math.min(p0.x, p1.x), w = Math.abs(p1.x - p0.x) + 0.6;
    ctx.drawImage(img, i * sw, 0, sw, img.height, x0, ccy - h / 2, w, h);
  }
}

/* coins projetés du panneau (mêmes formules que drawPanelY) */
function panelQuad(dx, dy, dw, dh, angle, focal = 2.2) {
  const half = dw / 2, ccx = dx + half, ccy = dy + dh / 2;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const pr = (u) => { const X = u * half * ca, Z = u * half * sa, k = (focal * dw) / (focal * dw + Z); return { x: ccx + X * k, h: dh * k }; };
  const l = pr(-1), r = pr(1);
  return [{ x: l.x, y: ccy - l.h / 2 }, { x: r.x, y: ccy - r.h / 2 }, { x: r.x, y: ccy + r.h / 2 }, { x: l.x, y: ccy + l.h / 2 }];
}

/* ---------- initialisation ---------- */
function setupEngine(w, h) {
  W = w; H = h; PORT = h > w; U = Math.min(w, h) / 1080; CX = w / 2; CY = h / 2;
  MAIN = document.getElementById('c');
  MAIN.width = w; MAIN.height = h;
  MX = MAIN.getContext('2d');
  SB = mkCanvas(w, h); SX = SB.getContext('2d');
  MB = mkCanvas(8, 8); MM = MB.getContext('2d');
  TMP = mkCanvas(w, h); TX = TMP.getContext('2d');
  TMP2 = mkCanvas(w, h); T2X = TMP2.getContext('2d');
  HB = mkCanvas(w / 2, h / 2); HX = HB.getContext('2d');
  HB2 = mkCanvas(w / 2, h / 2); H2X = HB2.getContext('2d');
  QB = mkCanvas(w / 4, h / 4); QX = QB.getContext('2d');
  QB2 = mkCanvas(w / 4, h / 4); Q2X = QB2.getContext('2d');
  buildDot();
  buildGrain();
}
