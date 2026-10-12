/* 22 → 26 s : les arguments, un par temps fort, en aplats francs rouge / noir. */
'use strict';

const FEAT_RED = '#ff2d4f', FEAT_INK = '#14060a';

function featBg(x, red) {
  if (red) {
    const g = x.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, '#ff3858'); g.addColorStop(1, '#e8203f');
    x.fillStyle = g;
  } else x.fillStyle = '#0a0607';
  x.fillRect(0, 0, W, H);
}
function kicker(x, txt, X, Y, col, a = 1) {
  x.save();
  x.globalAlpha = a;
  x.fillStyle = col;
  x.fillRect(X, Y - 9 * U, 34 * U, 3 * U);
  drawText(x, txt, X + 48 * U, Y, 22 * U, { fam: 'Archivo', wt: 700, track: 0.22, color: col });
  x.restore();
}
/* entrée commune : poussée rapide (le flou de mouvement fait le reste) */
function featPush(x, p, dirX = 1) {
  const e = E.outExpo(prog(p, 0, 0.32));
  const z = lerp(1.14, 1, e);
  x.translate(CX + dirX * (1 - e) * 90 * U, CY); x.scale(z, z); x.translate(-CX, -CY);
}

function sceneFeatures(x, lt, t) {
  const i = Math.min(3, Math.floor(lt));
  const p = lt - i;
  x.save();
  if (i === 0) featQuestions(x, p);
  else if (i === 1) featDuo(x, p);
  else if (i === 2) featFree(x, p);
  else featNoAccount(x, p);
  x.restore();
}

function featQuestions(x, p) {
  featBg(x, true);
  x.save();
  featPush(x, p, 1);
  const L = PORT ? { kx: W * 0.08, ky: H * 0.15 } : { kx: W * 0.07, ky: H * 0.17 };
  kicker(x, 'LE PARCOURS', L.kx, L.ky, FEAT_INK, E.outCubic(prog(p, 0.05, 0.25)));
  // « 12 » : les chiffres défilent comme un rouleau, de 01 à 12
  const big = PORT ? W * 0.64 : H * 0.7;
  const nx = PORT ? W * 0.07 : W * 0.065;
  const ny = PORT ? H * 0.52 : H * 0.84;
  const v = 1 + 11 * E.outCubic(prog(p, 0.02, 0.5));
  const cur = Math.floor(v), fr = v - cur;
  const cellH = big * 0.9;
  x.save();
  x.beginPath(); x.rect(nx - 20 * U, ny - big * 0.78, textWidth('12', big, { fam: 'Anton' }) + 60 * U, big * 0.86); x.clip();
  const n0 = String(cur).padStart(2, '0'), n1 = String(Math.min(12, cur + 1)).padStart(2, '0');
  drawText(x, n0, nx, ny - fr * cellH, big, { fam: 'Anton', color: FEAT_INK });
  if (cur < 12) drawText(x, n1, nx, ny + (1 - fr) * cellH, big, { fam: 'Anton', color: FEAT_INK });
  x.restore();
  const qx = PORT ? W * 0.08 : nx + textWidth('12', big, { fam: 'Anton' }) + 40 * U;
  const qs = PORT ? fitSize('QUESTIONS.', W * 0.84, 260 * U, { fam: 'Anton' }) : H * 0.22;
  const qy = PORT ? ny + qs * 1.05 : H * 0.56;
  revealWords(x, 'QUESTIONS.', qx, qy, qs, p - 0.12, { fam: 'Anton', color: FEAT_INK });
  x.globalAlpha = E.outCubic(prog(p, 0.3, 0.5));
  drawText(x, 'Ton humeur, ton contexte, ton temps.', qx, qy + 62 * U, 38 * U, { fam: 'Archivo', wt: 600, color: 'rgba(20,6,10,0.85)' });
  x.restore();
}

function featDuo(x, p) {
  featBg(x, false);
  x.save();
  const L = PORT ? { kx: W * 0.08, ky: H * 0.28 } : { kx: W * 0.07, ky: H * 0.24 };
  kicker(x, 'MODE DUO', L.kx, L.ky, FEAT_RED, E.outCubic(prog(p, 0.05, 0.25)));
  // deux lignes qui arrivent de bords opposés et se verrouillent sur le temps
  const s = PORT ? fitSize('DEUX HUMEURS.', W * 0.86, 300 * U, { fam: 'Anton' }) : H * 0.25;
  const y1 = PORT ? H * 0.43 : H * 0.52, y2 = y1 + s * 1.0;
  const e1 = E.outExpo(prog(p, 0.0, 0.3)), e2 = E.outExpo(prog(p, 0.08, 0.38));
  const X = L.kx;
  drawText(x, 'DEUX HUMEURS.', X - (1 - e1) * W * 0.9, y1, s, { fam: 'Anton', color: COL.ink });
  drawText(x, 'UN SEUL FILM.', X + (1 - e2) * W * 0.9, y2, s, { fam: 'Anton', color: FEAT_RED });
  x.globalAlpha = E.outCubic(prog(p, 0.32, 0.52));
  drawText(x, 'Chacun répond de son côté. On ne garde que ce qui tient pour vous deux.', X, y2 + 64 * U, PORT ? fitSize('Chacun répond de son côté. On ne garde que ce qui tient pour vous deux.', W * 0.86, 32 * U, { fam: 'Archivo', wt: 500 }) : 32 * U, { fam: 'Archivo', wt: 500, color: 'rgba(246,238,240,0.72)' });
  x.restore();
}

function featFree(x, p) {
  featBg(x, true);
  x.save();
  const L = PORT ? { kx: W * 0.08, ky: H * 0.3 } : { kx: W * 0.07, ky: H * 0.22 };
  kicker(x, 'ACCÈS', L.kx, L.ky, FEAT_INK, E.outCubic(prog(p, 0.05, 0.25)));
  const s = PORT ? fitSize('GRATUIT.', W * 0.86, 520 * U, { fam: 'Anton' }) : fitSize('GRATUIT.', W * 0.86, H * 0.62, { fam: 'Anton' });
  const y = PORT ? H * 0.56 : H * 0.76;
  const e = E.outExpo(prog(p, 0, 0.22));
  x.save();
  x.translate(L.kx, y); x.scale(lerp(1.35, 1, e), lerp(1.35, 1, e)); x.translate(-L.kx, -y);
  x.globalAlpha = clamp(p / 0.05);
  drawText(x, 'GRATUIT.', L.kx, y, s, { fam: 'Anton', color: FEAT_INK });
  x.restore();
  x.globalAlpha = E.outCubic(prog(p, 0.25, 0.45));
  drawText(x, 'Parcours illimités. Catalogue en accès libre.', L.kx, y + 64 * U, PORT ? fitSize('Parcours illimités. Catalogue en accès libre.', W * 0.86, 36 * U, { fam: 'Archivo', wt: 600 }) : 36 * U, { fam: 'Archivo', wt: 600, color: 'rgba(20,6,10,0.85)' });
  x.restore();
}

function featNoAccount(x, p) {
  featBg(x, false);
  x.save();
  // un faux champ « Créer un compte » est barré puis tombe
  const fw = PORT ? W * 0.7 : W * 0.32, fh = 84 * U;
  const fx = CX - fw / 2, fy = PORT ? H * 0.34 : H * 0.2;
  const strike = E.inOutCubic(prog(p, 0.12, 0.3));
  const drop = E.inCubic(prog(p, 0.34, 0.6));
  x.save();
  x.globalAlpha = (1 - drop) * E.outCubic(prog(p, 0, 0.1));
  x.translate(0, drop * 140 * U);
  x.translate(CX, fy + fh / 2); x.rotate(drop * 0.12); x.translate(-CX, -(fy + fh / 2));
  x.strokeStyle = 'rgba(246,238,240,0.35)'; x.lineWidth = 2 * U;
  x.strokeRect(fx, fy, fw, fh);
  drawText(x, 'Créer un compte', fx + 28 * U, fy + fh / 2 + 12 * U, 34 * U, { fam: 'Archivo', wt: 500, color: 'rgba(246,238,240,0.55)' });
  drawText(x, 'Mot de passe', fx + 28 * U, fy + fh + 66 * U, 26 * U, { fam: 'Archivo', wt: 500, color: 'rgba(246,238,240,0.3)' });
  x.fillStyle = FEAT_RED;
  x.fillRect(fx - 20 * U, fy + fh / 2 - 3 * U, (fw + 40 * U) * strike, 6 * U);
  x.restore();
  // « SANS INSCRIPTION. » arrive en force
  const s = PORT ? fitSize('INSCRIPTION.', W * 0.86, 300 * U, { fam: 'Anton' }) : fitSize('SANS INSCRIPTION.', W * 0.86, H * 0.3, { fam: 'Anton' });
  const e = E.outExpo(prog(p, 0.3, 0.55));
  x.globalAlpha = clamp((p - 0.3) / 0.05);
  x.save();
  x.translate(CX, CY); x.scale(lerp(1.3, 1, e), lerp(1.3, 1, e)); x.translate(-CX, -CY);
  if (PORT) {
    drawText(x, 'SANS', CX, H * 0.58, s, { fam: 'Anton', align: 'center', color: COL.ink });
    drawText(x, 'INSCRIPTION.', CX, H * 0.58 + s, s, { fam: 'Anton', align: 'center', color: COL.ink });
  } else drawText(x, 'SANS INSCRIPTION.', CX, H * 0.68, s, { fam: 'Anton', align: 'center', color: COL.ink });
  x.restore();
  x.globalAlpha = E.outCubic(prog(p, 0.5, 0.68));
  drawText(x, 'Aucun compte demandé.', CX, PORT ? H * 0.58 + s * 1.55 : H * 0.68 + 70 * U, 36 * U, { fam: 'Archivo', wt: 600, align: 'center', color: 'rgba(246,238,240,0.75)' });
  x.restore();
}
