/* Reproduction fidèle de l'interface de cinem00d.com (quiz + résultats),
   dessinée dans un tampon puis posée dans la scène comme un écran flottant. */
'use strict';

let UIB, UX, UIL;

function setupUI() {
  const pw = Math.round(PORT ? W * 0.9 : W * 0.84);
  const ph = Math.round(PORT ? H * 0.84 : H * 0.84);
  UIB = mkCanvas(pw, ph);
  UX = UIB.getContext('2d');
  // largeur de maquette : on agrandit l'interface pour qu'elle reste lisible en vidéo
  const design = PORT ? 430 : 1180;
  const k = pw / design;
  const margin = PORT ? 18 : (design - 952) / 2;
  UIL = { pw, ph, k, design, x0: margin * k, cw: (design - margin * 2) * k, cols: PORT ? 2 : 4 };
}

function uiBackground(x) {
  const { pw, ph } = UIL;
  x.fillStyle = '#0b0709';
  x.fillRect(0, 0, pw, ph);
  const g = x.createRadialGradient(pw * 0.5, -ph * 0.15, 0, pw * 0.5, -ph * 0.15, ph * 0.95);
  g.addColorStop(0, 'rgba(110,18,38,0.85)');
  g.addColorStop(0.45, 'rgba(50,10,20,0.6)');
  g.addColorStop(1, 'rgba(11,7,9,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, pw, ph);
}

function uiLogo(x, px, py, size) {
  const a = drawText(x, 'CINÉ', px, py, size, { fam: 'Anton', color: COL.ink });
  drawText(x, 'MOOD', px + a.w, py, size, { fam: 'Anton', color: COL.red });
}

function boxStroke(x, X, Y, w, h, col, lw) {
  x.strokeStyle = col;
  x.lineWidth = lw;
  x.strokeRect(X + lw / 2, Y + lw / 2, w - lw, h - lw);
}

/* barre du haut commune (logo, quitter) */
function uiTopBar(x) {
  const { k, x0, cw } = UIL;
  uiLogo(x, x0, 52 * k, 21 * k);
  const bw = 106 * k, bh = 34 * k, bx = x0 + cw - bw, by = 27 * k;
  boxStroke(x, bx, by, bw, bh, 'rgba(246,238,240,0.22)', Math.max(1, k));
  drawText(x, 'QUITTER ✕', bx + bw / 2, by + bh / 2 + 4.5 * k, 12.5 * k, { fam: 'Archivo', wt: 500, track: 0.06, align: 'center', color: 'rgba(246,238,240,0.7)' });
}

/* géométrie d'un écran de question (titre, grille), partagée par le rendu et les transitions */
function quizGeom(title, nOpts) {
  const { k, x0, cw, cols } = UIL;
  let ts = (PORT ? 30 : 60) * k;
  const T = title.toUpperCase();
  const lines = PORT ? wrapWords(T, ts, cw) : [T];
  if (!PORT) ts = Math.min(ts, fitSize(T, cw, ts, { fam: 'Anton' }));
  const ty = (PORT ? 238 : 262) * k;
  const lastBase = ty + (lines.length - 1) * ts * 1.06;
  const gap = 12 * k;
  const colsN = nOpts <= 4 && !PORT ? 4 : cols;
  const cwid = (cw - gap * (colsN - 1)) / colsN;
  const ch = (PORT ? 112 : 138) * k;
  const gy = lastBase + (PORT ? 30 : 43) * k;
  const rows = Math.ceil(nOpts / colsN);
  return { lines, ts, ty, gap, colsN, cwid, ch, gy, rows, bottom: gy + rows * (ch + gap) + 30 * k };
}

/* écran de question */
function drawQuiz(st) {
  const x = UX, { k, x0, cw, pw, ph, cols } = UIL;
  resetCtx(x);
  uiBackground(x);
  uiTopBar(x);
  // retour + fil d'Ariane + compteur
  const by = 88 * k;
  boxStroke(x, x0, by, 36 * k, 36 * k, 'rgba(246,238,240,0.28)', Math.max(1, k));
  drawText(x, '←', x0 + 18 * k, by + 23 * k, 14 * k, { fam: 'Archivo', align: 'center', color: COL.ink });
  let tx = x0 + 50 * k;
  const trail = st.trail || [];
  const maxTrailX = x0 + cw - 90 * k;
  trail.forEach((lab, i) => {
    const last = i === trail.length - 1;
    const s = lab.toUpperCase();
    const fs = 10.5 * k;
    const w = textWidth(s, fs, { fam: 'Archivo', wt: 500, track: 0.08 }) + 18 * k;
    if (tx + w > maxTrailX) return;
    const appear = last ? E.outCubic(clamp(st.trailP == null ? 1 : st.trailP)) : 1;
    x.globalAlpha = appear;
    x.fillStyle = last ? 'rgba(255,45,79,0.22)' : 'rgba(246,238,240,0.08)';
    x.fillRect(tx, by + 9 * k, w, 19 * k);
    drawText(x, s, tx + 9 * k, by + 22.5 * k, fs, { fam: 'Archivo', wt: 500, track: 0.08, color: last ? '#ff8fa1' : 'rgba(246,238,240,0.55)' });
    x.globalAlpha = 1;
    tx += w + 6 * k;
  });
  const cnt = String(st.step).padStart(2, '0') + ' / ' + String(st.total || 12);
  drawText(x, cnt, x0 + cw, by + 23 * k, 12.5 * k, { fam: 'Archivo', wt: 500, track: 0.1, align: 'right', color: COL.red });
  // progression
  const py = 140 * k;
  x.fillStyle = 'rgba(246,238,240,0.08)';
  x.fillRect(x0, py, cw, 3 * k);
  x.fillStyle = COL.red;
  x.fillRect(x0, py, cw * clamp(st.progress == null ? st.step / 12 : st.progress), 3 * k);

  // contenu de la question (glisse latéralement à chaque changement)
  x.save();
  x.translate((st.slide || 0) * k, 0);
  x.globalAlpha = clamp(st.alpha == null ? 1 : st.alpha);
  const ky = 197 * k;
  const kp = clamp(st.kickerP == null ? 1 : st.kickerP);
  x.fillStyle = COL.red;
  x.fillRect(x0, ky - 4 * k, 20 * k * E.outCubic(kp), 2 * k);
  x.globalAlpha *= E.outCubic(kp);
  drawText(x, st.kicker.toUpperCase(), x0 + 29 * k, ky, 11.5 * k, { fam: 'Archivo', wt: 600, track: 0.22, color: COL.red });
  x.globalAlpha = clamp(st.alpha == null ? 1 : st.alpha);
  // titre
  const opts = st.options || [];
  const G = quizGeom(st.title, opts.length);
  let ty = G.ty;
  G.lines.forEach((ln, li) => {
    revealWords(x, ln, x0, ty, G.ts, (st.titleT == null ? 9 : st.titleT) - li * 0.08, { fam: 'Anton', color: COL.ink, stagger: 0.05, dur: 0.5, asc: 1.05 });
    ty += G.ts * 1.06;
  });
  // options
  const { gap, colsN, cwid, ch, gy } = G;
  opts.forEach((o, i) => {
    const c = i % colsN, r = Math.floor(i / colsN);
    const appearT = (st.optT == null ? 9 : st.optT) - (0.05 + i * 0.045);
    const ap = E.outCubic(clamp(appearT / 0.38));
    if (ap <= 0) return;
    const X = x0 + c * (cwid + gap), Y = gy + r * (ch + gap) + (1 - ap) * 22 * k;
    const sel = st.sel === i ? E.outCubic(clamp(st.selP == null ? 1 : st.selP)) : 0;
    x.save();
    x.globalAlpha *= ap;
    // halo rouge sous la carte choisie
    if (sel > 0) {
      const hg = x.createRadialGradient(X + cwid / 2, Y + ch, 0, X + cwid / 2, Y + ch, cwid * 0.7);
      hg.addColorStop(0, `rgba(255,45,79,${0.35 * sel})`);
      hg.addColorStop(1, 'rgba(255,45,79,0)');
      x.fillStyle = hg;
      x.fillRect(X - cwid * 0.2, Y + ch - cwid * 0.7, cwid * 1.4, cwid * 1.4);
    }
    const bg = x.createLinearGradient(X, Y, X + cwid * 0.6, Y + ch);
    bg.addColorStop(0, `rgba(246,238,240,${0.045 + 0.02 * sel})`);
    bg.addColorStop(1, 'rgba(246,238,240,0.015)');
    x.fillStyle = '#0d090b';
    x.fillRect(X, Y, cwid, ch);
    x.fillStyle = bg;
    x.fillRect(X, Y, cwid, ch);
    if (sel > 0) {
      const sg = x.createLinearGradient(0, Y + ch, 0, Y);
      sg.addColorStop(0, `rgba(255,45,79,${0.2 * sel})`);
      sg.addColorStop(1, 'rgba(255,45,79,0)');
      x.fillStyle = sg;
      x.fillRect(X, Y, cwid, ch);
    }
    boxStroke(x, X, Y, cwid, ch, sel > 0 ? `rgba(255,45,79,${0.25 + 0.6 * sel})` : 'rgba(246,238,240,0.13)', Math.max(1, k));
    // barre gauche
    if (sel > 0) { x.fillStyle = COL.red; x.fillRect(X, Y + ch * (1 - sel), 3 * k, ch * sel); }
    drawText(x, o.num, X + 21 * k, Y + 30 * k, 10.5 * k, { fam: 'Archivo', wt: 500, track: 0.2, color: COL.red });
    const ls = Math.min(19 * k, fitSize(o.label, cwid - 42 * k, 19 * k, { fam: 'Archivo', wt: 600 }));
    drawText(x, o.label, X + 21 * k, Y + 59 * k, ls, { fam: 'Archivo', wt: 600, color: COL.ink });
    drawText(x, o.sub, X + 21 * k, Y + 88 * k, 13 * k, { fam: 'Archivo', wt: 400, color: 'rgba(246,238,240,0.5)' });
    if (sel > 0) {
      x.globalAlpha *= sel;
      drawText(x, '→', X + cwid - 22 * k + (1 - sel) * -8 * k, Y + 59 * k, 18 * k, { fam: 'Archivo', wt: 600, align: 'right', color: COL.red });
    }
    x.restore();
  });
  x.restore();
  return UIB;
}

function wrapWords(s, size, maxW, o = { fam: 'Anton' }) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const t = cur ? cur + ' ' + wd : wd;
    if (textWidth(t, size, o) > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* écran de résultats */
function drawResults(st) {
  const x = UX, { k, x0, cw, pw, ph } = UIL;
  resetCtx(x);
  uiBackground(x);
  uiTopBar(x);
  const t = st.t;
  let y = 100 * k;
  const a0 = E.outCubic(prog(t, 0, 0.4));
  x.globalAlpha = a0;
  drawText(x, 'TA SÉANCE', x0, y, 11.5 * k, { fam: 'Archivo', wt: 600, track: 0.22, color: COL.red });
  x.globalAlpha = 1;
  y += (PORT ? 44 : 52) * k;
  revealWords(x, 'TES FILMS DU MOMENT', x0, y, (PORT ? 36 : 54) * k, t - 0.05, { fam: 'Anton', color: COL.ink, stagger: 0.05, dur: 0.5 });
  y += 26 * k;
  x.globalAlpha = E.outCubic(prog(t, 0.25, 0.7));
  const nb = Math.round(lerp(0, 247, E.outExpo(prog(t, 0.2, 1.2))));
  drawText(x, nb + ' films passent tes filtres. Voici les 5 qui collent le mieux.', x0, y, (PORT ? 12.5 : 15) * k, { fam: 'Archivo', color: 'rgba(246,238,240,0.55)' });
  x.globalAlpha = 1;
  // filtres
  y += 16 * k;
  let cx2 = x0;
  const chips = ['Science-fiction + Aventure', 'L’espace', 'Intensité moyenne', 'À deux', '1h45 – 2h10', 'Note ≥ 6.8'];
  chips.forEach((c, i) => {
    const ap = E.outCubic(prog(t, 0.3 + i * 0.05, 0.65 + i * 0.05));
    const fs = 11 * k;
    const w = textWidth(c, fs, { fam: 'Archivo', track: 0.05 }) + 22 * k;
    if (cx2 + w > x0 + cw) return;
    x.globalAlpha = ap;
    x.fillStyle = 'rgba(246,238,240,0.03)';
    x.fillRect(cx2, y, w, 25 * k);
    boxStroke(x, cx2, y, w, 25 * k, 'rgba(246,238,240,0.13)', Math.max(1, k));
    drawText(x, c, cx2 + 11 * k, y + 16.5 * k, fs, { fam: 'Archivo', track: 0.05, color: 'rgba(246,238,240,0.62)' });
    cx2 += w + 7 * k;
  });
  x.globalAlpha = 1;
  y += 38 * k;
  // carte n°1
  const top = POSTER_DEFS[0];
  const ap1 = E.outCubic(prog(t, 0.15, 0.6));
  const pad = (PORT ? 16 : 20) * k;
  const why = 'Il croise exactement science-fiction et aventure · une intensité moyenne, exactement ton niveau · 2h04, pile ta durée · ça tient à deux.';
  let cardH, posterW, posterH, ix, iy, iw, wl, whyH, wx, wy, ww;
  const Y1 = y + (1 - ap1) * 26 * k;
  if (PORT) {
    posterH = 150 * k; posterW = posterH * (2 / 3);
    ix = x0 + pad + posterW + 16 * k; iy = Y1 + pad; iw = x0 + cw - pad - ix;
    wx = x0 + pad; ww = cw - pad * 2;
    wl = wrapWords(why, 12.5 * k, ww - 28 * k, { fam: 'Archivo' });
    whyH = (30 + wl.length * 17) * k;
    wy = Y1 + pad + posterH + 12 * k;
    cardH = pad + posterH + 12 * k + whyH + pad;
  } else {
    cardH = 270 * k; posterH = cardH - pad * 2; posterW = posterH * (2 / 3);
    ix = x0 + pad + posterW + 24 * k; iy = Y1 + pad; iw = x0 + cw - pad - ix;
    wx = ix; ww = iw; wy = iy + 84 * k;
    wl = wrapWords(why, 12.5 * k, ww - 28 * k, { fam: 'Archivo' });
    whyH = (30 + wl.length * 17) * k;
  }
  x.save();
  x.globalAlpha = ap1;
  const bg = x.createLinearGradient(x0, Y1, x0 + cw * 0.6, Y1 + cardH);
  bg.addColorStop(0, 'rgba(255,45,79,0.11)');
  bg.addColorStop(0.58, 'rgba(246,238,240,0.02)');
  x.fillStyle = '#0e090b';
  x.fillRect(x0, Y1, cw, cardH);
  x.fillStyle = bg;
  x.fillRect(x0, Y1, cw, cardH);
  boxStroke(x, x0, Y1, cw, cardH, 'rgba(255,45,79,0.5)', Math.max(1, k));
  x.drawImage(POSTERS[0], x0 + pad, Y1 + pad, posterW, posterH);
  const sc = Math.round(lerp(0, top.score, E.outCubic(prog(t, 0.35, 1.5))));
  drawText(x, top.badge.toUpperCase(), ix, iy + 12 * k, 10.5 * k, { fam: 'Archivo', wt: 600, track: 0.16, color: COL.red });
  if (PORT) {
    drawText(x, top.titre, ix, iy + 44 * k, Math.min(28 * k, fitSize(top.titre, iw, 28 * k, { fam: 'Anton' })), { fam: 'Anton', color: COL.ink });
    drawText(x, '2019 · 2h04 · ★ 7.9/10', ix, iy + 64 * k, 11 * k, { fam: 'Archivo', track: 0.05, color: 'rgba(246,238,240,0.45)' });
    drawText(x, sc + '%', ix, iy + 124 * k, 46 * k, { fam: 'Anton', color: COL.red });
    drawText(x, 'MATCH', ix + textWidth(sc + '%', 46 * k, { fam: 'Anton' }) + 10 * k, iy + 122 * k, 10 * k, { fam: 'Archivo', wt: 500, track: 0.16, color: 'rgba(246,238,240,0.45)' });
  } else {
    const rightCol = 110 * k;
    drawText(x, top.titre, ix, iy + 46 * k, Math.min(34 * k, fitSize(top.titre, iw - rightCol, 34 * k, { fam: 'Anton' })), { fam: 'Anton', color: COL.ink });
    drawText(x, top.meta, ix, iy + 68 * k, 11.5 * k, { fam: 'Archivo', track: 0.05, color: 'rgba(246,238,240,0.45)' });
    drawText(x, sc + '%', ix + iw, iy + 40 * k, 40 * k, { fam: 'Anton', align: 'right', color: COL.red });
    drawText(x, 'MATCH', ix + iw, iy + 58 * k, 9.5 * k, { fam: 'Archivo', wt: 500, track: 0.16, align: 'right', color: 'rgba(246,238,240,0.4)' });
  }
  // pourquoi lui
  x.fillStyle = 'rgba(255,45,79,0.07)';
  x.fillRect(wx, wy, ww, whyH);
  x.fillStyle = COL.red;
  x.fillRect(wx, wy, 2 * k, whyH);
  drawText(x, 'POURQUOI LUI', wx + 14 * k, wy + 18 * k, 9.5 * k, { fam: 'Archivo', wt: 600, track: 0.16, color: COL.red });
  const typed = Math.floor(lerp(0, why.length, E.outCubic(prog(t, 0.55, 1.6))));
  let used = 0;
  wl.forEach((ln, i) => {
    const vis = ln.slice(0, Math.max(0, typed - used));
    used += ln.length + 1;
    drawText(x, vis, wx + 14 * k, wy + 36 * k + i * 17 * k, 12.5 * k, { fam: 'Archivo', color: 'rgba(246,238,240,0.78)' });
  });
  if (!PORT) {
    // critères (les sept axes du moteur)
    const crit = [['Genre', 98], ['Intensité', 92], ['Qualité', 88], ['Contexte', 95], ['Notoriété', 81], ['Époque', 90], ['Ton', 93]];
    const cy0 = wy + whyH + 14 * k;
    const ncol = 4;
    const colW = (iw - 18 * k * (ncol - 1)) / ncol;
    crit.forEach((c, i) => {
      const col = i % ncol, row = Math.floor(i / ncol);
      const X = ix + col * (colW + 18 * k), Y = cy0 + row * 17 * k;
      const bp = E.outCubic(prog(t, 0.6 + i * 0.07, 1.4 + i * 0.07));
      drawText(x, c[0].toUpperCase(), X, Y + 8 * k, 9 * k, { fam: 'Archivo', wt: 500, track: 0.06, color: 'rgba(246,238,240,0.42)' });
      const bx = X + 64 * k, bw = colW - 64 * k - 24 * k;
      x.fillStyle = 'rgba(246,238,240,0.09)';
      x.fillRect(bx, Y + 3 * k, bw, 3 * k);
      x.fillStyle = c[1] >= 75 ? COL.red : 'rgba(255,45,79,0.42)';
      x.fillRect(bx, Y + 3 * k, bw * (c[1] / 100) * bp, 3 * k);
      drawText(x, String(Math.round(c[1] * bp)), X + colW, Y + 8 * k, 9 * k, { fam: 'Archivo', align: 'right', color: 'rgba(246,238,240,0.5)' });
    });
    // boutons
    const by2 = Y1 + cardH - pad - 34 * k;
    x.fillStyle = COL.red;
    const b1 = textWidth('VOIR LA FICHE', 12 * k, { fam: 'Archivo', wt: 600, track: 0.04 }) + 34 * k;
    x.fillRect(ix, by2, b1, 34 * k);
    drawText(x, 'VOIR LA FICHE', ix + 17 * k, by2 + 21.5 * k, 12 * k, { fam: 'Archivo', wt: 600, track: 0.04, color: '#fff' });
    const b2 = textWidth('OÙ LE VOIR', 12 * k, { fam: 'Archivo', track: 0.04 }) + 30 * k;
    boxStroke(x, ix + b1 + 8 * k, by2, b2, 34 * k, 'rgba(246,238,240,0.22)', Math.max(1, k));
    drawText(x, 'OÙ LE VOIR', ix + b1 + 8 * k + 15 * k, by2 + 21.5 * k, 12 * k, { fam: 'Archivo', track: 0.04, color: 'rgba(246,238,240,0.72)' });
  }
  x.restore();
  // cartes 2 à 5
  const y2 = Y1 + cardH + 14 * k;
  const n = 4, gap = 14 * k;
  const colsN = PORT ? 2 : 4;
  const w2 = (cw - gap * (colsN - 1)) / colsN, h2 = (PORT ? 96 : 104) * k;
  for (let i = 0; i < n; i++) {
    const d = POSTER_DEFS[i + 1];
    const ap = E.outCubic(prog(t, st.restAt + i * 0.07, st.restAt + 0.45 + i * 0.07));
    if (ap <= 0) continue;
    const c = i % colsN, r = Math.floor(i / colsN);
    const X = x0 + c * (w2 + gap), Y = y2 + r * (h2 + gap) + (1 - ap) * 26 * k;
    x.save();
    x.globalAlpha = ap;
    x.fillStyle = '#0e0a0c';
    x.fillRect(X, Y, w2, h2);
    x.fillStyle = 'rgba(246,238,240,0.022)';
    x.fillRect(X, Y, w2, h2);
    boxStroke(x, X, Y, w2, h2, 'rgba(246,238,240,0.11)', Math.max(1, k));
    const pp = (PORT ? 10 : 12) * k, phh = h2 - pp * 2, pww = phh * (2 / 3);
    x.drawImage(POSTERS[i + 1], X + pp, Y + pp, pww, phh);
    const tx = X + pp + pww + 14 * k, tw = X + w2 - pp - tx;
    drawText(x, d.badge.toUpperCase(), tx, Y + pp + 10 * k, 9 * k, { fam: 'Archivo', wt: 600, track: 0.14, color: 'rgba(255,45,79,0.85)' });
    drawText(x, d.titre, tx, Y + pp + 36 * k, Math.min(20 * k, fitSize(d.titre, tw, 20 * k, { fam: 'Anton' })), { fam: 'Anton', color: COL.ink });
    const scv = Math.round(lerp(0, d.score, E.outCubic(prog(t, st.restAt + 0.1 + i * 0.07, st.restAt + 0.9 + i * 0.07))));
    drawText(x, scv + '%', tx, Y + pp + 70 * k, 24 * k, { fam: 'Anton', color: COL.red });
    drawText(x, 'MATCH', tx + textWidth(scv + '%', 24 * k, { fam: 'Anton' }) + 8 * k, Y + pp + 69 * k, 9 * k, { fam: 'Archivo', wt: 500, track: 0.16, color: 'rgba(246,238,240,0.4)' });
    x.restore();
  }
  return UIB;
}

/* rectangle (dans UIB) de la carte d'option i, pour les transitions */
function quizCardRect(i, nOpts, title) {
  const G = quizGeom(title || 'Ce soir, il te faut quoi ?', nOpts);
  const c = i % G.colsN, r = Math.floor(i / G.colsN);
  return { x: UIL.x0 + c * (G.cwid + G.gap), y: G.gy + r * (G.ch + G.gap), w: G.cwid, h: G.ch };
}
