/* CinéMood — motion design typographique, version « 7 questions » (30 s).
   Mêmes plans que motion.js, mis à jour pour le site du 20 octobre (build f) : 12 → 7 questions
   (compte à rebours), les 7 types de questions en liste, les 9 humeurs du site, RÊVEUR entouré,
   les films du parcours réel. La liste prend une seconde de plus : les plans à partir des résultats
   passent une seconde plus tard (deux temps, la grille reste sur le tempo) et la signature finale
   est tenue une seconde de moins. */
'use strict';

CHOICE.w = 'RÊVEUR';
CHOICE.label = '09 — LA TÊTE AILLEURS';
RES.splice(0, RES.length, ['LES CARTOGRAPHES', 90], ['CAP SUR L’AURORE', 89], ['AU-DELÀ DES DUNES', 87], ['LA SEPTIÈME LUNE', 87], ['MACHINE DOUCE', 86]);

/* ---------- 5. 7 questions (8–9) : compte à rebours 12 → 7, puis le 7 reste seul ---------- */
function mSeven(x, t) {
  fill(x, P.blk);
  const M = M_();
  const v = 12 - 5 * EZ.out(prog(t, 8.05, 8.55));
  const gone = EZ.inOut(prog(t, 8.5, 8.78)); // le chiffre des dizaines s'efface, le 7 prend sa place
  let big, nx, ny, qx, qy, qs, lx, ly, al;
  if (PORT) {
    big = W * 0.56; nx = CX; ny = CY - 30 * U;
    qs = fitSize('QUESTIONS.', W * 0.84, W, { fam: 'Anton' }); qx = CX; qy = ny + qs * 1.15; lx = CX; ly = qy + 80 * U; al = 'center';
  } else {
    big = H * 0.56; ny = CY + capH(big) / 2;
    const c12 = textWidth('0', big, { fam: 'Anton' }) * 1.02;
    nx = M + c12;
    qs = H * 0.2; qx = nx + c12 + 70 * U; qy = CY + capH(qs) * 0.15; lx = qx; ly = qy + 70 * U; al = 'left';
  }
  const cell = textWidth('0', big, { fam: 'Anton' }) * 1.02;
  const sh = (PORT ? cell / 2 : cell) * gone;
  x.save();
  x.beginPath(); x.rect(nx - cell * 1.4, ny - capH(big) * 1.08, cell * 2.8, capH(big) * 1.16); x.clip();
  if (gone < 1) {
    x.save(); x.globalAlpha = 1 - gone;
    odoDigit(x, EZ.inOut(clamp(v - 9)), 10, nx - cell / 2, ny, big, P.red);
    x.restore();
  }
  odoDigit(x, odoPos(v, 1), 10, nx + cell / 2 - sh, ny, big, P.red);
  x.restore();
  const qsh = PORT ? 0 : sh;
  up(x, 'QUESTIONS.', qx - qsh, qy, qs, (t - 8.1) / 0.6, { align: al, color: P.ink });
  label(x, 'AU LIEU DE 12.', lx - qsh, ly, t - 8.4, { align: al, size: 26, color: 'rgba(246,238,240,0.72)' });
}

/* ---------- 6. les 7 questions (9–11,5), une ligne par croche ; la 7e tient sur deux lignes ---------- */
const Q7 = [['TON ', 'HUMEUR'], ['TON ', 'ENVIE'], ['TON ', 'SEUIL'], ['TON ', 'PUBLIC'], ['TON ', 'TEMPS'], ['TON ', 'ÉPOQUE'], ['CONNU OU', ''], ['', 'DÉCOUVERTE ?']];
const Q7_T = [9.15, 9.4, 9.65, 9.9, 10.15, 10.4, 10.65, 10.71];
function mList7(x, t) {
  fill(x, P.blk);
  // 9:16 : une colonne de 8 lignes ; 16:9 : deux colonnes de 4
  const M = M_(), nw = (PORT ? 86 : 96) * U, o = { fam: 'Anton' }, rows = PORT ? 8 : 4, gap = 60 * U;
  const colW = PORT ? W - 2 * M : (W - 2 * M - gap) / 2;
  const size = Math.min(fitSize('DÉCOUVERTE ?', colW - nw, H, o), (H * (PORT ? 0.6 : 0.66)) / rows / 1.04);
  const lh = size * 1.04, ch = capH(size);
  const y0 = CY - ((rows - 1) / 2) * lh + ch / 2;
  label(x, 'LES 7 QUESTIONS', M, y0 - ch - 54 * U, t - 9.05, { size: 24, color: P.red });
  Q7.forEach(([a, b], i) => {
    const X = M + (i < rows ? 0 : colW + gap), Y = y0 + (i % rows) * lh, p = (t - Q7_T[i]) / 0.5;
    if (a) up(x, a, X + nw, Y, size, p, { color: P.ink });
    if (b) up(x, b, X + nw + textWidth(a, size, o), Y, size, p, { color: P.red });
    if (i < 7) label(x, String(i + 1).padStart(2, '0'), X, Y - ch + 26 * U, t - Q7_T[i], { size: 24, color: 'rgba(246,238,240,0.55)' });
  });
}

/* ---------- 7. les 9 humeurs du site (11,5–13,75), une par croche ---------- */
const MOODS7 = [['HEUREUX', P.red, P.dark], ['AMOUREUX', P.pink, P.dark], ['TRISTE', P.blk, P.red], ['FATIGUÉ', P.ink, P.dark], ['ÉNERVÉ', P.red, P.ink],
  ['TÉMÉRAIRE', P.blk, P.ink], ['BLASÉ', P.ink, P.red], ['CURIEUX', P.pink, P.dark], ['RÊVEUR', P.blk, P.ink]];
function mMoods7(x, t) {
  const k = Math.min(8, Math.floor((t - 11.5) / 0.25));
  const lt = t - 11.5 - k * 0.25;
  const [w, bg, fg] = MOODS7[k];
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
  const ls = 24 * U * (PORT ? 1.15 : 1), lo = { fam: 'Archivo', wt: 700, track: 0.28, align: 'center', color: fgc };
  drawText(x, 'COMMENT TU TE SENS CE SOIR ?', CX, PORT ? H * 0.22 : H * 0.17, ls, lo);
  drawText(x, String(k + 1).padStart(2, '0'), CX, PORT ? H * 0.8 : H * 0.86, ls, lo);
}

/* ---------- montage : jusqu'au logo comme motion.js, puis la nouvelle partie, puis motion.js une seconde plus tard ---------- */
const CHOICE7 = (t) => 12.5 + (t - 13.75) * 1.2; // le choix, joué en 1,25 s au lieu de 1,5 s
const TIMELINE7 = TIMELINE.slice(0, 7).concat([
  { a: 8.02, b: 8.95, fn: (x, lt, t) => mSeven(x, t) },
  { a: 8.95, b: 9.3, fn: (x, lt, t) => pushUp(x, t, 8.95, 9.3, (c) => mSeven(c, t), (c) => mList7(c, t)) },
  { a: 9.3, b: 11.5, fn: (x, lt, t) => mList7(x, t) },
  { a: 11.5, b: 13.75, fn: (x, lt, t) => mMoods7(x, t) },
  { a: 13.75, b: 15.0, fn: (x, lt, t) => mChoice(x, CHOICE7(t)) },
], TIMELINE.slice(12).map((s) => ({ a: s.a + 1, b: Math.min(s.b + 1, 30.01), fn: (x, lt, t) => s.fn(x, lt, t - 1) })));

function motionBlur7(t) {
  if (t >= 15.0) return motionBlurAt(t - 1);
  if (t >= 13.75) return motionBlurAt(CHOICE7(t));
  if (t >= 8.95 && t < 9.32) return { n: 40, shutter: 1 };
  for (const s0 of Q7_T.concat([9.05])) if (t >= s0 && t < s0 + 0.22) return { n: 6, shutter: 0.8 };
  for (let k = 0; k < 9; k++) if (t >= 11.5 + k * 0.25 && t < 11.5 + k * 0.25 + 0.14) return { n: 8, shutter: 0.8 };
  if (t >= 9.0) return { n: 1, shutter: 0 };
  return motionBlurAt(t);
}
function fx7(t) {
  const fx = { letterbox: 0, grain: 0.05, vignette: 0.18, bloom: 0, chroma: 0, shake: { x: 0, y: 0 }, flash: 0, flashCol: [255, 255, 255], fade: 0 };
  for (const [ti, a] of [[6.0, 0.5], [15.0, 0.5], [21.0, 0.8], [22.55, 0.6], [26.5, 0.5]]) {
    const d = t - ti;
    if (d >= 0 && d < 0.25) { const s = shake(t, 8 * a * (1 - d / 0.25) ** 2, 30, ti); fx.shake.x += s.x; fx.shake.y += s.y; }
  }
  fx.fade = Math.max(1 - prog(t, 0, 0.1), EZ.in(prog(t, 29.4, 30)));
  return fx;
}
