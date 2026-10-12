/* Scènes du film. Le découpage et les transitions sont dans edit.js,
   la pellicule des humeurs dans gate.js, les arguments dans features.js. */
'use strict';

let NB, NX;

const MOODS = [
  { num: '01', w: 'RIRE', sub: 'et rien d’autre', col: [255, 196, 61], kind: 'laugh' },
  { num: '02', w: 'AVOIR PEUR', sub: 'ou presque', col: [255, 45, 79], kind: 'fear' },
  { num: '04', w: 'ÊTRE ÉMU', sub: 'sortir les mouchoirs', col: [255, 143, 161], kind: 'emu' },
  { num: '05', w: 'DE L’ADRÉNALINE', sub: 'du rythme, du bruit', col: [255, 106, 26], kind: 'rush' },
  { num: '03', w: 'RÉFLÉCHIR', sub: 'ça te va ce soir', col: [159, 194, 255], kind: 'think' },
  { num: '07', w: 'ÊTRE SURPRIS', sub: 'ne rien voir venir', col: [180, 107, 255], kind: 'glitch' },
  { num: '08', w: 'DÉCROCHER', sub: 'zéro effort', col: [111, 227, 193], kind: 'chill' },
  { num: '06', w: 'M’ÉVADER', sub: 'partir loin d’ici', col: [73, 184, 255], kind: 'warp' },
];

const Q1 = {
  step: 1, kicker: 'On commence par l’essentiel', title: 'Ce soir, il te faut quoi ?', options: [
    { num: '01', label: 'Rire', sub: 'et rien d’autre' }, { num: '02', label: 'Avoir peur', sub: 'ou presque' },
    { num: '03', label: 'Réfléchir', sub: 'ça te va ce soir' }, { num: '04', label: 'Être ému', sub: 'sortir les mouchoirs' },
    { num: '05', label: 'De l’adrénaline', sub: 'du rythme, du bruit' }, { num: '06', label: 'M’évader', sub: 'partir loin d’ici' },
    { num: '07', label: 'Être surpris', sub: 'ne rien voir venir' }, { num: '08', label: 'Décrocher', sub: 'zéro effort' },
  ],
};
const QS = [
  { step: 2, kicker: 'La destination', title: 'Direction ?', sel: 0, chip: 'M’évader', options: [
    ['Un autre monde', 'ailleurs complet'], ['Un monde magique', 'les règles changent'], ['Les grands espaces', 'de l’air'], ['L’animation', 'tout est possible']] },
  { step: 3, kicker: 'On affine', title: 'Quel ailleurs ?', sel: 0, chip: 'Un autre monde', options: [
    ['L’espace', 'vraiment loin'], ['Un futur sombre', 'ça a mal tourné'], ['Une idée vertigineuse', 'ça retourne la tête'], ['La SF pure', 'le genre pour lui-même']] },
  { step: 4, kicker: 'Le curseur', title: 'On monte le son jusqu’où ?', sel: 1, chip: 'L’espace', options: [
    ['Tout doux', 'rien de dur, rien de violent'], ['Équilibré', 'de la tension, sans excès'], ['Intense', 'ça doit cogner'], ['Sans filtre', 'ne me ménage pas']] },
  { step: 5, kicker: 'Ça change absolument tout', title: 'Qui est sur le canapé ?', sel: 1, chip: 'Équilibré', options: [
    ['Seul', 'personne à ménager'], ['À deux', 'même écran, même envie'], ['Entre amis', 'ça commente'], ['En famille', 'tous les âges'],
    ['Avec des enfants', 'rien de dur'], ['Avec un novice', 'ça doit rester simple']] },
  { step: 6, kicker: 'On ne dépassera pas', title: 'Il te reste combien de temps ?', sel: 2, chip: 'À deux', options: [
    ['Moins de 1h25', 'vraiment court'], ['1h25 – 1h45', 'format serré'], ['1h45 – 2h10', 'le format normal'], ['2h10 – 2h40', 'on prend la soirée'], ['Peu importe', 'aucune contrainte']] },
  { step: 7, kicker: 'L’époque', title: 'On remonte jusqu’où ?', sel: 1, chip: '1h45 – 2h10', options: [
    ['Très récent', '2020 et après'], ['Les années 2010', '2010 – 2019'], ['Les années 2000', '2000 – 2009'], ['Années 80 – 90', 'l’âge d’or vidéo']] },
  { step: 8, kicker: 'Le pays', title: 'Le film parle quelle langue ?', sel: 0, chip: 'Les années 2010', options: [
    ['De n’importe où', 'le monde entier'], ['Français', 'chez nous'], ['Américain', 'la grande industrie'], ['Coréen', 'la vague']] },
  { step: 9, kicker: 'Connu ou pas', title: 'Terrain connu, ou on ose ?', sel: 2, chip: 'De n’importe où', options: [
    ['Un film très connu', 'peu de risque'], ['Assez connu', 'sans être un blockbuster'], ['Un film culte', 'adoré par ceux qui l’ont vu'], ['Une découverte', 'peu vu, très bien noté']] },
  { step: 10, kicker: 'Le rythme', title: 'Ça fonce, ou ça prend son temps ?', sel: 2, chip: 'Un film culte', options: [
    ['Ça enchaîne', 'jamais de temps mort'], ['Entre les deux', 'ça avance sans courir'], ['Par vagues', 'des pointes, puis des pauses'], ['Tout en lenteur', 'de longs plans']] },
  { step: 11, kicker: 'Sois honnête', title: 'Ton cerveau est disponible ?', sel: 1, chip: 'Par vagues', options: [
    ['Non, je me laisse porter', 'facile à suivre'], ['Un peu', 'un minimum d’attention'], ['Oui, à fond', 'un film qui fait réfléchir']] },
  { step: 12, kicker: 'Dernière question', title: 'Tu prends lequel ?', sel: 0, chip: 'Un peu', options: [
    ['Le mieux noté', 'la qualité avant tout'], ['Celui dont tout le monde parle', 'l’évidence'], ['Un film qu’on a oublié', 'à redécouvrir'], ['Le plus frais possible', 'le plus récent qui tient']] },
];
QS.forEach(q => { q.options = q.options.map((o, i) => ({ num: String(i + 1).padStart(2, '0'), label: o[0], sub: o[1] })); });

/* ---------- éléments partagés ---------- */
function bgStudio(x, t) {
  x.fillStyle = '#030203';
  x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(CX, -H * 0.35, 0, CX, -H * 0.35, H * 1.35);
  g.addColorStop(0, 'rgba(90,26,38,0.55)');
  g.addColorStop(0.55, 'rgba(30,9,14,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
}
function dust(x, t, col, alpha, region) {
  const img = tintedDot('d' + col.join(','), col);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < DUST.length; i++) {
    const d = DUST[i];
    const px = ((d.x + t * 0.012 * d.sp + noise1(t * 0.3 + d.ph) * 0.02) % 1 + 1) % 1;
    const py = ((d.y - t * 0.02 * d.sp) % 1 + 1) % 1;
    let a = alpha * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + d.ph * 3)));
    if (region) a *= region(px * W, py * H);
    if (a < 0.01) continue;
    const s = d.s * 7 * U;
    x.globalAlpha = a;
    x.drawImage(img, px * W - s / 2, py * H - s / 2, s, s);
  }
  x.restore();
}
let FLIP, FLX;
function placePanel(x, img, o) {
  const dw = img.width * o.s, dh = img.height * o.s;
  const X = o.cx - dw / 2, Y = o.cy - dh / 2;
  const al = o.a == null ? 1 : o.a;
  const ry = o.ry || 0;
  const q = panelQuad(X, Y, dw, dh, ry);
  // lumière que l'écran projette sur le sol
  const bottom = (q[2].y + q[3].y) / 2;
  const spill = x.createRadialGradient(o.cx, bottom, 0, o.cx, bottom, dw * 0.65);
  spill.addColorStop(0, `rgba(120,30,48,${0.32 * al})`);
  spill.addColorStop(1, 'rgba(0,0,0,0)');
  x.save();
  x.translate(o.cx, bottom); x.scale(1, 0.22); x.translate(-o.cx, -bottom);
  x.fillStyle = spill;
  x.fillRect(o.cx - dw, bottom - dw, dw * 2, dw * 2);
  x.restore();
  // reflet : chaque bande verticale est miroitée sous son propre bord inférieur
  if (o.reflect !== false) {
    if (!FLIP || FLIP.width !== img.width || FLIP.height !== img.height) { FLIP = mkCanvas(img.width, img.height); FLX = FLIP.getContext('2d'); }
    resetCtx(FLX);
    FLX.clearRect(0, 0, FLIP.width, FLIP.height);
    FLX.translate(0, FLIP.height); FLX.scale(1, -1);
    FLX.drawImage(img, 0, 0);
    clearCanvas(TMP2, T2X);
    T2X.setTransform(x.getTransform());
    T2X.globalAlpha = 0.16 * al;
    drawPanelY(T2X, FLIP, X, Y, dw, dh, ry, { strips: Math.round(dw / 4), mirrorBelow: true });
    resetCtx(T2X);
    const m = x.getTransform();
    const by = m.d * bottom + m.f;
    T2X.globalCompositeOperation = 'destination-in';
    const fade = T2X.createLinearGradient(0, by, 0, by + dh * m.d * 0.32);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    T2X.fillStyle = fade;
    T2X.fillRect(0, 0, W, H);
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(TMP2, 0, 0);
    x.restore();
  }
  // ombre portée, calée sur les coins projetés
  x.save();
  x.globalAlpha = al * 0.85;
  x.filter = `blur(${40 * U}px)`;
  x.fillStyle = '#000';
  x.beginPath();
  x.moveTo(q[0].x, q[0].y + 30 * U); x.lineTo(q[1].x, q[1].y + 30 * U); x.lineTo(q[2].x, q[2].y + 40 * U); x.lineTo(q[3].x, q[3].y + 40 * U);
  x.closePath(); x.fill();
  x.restore();
  x.save();
  x.globalAlpha = al;
  drawPanelY(x, img, X, Y, dw, dh, ry, { strips: Math.round(dw / 3) });
  x.strokeStyle = 'rgba(255,255,255,0.08)';
  x.lineWidth = 1.5 * U;
  x.beginPath();
  x.moveTo(q[0].x, q[0].y); x.lineTo(q[1].x, q[1].y); x.lineTo(q[2].x, q[2].y); x.lineTo(q[3].x, q[3].y);
  x.closePath(); x.stroke();
  x.restore();
  return q;
}
/* facteur d'allumage d'un tube néon : salves rapides puis stable */
function ignite(dt, seed, dur = 0.3) {
  if (dt <= 0) return 0;
  if (dt >= dur) return 1;
  const f = Math.floor(dt * 60);
  const r = rnd(f * 3.17 + seed * 19.3);
  return r > 0.5 ? 0.55 + 0.45 * rnd(f + seed * 7.1) : 0.04;
}

/* le mur néon (ouverture et fin) */
function neonSignLayout() {
  const size = PORT ? fitSize('CINÉMOOD', W * 0.84, 520 * U, { fam: 'Anton' }) : fitSize('CINÉMOOD', W * 0.6, 330 * U, { fam: 'Anton' });
  const base = PORT ? CY - 170 * U : CY + 70 * U;
  const horizon = base + size * (PORT ? 0.34 : 0.36);
  return { size, base, horizon };
}
function drawWallScene(x, t, intensity, drawSign, camZ) {
  const L = neonSignLayout();
  x.fillStyle = '#000';
  x.fillRect(0, 0, W, H);
  x.save();
  camera(x, { z: camZ || 1, oy: L.base - L.size * 0.35 });
  const wx = -(WALL.width - W) / 2, wy = -(WALL.height - H) / 2;
  // mur : ambiance + lumière du néon
  x.save();
  x.beginPath(); x.rect(-W, -H, W * 3, L.horizon + H); x.clip();
  x.globalAlpha = 0.06;
  x.drawImage(WALL, wx, wy);
  x.globalAlpha = 1;
  if (intensity > 0.01) {
    clearCanvas(TMP, TX);
    TX.drawImage(WALL, wx, wy);
    TX.globalCompositeOperation = 'multiply';
    const lx = CX, ly = L.base - L.size * 0.36;
    const lg = TX.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * (PORT ? 0.55 : 0.52));
    lg.addColorStop(0, 'rgb(255,130,150)');
    lg.addColorStop(0.2, 'rgb(210,40,72)');
    lg.addColorStop(0.5, 'rgb(80,10,26)');
    lg.addColorStop(0.8, 'rgb(18,2,6)');
    lg.addColorStop(1, 'rgb(0,0,0)');
    TX.fillStyle = lg;
    TX.fillRect(0, 0, W, H);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = clamp(intensity) * 0.95;
    x.drawImage(TMP, 0, 0);
  }
  x.restore();
  // sol mouillé
  x.save();
  const fg = x.createLinearGradient(0, L.horizon, 0, H * 1.2);
  fg.addColorStop(0, '#0b0607');
  fg.addColorStop(1, '#020102');
  x.fillStyle = fg;
  x.fillRect(-W, L.horizon, W * 3, H * 2);
  const sg = x.createLinearGradient(0, L.horizon, 0, L.horizon + 160 * U);
  sg.addColorStop(0, `rgba(255,45,79,${0.22 * intensity})`);
  sg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = sg;
  x.fillRect(-W, L.horizon, W * 3, 160 * U);
  x.fillStyle = 'rgba(0,0,0,0.6)';
  x.fillRect(-W, L.horizon - 2 * U, W * 3, 3 * U);
  x.restore();
  // enseigne dans un calque, puis reflet
  clearCanvas(NB, NX);
  const m = x.getTransform();
  NX.setTransform(m);
  drawSign(NX, L);
  resetCtx(NX);
  x.restore();
  x.save();
  x.drawImage(NB, 0, 0);
  x.restore();
  // reflet : miroir autour de la ligne d'horizon, troublé par la pluie (bandes décalées)
  const hz = m.d * L.horizon + m.f;
  clearCanvas(TMP2, T2X);
  T2X.save();
  T2X.translate(0, hz * 2); T2X.scale(1, -1);
  T2X.filter = `blur(${3 * U}px)`;
  T2X.drawImage(NB, 0, 0);
  T2X.restore();
  const band = Math.max(2, Math.round(3 * U));
  x.save();
  for (let yy = Math.floor(hz); yy < H; yy += band) {
    const depth = (yy - hz) / Math.max(1, H - hz);
    const off = (Math.sin(yy * 0.09 + t * 7.0) * 0.6 + Math.sin(yy * 0.031 - t * 4.3) * 0.4) * (1.5 + 7 * depth) * U;
    x.globalAlpha = 0.36 * (1 - depth * 0.55);
    x.drawImage(TMP2, 0, yy, W, band, off, yy, W, band);
  }
  x.restore();
  // halo de l'enseigne
  const ly = (L.base - L.size * 0.36) * m.d + m.f;
  const hg = x.createRadialGradient(CX, ly, 0, CX, ly, Math.max(W, H) * 0.55);
  hg.addColorStop(0, `rgba(255,45,79,${0.12 * intensity})`);
  hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg;
  x.fillRect(0, 0, W, H);
  rain(x, t, CX, ly, hz, intensity);
  return L;
}

/* pluie : traits fins éclairés par l'enseigne, impacts qui s'élargissent sur le sol */
function rain(x, t, lx, ly, hz, inten) {
  const R = Math.max(W, H);
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  const n = PORT ? 520 : 460;
  for (let i = 0; i < n; i++) {
    const sp = (1700 + rnd(i * 2.7) * 900) * U;
    const len = sp / 75; // traînée = vitesse × temps d'obturation
    const x0 = rnd(i * 1.3) * W * 1.25 - W * 0.12;
    const cyc = H * 1.35;
    const y = ((rnd(i * 3.1) * cyc + t * sp) % cyc) - H * 0.2;
    const near = rnd(i * 5.9);
    const px = x0 + (y - CY) * 0.13;
    const prox = clamp(1 - Math.hypot(px - lx, y - ly) / (R * 0.55));
    const a = (0.035 + 0.5 * prox * prox * inten) * (0.4 + 0.6 * near);
    if (a < 0.008) continue;
    x.strokeStyle = `rgba(255,${170 + near * 50 | 0},${185 + near * 40 | 0},${a})`;
    x.lineWidth = (0.6 + near * 1.3) * U;
    x.beginPath(); x.moveTo(px, y); x.lineTo(px + len * 0.13, y + len); x.stroke();
  }
  // impacts au sol
  for (let j = 0; j < 70; j++) {
    const per = 0.45 + rnd(j * 4.4) * 0.4;
    const ph = (t / per + rnd(j * 7.3)) % 1;
    const cyc = Math.floor(t / per + rnd(j * 7.3));
    const fx = rnd(j * 3.3 + cyc * 1.7) * W, fy = hz + (0.04 + rnd(j * 9.1 + cyc * 2.3) * 0.9) * (H - hz);
    const prox = clamp(1 - Math.abs(fx - lx) / (W * 0.7));
    const a = (1 - ph) * 0.4 * inten * (0.3 + 0.7 * prox);
    if (a < 0.01) continue;
    const r = (3 + 26 * E.outCubic(ph)) * U * (0.5 + (fy - hz) / (H - hz));
    x.strokeStyle = `rgba(255,150,170,${a})`;
    x.lineWidth = 1.2 * U;
    x.beginPath(); x.ellipse(fx, fy, r, r * 0.22, 0, 0, Math.PI * 2); x.stroke();
  }
  x.restore();
}

/* ---------- 1. néon d'ouverture ---------- */
function levelsOpen(lt) {
  const on = [0.16, 0.3, 0.42, 0.58, 0.74, 0.86];
  const lv = on.map((o, i) => {
    let v = ignite(lt - o, i + 1, 0.32);
    if (i === 3) v *= lt - o > 0.32 ? (rnd(Math.floor(lt * 60) * 1.7) > 0.86 ? 0.25 : 0.9) : 1; // le É à moitié mort
    if (i === 4 && lt > 1.2 && lt < 1.3) v *= 0.3; // le M lâche une fois
    return v;
  });
  // court-circuit final avant la coupe
  if (lt > 1.86) for (let i = 0; i < lv.length; i++) lv[i] *= rnd(Math.floor(lt * 60) * 2.3 + i) > 0.5 ? 0.6 : 0.05;
  return lv;
}
function sceneNeonOpen(x, lt) {
  const word = 'CINÉMA';
  const lv = levelsOpen(lt);
  const inten = lv.reduce((a, b) => a + b, 0) / lv.length;
  const z = 1.0 + 0.06 * E.inOutCubic(prog(lt, 0, 2.0));
  drawWallScene(x, lt, inten, (nx, L) => {
    // centre « CINÉMA » sur la position qu'il occupera dans « CINÉMOOD » ? Non : on le centre.
    drawNeon(nx, word, CX, L.base, L.size, lv, { align: 'center' });
  }, z);
}

/* ---------- 2. le scroll infini ---------- */
function sceneScroll(x, lt) {
  x.fillStyle = '#030203';
  x.fillRect(0, 0, W, H);
  const stopT = 3.45;
  const moving = lt < stopT;
  const tt = Math.min(lt, stopT);
  const tw = TILES[0].width, th = TILES[0].height, gap = 16 * U;
  const speed = 160 * U * tt + 2600 * U * Math.pow(prog(tt, 0.2, stopT), 2.4);
  const jolt = moving ? 0 : E.outCubic(prog(lt, stopT, stopT + 0.25));
  x.save();
  camera(x, { z: (PORT ? 1.25 : 1.12) + 0.05 * jolt, r: -0.11 });
  const cols = Math.ceil((W * 1.8) / (tw + gap));
  for (let c = -cols; c <= cols; c++) {
    const mult = 1 + 0.18 * Math.sin(c * 1.7);
    const off = speed * mult + c * 133 * U;
    const colX = CX + c * (tw + gap) - tw / 2;
    const rowH = th + gap;
    const first = Math.floor((off - H) / rowH) - 2;
    for (let r = first; r < first + Math.ceil((H * 2.6) / rowH) + 4; r++) {
      const y = r * rowH - off + CY;
      if (y < -H * 0.8 || y > H * 1.8) continue;
      const idx = ((r * 7 + c * 13) % TILES.length + TILES.length) % TILES.length;
      x.globalAlpha = 0.62;
      x.drawImage(TILES[idx], colX, y);
    }
  }
  x.globalAlpha = 1;
  // le « survol » indécis : un cadre rouge qui saute de vignette en vignette
  if (lt > 0.5) {
    const hop = Math.floor((lt - 0.5) / 0.34);
    const hp = E.outCubic(((lt - 0.5) % 0.34) / 0.34 * 3 > 1 ? 1 : (((lt - 0.5) % 0.34) / 0.34) * 3);
    const pick = (h) => ({ c: Math.floor(rnd(h * 3.1) * 5) - 2, r: Math.floor(rnd(h * 7.7) * 3) - 1 });
    const a = pick(hop - 1), b = pick(hop);
    const cc = lerp(a.c, b.c, hp), rr = lerp(a.r, b.r, hp);
    const bx = CX + cc * (tw + gap) - tw / 2, by = CY + rr * (th + gap) - th / 2;
    x.strokeStyle = 'rgba(255,45,79,0.9)';
    x.lineWidth = 4 * U;
    x.shadowColor = 'rgba(255,45,79,0.9)';
    x.shadowBlur = 30 * U;
    x.strokeRect(bx - 6 * U, by - 6 * U, tw + 12 * U, th + 12 * U);
    x.shadowBlur = 0;
  }
  x.restore();
  // traînée de mouvement : assombrissement vertical
  const shade = x.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(3,2,3,0.92)');
  shade.addColorStop(0.3, 'rgba(3,2,3,0.45)');
  shade.addColorStop(0.7, 'rgba(3,2,3,0.45)');
  shade.addColorStop(1, 'rgba(3,2,3,0.92)');
  x.fillStyle = shade;
  x.fillRect(0, 0, W, H);
  const cg = x.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.5);
  cg.addColorStop(0, `rgba(0,0,0,${0.55 + 0.3 * jolt})`);
  cg.addColorStop(1, 'rgba(0,0,0,0.1)');
  x.fillStyle = cg;
  x.fillRect(0, 0, W, H);

  // à l'arrêt, le mur d'affiches s'éteint : il ne reste que le texte
  const off = prog(lt, 3.45, 3.62);
  if (off > 0) { x.fillStyle = `rgba(0,0,0,${off})`; x.fillRect(0, 0, W, H); }

  // texte
  const big = PORT ? 250 * U : 280 * U;
  const yMid = CY + big * 0.36;
  const ms = PORT ? fitSize('30 MINUTES', W * 0.88, big, { fam: 'Anton' }) : big;
  // plongée dans le creux du « 0 » de 30 : il grossit jusqu'à remplir l'écran de noir
  const zt = prog(lt, 3.6, 4.0);
  x.save();
  if (zt > 0) {
    const lay = layoutChars('30 MINUTES', ms, { fam: 'Anton' });
    const c0 = lay.chars[1];
    const px = CX - lay.w / 2 + c0.x + c0.w / 2;
    const py = yMid - textAscent('0', ms, { fam: 'Anton' }) * 0.5;
    const z = Math.exp(Math.log(70) * E.inCubic(zt));
    const e2 = E.inOutCubic(zt);
    const sx = lerp(px, CX, e2), sy = lerp(py, CY, e2);
    x.translate(sx, sy); x.scale(z, z); x.translate(-px, -py);
  }
  const fadeTxt = 1 - prog(lt, 3.45, 3.6);
  x.globalAlpha = fadeTxt;
  revealWords(x, 'TU PASSES', CX, yMid - big * 0.98, PORT ? 92 * U : 84 * U, lt - 0.15, { fam: 'Anton', align: 'center', color: COL.ink, track: 0.02 });
  x.globalAlpha = 1;
  // chronomètre puis « 30 MINUTES »
  const cnt = clamp((lt - 0.35) / 2.75);
  const secs = Math.floor(E.inQuad(cnt) * 1800);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  const lock = prog(lt, 3.1, 3.3);
  if (lt > 0.3) {
    const ap = E.outCubic(prog(lt, 0.3, 0.55));
    x.save();
    x.globalAlpha = ap * (1 - lock);
    const sz = big * (PORT ? 0.95 : 1);
    const digits = mm + ':' + ss;
    const cellW = textWidth('0', sz, { fam: 'Anton' }) * 1.04;
    const colonW = textWidth(':', sz, { fam: 'Anton' }) * 1.3;
    const tot = cellW * 4 + colonW;
    let dx = CX - tot / 2;
    for (const ch of digits) {
      const cw = ch === ':' ? colonW : cellW;
      drawText(x, ch, dx + cw / 2, yMid, sz, { fam: 'Anton', align: 'center', color: cnt > 0.85 ? COL.red : COL.ink });
      dx += cw;
    }
    x.restore();
    if (lock > 0) {
      const ls = E.outBack(lock);
      x.save();
      x.translate(CX, yMid - big * 0.35);
      x.scale(lerp(1.25, 1, ls), lerp(1.25, 1, ls));
      x.translate(-CX, -(yMid - big * 0.35));
      x.globalAlpha = clamp(lock * 3);
      drawText(x, '30 MINUTES', CX, yMid, ms, { fam: 'Anton', align: 'center', color: COL.red });
      x.restore();
    }
  }
  const subS = PORT ? 64 * U : 66 * U;
  x.globalAlpha = fadeTxt;
  if (PORT) {
    revealWords(x, 'À CHERCHER', CX, yMid + subS * 1.45, subS, lt - 1.0, { fam: 'Anton', align: 'center', color: COL.ink });
    revealWords(x, 'QUOI REGARDER.', CX, yMid + subS * 2.5, subS, lt - 1.15, { fam: 'Anton', align: 'center', color: COL.ink });
  } else {
    revealWords(x, 'À CHERCHER QUOI REGARDER.', CX, yMid + subS * 1.5, subS, lt - 1.0, { fam: 'Anton', align: 'center', color: COL.ink, stagger: 0.07 });
  }
  x.restore();
}

/* ---------- 3. « On part de ton moment » ---------- */
function sceneTurn(x, lt) {
  x.fillStyle = '#000';
  x.fillRect(0, 0, W, H);
  // faisceau de projecteur
  const beam = E.outCubic(prog(lt, 0.0, 0.8));
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bg = x.createRadialGradient(CX, -H * 0.2, 0, CX, -H * 0.2, H * 1.4);
  bg.addColorStop(0, `rgba(255,70,100,${0.22 * beam})`);
  bg.addColorStop(0.5, `rgba(255,45,79,${0.06 * beam})`);
  bg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = bg;
  x.filter = `blur(${46 * U}px)`;
  x.beginPath();
  x.moveTo(CX - 40 * U, -10);
  x.lineTo(CX + 40 * U, -10);
  x.lineTo(CX + W * 0.75, H);
  x.lineTo(CX - W * 0.75, H);
  x.fill();
  x.filter = 'none';
  x.restore();
  dust(x, lt + 3, [255, 160, 175], 0.6 * beam, (px, py) => clamp(1 - Math.abs(px - CX) / (W * 0.25 + py * 0.5)));
  const z = 1 + 0.05 * E.inOutCubic(prog(lt, 0, 2));
  x.save();
  camera(x, { z });
  const s1 = PORT ? fitSize('ON PART DE', W * 0.8, 210 * U, { fam: 'Anton' }) : 170 * U;
  const s2 = PORT ? fitSize('TON MOMENT.', W * 0.86, 230 * U, { fam: 'Anton' }) : 230 * U;
  const y1 = CY - s2 * 0.22, y2 = y1 + s2 * 1.0;
  revealWords(x, 'ON PART DE', CX, y1, s1, lt - 0.12, { fam: 'Anton', align: 'center', color: COL.ink, stagger: 0.08 });
  const word = 'TON MOMENT.';
  const lv = word.split('').map((c, i) => ignite(lt - 0.5 - i * 0.025, 40 + i, 0.25));
  drawNeon(x, word, CX, y2, s2, lv, { align: 'center', glow: 0.8 });
  x.restore();
}

/* ---------- 4. la question ---------- */
/* cadrage d'une question : la zone utile (haut de l'écran jusqu'aux cartes) remplit l'image */
function quizFrame(q) {
  const G = quizGeom(q.title, q.options.length);
  const sc = Math.min(PORT ? 1.04 : 1.16, (H * (PORT ? 0.7 : 0.88)) / G.bottom);
  const top = (H - G.bottom * sc) / 2;
  return { s: sc, cy: top + (UIB.height * sc) / 2 };
}
/* point de l'écran (approximation sans perspective) correspondant à un point de l'interface */
function uiToScreen(px, py, s, cy) {
  return { x: CX + (px - UIB.width / 2) * s, y: cy + (py - UIB.height / 2) * s };
}
function sceneQuestion(x, lt, t) {
  bgStudio(x, t);
  const img = drawQuiz({
    step: 1, total: 12, kicker: Q1.kicker, title: Q1.title, options: Q1.options,
    titleT: lt - 0.3, optT: lt - 0.85, kickerP: prog(lt, 0.2, 0.5), trail: [], progress: (1 / 12) * E.outCubic(prog(lt, 0.3, 0.9)),
  });
  const F = quizFrame(Q1);
  const ry = PORT ? 0 : lerp(0.11, 0.06, E.outCubic(prog(lt, 0, 1.7)));
  let s = F.s * (1 + 0.015 * prog(lt, 0, 1.7));
  x.save();
  // plongée vers la carte « 01 Rire » : elle remplit l'écran et ouvre sur la pellicule
  const pz = prog(lt, 1.72, 2.0);
  if (pz > 0) {
    const r = quizCardRect(0, 8);
    const P = uiToScreen(r.x + r.w / 2, r.y + r.h / 2, s, F.cy);
    const z = Math.exp(Math.log(9) * E.inCubic(pz));
    const e2 = E.inOutCubic(pz);
    x.translate(lerp(P.x, CX, e2), lerp(P.y, CY, e2)); x.scale(z, z); x.translate(-P.x, -P.y);
  }
  placePanel(x, img, { cx: CX, cy: F.cy, s, ry });
  x.restore();
}

/* ---------- 6. le parcours en accéléré ---------- */
/* questions du parcours accéléré : début et durée de chacune */
function speedSlots() {
  const sl = [];
  for (let i = 0; i < 5; i++) sl.push({ qi: i, a: i * 0.5, d: 0.5, push: 0.16 });
  for (let i = 0; i < 6; i++) sl.push({ qi: 5 + i, a: 2.5 + i * (0.5 / 6), d: 0.5 / 6, push: 0.055 });
  return sl;
}
const SPEED_SLOTS = speedSlots();
function sceneSpeed(x, lt, t) {
  bgStudio(x, t);
  let si = 0;
  for (let i = 0; i < SPEED_SLOTS.length; i++) if (lt >= SPEED_SLOTS[i].a) si = i;
  const S = SPEED_SLOTS[si], q = QS[S.qi], ql = lt - S.a;
  const fast = S.qi >= 5;
  const prevQ = si > 0 ? QS[SPEED_SLOTS[si - 1].qi] : Q1;
  const trail = [];
  for (let i = 0; i <= S.qi; i++) trail.push(QS[i].chip);
  const selAt = fast ? 0.035 : 0.3;
  // poussée latérale : la question précédente sort à gauche, la nouvelle arrive de la droite
  const e = E.inOutCubic(prog(ql, 0, S.push));
  const cw = UIL.cw;
  const prevState = {
    kicker: prevQ.kicker, title: prevQ.title, options: prevQ.options, sel: si > 0 ? prevQ.sel : 5, selP: 1,
    dx: -cw * 0.95 * e, alpha: 1 - e,
  };
  const img = drawQuiz({
    step: q.step, total: 12, kicker: q.kicker, title: q.title, options: q.options,
    titleT: fast ? 9 : ql * 1.7 + 0.1, optT: fast ? 9 : ql * 1.6 + 0.3, kickerP: fast ? 1 : prog(ql, 0.02, 0.16),
    dx: cw * 0.6 * (1 - e), alpha: Math.sqrt(e),
    sel: ql > selAt ? q.sel : -1, selP: prog(ql, selAt, selAt + (fast ? 0.03 : 0.12)),
    trail, trailP: prog(ql, 0, 0.2), progress: lerp((q.step - 1) / 12, q.step / 12, E.outCubic(prog(ql, 0, fast ? 0.05 : 0.25))),
    prev: e < 1 ? prevState : null,
  });
  const ry = PORT ? 0 : lerp(0.06, -0.06, E.inOutCubic(prog(lt, 0, 3)));
  const cur = quizFrame(q), prev = quizFrame(prevQ);
  const blend = fast ? 1 : E.inOutCubic(prog(ql, 0, 0.2));
  let sc = lerp(prev.s, cur.s, blend) * (1 + 0.012 * Math.sin(lt * 1.3));
  let pcy = lerp(prev.cy, cur.cy, blend);
  // l'écran recule et se replie en un point : le catalogue va apparaître
  const rc = E.inCubic(prog(lt, 2.8, 3.0));
  sc *= lerp(1, 0.12, rc);
  pcy = lerp(pcy, globeY(), rc);
  placePanel(x, img, { cx: CX, cy: pcy, s: sc, ry, a: 1 - rc * rc, reflect: rc < 0.5 });
  // chrono discret sous l'écran
  const secs = Math.floor(lerp(9, 52, prog(lt, 0, 3)));
  const lab = '00:' + String(secs).padStart(2, '0');
  const yy = PORT ? H - 150 * U : H - 30 * U;
  x.save();
  x.globalAlpha = 0.8 * (1 - rc);
  x.fillStyle = COL.red;
  x.beginPath(); x.arc(CX - 62 * U, yy - 11 * U, 6 * U, 0, Math.PI * 2); x.fill();
  drawText(x, lab, CX - 46 * U, yy, 30 * U, { fam: 'Archivo', wt: 600, track: 0.1, color: COL.ink });
  x.restore();
}

/* ---------- 7. le moteur filtre le catalogue ---------- */
let GLOBE = null;
function buildGlobe() {
  const r = prng(321);
  GLOBE = [];
  for (let i = 0; i < 3200; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const rad = 0.75 + r() * 0.35;
    GLOBE.push({ x: s * Math.cos(th) * rad, y: u * rad, z: s * Math.sin(th) * rad, v: r(), keep: false });
  }
  for (let k = 0; k < 5; k++) GLOBE[k * 197 + 11].keep = true;
}
function globeY() { return PORT ? CY - 120 * U : CY - 70 * U; }
function sceneLoading(x, lt, t) {
  if (!GLOBE) buildGlobe();
  bgStudio(x, t);
  // le globe naît du point où l'écran s'est replié
  const R = Math.min(W, H) * (PORT ? 0.36 : 0.3) * lerp(0.04, 1, E.outCubic(prog(lt, 0, 0.32)));
  const gy = globeY();
  const rot = 0.6 + lt * 1.4;
  const stage = lt / 1.0; // 0..1
  const cut = [0, 0.55, 0.85, 0.97, 1.0];
  const thr = E.inOutCubic(clamp((lt - 0.08) / 0.72));
  x.save();
  x.globalCompositeOperation = 'lighter';
  const dot = tintedDot('ink', INK), dotR = tintedDot('red', RED);
  const collapse = E.inOutCubic(prog(lt, 0.7, 1.0));
  GLOBE.forEach((p, i) => {
    const ca = Math.cos(rot), sa = Math.sin(rot);
    let X = p.x * ca - p.z * sa, Z = p.x * sa + p.z * ca, Y = p.y;
    const tilt = 0.35;
    const Y2 = Y * Math.cos(tilt) - Z * Math.sin(tilt), Z2 = Y * Math.sin(tilt) + Z * Math.cos(tilt);
    const persp = 2.6 / (2.6 + Z2);
    let sx = CX + X * R * persp, sy = gy + Y2 * R * persp;
    let a = (0.3 + 0.7 * (1 - (Z2 + 1) / 2)) * 0.95;
    let size = (6 + 5 * persp) * U;
    if (p.keep) {
      const k = Math.floor(i / 197);
      const tx = CX + (k - 2) * 46 * U, ty = gy;
      sx = lerp(sx, tx, collapse); sy = lerp(sy, ty, collapse);
      x.globalAlpha = 1;
      const s2 = size * (2 + 2 * collapse);
      x.drawImage(dotR, sx - s2, sy - s2, s2 * 2, s2 * 2);
      return;
    }
    if (p.v < thr) {
      const dead = clamp((thr - p.v) * 8);
      a *= 1 - dead;
      sy += dead * 60 * U;
    }
    if (a < 0.01) return;
    x.globalAlpha = a;
    x.drawImage(dot, sx - size / 2, sy - size / 2, size, size);
  });
  x.restore();
  // lignes de chargement (celles du site)
  const lines = ['LECTURE DE TES RÉPONSES', 'CONSTRUCTION DES FILTRES', 'ANALYSE DES CANDIDATS', 'CLASSEMENT FINAL'];
  const li = Math.min(3, Math.floor(lt / 0.25));
  const lp = lt - li * 0.25;
  const ls = PORT ? 64 * U : 58 * U;
  const ty = PORT ? gy + R + 190 * U : gy + R + 130 * U;
  x.save();
  x.globalAlpha = E.outCubic(prog(lp, 0, 0.1));
  drawText(x, lines[li], CX, ty + (1 - E.outCubic(prog(lp, 0, 0.12))) * 22 * U, ls, { fam: 'Anton', align: 'center', color: COL.ink });
  x.restore();
  const chips = 'Science-fiction + Aventure · L’espace · Intensité moyenne · À deux · 1h45 – 2h10';
  const cs = PORT ? fitSize(chips, W * 0.9, 24 * U, { fam: 'Archivo' }) : 22 * U;
  drawText(x, chips, CX, ty + 50 * U, cs, { fam: 'Archivo', align: 'center', color: 'rgba(246,238,240,0.5)' });
  // barre
  const bw = PORT ? W * 0.6 : W * 0.28;
  x.fillStyle = 'rgba(246,238,240,0.1)';
  x.fillRect(CX - bw / 2, ty + 84 * U, bw, 3 * U);
  x.fillStyle = COL.red;
  x.fillRect(CX - bw / 2, ty + 84 * U, bw * E.inOutCubic(clamp(lt / 0.95)), 3 * U);
}

/* ---------- 8. les résultats ---------- */
function sceneResults(x, lt, t) {
  bgStudio(x, t);
  // plongée finale dans le rouge du « I » d'EXPLIQUÉS : l'écran devient rouge, raccord avec la suite
  const cap = resultsCaption();
  const zt = prog(lt, 3.82, 4.0);
  x.save();
  if (zt > 0) {
    const z = Math.exp(Math.log(160) * E.inCubic(zt));
    const e2 = E.inOutCubic(zt);
    x.translate(lerp(cap.ix, CX, e2), lerp(cap.iy, CY, e2)); x.scale(z, z); x.translate(-cap.ix, -cap.iy);
  }
  const img = drawResults({ t: lt, restAt: 1.05 });
  const k = UIL.k;
  // la caméra part serrée sur la carte n°1 puis recule
  const pull = E.inOutCubic(prog(lt, 1.0, 2.0));
  const aside = E.inOutCubic(prog(lt, 2.55, 3.2));
  let s = lerp(PORT ? 1.6 : 1.8, 0.97, pull);
  // point d'intérêt dans UIB (carte n°1)
  const fx = PORT ? UIB.width * 0.5 : UIB.width * 0.6, fy = PORT ? UIB.height * 0.36 : UIB.height * 0.58;
  let cx = CX - (fx - UIB.width / 2) * s * (1 - pull), cy = CY - (fy - UIB.height / 2) * s * (1 - pull) + (1 - pull) * 40 * U;
  let ry = lerp(0.12, 0.04, pull);
  if (!PORT) {
    s = lerp(s, 0.74, aside);
    cx = lerp(cx, W * 0.66, aside);
    ry = lerp(ry, -0.36, aside);
  } else {
    s = lerp(s, 0.72, aside);
    cy = lerp(cy, CY + H * 0.17, aside);
  }
  placePanel(x, img, { cx, cy, s, ry });
  // onde de choc de la chute : les 5 points rouges du chargement éclatent en résultats
  if (lt < 0.5) {
    const p = lt / 0.5;
    const R = Math.max(W, H) * 0.9 * E.outCubic(p);
    const oy = PORT ? CY - 120 * U : CY - 70 * U;
    x.save();
    x.globalCompositeOperation = 'lighter';
    const core = x.createRadialGradient(CX, oy, 0, CX, oy, Math.max(W, H) * 0.45);
    core.addColorStop(0, `rgba(255,90,120,${0.85 * (1 - p) * (1 - p)})`);
    core.addColorStop(1, 'rgba(255,45,79,0)');
    x.fillStyle = core;
    x.fillRect(0, 0, W, H);
    for (const [k, a] of [[1, 0.9], [0.82, 0.45]]) {
      x.strokeStyle = `rgba(255,70,100,${a * (1 - p)})`;
      x.lineWidth = (26 * (1 - p) + 2) * U;
      x.shadowColor = 'rgba(255,45,79,0.9)';
      x.shadowBlur = 40 * U;
      x.beginPath(); x.arc(CX, oy, R * k, 0, Math.PI * 2); x.stroke();
    }
    x.restore();
  }
  // légende éditoriale
  if (aside > 0) {
    const tl = lt - 2.75;
    revealWords(x, 'CINQ FILMS,', cap.lx, cap.l0, cap.ls, tl, { fam: 'Anton', align: cap.al, color: COL.ink });
    revealWords(x, 'CLASSÉS ET', cap.lx, cap.l0 + cap.ls * 1.02, cap.ls, tl - 0.1, { fam: 'Anton', align: cap.al, color: COL.ink });
    revealWords(x, 'EXPLIQUÉS.', cap.lx, cap.l0 + cap.ls * 2.04, cap.ls, tl - 0.2, { fam: 'Anton', align: cap.al, color: COL.red });
  }
  x.restore();
}
function resultsCaption() {
  const ls = PORT ? 118 * U : 124 * U;
  const lx = PORT ? CX : W * 0.075;
  const al = PORT ? 'center' : 'left';
  const l0 = PORT ? H * 0.14 : CY - ls * 0.62;
  const L = layoutChars('EXPLIQUÉS.', ls, { fam: 'Anton' });
  const x0 = PORT ? CX - L.w / 2 : lx;
  const ci = L.chars[4]; // le I
  return { ls, lx, al, l0, ix: x0 + ci.x + ci.w / 2, iy: l0 + ls * 2.04 - textAscent('I', ls, { fam: 'Anton' }) * 0.5 };
}

/* ---------- 10. le logo ---------- */
function sceneLogo(x, lt, t) {
  const full = 'CINÉMOOD';
  const L0 = neonSignLayout();
  const lay = layoutChars(full, L0.size, { fam: 'Anton' });
  const layA = layoutChars('CINÉMA', L0.size, { fam: 'Anton' });
  const { lvA, aLv, lv, kill } = levelsLogo(lt);
  const shift = E.inOutCubic(prog(lt, 0.85, 1.45));
  const xA = CX - layA.w / 2, xF = CX - lay.w / 2;
  const x0 = lerp(xA, xF, shift);
  const whiten = E.inOutCubic(prog(lt, 1.05, 1.5));
  const cols = full.split('').map((c, i) => (i < 4 ? mixc(RED, INK, whiten) : RED));
  const glass = full.split('').map((c, i) => (i < 5 ? 1 : E.outCubic(prog(lt, 0.95 + (i - 5) * 0.1, 1.15 + (i - 5) * 0.1))));
  const inten = (lv.reduce((a, b) => a + b, 0) + aLv) / 6.5;
  const z = 1.06 - 0.06 * E.outCubic(prog(lt, 0, 4));
  let L;
  L = drawWallScene(x, t, Math.min(1.1, inten), (nx, LL) => {
    // tubes : on dessine lettre par lettre pour gérer le verre et les couleurs
    drawNeonGlass(nx, full, x0, LL.base, LL.size, lv, cols, glass);
    if (aLv > 0.003 || kill < 1) {
      const ax = x0 + lay.chars[5].x;
      drawNeonGlass(nx, 'A', ax, LL.base, LL.size, [aLv], [RED], [1 - kill]);
    }
  }, z);
  // étincelles quand le A lâche
  if (lt > 0.72 && lt < 1.4) {
    const ax = x0 + lay.chars[5].x + lay.chars[5].w / 2;
    const ay = L.base - L.size * 0.4;
    const st = lt - 0.72;
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI / 2 + (rnd(i * 2.3) - 0.5) * 2.6;
      const v = (300 + rnd(i * 5.7) * 700) * U;
      const px = ax + Math.cos(a) * v * st, py = ay + Math.sin(a) * v * st + 1600 * U * st * st;
      const life = clamp(1 - st / (0.35 + rnd(i) * 0.4));
      if (life <= 0) continue;
      x.strokeStyle = `rgba(255,${200 + rnd(i) * 55 | 0},150,${life})`;
      x.lineWidth = 2.5 * U;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px - Math.cos(a) * 18 * U, py - Math.sin(a) * 18 * U - 24 * U * st);
      x.stroke();
    }
    x.restore();
  }
  // reflet d'objectif anamorphique : une ligne de lumière horizontale quand MOOD s'allume
  const fl = E.outCubic(prog(lt, 1.08, 1.6)) * (0.8 + 0.2 * Math.sin(lt * 2.3));
  if (fl > 0.01) {
    const fy = L.base - L.size * 0.38;
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (const [hh, a, col] of [[46, 0.22, [255, 70, 100]], [10, 0.45, [255, 150, 170]], [2.5, 0.8, [255, 235, 240]]]) {
      const g = x.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a * fl)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g;
      x.save();
      x.filter = `blur(${hh * 0.6 * U}px)`;
      x.fillRect(-W * 0.1, fy - hh * U / 2, W * 1.2, hh * U);
      x.restore();
    }
    x.restore();
  }
  // signature
  const tagS = PORT ? 30 * U : 30 * U;
  const ty = PORT ? L.horizon + textAscent('CINÉMOOD', L.size, { fam: 'Anton' }) + 110 * U : L.base - textAscent('CINÉMOOD', L.size, { fam: 'Anton' }) - 52 * U;
  const tag = 'LE FILM QUI COLLE À TON MOMENT, EN UNE MINUTE.';
  if (PORT) {
    revealWords(x, 'LE FILM QUI COLLE À TON MOMENT,', CX, ty, tagS, lt - 1.75, { fam: 'Archivo', wt: 600, track: 0.14, align: 'center', color: 'rgba(246,238,240,0.85)', stagger: 0.04 });
    revealWords(x, 'EN UNE MINUTE.', CX, ty + tagS * 1.7, tagS, lt - 1.9, { fam: 'Archivo', wt: 600, track: 0.14, align: 'center', color: 'rgba(246,238,240,0.85)', stagger: 0.04 });
  } else {
    revealWords(x, tag, CX, ty, tagS, lt - 1.75, { fam: 'Archivo', wt: 600, track: 0.14, align: 'center', color: 'rgba(246,238,240,0.85)', stagger: 0.035 });
  }
  // URL
  const us = PORT ? 80 * U : 70 * U;
  const uy = PORT ? ty + 210 * U : L.horizon + (H - L.horizon) * 0.55;
  const ua = E.outCubic(prog(lt, 2.15, 2.6));
  if (ua > 0) {
    x.save();
    x.globalAlpha = ua;
    const parts = [['cinem', COL.ink], ['00', COL.red], ['d.com', COL.ink]];
    const ws = parts.map(pp => textWidth(pp[0], us, { fam: 'Archivo', wt: 700 }));
    const tot = ws.reduce((a, b) => a + b, 0);
    const padX = 34 * U, bh = us * 1.55;
    const bx = CX - tot / 2 - padX, by = uy - us * 1.08;
    // cadre façon bouton du site
    x.fillStyle = 'rgba(16,10,13,0.85)';
    x.fillRect(bx, by, tot + padX * 2, bh);
    x.strokeStyle = rgba(RED, 0.9);
    x.lineWidth = 2 * U;
    const dl = E.inOutCubic(prog(lt, 2.15, 2.8));
    x.strokeRect(bx, by, (tot + padX * 2) * dl, bh);
    let ux = CX - tot / 2 + (1 - ua) * 20 * U;
    parts.forEach((pp, i) => { drawText(x, pp[0], ux, uy, us, { fam: 'Archivo', wt: 700, color: pp[1] }); ux += ws[i]; });
    x.restore();
    x.save();
    x.globalAlpha = E.outCubic(prog(lt, 2.5, 2.9)) * 0.7;
    drawText(x, 'GRATUIT  ·  SANS INSCRIPTION  ·  MODE DUO', CX, by + bh + 58 * U, 22 * U, { fam: 'Archivo', wt: 600, track: 0.2, align: 'center', color: COL.ink });
    x.restore();
  }
}
/* phase 1 : CINÉMA s'allume, phase 2 : le A meurt et OOD s'allume */
function levelsLogo(lt) {
  const on = [0.0, 0.06, 0.12, 0.2, 0.26, 0.32];
  const lvA = on.map((o, i) => ignite(lt - 0.05 - o, 70 + i, 0.2));
  const kill = prog(lt, 0.72, 0.9);
  const aLv = lvA[5] * (kill > 0 ? (kill < 1 ? (rnd(Math.floor(lt * 60) * 4.1) > 0.45 ? 0.9 : 0.02) : 0) : 1);
  const lv = 'CINÉMOOD'.split('').map((c, i) => {
    if (i < 5) {
      let v = lvA[i];
      if (i === 3 && lt > 0.5) v *= rnd(Math.floor(lt * 60) * 1.7) > 0.9 ? 0.3 : 1; // É fatigué, comme sur le site
      return v;
    }
    return ignite(lt - 1.05 - (i - 5) * 0.12, 90 + i, 0.3);
  });
  return { lvA, aLv, lv, kill };
}
/* intensité moyenne du néon à l'image f (pour caler le son) */
function neonLevelAt(f) {
  const t = f / FPS;
  if (t < 2.0) { const l = levelsOpen(t); return l.reduce((a, b) => a + b, 0) / l.length; }
  if (t >= 6.0 && t < 8.0) { const lt = t - 6.0; const n = 'TON MOMENT.'.length; let s = 0; for (let i = 0; i < n; i++) s += ignite(lt - 0.5 - i * 0.025, 40 + i, 0.25); return s / n; }
  if (t >= 26.0) { const r = levelsLogo(t - 26.0); return (r.lv.reduce((a, b) => a + b, 0) + r.aLv) / 9; }
  return 0;
}
/* variante du néon avec opacité du verre et couleur par lettre */
function drawNeonGlass(ctx, s, x0, y, size, levels, cols, glass) {
  const L = layoutChars(s, size, { fam: 'Anton' });
  setFont(ctx, size, 'Anton');
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.save();
  for (const c of L.chars) {
    const g = glass[c.i];
    if (g <= 0.001) continue;
    ctx.globalAlpha = g;
    ctx.fillStyle = rgba(mixc(cols[c.i], [20, 6, 10], 0.84), 0.92);
    ctx.fillText(c.ch, x0 + c.x, y);
    ctx.strokeStyle = 'rgba(255,220,226,0.07)';
    ctx.lineWidth = Math.max(1, size * 0.006);
    ctx.strokeText(c.ch, x0 + c.x, y);
  }
  ctx.restore();
  const hx = halfCtxLike(ctx);
  setFont(hx, size, 'Anton');
  let any = false;
  for (const c of L.chars) {
    const lv = levels[c.i] || 0;
    if (lv <= 0.003) continue;
    any = true;
    hx.fillStyle = glowColor(cols[c.i], lv);
    hx.fillText(c.ch, x0 + c.x, y);
  }
  if (any) { const gs = size / 260; glowFromHalf(ctx, [6 * gs, 22 * gs, 64 * gs, 150 * gs], [0.85, 0.7, 0.5, 0.25]); }
  ctx.save();
  for (const c of L.chars) {
    const lv = levels[c.i] || 0;
    if (lv <= 0.003) continue;
    const col = cols[c.i];
    const white = col[1] > 150;
    const hot = mixc(col, [255, 244, 246], white ? 0.7 : 0.42);
    ctx.globalAlpha = lv;
    ctx.fillStyle = rgba(white ? mixc(col, [236, 168, 184], 0.45) : col, 1);
    ctx.fillText(c.ch, x0 + c.x, y);
    ctx.globalAlpha = lv * (white ? 1 : 0.85);
    ctx.strokeStyle = rgba(white ? [255, 255, 255] : hot, 1);
    ctx.lineWidth = Math.max(1, size * (white ? 0.02 : 0.014));
    ctx.strokeText(c.ch, x0 + c.x, y);
  }
  ctx.restore();
}

