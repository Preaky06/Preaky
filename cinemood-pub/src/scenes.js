/* Découpage du film (30 s, 120 BPM : 1 temps = 0,5 s, 1 mesure = 2 s)
   0–2    néon « CINÉMA » qui s'allume
   2–6    le scroll infini : « Tu passes 30 minutes à chercher quoi regarder »
   6–8    « On part de ton moment »
   8–10   l'interface : « Ce soir, il te faut quoi ? »
   10–14  les 8 humeurs, une par temps
   14–17  le parcours en accéléré (12 questions)
   17–18  le moteur filtre le catalogue
   18–22  les résultats
   22–26  les arguments (12 questions, Duo, gratuit, sans inscription)
   26–30  le logo : CINÉMA devient CINÉMOOD */
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
function bgStudio(x, t, tint = RED, k = 1) {
  x.fillStyle = '#050304';
  x.fillRect(0, 0, W, H);
  const a = x.createRadialGradient(W * (0.2 + 0.05 * Math.sin(t * 0.7)), H * 0.05, 0, W * 0.2, H * 0.05, Math.max(W, H) * 0.8);
  a.addColorStop(0, rgba(tint, 0.28 * k));
  a.addColorStop(1, rgba(tint, 0));
  x.fillStyle = a;
  x.fillRect(0, 0, W, H);
  const b = x.createRadialGradient(W * (0.85 - 0.04 * Math.sin(t * 0.5)), H * 1.0, 0, W * 0.85, H, Math.max(W, H) * 0.7);
  b.addColorStop(0, rgba(tint, 0.18 * k));
  b.addColorStop(1, rgba(tint, 0));
  x.fillStyle = b;
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
function placePanel(x, img, o) {
  const dw = img.width * o.s, dh = img.height * o.s;
  const X = o.cx - dw / 2, Y = o.cy - dh / 2;
  const al = o.a == null ? 1 : o.a;
  // halo derrière l'écran
  const g = x.createRadialGradient(o.cx, o.cy + dh * 0.1, 0, o.cx, o.cy, Math.max(dw, dh) * 0.75);
  g.addColorStop(0, `rgba(255,45,79,${0.16 * al})`);
  g.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // ombre portée, calée sur les coins projetés
  const q = panelQuad(X, Y, dw, dh, o.ry || 0);
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
  drawPanelY(x, img, X, Y, dw, dh, o.ry || 0, { strips: Math.round(dw / 3) });
  // liseré fin autour de l'écran
  x.strokeStyle = 'rgba(255,255,255,0.07)';
  x.lineWidth = 1.5 * U;
  x.beginPath();
  x.moveTo(q[0].x, q[0].y); x.lineTo(q[1].x, q[1].y); x.lineTo(q[2].x, q[2].y); x.lineTo(q[3].x, q[3].y);
  x.closePath(); x.stroke();
  x.restore();
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
  // reflet : miroir autour de la ligne d'horizon (à l'écran)
  const hz = m.d * L.horizon + m.f;
  x.beginPath(); x.rect(0, hz, W, H - hz); x.clip();
  x.translate(0, hz * 2);
  x.scale(1, -1);
  x.globalAlpha = 0.34;
  x.filter = `blur(${4 * U}px)`;
  x.drawImage(NB, 0, 0);
  x.filter = 'none';
  x.restore();
  // halo + poussière
  const ly = (L.base - L.size * 0.36) * m.d + m.f;
  const hg = x.createRadialGradient(CX, ly, 0, CX, ly, Math.max(W, H) * 0.55);
  hg.addColorStop(0, `rgba(255,45,79,${0.12 * intensity})`);
  hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg;
  x.fillRect(0, 0, W, H);
  dust(x, t, [255, 140, 160], 0.55 * intensity, (px, py) => clamp(1 - Math.hypot(px - CX, py - ly) / (Math.max(W, H) * 0.6)));
  return L;
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

  // texte
  const big = PORT ? 250 * U : 280 * U;
  const yMid = CY + big * 0.36;
  revealWords(x, 'TU PASSES', CX, yMid - big * 0.98, PORT ? 92 * U : 84 * U, lt - 0.15, { fam: 'Anton', align: 'center', color: COL.ink, track: 0.02 });
  // chronomètre puis « 30 MINUTES »
  const cnt = clamp((lt - 0.35) / 2.75);
  const secs = Math.floor(E.inQuad(cnt) * 1800);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  const lock = prog(lt, 3.1, 3.3);
  if (lt > 0.3) {
    const ap = E.outCubic(prog(lt, 0.3, 0.55));
    x.save();
    x.globalAlpha = ap * (1 - lock);
    const s = big * (PORT ? 0.95 : 1);
    const digits = mm + ':' + ss;
    const cellW = textWidth('0', s, { fam: 'Anton' }) * 1.04;
    const colonW = textWidth(':', s, { fam: 'Anton' }) * 1.3;
    const tot = cellW * 4 + colonW;
    let dx = CX - tot / 2;
    for (const ch of digits) {
      const cw = ch === ':' ? colonW : cellW;
      drawText(x, ch, dx + cw / 2, yMid, s, { fam: 'Anton', align: 'center', color: cnt > 0.85 ? COL.red : COL.ink });
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
      const ms = PORT ? fitSize('30 MINUTES', W * 0.88, big, { fam: 'Anton' }) : big;
      drawText(x, '30 MINUTES', CX, yMid, ms, { fam: 'Anton', align: 'center', color: COL.red });
      x.restore();
    }
  }
  const subS = PORT ? 64 * U : 66 * U;
  if (PORT) {
    revealWords(x, 'À CHERCHER', CX, yMid + subS * 1.45, subS, lt - 1.0, { fam: 'Anton', align: 'center', color: COL.ink });
    revealWords(x, 'QUOI REGARDER.', CX, yMid + subS * 2.5, subS, lt - 1.15, { fam: 'Anton', align: 'center', color: COL.ink });
  } else {
    revealWords(x, 'À CHERCHER QUOI REGARDER.', CX, yMid + subS * 1.5, subS, lt - 1.0, { fam: 'Anton', align: 'center', color: COL.ink, stagger: 0.07 });
  }
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
  const z = 1 + 0.05 * E.inOutCubic(prog(lt, 0, 2)) + 0.25 * E.inExpo(prog(lt, 1.7, 2.0));
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
function sceneQuestion(x, lt, t) {
  bgStudio(x, t);
  dust(x, t, [255, 120, 140], 0.3);
  const img = drawQuiz({
    step: 1, total: 12, kicker: Q1.kicker, title: Q1.title, options: Q1.options,
    titleT: lt - 0.2, optT: lt - 0.75, kickerP: prog(lt, 0.05, 0.4), trail: [], progress: (1 / 12) * E.outCubic(prog(lt, 0.2, 0.8)),
  });
  const intro = E.outQuint(prog(lt, 0, 1.1));
  const push = E.inCubic(prog(lt, 1.55, 2.0));
  const ry = lerp(PORT ? 0.0 : 0.42, PORT ? 0 : 0.07, intro) - (PORT ? 0 : 0.07) * push;
  const s = lerp(0.82, 0.97, intro) + 0.9 * push;
  const cy = CY + lerp(60 * U, 0, intro) + (PORT ? 0 : 0) - push * 120 * U;
  x.save();
  if (PORT) camera(x, { z: 1, r: lerp(-0.03, 0, intro) });
  placePanel(x, img, { cx: CX, cy, s, ry, a: clamp(lt / 0.25) });
  x.restore();
}

/* ---------- 5. les humeurs ---------- */
function moodWord(x, m, size, y, o = {}) {
  drawText(x, m.w, CX + (o.dx || 0), y + (o.dy || 0), size, { fam: 'Anton', align: 'center', color: o.color || COL.ink, track: o.track || 0 });
}
function sceneMood(x, lt, t, idx) {
  const m = MOODS[idx];
  const p = lt; // 0..0.5
  const col = m.col;
  const maxW = PORT ? W * 0.88 : W * 0.8;
  let size = Math.min(PORT ? 300 * U : 320 * U, fitSize(m.w, maxW, 400 * U, { fam: 'Anton' }));
  const y = CY + size * 0.36;
  x.fillStyle = '#040203';
  x.fillRect(0, 0, W, H);
  const glow = (a, r = 0.75) => {
    const g = x.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  };
  x.save();
  if (m.kind === 'laugh') {
    glow(0.42);
    // confettis
    for (let i = 0; i < 90; i++) {
      const a = rnd(i * 1.3) * Math.PI * 2, v = (700 + rnd(i * 2.1) * 1300) * U;
      const tt = p + 0.02;
      const px = CX + Math.cos(a) * v * tt, py = CY + Math.sin(a) * v * tt + 2400 * U * tt * tt;
      const cc = [col, RED, INK][i % 3];
      x.save();
      x.translate(px, py);
      x.rotate(rnd(i) * 6 + tt * (6 + rnd(i * 3) * 10));
      x.fillStyle = rgba(cc, 0.9);
      const s = (10 + rnd(i * 5) * 14) * U;
      if (i % 2) x.fillRect(-s / 2, -s / 4, s, s / 2); else { x.beginPath(); x.arc(0, 0, s / 2.6, 0, Math.PI * 2); x.fill(); }
      x.restore();
    }
    const b = E.outBack(prog(p, 0, 0.22));
    x.translate(CX, CY);
    x.rotate(lerp(-0.12, 0, E.outBackSoft(prog(p, 0, 0.3))));
    x.scale(lerp(0.5, 1, b), lerp(0.5, 1, b) * (1 + 0.06 * Math.sin(p * 30) * (1 - prog(p, 0, 0.4))));
    x.translate(-CX, -CY);
    moodWord(x, m, size, y, { color: rgba(col, 1) });
  } else if (m.kind === 'fear') {
    const strobe = rnd(Math.floor(p * 60 / 2) * 1.91 + 3) > 0.35 ? 1 : 0.15;
    glow(0.5 * strobe, 0.6);
    const lg = x.createLinearGradient(0, H, 0, H * 0.4);
    lg.addColorStop(0, rgba(col, 0.35 * strobe));
    lg.addColorStop(1, rgba(col, 0));
    x.fillStyle = lg;
    x.fillRect(0, 0, W, H);
    // rayures de pellicule
    x.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 4; i++) x.fillRect(rnd(Math.floor(p * 60) + i * 9) * W, 0, 1.5 * U, H);
    const j = 7 * U * (1 - prog(p, 0.3, 0.5) * 0.6);
    const jx = (rnd(Math.floor(p * 60) * 3.3) - 0.5) * j * 2, jy = (rnd(Math.floor(p * 60) * 5.1) - 0.5) * j * 2;
    const zs = lerp(1.15, 1, E.outExpo(prog(p, 0, 0.18)));
    x.translate(CX, CY); x.scale(zs, zs); x.translate(-CX, -CY);
    x.globalCompositeOperation = 'lighter';
    moodWord(x, m, size, y, { dx: jx - 9 * U, dy: jy, color: 'rgba(255,0,40,0.9)' });
    moodWord(x, m, size, y, { dx: jx + 9 * U, dy: jy, color: 'rgba(0,200,255,0.55)' });
    x.globalCompositeOperation = 'source-over';
    moodWord(x, m, size, y, { dx: jx, dy: jy, color: rgba(INK, strobe > 0.5 ? 1 : 0.5) });
  } else if (m.kind === 'emu') {
    const bg = x.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1d0a14'); bg.addColorStop(1, '#3a1222');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    glow(0.25);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const r = (30 + rnd(i * 4.4) * 120) * U;
      const px = rnd(i * 1.7) * W + Math.sin(p * 2 + i) * 30 * U, py = rnd(i * 2.9) * H - p * (40 + rnd(i) * 80) * U;
      x.fillStyle = rgba(col, 0.05 + rnd(i * 8.1) * 0.12);
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = rgba(col, 0.08);
      x.lineWidth = 2 * U; x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    const bl = 24 * (1 - E.outCubic(prog(p, 0, 0.3)));
    x.filter = bl > 0.3 ? `blur(${bl * U}px)` : 'none';
    x.shadowColor = rgba(col, 0.8);
    x.shadowBlur = 50 * U;
    const zs = lerp(1.08, 1, E.outCubic(prog(p, 0, 0.5)));
    x.translate(CX, CY); x.scale(zs, zs); x.translate(-CX, -CY);
    moodWord(x, m, size, y, { color: '#ffe3e8' });
    x.filter = 'none';
    x.shadowBlur = 0;
  } else if (m.kind === 'rush') {
    glow(0.5);
    x.save();
    const sk = shake(p, 16, 22, 5);
    x.translate(sk.x, sk.y);
    x.globalCompositeOperation = 'lighter';
    const R = Math.max(W, H) * 0.8;
    for (let i = 0; i < 110; i++) {
      const a = rnd(i * 3.7) * Math.PI * 2;
      const r0 = ((rnd(i * 1.1) + p * 3.2) % 1) * R;
      const len = (0.12 + rnd(i * 6.3) * 0.25) * R;
      x.strokeStyle = rgba(i % 4 ? col : INK, 0.08 + 0.5 * (r0 / R));
      x.lineWidth = (2 + rnd(i * 2.2) * 4) * U * (r0 / R + 0.2);
      x.beginPath();
      x.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
      x.lineTo(CX + Math.cos(a) * (r0 + len), CY + Math.sin(a) * (r0 + len));
      x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    const sl = E.outExpo(prog(p, 0, 0.14));
    const zs = lerp(2.4, 1, sl) + 0.03 * Math.sin(p * 40) * (1 - sl);
    // fantômes de flou de mouvement
    for (let g = 3; g >= 0; g--) {
      const zz = zs * (1 + g * 0.06 * (1 - sl * 0.7));
      x.save();
      x.translate(CX, CY); x.scale(zz, zz); x.skewX ? 0 : 0; x.translate(-CX, -CY);
      x.globalAlpha = g === 0 ? 1 : 0.18;
      x.transform(1, 0, -0.12, 1, 0, 0);
      x.translate(y * 0.12, 0);
      moodWord(x, m, size, y, { color: g === 0 ? '#fff4e8' : rgba(col, 1) });
      x.restore();
    }
    x.restore();
  } else if (m.kind === 'think') {
    x.fillStyle = '#04070d'; x.fillRect(0, 0, W, H);
    glow(0.2);
    x.strokeStyle = rgba(col, 0.25);
    x.lineWidth = 1.5 * U;
    const R = Math.min(W, H) * 0.48;
    for (let i = 1; i <= 6; i++) {
      x.save();
      x.translate(CX, CY);
      x.rotate((i % 2 ? 1 : -1) * p * 0.6 + i);
      x.setLineDash([(6 + i * 4) * U, (10 + i * 6) * U]);
      x.beginPath(); x.arc(0, 0, R * (0.25 + i * 0.16) * lerp(0.92, 1, E.outCubic(prog(p, 0, 0.5))), 0, Math.PI * 2); x.stroke();
      x.restore();
    }
    x.setLineDash([]);
    const tr = lerp(0.5, 0.06, E.outQuint(prog(p, 0, 0.45)));
    size = Math.min(size, fitSize(m.w, maxW, 400 * U, { fam: 'Anton', track: 0.06 }));
    x.globalAlpha = E.outCubic(prog(p, 0, 0.2));
    moodWord(x, m, size, y, { color: '#eef3ff', track: tr });
  } else if (m.kind === 'glitch') {
    const fl = p < 0.06 ? 1 : 0;
    glow(0.35 + fl * 0.5);
    clearCanvas(TMP, TX);
    moodWord(TX, m, size, y, { color: COL.ink });
    const settle = 1 - E.outCubic(prog(p, 0.02, 0.32));
    const slices = 18;
    const asc = textAscent(m.w, size, { fam: 'Anton' });
    const top = y - asc - 6 * U, hh = asc + size * 0.08;
    for (let s = 0; s < slices; s++) {
      const sy = top + (hh * s) / slices, sh = hh / slices + 1;
      const off = (rnd(s * 9.1 + Math.floor(p * 60 / 3) * 1.3) - 0.5) * 220 * U * settle;
      x.drawImage(TMP, 0, sy, W, sh, off, sy, W, sh);
      if (settle > 0.2 && rnd(s * 2.2 + Math.floor(p * 30)) > 0.75) {
        x.fillStyle = rgba(col, 0.6 * settle);
        x.fillRect(CX - size * 1.5 + rnd(s * 4.4) * size * 3, sy, (80 + rnd(s) * 300) * U, sh);
      }
    }
  } else if (m.kind === 'chill') {
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#04110f'); bg.addColorStop(1, '#0a2a24');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    glow(0.18);
    for (let i = 0; i < 40; i++) {
      const r = (6 + rnd(i * 3.3) * 34) * U;
      const px = rnd(i * 1.9) * W + Math.sin(p * 3 + i * 2) * 14 * U;
      const py = ((rnd(i * 5.5) * H * 1.2 - p * (120 + rnd(i) * 160) * U) % (H * 1.2) + H * 1.2) % (H * 1.2);
      x.strokeStyle = rgba(col, 0.35);
      x.lineWidth = 2 * U;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.stroke();
    }
    const d = E.outCubic(prog(p, 0, 0.45));
    x.globalAlpha = d;
    moodWord(x, m, size, y, { dy: lerp(-60 * U, 0, d), color: '#e9fff8' });
  } else if (m.kind === 'warp') {
    const sp = lerp(0.9, 2.6, prog(p, 0, 0.5));
    const tt = 10 + p * sp;
    x.fillStyle = '#02040a'; x.fillRect(0, 0, W, H);
    glow(0.3, 0.6);
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round';
    const F = Math.max(W, H) * 0.32;
    for (const s of STARS) {
      let z = ((s.z - tt * 0.35) % 1 + 1) % 1;
      if (z < 0.03) continue;
      const z2 = z + 0.05 * sp;
      const sx = CX + (s.x / z) * F, sy = CY + (s.y / z) * F * 0.7;
      const px = CX + (s.x / z2) * F, py = CY + (s.y / z2) * F * 0.7;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const br = (1 - z) * s.b;
      x.strokeStyle = rgba(mixc(col, INK, s.b), br);
      x.lineWidth = Math.max(1, (1 - z) * 4 * U);
      x.beginPath(); x.moveTo(px, py); x.lineTo(sx, sy); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    const f = E.outCubic(prog(p, 0, 0.4));
    x.globalAlpha = f;
    const zs = lerp(0.9, 1.04, E.outCubic(prog(p, 0, 0.5)));
    x.translate(CX, CY); x.scale(zs, zs); x.translate(-CX, -CY);
    x.shadowColor = rgba(col, 0.9);
    x.shadowBlur = 40 * U;
    moodWord(x, m, size, y, { color: '#eaf6ff' });
    x.shadowBlur = 0;
  }
  x.restore();
  // numéro + sous-titre (mêmes codes que les cartes du site)
  const ns = (PORT ? 30 : 28) * U;
  const subY = y + (PORT ? 120 : 110) * U;
  x.save();
  x.globalAlpha = E.outCubic(prog(p, 0.05, 0.2));
  drawText(x, m.num, CX, y - textAscent(m.w, size, { fam: 'Anton' }) - 30 * U, ns, { fam: 'Archivo', wt: 600, track: 0.2, align: 'center', color: rgba(m.kind === 'fear' ? INK : COL.red === '' ? RED : RED, 1) });
  drawText(x, m.sub, CX, subY, (PORT ? 50 : 46) * U, { fam: 'Archivo', wt: 500, align: 'center', color: 'rgba(246,238,240,0.82)' });
  x.restore();
}
function sceneMoods(x, lt, t) {
  const idx = Math.min(7, Math.floor(lt / 0.5));
  const p = lt - idx * 0.5;
  if (idx === 7 && p > 0.3) {
    // zoom arrière : on ressort de la carte « M'évader » choisie
    const z = E.inOutCubic(prog(p, 0.3, 0.5));
    sceneMood(x, p, t, idx);
    const img = drawQuiz({ step: 1, total: 12, kicker: Q1.kicker, title: Q1.title, options: Q1.options, sel: 5, selP: 1, trail: [], progress: 1 / 12 });
    const r = quizCardRect(5, 8);
    const s0 = 0.97;
    const cardCx = (r.x + r.w / 2 - img.width / 2) * s0, cardCy = (r.y + r.h / 2 - img.height / 2) * s0;
    const big = Math.max(W / (r.w * s0), H / (r.h * s0)) * 1.15;
    const zz = Math.exp(lerp(Math.log(big), 0, z));
    const wgt = (zz - 1) / (big - 1);
    x.save();
    x.globalAlpha = clamp(z * 2.5);
    x.translate(CX, CY);
    x.scale(zz, zz);
    x.translate(-(CX + cardCx * wgt), -(CY + cardCy * wgt));
    placePanel(x, img, { cx: CX, cy: CY, s: s0, ry: 0 });
    x.restore();
    return;
  }
  sceneMood(x, p, t, idx);
}

/* ---------- 6. le parcours en accéléré ---------- */
function sceneSpeed(x, lt, t) {
  bgStudio(x, t);
  dust(x, t, [255, 120, 140], 0.3);
  // 02 → 06 : un temps chacun ; 07 → 12 : une croche… et plus vite
  let qi, ql;
  if (lt < 2.5) { qi = Math.floor(lt / 0.5); ql = lt - qi * 0.5; }
  else { qi = 5 + Math.min(5, Math.floor((lt - 2.5) / (0.5 / 6))); ql = (lt - 2.5) % (0.5 / 6); }
  const q = QS[qi];
  const fast = qi >= 5;
  const trail = [];
  for (let i = 0; i <= qi; i++) trail.push(QS[i].chip);
  const selAt = fast ? 0.03 : 0.3;
  const opts = q.options;
  const img = drawQuiz({
    step: q.step, total: 12, kicker: q.kicker, title: q.title, options: opts,
    titleT: fast ? 9 : ql * 1.6 + 0.05, optT: fast ? 9 : ql * 1.5 + 0.12, kickerP: fast ? 1 : prog(ql, 0, 0.15),
    slide: fast ? 0 : 34 * (1 - E.outCubic(prog(ql, 0, 0.22))), alpha: fast ? 1 : E.outCubic(prog(ql, 0, 0.18)),
    sel: ql > selAt ? q.sel : -1, selP: prog(ql, selAt, selAt + (fast ? 0.04 : 0.12)),
    trail, trailP: prog(ql, 0, 0.2), progress: lerp((q.step - 1) / 12, q.step / 12, E.outCubic(prog(ql, 0, fast ? 0.06 : 0.25))),
  });
  const ry = PORT ? 0 : lerp(0.09, -0.07, E.inOutCubic(prog(lt, 0, 3)));
  // cadrage : la zone utile (haut de l'écran jusqu'aux cartes) remplit l'image
  const frameFor = (qq) => {
    const G = quizGeom(qq.title, qq.options.length);
    const sc = Math.min(PORT ? 1.04 : 1.16, (H * (PORT ? 0.7 : 0.88)) / G.bottom);
    const top = (H - G.bottom * sc) / 2;
    return { s: sc, cy: top + (UIB.height * sc) / 2 };
  };
  const cur = frameFor(q), prev = frameFor(qi > 0 ? QS[qi - 1] : Q1);
  const blend = fast ? 1 : E.inOutCubic(prog(ql, 0, 0.2));
  const s = lerp(prev.s, cur.s, blend) * (1 + 0.012 * Math.sin(lt * 1.3));
  const pcy = lerp(prev.cy, cur.cy, blend);
  placePanel(x, img, { cx: CX, cy: pcy, s, ry });
  // chrono discret sous l'écran
  const secs = Math.floor(lerp(9, 52, prog(lt, 0, 3)));
  const lab = '00:' + String(secs).padStart(2, '0');
  const yy = PORT ? H - 150 * U : H - 34 * U;
  x.save();
  x.globalAlpha = 0.85;
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
function sceneLoading(x, lt, t) {
  if (!GLOBE) buildGlobe();
  bgStudio(x, t, RED, 0.6);
  const R = Math.min(W, H) * (PORT ? 0.36 : 0.3);
  const gy = PORT ? CY - 120 * U : CY - 70 * U;
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
  dust(x, t, [255, 120, 140], 0.25);
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
  // légende éditoriale
  if (aside > 0) {
    const ls = PORT ? 118 * U : 124 * U;
    const lx = PORT ? CX : W * 0.075;
    const al = PORT ? 'center' : 'left';
    const l0 = PORT ? H * 0.14 : CY - ls * 0.62;
    const tl = lt - 2.75;
    revealWords(x, 'CINQ FILMS,', lx, l0, ls, tl, { fam: 'Anton', align: al, color: COL.ink });
    revealWords(x, 'CLASSÉS ET', lx, l0 + ls * 1.02, ls, tl - 0.1, { fam: 'Anton', align: al, color: COL.ink });
    revealWords(x, 'EXPLIQUÉS.', lx, l0 + ls * 2.04, ls, tl - 0.2, { fam: 'Anton', align: al, color: COL.red });
  }
}

/* ---------- 9. les arguments ---------- */
function sceneFeature(x, lt, t, i) {
  bgStudio(x, t, RED, 0.7);
  const p = lt;
  const e = E.outQuint(prog(p, 0, 0.35));
  const big = PORT ? 330 * U : 300 * U;
  x.save();
  const z = 1 + 0.04 * p;
  camera(x, { z });
  if (i === 0) {
    // 12 graduations qui se remplissent
    const R = PORT ? 330 * U : 300 * U;
    const cy = PORT ? CY - 160 * U : CY;
    const cx0 = PORT ? CX : W * 0.3;
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI / 2 + (k / 12) * Math.PI * 2;
      const on = prog(p, 0.05 + k * 0.045, 0.12 + k * 0.045);
      x.strokeStyle = on > 0 ? rgba(RED, 0.35 + 0.65 * on) : 'rgba(246,238,240,0.12)';
      x.lineWidth = 9 * U;
      x.lineCap = 'butt';
      x.beginPath();
      x.moveTo(cx0 + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86);
      x.lineTo(cx0 + Math.cos(a) * R, cy + Math.sin(a) * R);
      x.stroke();
    }
    x.globalAlpha = e;
    drawText(x, '12', cx0, cy + big * 0.36, big * 0.95, { fam: 'Anton', align: 'center', color: COL.red });
    x.globalAlpha = 1;
    const tx = PORT ? CX : W * 0.53, al = PORT ? 'center' : 'left';
    const ty = PORT ? cy + R + 170 * U : CY + 20 * U;
    revealWords(x, 'QUESTIONS', tx, ty, PORT ? 150 * U : 160 * U, p - 0.12, { fam: 'Anton', align: al, color: COL.ink });
    x.globalAlpha = E.outCubic(prog(p, 0.3, 0.55));
    drawText(x, 'Ton humeur, ton contexte, ton temps.', tx, ty + 80 * U, PORT ? 40 * U : 40 * U, { fam: 'Archivo', wt: 500, align: al, color: 'rgba(246,238,240,0.75)' });
  } else if (i === 1) {
    const d = E.inOutCubic(prog(p, 0.05, 0.55));
    const R = PORT ? 230 * U : 210 * U;
    const cy = PORT ? CY - 200 * U : CY - 40 * U;
    const sep = lerp(R * 1.6, R * 0.62, d);
    x.lineWidth = 6 * U;
    x.strokeStyle = COL.ink;
    x.beginPath(); x.arc(CX - sep / 2, cy, R, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = COL.red;
    x.beginPath(); x.arc(CX + sep / 2, cy, R, 0, Math.PI * 2); x.stroke();
    // intersection remplie
    x.save();
    x.beginPath(); x.arc(CX - sep / 2, cy, R, 0, Math.PI * 2); x.clip();
    x.beginPath(); x.arc(CX + sep / 2, cy, R, 0, Math.PI * 2);
    x.fillStyle = rgba(RED, 0.75 * d);
    x.fill();
    x.restore();
    x.globalAlpha = clamp(d * 1.5 - 0.3);
    drawText(x, '94 %', CX, cy + 26 * U, 70 * U, { fam: 'Anton', align: 'center', color: '#fff' });
    x.globalAlpha = 1;
    const ty = cy + R + (PORT ? 210 : 175) * U;
    revealWords(x, 'MODE DUO', CX, ty, PORT ? 170 * U : 150 * U, p - 0.1, { fam: 'Anton', align: 'center', color: COL.ink });
    x.globalAlpha = E.outCubic(prog(p, 0.3, 0.55));
    drawText(x, 'Un film qui tient pour vous deux.', CX, ty + 72 * U, 40 * U, { fam: 'Archivo', wt: 500, align: 'center', color: 'rgba(246,238,240,0.75)' });
  } else if (i === 2) {
    const s = PORT ? fitSize('GRATUIT', W * 0.86, 420 * U, { fam: 'Anton' }) : 380 * U;
    const y = CY + s * 0.24;
    const zs = lerp(1.35, 1, E.outExpo(prog(p, 0, 0.25)));
    x.save();
    x.translate(CX, CY); x.scale(zs, zs); x.translate(-CX, -CY);
    x.globalAlpha = clamp(p / 0.08);
    drawText(x, 'GRATUIT', CX, y, s, { fam: 'Anton', align: 'center', color: COL.red });
    x.restore();
    x.globalAlpha = E.outCubic(prog(p, 0.25, 0.5));
    drawText(x, 'Parcours illimités, catalogue en accès libre.', CX, y + 100 * U, PORT ? fitSize('Parcours illimités, catalogue en accès libre.', W * 0.88, 40 * U, { fam: 'Archivo', wt: 500 }) : 40 * U, { fam: 'Archivo', wt: 500, align: 'center', color: 'rgba(246,238,240,0.78)' });
  } else {
    const s = PORT ? 200 * U : 200 * U;
    const y0 = CY - s * 0.15;
    if (PORT) {
      revealWords(x, 'SANS', CX, y0, s * 1.2, p - 0.02, { fam: 'Anton', align: 'center', color: COL.ink });
      revealWords(x, 'INSCRIPTION', CX, y0 + s * 1.15, fitSize('INSCRIPTION', W * 0.88, 260 * U, { fam: 'Anton' }), p - 0.1, { fam: 'Anton', align: 'center', color: COL.ink });
    } else {
      revealWords(x, 'SANS INSCRIPTION', CX, y0 + s * 0.5, s * 1.25, p - 0.02, { fam: 'Anton', align: 'center', color: COL.ink, stagger: 0.1 });
    }
    // trait barré façon formulaire supprimé
    const lw = E.inOutCubic(prog(p, 0.3, 0.6));
    x.globalAlpha = E.outCubic(prog(p, 0.35, 0.6));
    drawText(x, 'Aucun compte demandé.', CX, (PORT ? y0 + s * 1.15 + 120 * U : y0 + s * 0.5 + 105 * U), 40 * U, { fam: 'Archivo', wt: 500, align: 'center', color: 'rgba(246,238,240,0.78)' });
    x.globalAlpha = 1;
    x.fillStyle = COL.red;
    const bw = (PORT ? W * 0.5 : W * 0.24) * lw;
    x.fillRect(CX - (PORT ? W * 0.25 : W * 0.12), (PORT ? y0 + s * 1.15 + 160 * U : y0 + s * 0.5 + 140 * U), bw, 5 * U);
  }
  x.restore();
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

/* ---------- montage ---------- */
const TIMELINE = [
  { a: 0.0, b: 2.0, fn: sceneNeonOpen },
  { a: 2.0, b: 6.0, fn: sceneScroll },
  { a: 6.0, b: 8.0, fn: sceneTurn },
  { a: 8.0, b: 10.0, fn: sceneQuestion },
  { a: 10.0, b: 14.0, fn: sceneMoods },
  { a: 14.0, b: 17.0, fn: sceneSpeed },
  { a: 17.0, b: 18.0, fn: sceneLoading },
  { a: 18.0, b: 22.0, fn: sceneResults },
  { a: 22.0, b: 23.0, fn: (x, lt, t) => sceneFeature(x, lt, t, 0) },
  { a: 23.0, b: 24.0, fn: (x, lt, t) => sceneFeature(x, lt, t, 1) },
  { a: 24.0, b: 25.0, fn: (x, lt, t) => sceneFeature(x, lt, t, 2) },
  { a: 25.0, b: 26.0, fn: (x, lt, t) => sceneFeature(x, lt, t, 3) },
  { a: 26.0, b: 30.01, fn: sceneLogo },
];

/* effets globaux : flashs aux coupes, aberration aux impacts, tremblements, barres */
const CUTS = [2.0, 6.0, 8.0, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 17.0, 18.0, 22.0, 23.0, 24.0, 25.0, 26.0];
const IMPACTS = [{ t: 6.0, a: 1 }, { t: 10.0, a: 0.8 }, { t: 18.0, a: 1.4 }, { t: 22.0, a: 0.7 }, { t: 24.0, a: 0.9 }, { t: 26.72, a: 0.8 }];
function fxAt(t) {
  const fx = { letterbox: 0, grain: 0.13, vignette: 0.85, bloom: 0.3, chroma: 0, shake: { x: 0, y: 0 }, flash: 0, flashCol: [255, 255, 255], fade: 0 };
  // barres 2.39:1 pendant l'ouverture, qui s'ouvrent sur « On part de ton moment »
  if (!PORT) fx.letterbox = t < 6.0 ? 1 : 1 - E.inOutCubic(prog(t, 6.0, 6.6));
  else fx.letterbox = 0;
  if (t < 2.0 || t >= 26.0) { fx.grain = 0.17; fx.bloom = 0.85; }
  if (t >= 2.0 && t < 6.0) fx.grain = 0.16;
  for (const c of CUTS) {
    const d = t - c;
    if (c === 2.0 || c === 26.0) continue; // pas de flash sur les plans néon : il délaverait les noirs
    if (d >= 0 && d < 0.1) fx.flash = Math.max(fx.flash, 0.12 * (1 - d / 0.1));
  }
  for (const im of IMPACTS) {
    const d = t - im.t;
    if (d >= 0 && d < 0.35) {
      const k = 1 - d / 0.35;
      fx.chroma = Math.max(fx.chroma, 9 * im.a * k * k);
      const s = shake(t, 14 * im.a * k * k, 30, im.t);
      fx.shake.x += s.x; fx.shake.y += s.y;
      if (d < 0.08) { fx.flash = Math.max(fx.flash, 0.4 * im.a * (1 - d / 0.08)); fx.flashCol = im.t === 18.0 ? [255, 120, 140] : [255, 255, 255]; }
    }
  }
  // glitch de sortie du scroll
  if (t > 5.82 && t < 6.0) fx.chroma = Math.max(fx.chroma, 14);
  fx.fade = Math.max(1 - prog(t, 0, 0.12), E.inCubic(prog(t, 29.35, 30)));
  return fx;
}
