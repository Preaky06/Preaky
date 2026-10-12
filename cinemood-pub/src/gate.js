/* Les 8 humeurs défilent sur une pellicule 35 mm rétroéclairée : à chaque temps,
   la griffe du projecteur tire l'image suivante (mouvement intermittent). */
'use strict';

let MFB, MFX, GATE_G = null;
const PULL = 0.075; // durée d'un tirage d'image (s)

function gateGeom() {
  if (GATE_G) return GATE_G;
  let fw, fh;
  if (PORT) { fw = W * 0.8; fh = fw * 1.25; } else { fw = W * 0.7; fh = fw * 9 / 16; }
  fw = Math.round(fw); fh = Math.round(fh);
  const side = Math.round(fw * (PORT ? 0.1 : 0.085));
  const gap = Math.round((PORT ? 40 : 34) * U);
  GATE_G = { fw, fh, side, gap, pitch: fh + gap, sw: fw + side * 2 };
  MFB = mkCanvas(fw, fh); MFX = MFB.getContext('2d');
  return GATE_G;
}
/* position fractionnaire de la pellicule : l'image i est dans la fenêtre quand pos = i */
function gatePos(lt) {
  const b = Math.floor(lt / 0.5), u = lt - b * 0.5;
  return (b - 1) + E.inOutCubic(clamp(u / PULL));
}

/* ---------- contenu d'une image (repère local w × h) ---------- */
function frameLabel(c, m, w, h, col, a) {
  const k = h / 760;
  c.save();
  c.globalAlpha = a;
  c.fillStyle = col;
  c.fillRect(w * 0.06, h * 0.1 - 5 * k, 26 * k, 3 * k);
  drawText(c, m.num, w * 0.06 + 38 * k, h * 0.1 + 6 * k, 20 * k, { fam: 'Archivo', wt: 600, track: 0.22, color: col });
  c.restore();
}
function gradBg(c, w, h, a, b, ang = 0.6) {
  const g = c.createLinearGradient(0, 0, w * Math.cos(ang), h * Math.sin(ang) + h * 0.3);
  g.addColorStop(0, a); g.addColorStop(1, b);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function softLight(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
}
function drawMoodFrame(c, i, p, w, h, t) {
  const m = MOODS[i];
  const k = h / 760;
  const word = m.w;
  const maxW = w * 0.86;
  let size = Math.min(h * (PORT ? 0.3 : 0.42), fitSize(word, maxW, h, { fam: 'Anton' }));
  const asc = textAscent(word, size, { fam: 'Anton' });
  let wy = h * 0.5 + asc * 0.42;
  resetCtx(c);
  c.save();
  if (m.kind === 'laugh') {
    gradBg(c, w, h, '#f6c445', '#d4870c');
    softLight(c, w * 0.75, h * 0.1, h * 0.9, [255, 245, 210], 0.55);
    const b = E.outBack(prog(p, 0, 0.24));
    const sq = 1 + 0.08 * Math.sin(p * 34) * (1 - prog(p, 0.05, 0.4));
    c.translate(w / 2, wy); c.rotate(lerp(-0.1, 0, E.outBackSoft(prog(p, 0, 0.3)))); c.scale(lerp(0.4, 1, b) * sq, lerp(0.4, 1, b) / sq); c.translate(-w / 2, -wy);
    drawText(c, word, w / 2, wy, size, { fam: 'Anton', align: 'center', color: '#1f1404' });
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#1f1404', 1);
    drawText(c, m.sub, w / 2, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 600, align: 'center', color: 'rgba(31,20,4,0.82)' });
  } else if (m.kind === 'fear') {
    c.fillStyle = '#050102'; c.fillRect(0, 0, w, h);
    const strobe = rnd(Math.floor(p * 30) * 1.91 + 3) > 0.32 ? 1 : 0.2;
    const lg = c.createLinearGradient(0, h, 0, h * 0.2);
    lg.addColorStop(0, `rgba(255,30,60,${0.75 * strobe})`); lg.addColorStop(1, 'rgba(255,30,60,0)');
    c.fillStyle = lg; c.fillRect(0, 0, w, h);
    const j = 6 * k * (1 - prog(p, 0.3, 0.5) * 0.7);
    const jx = (rnd(Math.floor(p * 60) * 3.3) - 0.5) * j * 2, jy = (rnd(Math.floor(p * 60) * 5.1) - 0.5) * j * 2;
    const lx = w * 0.06;
    size = Math.min(size, fitSize(word, w * 0.88, h, { fam: 'Anton' }));
    c.globalAlpha = E.outCubic(prog(p, 0, 0.06));
    c.globalCompositeOperation = 'lighter';
    drawText(c, word, lx + jx - 7 * k, wy + jy, size, { fam: 'Anton', color: 'rgba(255,0,40,0.85)' });
    drawText(c, word, lx + jx + 7 * k, wy + jy, size, { fam: 'Anton', color: 'rgba(0,190,255,0.45)' });
    c.globalCompositeOperation = 'source-over';
    drawText(c, word, lx + jx, wy + jy, size, { fam: 'Anton', color: strobe > 0.5 ? '#f6eef0' : 'rgba(246,238,240,0.5)' });
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#ff2d4f', 1);
    drawText(c, m.sub, lx, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 600, color: 'rgba(246,238,240,0.8)' });
  } else if (m.kind === 'emu') {
    gradBg(c, w, h, '#f4bcc6', '#b85a72', 1.1);
    softLight(c, w * 0.2, h * 0.05, h * 1.1, [255, 255, 255], 0.5);
    const bl = 22 * (1 - E.outCubic(prog(p, 0, 0.32)));
    const zs = lerp(1.1, 1, E.outCubic(prog(p, 0, 0.5)));
    c.translate(w / 2, h / 2); c.scale(zs, zs); c.translate(-w / 2, -h / 2);
    c.filter = bl > 0.3 ? `blur(${bl * k}px)` : 'none';
    c.globalAlpha = E.outCubic(prog(p, 0, 0.18));
    drawText(c, word, w / 2, wy, size, { fam: 'Anton', align: 'center', color: '#3d0f1f' });
    c.filter = 'none';
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#3d0f1f', 1);
    drawText(c, m.sub, w / 2, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 600, align: 'center', color: 'rgba(61,15,31,0.8)' });
  } else if (m.kind === 'rush') {
    gradBg(c, w, h, '#ff6a1f', '#c22a00', 0.3);
    // traits de vitesse, sombres, qui fuient vers le bord
    c.save();
    c.strokeStyle = 'rgba(40,6,0,0.35)';
    const R = Math.hypot(w, h) * 0.6;
    for (let n = 0; n < 60; n++) {
      const a = rnd(n * 3.7) * Math.PI * 2;
      const r0 = ((rnd(n * 1.1) + p * 3.6) % 1) * R;
      const len = (0.1 + rnd(n * 6.3) * 0.22) * R;
      c.lineWidth = (2 + rnd(n * 2.2) * 5) * k;
      c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
      c.lineTo(w / 2 + Math.cos(a) * (r0 + len), h / 2 + Math.sin(a) * (r0 + len)); c.stroke();
    }
    c.restore();
    const sl = E.outExpo(prog(p, 0, 0.12));
    const zs = lerp(2.2, 1, sl);
    const sk = shake(p + 3, 10 * (1 - prog(p, 0.1, 0.45)), 24, 5);
    c.translate(w / 2 + sk.x * k, h / 2 + sk.y * k); c.scale(zs, zs); c.translate(-w / 2, -h / 2);
    c.transform(1, 0, -0.14, 1, wy * 0.14, 0);
    drawText(c, word, w / 2, wy, size, { fam: 'Anton', align: 'center', color: '#160400' });
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#160400', 1);
    drawText(c, m.sub, w / 2, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 700, align: 'center', color: 'rgba(22,4,0,0.85)' });
  } else if (m.kind === 'think') {
    gradBg(c, w, h, '#1d3557', '#081426', 1.0);
    softLight(c, w * 0.5, h * 1.1, h, [120, 170, 255], 0.35);
    const tr = lerp(0.42, 0.04, E.outQuint(prog(p, 0, 0.45)));
    size = Math.min(size, fitSize(word, maxW, h, { fam: 'Anton', track: 0.42 }) * 1.0);
    c.globalAlpha = E.outCubic(prog(p, 0, 0.2));
    drawText(c, word, w / 2, wy, size, { fam: 'Anton', align: 'center', color: '#eef3ff', track: tr });
    c.fillStyle = 'rgba(238,243,255,0.5)';
    const lw = w * 0.3 * E.inOutCubic(prog(p, 0.08, 0.4));
    c.fillRect(w / 2 - lw / 2, wy + 30 * k, lw, 2 * k);
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#9fc2ff', 1);
    drawText(c, m.sub, w / 2, wy + 78 * k, 32 * k, { fam: 'Archivo', wt: 500, track: 0.08, align: 'center', color: 'rgba(238,243,255,0.8)' });
  } else if (m.kind === 'glitch') {
    gradBg(c, w, h, '#7c3aed', '#2a0b5c', 0.9);
    if (p < 0.05) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, 0, w, h); }
    const tmpW = w, tmpH = h;
    clearCanvas(TMP, TX);
    drawText(TX, word, w / 2, wy, size, { fam: 'Anton', align: 'center', color: '#f6f1ff' });
    const settle = 1 - E.outCubic(prog(p, 0.02, 0.3));
    const top = wy - asc - 6 * k, hh = asc + size * 0.1;
    const slices = 16;
    for (let sI = 0; sI < slices; sI++) {
      const sy = top + (hh * sI) / slices, sh = hh / slices + 1;
      const off = (rnd(sI * 9.1 + Math.floor(p * 20) * 1.3) - 0.5) * 200 * k * settle;
      c.drawImage(TMP, 0, sy, tmpW, sh, off, sy, tmpW, sh);
      if (settle > 0.25 && rnd(sI * 2.2 + Math.floor(p * 30)) > 0.78) {
        c.fillStyle = `rgba(0,255,220,${0.5 * settle})`;
        c.fillRect(rnd(sI * 4.4) * w, sy, (60 + rnd(sI) * 260) * k, sh);
      }
    }
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#e9d5ff', 1);
    drawText(c, m.sub, w / 2, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 600, align: 'center', color: 'rgba(246,241,255,0.82)' });
  } else if (m.kind === 'chill') {
    gradBg(c, w, h, '#b4f1dd', '#5cc2a3', 1.2);
    softLight(c, w * 0.8, h * 0.0, h, [255, 255, 255], 0.45);
    const d = E.outCubic(prog(p, 0, 0.5));
    c.globalAlpha = d;
    drawText(c, word, w / 2, wy + lerp(-50 * k, 0, d) + Math.sin(p * 4) * 4 * k, size, { fam: 'Anton', align: 'center', color: '#06261f' });
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#06261f', 1);
    drawText(c, m.sub, w / 2, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 600, align: 'center', color: 'rgba(6,38,31,0.8)' });
  } else if (m.kind === 'warp') {
    c.fillStyle = '#02040b'; c.fillRect(0, 0, w, h);
    softLight(c, w / 2, h / 2, h * 0.8, [60, 150, 255], 0.35);
    const sp = lerp(0.9, 2.4, prog(p, 0, 0.5));
    const tt = 10 + p * sp;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    const F = Math.max(w, h) * 0.32;
    for (const s2 of STARS) {
      const z = ((s2.z - tt * 0.35) % 1 + 1) % 1;
      if (z < 0.03) continue;
      const z2 = z + 0.05 * sp;
      const sx = w / 2 + (s2.x / z) * F, sy = h / 2 + (s2.y / z) * F * 0.7;
      const px = w / 2 + (s2.x / z2) * F, py = h / 2 + (s2.y / z2) * F * 0.7;
      if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
      c.strokeStyle = rgba(mixc([90, 180, 255], INK, s2.b), (1 - z) * s2.b);
      c.lineWidth = Math.max(1, (1 - z) * 3.4 * k);
      c.beginPath(); c.moveTo(px, py); c.lineTo(sx, sy); c.stroke();
    }
    c.restore();
    const f = E.outCubic(prog(p, 0, 0.3));
    const zs = lerp(0.92, 1.04, E.outCubic(prog(p, 0, 0.7)));
    c.globalAlpha = f;
    c.translate(w / 2, h / 2); c.scale(zs, zs); c.translate(-w / 2, -h / 2);
    drawText(c, word, w / 2, wy, size, { fam: 'Anton', align: 'center', color: '#eef7ff' });
    c.restore(); c.save();
    frameLabel(c, m, w, h, '#7cc4ff', 1);
    drawText(c, m.sub, w / 2, wy + 64 * k, 34 * k, { fam: 'Archivo', wt: 600, align: 'center', color: 'rgba(238,247,255,0.82)' });
  }
  c.restore();
  // matière de la pellicule : vignettage de l'objectif
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = vg; c.fillRect(0, 0, w, h);
}

/* ---------- la pellicule ---------- */
function drawStrip(x, pos, lt, t, o = {}) {
  const G = gateGeom();
  const sx = CX - G.sw / 2, fx = CX - G.fw / 2;
  // lumière de la table lumineuse qui déborde de chaque côté
  const lg = x.createLinearGradient(sx - 160 * U, 0, sx + G.sw + 160 * U, 0);
  lg.addColorStop(0, 'rgba(255,214,170,0)');
  lg.addColorStop(0.12, 'rgba(255,214,170,0.07)');
  lg.addColorStop(0.88, 'rgba(255,214,170,0.07)');
  lg.addColorStop(1, 'rgba(255,214,170,0)');
  x.fillStyle = lg; x.fillRect(0, 0, W, H);
  // support du film (ambre sombre)
  x.fillStyle = '#1a120a';
  x.fillRect(sx, -20, G.sw, H + 40);
  const i0 = Math.floor(pos) - 1, i1 = Math.ceil(pos) + 1;
  for (let i = i0; i <= i1; i++) {
    const cy = CY + (i - pos) * G.pitch;
    const top = cy - G.fh / 2;
    if (top > H + G.pitch || top + G.fh < -G.pitch) continue;
    x.save();
    x.beginPath(); x.roundRect(fx, top, G.fw, G.fh, 10 * U); x.clip();
    if (i < 0 || i > 7) {
      x.fillStyle = '#0d0907'; x.fillRect(fx, top, G.fw, G.fh);
      drawText(x, i < 0 ? '◆' : '', CX, cy + 20 * U, 60 * U, { fam: 'Archivo', align: 'center', color: 'rgba(255,214,170,0.15)' });
    } else {
      clearCanvas(MFB, MFX);
      drawMoodFrame(MFX, i, lt - i * 0.5, G.fw, G.fh, t);
      x.drawImage(MFB, fx, top);
      // vacillement d'exposition propre à chaque image
      const fl = 0.04 * noise1(t * 18 + i * 7);
      if (fl > 0) { x.fillStyle = `rgba(255,240,220,${fl})`; x.fillRect(fx, top, G.fw, G.fh); }
      else { x.fillStyle = `rgba(0,0,0,${-fl})`; x.fillRect(fx, top, G.fw, G.fh); }
    }
    x.restore();
    // perforations : 4 par image, la lumière les traverse
    const pw = G.side * 0.42, ph = (G.pitch / 4) * 0.5, rr = pw * 0.2;
    for (let j = 0; j < 4; j++) {
      const py = cy - G.pitch / 2 + (j + 0.5) * (G.pitch / 4) - ph / 2;
      for (const px of [sx + G.side * 0.32, sx + G.sw - G.side * 0.32 - pw]) {
        x.save();
        x.shadowColor = 'rgba(255,225,190,0.8)';
        x.shadowBlur = 16 * U;
        x.fillStyle = 'rgba(255,236,212,0.92)';
        x.beginPath(); x.roundRect(px, py, pw, ph, rr); x.fill();
        x.restore();
      }
    }
    // marquage de bord, comme sur une vraie pellicule
    x.save();
    x.translate(sx + G.side * 0.14, cy);
    x.rotate(-Math.PI / 2);
    drawText(x, 'CINÉMOOD  35   ▸ ' + String(Math.max(0, i + 1)).padStart(2, '0'), 0, 0, 13 * U, { fam: 'Archivo', wt: 700, track: 0.25, align: 'center', color: 'rgba(255,150,60,0.65)' });
    x.restore();
  }
  // rayures et poussières, qui défilent avec le film
  x.save();
  for (let n = 0; n < 5; n++) {
    if (rnd(n * 13.1 + Math.floor(t * 12)) < 0.55) continue;
    x.fillStyle = 'rgba(255,248,235,0.18)';
    x.fillRect(fx + rnd(n * 7.7 + Math.floor(t * 3)) * G.fw, 0, 1.2 * U, H);
  }
  for (let n = 0; n < 26; n++) {
    const yy = ((rnd(n * 3.3) * 5 - pos) % 5 + 5) % 5 * G.pitch - G.pitch;
    const xx = fx + rnd(n * 9.9) * G.fw;
    x.fillStyle = 'rgba(10,6,4,0.55)';
    x.beginPath(); x.ellipse(xx, yy, (1 + rnd(n) * 3) * U, (1 + rnd(n * 2) * 5) * U, rnd(n) * 3, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

function sceneGate(x, lt, t) {
  x.fillStyle = '#050302';
  x.fillRect(0, 0, W, H);
  const pos = gatePos(lt);
  const u = lt % 0.5;
  const hold = clamp((u - PULL) / 0.06);
  // instabilité du couloir de projection (seulement à l'arrêt de l'image)
  const wx = fbm1(t * 6) * 1.3 * U * hold, wy = fbm1(t * 5 + 9) * 1.0 * U * hold;
  x.save();
  camera(x, { z: 1 + 0.035 * (lt / 3.7) });
  x.translate(wx, wy);
  drawStrip(x, pos, lt, t);
  x.restore();
}

/* 13,7 → 14 s : l'image « M'évader » rétrécit jusqu'à devenir la carte 06 de l'interface */
function sceneGateToUI(x, t) {
  const e = E.inOutCubic(prog(t, 13.7, 14.0));
  const G = gateGeom();
  const lt = t - 10.0;
  bgStudio(x, t);
  const img = drawQuiz({ step: 1, total: 12, kicker: Q1.kicker, title: Q1.title, options: Q1.options, sel: 5, selP: 1, trail: [], progress: 1 / 12 });
  const F = quizFrame(Q1);
  const s = F.s * lerp(1.22, 1, e);
  x.save();
  x.globalAlpha = 1;
  placePanel(x, img, { cx: CX, cy: F.cy, s, ry: lerp(0, 0.06, e), a: clamp(e * 1.6) });
  x.restore();
  // la pellicule s'efface autour de l'image
  x.save();
  x.globalAlpha = 1 - clamp(e * 2.2);
  x.fillStyle = '#050302'; x.fillRect(0, 0, W, H);
  drawStrip(x, 7, lt, t);
  x.restore();
  // l'image elle-même vole jusqu'à la carte
  const r = quizCardRect(5, 8);
  const P0 = uiToScreen(r.x, r.y, s, F.cy);
  const tx = P0.x, ty = P0.y, tw = r.w * s, th = r.h * s;
  const fx = CX - G.fw / 2, fy = CY - G.fh / 2;
  const X = lerp(fx, tx, e), Y = lerp(fy, ty, e), Wd = lerp(G.fw, tw, e), Hd = lerp(G.fh, th, e);
  clearCanvas(MFB, MFX);
  drawMoodFrame(MFX, 7, lt - 3.5, G.fw, G.fh, t);
  x.save();
  x.globalAlpha = 1 - E.inCubic(clamp((e - 0.55) / 0.45));
  x.beginPath(); x.roundRect(X, Y, Wd, Hd, lerp(10, 2, e) * U); x.clip();
  x.drawImage(MFB, X, Y, Wd, Hd);
  x.restore();
}
