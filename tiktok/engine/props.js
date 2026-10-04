/* Accessoires et décors. Chaque fonction renvoie des parts centrées sur (0,0)
 * (sauf mention contraire) ; on les place avec E.draw(scene, parts, {x, y, s, r}). */
(() => {
  const { P, T, G, Tube, C, ell } = E;
  const rect = (x, y, w, h, r = 0) => r
    ? `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`
    : `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
  E.rect = rect;
  const at = (x, y, parts, o = {}) => G(parts, { tf: `translate(${x},${y})${o.r ? ` rotate(${o.r})` : ''}${o.s ? ` scale(${o.s})` : ''}`, ...o });
  E.at = at;

  E.props = {
    // Feutre géant (vertical, pointe en haut).
    marker: (color = C.blue) => [
      P('M-22,-60 L22,-60 L22,100 Q22,114 8,114 L-8,114 Q-22,114 -22,100 Z', { fill: color }),
      P(rect(-22, -6, 44, 46), { fill: C.white, w: 6 }),
      P('M-22,-60 L-12,-96 L12,-96 L22,-60 Z', { fill: C.grey, w: 6 }),
      P('M-12,-96 L-5,-122 L5,-122 L12,-96 Z', { fill: color, w: 6 }),
    ],

    // Cahier ouvert avec gribouillis.
    notebook: (doodles = true) => [
      P('M-140,-92 Q-70,-104 0,-84 L0,92 Q-70,72 -140,84 Z', { fill: C.white }),
      P('M0,-84 Q70,-104 140,-92 L140,84 Q70,72 0,92 Z', { fill: C.white }),
      P('M-120,-50 L-24,-46 M-120,-14 L-24,-10 M-120,22 L-24,26', { w: 3, stroke: '#9fc4ff' }),
      ...(doodles ? [
        P('M30,-40 l14,30 l32,4 l-24,22 l6,32 l-28,-16 l-28,16 l6,-32 l-24,-22 l32,-4 Z', { stroke: C.coral, w: 6 }),
        P('M-110,40 C-90,10 -70,70 -50,40 C-30,10 -20,60 -10,40', { stroke: C.blue, w: 6 }),
        P(ell(100, 50, 22, 22), { stroke: C.green, w: 6 }),
        P('M92,46 L94,46 M106,46 L108,46 M90,58 Q100,66 110,58', { stroke: C.green, w: 5 }),
      ] : []),
    ],

    // Table vue de face.
    table: (w = 340) => [
      P(rect(-w / 2 + 20, 10, 26, 190), { fill: C.wood, w: 6 }),
      P(rect(w / 2 - 46, 10, 26, 190), { fill: C.wood, w: 6 }),
      P(rect(-w / 2, -20, w, 34, 8), { fill: C.wood }),
      P('M-110,-6 C-90,-14 -80,4 -60,-4 C-40,-12 -30,6 -10,-2', { stroke: C.purple, w: 5 }),
      P('M40,-4 l10,-8 l10,8 l10,-8 l10,8 l10,-8', { stroke: C.red, w: 5 }),
    ],

    // Dessins d'enfant sur le mur (traits de couleur uniquement).
    wall: () => [
      // soleil
      P(ell(-380, -420, 52, 52), { stroke: C.yellow, w: 11, fill: null }),
      P('M-380,-500 L-380,-530 M-380,-340 L-380,-312 M-460,-420 L-490,-420 M-300,-420 L-272,-420 M-438,-478 L-458,-498 M-322,-362 L-302,-342 M-322,-478 L-302,-498 M-438,-362 L-458,-342', { stroke: C.yellow, w: 10 }),
      // maison
      P('M-210,-300 L-210,-420 L-110,-420 L-110,-300 Z', { stroke: C.red, w: 10 }),
      P('M-230,-412 L-160,-480 L-90,-412', { stroke: C.red, w: 10 }),
      P('M-172,-300 L-172,-350 L-146,-350 L-146,-300', { stroke: C.blue, w: 9 }),
      // dino
      P('M10,-330 C10,-400 90,-420 120,-380 C140,-440 190,-450 200,-410 C206,-390 180,-380 160,-386 C170,-350 170,-320 150,-300 L150,-270 M100,-300 L100,-270 M40,-310 C20,-300 0,-320 10,-330 M60,-382 L66,-404 L80,-388 L90,-414 L102,-392', { stroke: C.green, w: 10 }),
      P(ell(178, -420, 5, 5), { stroke: C.green, w: 8 }),
      // famille bâton
      P('M300,-400 m-24,0 a24,24 0 1,0 48,0 a24,24 0 1,0 -48,0 M300,-376 L300,-310 M270,-360 L330,-360 M300,-310 L278,-270 M300,-310 L322,-270', { stroke: C.purple, w: 8 }),
      P('M410,-380 m-18,0 a18,18 0 1,0 36,0 a18,18 0 1,0 -36,0 M410,-362 L410,-310 M388,-346 L432,-346 M410,-310 L394,-278 M410,-310 L426,-278', { stroke: C.pink, w: 8 }),
      // gribouillis
      P('M-470,-230 C-430,-260 -400,-200 -360,-230 C-320,-260 -300,-200 -260,-230 C-220,-260 -200,-200 -160,-230', { stroke: C.blue, w: 9 }),
      P('M230,-230 l30,-30 l30,30 l30,-30 l30,30 l30,-30 l30,30', { stroke: C.coral, w: 9 }),
    ],

    // Tableau noir.
    blackboard: (w = 460, h = 260, text = '2 + 2 = ?') => [
      P(rect(-w / 2 - 18, -h / 2 - 18, w + 36, h + 36, 10), { fill: C.wood }),
      P(rect(-w / 2, -h / 2, w, h, 4), { fill: '#2f5a46', w: 6 }),
      T(text, 0, -10, { size: 84, font: 'hand', fill: '#f4f4f4' }),
      P(`M${-w / 2 + 30},${h / 2 - 40} C${-w / 4},${h / 2 - 60} 0,${h / 2 - 20} ${w / 4},${h / 2 - 44}`, { stroke: '#f4f4f4', w: 4 }),
    ],

    // Pupitre d'écolier (le perso se place derrière).
    desk: () => [
      P(rect(-150, -14, 300, 30, 6), { fill: C.wood }),
      P(rect(-130, 16, 260, 120), { fill: '#c98d52', w: 6 }),
      P('M-110,136 L-110,190 M110,136 L110,190', { w: 9 }),
    ],

    // Lune dessinée (croissant avec un visage) + étoiles.
    moon: () => [
      P('M30,-110 C-60,-110 -110,-40 -110,20 C-110,90 -40,130 30,120 C-30,90 -50,40 -46,0 C-40,-50 -10,-90 30,-110 Z', { fill: C.yellow, w: 7 }),
      P('M-72,-6 Q-62,-16 -52,-6', { w: 5 }),
      P('M-80,40 Q-62,58 -44,44', { w: 5 }),
      P(ell(-84, 22, 9, 6), { fill: C.blush, stroke: false, back: false, op: 0.7 }),
      E.sparkle(80, -70, 22, C.yellow),
      E.sparkle(110, 30, 14, C.yellow),
      E.sparkle(60, 90, 18, C.yellow),
    ],

    // Logo badge.
    logo: () => [
      P(ell(0, 0, 112, 112), { fill: C.coral, w: 8 }),
      P(ell(0, 0, 88, 88), { stroke: C.white, w: 6 }),
      T('P', 4, 8, { size: 130, font: 'titan', fill: C.white, stroke: C.ink, sw: 10 }),
      E.sparkle(82, -88, 22, C.yellow),
    ],

    // Affiche de foot (clin d'œil aux posters du portfolio).
    poster: () => [
      P(rect(-115, -160, 230, 320, 6), { fill: C.navy, w: 8 }),
      P(ell(0, -10, 74, 74), { fill: '#3e5a86', stroke: false, back: false }),
      T('10', 0, -20, { size: 150, font: 'titan', fill: C.yellow, stroke: C.ink, sw: 8 }),
      P(ell(-56, 92, 22, 22), { fill: C.white, w: 6 }),
      P('M-66,82 L-46,102 M-46,82 L-66,102', { w: 4 }),
      T('LEGEND', 24, 122, { size: 34, font: 'titan', fill: C.white }),
    ],

    // Palette de couleurs.
    palette: () => [
      P('M-150,10 C-160,-80 -60,-120 20,-110 C110,-100 170,-40 150,30 C140,70 90,60 70,90 C50,120 -10,120 -60,100 C-120,80 -146,50 -150,10 Z', { fill: '#f3e1c4' }),
      P(ell(-90, -20, 24, 24), { fill: C.coral, w: 5 }),
      P(ell(-26, -60, 24, 24), { fill: C.yellow, w: 5 }),
      P(ell(50, -50, 24, 24), { fill: C.blue, w: 5 }),
      P(ell(100, 10, 22, 22), { fill: C.green, w: 5 }),
      P(ell(-40, 50, 20, 20), { fill: C.paper, w: 5 }),
    ],

    // Spécimen typo "Aa".
    type: () => [
      P(rect(-120, -110, 240, 220, 18), { fill: C.white, w: 7 }),
      T('Aa', 0, -10, { size: 120, font: 'titan', fill: C.ink }),
      P('M-80,70 L80,70', { w: 6, stroke: C.grey }),
    ],

    // Carte "Community manager" + barre de chargement (remplissage animé séparément).
    cmCard: () => [
      P(rect(-380, -150, 760, 300, 28), { fill: C.white, w: 9 }),
      T('COMMUNITY', 0, -78, { size: 84, font: 'titan', fill: C.coral, stroke: C.ink, sw: 10 }),
      T('MANAGER', 0, 4, { size: 84, font: 'titan', fill: C.coral, stroke: C.ink, sw: 10 }),
      P(rect(-300, 60, 600, 46, 23), { fill: '#efe9df', w: 7, name: 'bar' }),
      T('EN FORMATION…', 0, 128, { size: 32, font: 'fredoka', fill: C.ink }),
    ],

    // Grand téléphone (écran avec un fil d'actu).
    phone: (w = 400, h = 740) => [
      P(rect(-w / 2, -h / 2, w, h, 56), { fill: '#2a2a33', w: 9 }),
      P(rect(-w / 2 + 22, -h / 2 + 50, w - 44, h - 100, 22), { fill: '#eef6ff', w: 5 }),
      P(rect(-44, -h / 2 + 18, 88, 16, 8), { fill: C.ink, stroke: false, back: false }),
      P(rect(-w / 2 + 50, -h / 2 + 90, w - 100, 150, 14), { fill: C.pink, w: 5 }),
      E.heart(-w / 2 + 80, -h / 2 + 270, 0.55, C.red),
      P(`M${-w / 2 + 120},${-h / 2 + 274} L${w / 2 - 60},${-h / 2 + 274}`, { w: 6, stroke: C.grey }),
      P(rect(-w / 2 + 50, -h / 2 + 320, w - 100, 150, 14), { fill: C.yellow, w: 5 }),
      E.heart(-w / 2 + 80, -h / 2 + 500, 0.55, C.red),
      P(`M${-w / 2 + 120},${-h / 2 + 504} L${w / 2 - 90},${-h / 2 + 504}`, { w: 6, stroke: C.grey }),
      P(rect(-w / 2 + 50, -h / 2 + 550, w - 100, 120, 14), { fill: C.green, w: 5 }),
    ],

    // Bande de scotch (centrée, horizontale) — à tourner via {r}.
    tape: (len = 300, wd = 56) => [
      P(`M${-len / 2},${-wd / 2} L${len / 2},${-wd / 2} l-8,9 l8,9 l-8,9 l8,9 l-8,${wd - 36} L${-len / 2},${wd / 2} l8,-9 l-8,-9 l8,-9 l-8,-9 Z`, { fill: '#efe2b8', w: 5, op: 0.95 }),
      P(`M${-len / 2 + 30},${-wd / 2 + 12} L${len / 2 - 40},${-wd / 2 + 12}`, { stroke: C.white, w: 5 }),
    ],

    // Réveil numérique.
    clock: (txt = '03:47') => [
      P(rect(-130, -64, 260, 128, 26), { fill: '#2a2a33', w: 8 }),
      T(txt, 0, 4, { size: 76, font: 'fredoka', fill: C.red }),
      P('M-90,64 L-110,92 M90,64 L110,92', { w: 8 }),
    ],

    // Cadre de BD avec titre.
    panel: (w, h, title, color = C.yellow) => [
      P(rect(-w / 2, -h / 2, w, h, 10), { fill: C.white, w: 8 }),
      P(rect(-w / 2 + 30, -h / 2 - 34, w - 60, 66, 14), { fill: color, w: 7 }),
      T(title, 0, -h / 2, { size: 44, font: 'titan', fill: C.ink }),
    ],

    // Nuage de pluie.
    rainCloud: () => [
      P('M-110,20 C-150,20 -150,-40 -104,-40 C-100,-90 -30,-100 -10,-60 C10,-100 90,-96 96,-44 C140,-44 150,20 104,20 Z', { fill: '#9aa3b5', w: 7 }),
      P('M-80,46 L-92,80 M-30,46 L-42,80 M20,46 L8,80 M70,46 L58,80', { stroke: C.blue, w: 7 }),
    ],

    // OVNI qui aspire quelqu'un.
    ufo: () => [
      P('M-60,0 L60,0 L130,210 L-130,210 Z', { fill: C.yellow, stroke: false, back: false, op: 0.45 }),
      P('M-60,-40 C-60,-100 60,-100 60,-40 Z', { fill: C.glow, w: 7 }),
      P('M-150,-10 C-150,-60 150,-60 150,-10 C150,30 -150,30 -150,-10 Z', { fill: C.grey, w: 7 }),
      P(ell(-90, -6, 10, 10), { fill: C.yellow, w: 5 }),
      P(ell(0, 6, 10, 10), { fill: C.yellow, w: 5 }),
      P(ell(90, -6, 10, 10), { fill: C.yellow, w: 5 }),
    ],

    // Avion en papier (pointe vers la droite).
    plane: () => [
      P('M-70,-10 L80,-40 L-40,40 Z', { fill: C.white, w: 6 }),
      P('M-40,40 L-20,4 L80,-40', { w: 6 }),
      P('M-70,-10 L-20,4', { w: 5 }),
    ],

    // Bouton S'abonner.
    subscribe: () => [
      P(rect(-300, -80, 600, 160, 80), { fill: C.red, w: 9 }),
      T("S'ABONNER", 0, 6, { size: 86, font: 'titan', fill: C.white, stroke: C.ink, sw: 8 }),
    ],

    // Curseur "main" (doigt pointé vers le haut-gauche, bout du doigt en 0,0).
    cursor: () => [
      P('M0,0 C-8,-6 -22,0 -18,14 L4,96 C-10,86 -36,80 -44,96 C-50,108 -30,124 -10,140 C14,160 40,176 80,176 C130,176 150,140 146,100 L136,52 C132,36 112,36 108,52 C104,34 84,34 80,50 C76,34 56,34 52,52 L34,-2 C28,-18 6,-14 0,0 Z', { fill: C.white, w: 7 }),
      P('M58,58 L64,96 M86,56 L90,96 M112,58 L114,96', { w: 4 }),
    ],

    // Patate avec un visage.
    potato: () => [
      P('M-190,-20 C-200,-120 -80,-160 10,-150 C120,-150 210,-90 196,10 C186,110 90,150 -10,146 C-120,142 -184,80 -190,-20 Z', { fill: C.potato, w: 9 }),
      P(ell(-120, 60, 9, 7), { fill: '#a8783a', stroke: false, back: false }),
      P(ell(130, -70, 8, 6), { fill: '#a8783a', stroke: false, back: false }),
      P(ell(90, 90, 10, 7), { fill: '#a8783a', stroke: false, back: false }),
      P(ell(-50, -40, 24, 30), { fill: C.white, w: 6 }),
      P(ell(40, -40, 24, 30), { fill: C.white, w: 6 }),
      P(ell(-44, -30, 10, 10), { fill: C.ink, stroke: false, back: false }),
      P(ell(46, -30, 10, 10), { fill: C.ink, stroke: false, back: false }),
      P('M-80,-90 L-24,-74 M80,-90 L24,-74', { w: 7 }),
      P('M-40,50 Q0,30 40,50', { w: 7 }),
      P('M-6,0 Q8,10 -2,18', { w: 5 }),
    ],

    // Tampon "Épisode 1".
    stamp: (l1, l2, color = C.red) => [
      P(rect(-270, -78, 540, 156, 14), { stroke: color, w: 10, fill: null }),
      P(rect(-252, -62, 504, 124, 8), { stroke: color, w: 4, fill: null }),
      T(l1, 0, -18, { size: 50, font: 'titan', fill: color }),
      T(l2, 0, 36, { size: 40, font: 'titan', fill: color }),
    ],
  };
})();
