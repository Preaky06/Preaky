/* Personnages et petits éléments graphiques réutilisables.
 * Repère d'un perso : pieds en (0,0), axe x centré, y négatif vers le haut.
 * Tout renvoie des listes de parts (E.P / E.Tube / E.T / E.G) à passer à E.draw ou E.pop.
 */
(() => {
  const { P, Tube, T, G, C } = E;

  const ell = (cx, cy, rx, ry) => `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0 Z`;
  E.ell = ell;

  // ---------- visage ----------
  const BROWS = {
    normal: ['M-62,-438 Q-42,-448 -22,-440', 'M62,-438 Q42,-448 22,-440'],
    angry: ['M-64,-448 L-20,-430', 'M64,-448 L20,-430'],
    worried: ['M-62,-432 L-24,-448', 'M62,-432 L24,-448'],
    up: ['M-62,-452 Q-42,-464 -22,-454', 'M62,-452 Q42,-464 22,-454'],
    determined: ['M-64,-446 L-22,-436', 'M64,-446 L22,-436'],
  };

  function mouth(kind) {
    switch (kind) {
      case 'grin':
        return [
          P('M-36,-340 Q0,-334 36,-340 Q32,-296 0,-294 Q-32,-296 -36,-340 Z', { fill: '#7a2230', w: 6 }),
          P('M-30,-338 Q0,-333 30,-338 L28,-326 Q0,-321 -28,-326 Z', { fill: C.white, stroke: false, back: false }),
          P('M-16,-302 Q0,-316 16,-302 Q8,-295 0,-295 Q-8,-295 -16,-302 Z', { fill: '#ff7b8a', stroke: false, back: false }),
        ];
      case 'o':
        return [P(ell(0, -322, 13, 17), { fill: '#7a2230', w: 6 })];
      case 'scream':
        return [P(ell(0, -318, 22, 26), { fill: '#7a2230', w: 6 }), P('M-12,-300 Q0,-310 12,-300 Q0,-294 -12,-300 Z', { fill: '#ff7b8a', stroke: false, back: false })];
      case 'flat':
        return [P('M-22,-326 L22,-326', { w: 6 })];
      case 'wavy':
        return [P('M-32,-326 Q-21,-337 -11,-326 Q0,-315 11,-326 Q21,-337 32,-326', { w: 6 })];
      case 'frown':
        return [P('M-28,-316 Q0,-342 28,-316', { w: 6 })];
      case 'smirk':
        return [P('M-28,-330 Q4,-318 32,-342', { w: 6 })];
      case 'tongue':
        return [P('M-30,-336 Q0,-310 30,-336', { w: 6 }), P('M4,-322 Q6,-298 20,-300 Q30,-304 24,-328 Z', { fill: '#ff7b8a', w: 5 })];
      default: // smile
        return [P('M-32,-338 Q0,-304 32,-338', { w: 6 })];
    }
  }

  function eyes(kind) {
    const L = -40, R = 40, Y = -394;
    if (kind === 'happy') return [P(`M${L - 20},${Y + 4} Q${L},${Y - 22} ${L + 20},${Y + 4}`, { w: 7 }), P(`M${R - 20},${Y + 4} Q${R},${Y - 22} ${R + 20},${Y + 4}`, { w: 7 })];
    if (kind === 'closed') return [P(`M${L - 20},${Y} Q${L},${Y + 14} ${L + 20},${Y}`, { w: 7 }), P(`M${R - 20},${Y} Q${R},${Y + 14} ${R + 20},${Y}`, { w: 7 })];
    const rx = kind === 'wide' ? 24 : 21, ry = kind === 'wide' ? 30 : 27;
    const pr = kind === 'wide' ? 7 : kind === 'tired' ? 9 : 10.5;
    const look = { left: [-8, 2], right: [8, 2], up: [0, -10], down: [0, 9], side: [9, 3] }[E._look] || [3, 4];
    const out = [];
    for (const cx of [L, R]) {
      out.push(P(ell(cx, Y, rx, ry), { fill: C.white, w: 6 }));
      out.push(P(ell(cx + look[0], Y + look[1], pr, pr), { fill: C.ink, stroke: false, back: false }));
      out.push(P(ell(cx + look[0] + 3.5, Y + look[1] - 4, 3.2, 3.2), { fill: C.white, stroke: false, back: false }));
      if (kind === 'tired') {
        out.push(P(`M${cx - rx},${Y - 2} Q${cx},${Y - ry - 4} ${cx + rx},${Y - 2} Z`, { fill: C.skin, w: 6 }));
        out.push(P(`M${cx - 18},${Y + ry + 8} Q${cx},${Y + ry + 16} ${cx + 18},${Y + ry + 8}`, { w: 4, stroke: '#8a6fb0' }));
      }
    }
    return out;
  }

  // ---------- coiffures ----------
  const HAIR = {
    messy: [
      'M-114,-390 C-126,-470 -72,-528 4,-522 C78,-522 128,-474 114,-390 C110,-418 102,-436 90,-446 L82,-428 L68,-454 L52,-434 L36,-460 L18,-436 L-2,-462 L-20,-436 L-40,-460 L-56,-434 L-72,-454 L-86,-430 C-98,-440 -108,-420 -114,-390 Z',
      'M-8,-520 C-14,-550 12,-570 38,-562 C24,-554 20,-540 24,-521 Z',
    ],
    long: [
      'M-130,-400 C-132,-492 -70,-534 0,-534 C70,-534 132,-492 130,-400 L134,-282 Q134,-252 104,-254 L-104,-254 Q-134,-252 -134,-282 Z',
      'M-112,-404 C-118,-482 -50,-516 10,-512 C74,-510 120,-474 112,-404 C100,-448 64,-470 14,-470 C-6,-440 -58,-418 -112,-404 Z',
    ],
    bun: [
      'M-112,-396 C-122,-470 -70,-514 4,-512 C76,-512 126,-470 112,-396 C100,-436 60,-458 0,-456 C-60,-456 -100,-436 -112,-396 Z',
      ell(0, -540, 40, 34),
    ],
    bald: [
      'M-108,-400 C-124,-410 -126,-360 -108,-350 L-104,-380 Z',
      'M108,-400 C124,-410 126,-360 108,-350 L104,-380 Z',
    ],
    spiky: [
      'M-112,-392 L-124,-456 L-92,-450 L-90,-510 L-50,-480 L-30,-540 L0,-490 L30,-544 L50,-482 L92,-512 L92,-452 L124,-458 L112,-392 C100,-430 60,-446 0,-446 C-60,-446 -100,-430 -112,-392 Z',
    ],
  };

  // ---------- poses des bras (épaules en ±sx) ----------
  function arms(pose, sx, sy) {
    // 4 points de contrôle (x relatifs à l'épaule) + position de la main
    const A = {
      idle: [[0, 0], [30, 30], [38, 82], [34, 134], [34, 146]],
      wave: [[0, 0], [48, -18], [84, -58], [92, -110], [94, -126]],
      hips: [[0, 0], [58, 22], [64, 66], [18, 92], [14, 94]],
      front: [[0, 0], [38, 52], [0, 82], [-62, 66], [-72, 64]],
      point: [[0, 0], [58, 0], [108, 4], [150, 0], [162, 0]],
      up: [[0, 0], [38, -38], [38, -98], [38, -148], [38, -160]],
      shrug: [[0, 0], [58, 32], [88, 12], [98, -34], [102, -46]],
      draw: [[0, 0], [48, 32], [88, 42], [124, 30], [136, 26]],
      face: [[0, 0], [40, -20], [10, -80], [-50, -98], [-60, -102]],
      down: [[0, 0], [20, 40], [22, 90], [18, 136], [18, 148]],
      chin: [[0, 0], [40, 40], [20, 70], [-40, 50], [-52, 46]],
    }[pose] || null;
    return (A || arms.base).map(([x, y]) => [sx + x, sy + y]);
  }
  arms.base = [[0, 0], [30, 30], [38, 82], [34, 134], [34, 146]];

  // Découpe une cubique (de Casteljau) : renvoie la partie [0, t].
  function splitCubic(p, t) {
    const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const p01 = L(p[0], p[1]), p12 = L(p[1], p[2]), p23 = L(p[2], p[3]);
    const a = L(p01, p12), b = L(p12, p23), c = L(a, b);
    return [p[0], p01, a, c];
  }
  const cubicD = (p) => `M${p[0]} C${p[1]} ${p[2]} ${p[3]}`;

  /* Personnage générique.
   * o: {hair, hairColor, skin, top:'hoodie'|'tee'|'dress'|'shirt', topColor, pants, kid,
   *     eyes, brows, mouth, armL, armR, glasses, mustache, blush, look, holdR, holdL} */
  E.person = (o = {}) => {
    const kid = !!o.kid;
    const hy = kid ? -64 : -84; // hanches
    const sy = kid ? -206 : -294; // épaules
    const dy = kid ? 92 : 0; // décalage de la tête
    const sx = kid ? 66 : 88, bw = kid ? 104 : 140;
    const skin = o.skin || C.skin;
    const top = o.top || 'hoodie';
    const topColor = o.topColor || C.coral;
    const pants = o.pants || C.navy;
    E._look = o.look;
    const parts = [];

    // jambes + chaussures
    const legTop = hy - 10;
    const legs = top === 'dress'
      ? [Tube(`M-34,${hy + 10} L-36,-30`, { fill: skin, w: 26, seq: 20 }), Tube(`M34,${hy + 10} L36,-30`, { fill: skin, w: 26, seq: 20 })]
      : [Tube(`M${-bw * 0.37},${legTop} L${-bw * 0.4},-30`, { fill: pants, w: kid ? 40 : 48, seq: 20 }), Tube(`M${bw * 0.37},${legTop} L${bw * 0.4},-30`, { fill: pants, w: kid ? 40 : 48, seq: 20 })];
    parts.push(...legs);
    const fx = top === 'dress' ? 40 : bw * 0.42;
    parts.push(P(ell(-fx - 10, -16, kid ? 30 : 38, 18), { fill: o.shoes || C.white, seq: 21 }));
    parts.push(P(ell(fx + 10, -16, kid ? 30 : 38, 18), { fill: o.shoes || C.white, seq: 21 }));

    // torse
    if (top === 'dress') {
      parts.push(P(`M${-sx + 10},${sy} C${-sx - 26},${sy + 10} ${-bw + 30},${sy + 40} ${-bw + 36},${sy + 90} L${-bw - 18},${hy + 24} C${-60},${hy + 40} ${60},${hy + 40} ${bw + 18},${hy + 24} L${bw - 36},${sy + 90} C${bw - 30},${sy + 40} ${sx + 26},${sy + 10} ${sx - 10},${sy} Z`, { fill: topColor, seq: 10 }));
      parts.push(P(`M${-bw + 40},${sy + 100} Q0,${sy + 116} ${bw - 40},${sy + 100}`, { w: 5, seq: 11 }));
    } else {
      parts.push(P(`M${-sx},${sy} C${-sx - 34},${sy + 6} ${-bw},${sy + 32} ${-bw},${sy + 72} L${-bw + 6},${hy - 18} C${-bw + 7},${hy - 6} ${-bw + 14},${hy} ${-bw + 26},${hy} L${bw - 26},${hy} C${bw - 14},${hy} ${bw - 7},${hy - 6} ${bw - 6},${hy - 18} L${bw},${sy + 72} C${bw},${sy + 32} ${sx + 34},${sy + 6} ${sx},${sy} Z`, { fill: topColor, seq: 10 }));
      if (top === 'hoodie') {
        parts.push(P(`M${-sx + 12},${sy - 2} C${-sx + 30},${sy + 34} ${sx - 30},${sy + 34} ${sx - 12},${sy - 2}`, { w: 6, seq: 11 }));
        parts.push(P(`M-20,${sy + 22} L-24,${sy + 70}`, { w: 5, seq: 11 }));
        parts.push(P(`M20,${sy + 22} L24,${sy + 70}`, { w: 5, seq: 11 }));
        parts.push(P(`M${-bw * 0.45},${hy - 80} L${bw * 0.45},${hy - 80} L${bw * 0.53},${hy - 26} L${-bw * 0.53},${hy - 26} Z`, { w: 5, seq: 11 }));
      } else if (top === 'tee') {
        parts.push(P(`M${-sx + 18},${sy} Q0,${sy + 30} ${sx - 18},${sy}`, { w: 6, seq: 11 }));
        if (o.stripe) parts.push(P(`M${-bw + 2},${sy + 90} L${bw - 2},${sy + 90}`, { w: 14, stroke: o.stripe, seq: 11 }));
      } else if (top === 'shirt') {
        parts.push(P(`M-34,${sy} L0,${sy + 40} L34,${sy}`, { w: 6, seq: 11 }));
        parts.push(P(`M0,${sy + 40} L-14,${sy + 60} L0,${sy + 150} L14,${sy + 60} Z`, { fill: o.tie || C.red, w: 5, seq: 11 }));
      }
    }

    // bras
    const ax = bw - 30, ay = sy + 34;
    const armW = kid ? 30 : 38;
    const sleeve = topColor;
    const mkArm = (side, pose, hold) => {
      const k = side === 'L' ? -1 : 1;
      const pts = arms(pose, ax, ay).map(([x, y]) => [x * k, y]);
      const [hx, hy2] = pts[4];
      const d = cubicD(pts);
      const list = [];
      if (top === 'tee' || top === 'dress') {
        list.push(Tube(d, { fill: skin, w: armW - 6, seq: 15 }));
        list.push(Tube(cubicD(splitCubic(pts, 0.32)), { fill: topColor, w: armW + 6, seq: 15.5 }));
      } else list.push(Tube(d, { fill: sleeve, w: armW, seq: 15 }));
      if (hold) list.push(...hold(hx, hy2));
      list.push(P(ell(hx, hy2, kid ? 18 : 22, kid ? 18 : 22), { fill: skin, w: 6, seq: 16 }));
      return G(list, { name: 'arm' + side, pivot: [pts[0][0], pts[0][1]] });
    };
    parts.push(mkArm('L', o.armL || 'idle', o.holdL));
    parts.push(mkArm('R', o.armR || 'idle', o.holdR));

    // tête
    const hairColor = o.hairColor || C.hair;
    const hair = HAIR[o.hair || 'messy'];
    const headParts = [];
    if (o.hair === 'long') headParts.push(P(hair[0], { fill: hairColor, seq: 2 }));
    headParts.push(P('M-102,-408 C-132,-416 -134,-360 -100,-358 Z', { fill: skin, seq: 1 }));
    headParts.push(P('M102,-408 C132,-416 134,-360 100,-358 Z', { fill: skin, seq: 1 }));
    headParts.push(P('M-106,-398 C-108,-462 -60,-490 0,-490 C62,-490 110,-462 108,-398 C106,-330 66,-288 0,-286 C-66,-288 -104,-330 -106,-398 Z', { fill: o.face || skin, seq: 0, name: 'head' }));
    if (o.hair !== 'long') hair.forEach((d) => headParts.push(P(d, { fill: hairColor, seq: 2 })));
    else headParts.push(P(hair[1], { fill: hairColor, seq: 2 }));
    if (o.lashes) headParts.push(P('M-60,-414 L-72,-426 M-54,-420 L-62,-434', { w: 5, seq: 3.5 }), P('M60,-414 L72,-426 M54,-420 L62,-434', { w: 5, seq: 3.5 }));
    if (o.blush !== false) {
      headParts.push(P(ell(-66, -350, 16, 9), { fill: C.blush, stroke: false, back: false, op: 0.55, seq: 7 }));
      headParts.push(P(ell(66, -350, 16, 9), { fill: C.blush, stroke: false, back: false, op: 0.55, seq: 7 }));
    }
    // visage principal + variantes d'expression (activées avec E.expr)
    const face = (f, main) => {
      E._look = f.look;
      const list = [];
      list.push(G(eyes(f.eyes), { name: main ? 'eyes' : undefined, seq: 3 }));
      if (main) list.push(G(eyes('closed'), { name: 'eyesClosed', alt: true }));
      const b = BROWS[f.brows || 'normal'];
      list.push(P(b[0], { w: 7, seq: 4 }), P(b[1], { w: 7, seq: 4 }));
      if (o.glasses) list.push(P(ell(-40, -394, 32, 30), { w: 6, seq: 4.5 }), P(ell(40, -394, 32, 30), { w: 6, seq: 4.5 }), P('M-8,-396 Q0,-402 8,-396', { w: 6, seq: 4.5 }));
      if (o.lashes) list.push(P('M-60,-414 L-72,-426 M-54,-420 L-62,-434', { w: 5, seq: 3.5 }), P('M60,-414 L72,-426 M54,-420 L62,-434', { w: 5, seq: 3.5 }));
      list.push(P('M-4,-372 Q9,-362 0,-352', { w: 5, seq: 5 }));
      if (o.mustache) list.push(P('M-44,-340 C-30,-362 -6,-356 0,-346 C6,-356 30,-362 44,-340 C30,-344 14,-338 0,-338 C-14,-338 -30,-344 -44,-340 Z', { fill: hairColor, seq: 5.5 }));
      if (f.red) list.push(P(ell(0, -360, 90, 40), { fill: C.red, stroke: false, back: false, op: 0.35, seq: 6.5 }));
      list.push(G(mouth(f.mouth), { name: main ? 'mouth' : undefined, seq: 6 }));
      if (main) list.push(G(mouth(f.talk || 'grin'), { name: 'mouthOpen', alt: true }));
      E._look = undefined;
      return list;
    };
    headParts.push(G(face({ eyes: o.eyes, brows: o.brows, mouth: o.mouth, look: o.look, red: o.red, talk: o.talkMouth }, true), { name: 'face' }));
    for (const [name, f] of Object.entries(o.faces || {})) headParts.push(G(face(f, false), { name: 'face_' + name, alt: true }));
    parts.push(G(headParts, { tf: dy ? `translate(0,${dy})` : null, name: 'headG' }));
    E._look = undefined;
    return parts;
  };

  // Maël (le perso principal).
  E.mael = (o = {}) => E.person({ hair: 'messy', top: 'hoodie', topColor: C.coral, pants: C.navy, ...o });
  E.maelKid = (o = {}) => E.person({ hair: 'messy', top: 'tee', topColor: C.yellow, pants: C.blue, kid: true, ...o });

  // ---------- petits éléments ----------
  E.sparkle = (x, y, r = 30, color = C.yellow) => P(`M${x},${y - r} Q${x + r * 0.18},${y - r * 0.18} ${x + r},${y} Q${x + r * 0.18},${y + r * 0.18} ${x},${y + r} Q${x - r * 0.18},${y + r * 0.18} ${x - r},${y} Q${x - r * 0.18},${y - r * 0.18} ${x},${y - r} Z`, { fill: color, w: 5 });
  E.sweat = (x, y, s = 1) => P(`M${x},${y} C${x - 14 * s},${y + 20 * s} ${x - 14 * s},${y + 34 * s} ${x},${y + 36 * s} C${x + 14 * s},${y + 34 * s} ${x + 14 * s},${y + 20 * s} ${x},${y} Z`, { fill: C.glow, w: 5 });
  E.puff = (x, y, r = 30) => P(`M${x - r},${y} C${x - r},${y - r * 0.9} ${x - r * 0.2},${y - r * 1.1} ${x},${y - r * 0.6} C${x + r * 0.3},${y - r * 1.2} ${x + r * 1.1},${y - r * 0.8} ${x + r},${y} C${x + r * 1.1},${y + r * 0.7} ${x + r * 0.2},${y + r * 0.9} ${x},${y + r * 0.5} C${x - r * 0.4},${y + r * 0.9} ${x - r * 1.1},${y + r * 0.6} ${x - r},${y} Z`, { fill: C.white, w: 5 });
  E.bang = (x, y, s = 1, color = C.red) => [P(`M${x - 9 * s},${y - 60 * s} L${x + 9 * s},${y - 60 * s} L${x + 5 * s},${y - 8 * s} L${x - 5 * s},${y - 8 * s} Z`, { fill: color, w: 5 }), P(ell(x, y + 10 * s, 8 * s, 8 * s), { fill: color, w: 5 })];
  E.lines = (x, y, n = 3, len = 40, ang = 0, gap = 22) => {
    const out = [];
    const a = (ang * Math.PI) / 180;
    for (let i = 0; i < n; i++) {
      const ox = x + Math.cos(a + Math.PI / 2) * (i - (n - 1) / 2) * gap, oy = y + Math.sin(a + Math.PI / 2) * (i - (n - 1) / 2) * gap;
      out.push(P(`M${ox},${oy} L${ox + Math.cos(a) * len},${oy + Math.sin(a) * len}`, { w: 6 }));
    }
    return out;
  };
  E.heart = (x, y, s = 1, color = C.red) => P(`M${x},${y + 30 * s} C${x - 50 * s},${y - 6 * s} ${x - 30 * s},${y - 44 * s} ${x},${y - 18 * s} C${x + 30 * s},${y - 44 * s} ${x + 50 * s},${y - 6 * s} ${x},${y + 30 * s} Z`, { fill: color, w: 5 });
  E.arrow = (x1, y1, x2, y2, bend = 40) => {
    const mx = (x1 + x2) / 2 - (y2 - y1) * bend / 200, my = (y1 + y2) / 2 + (x2 - x1) * bend / 200;
    const ang = Math.atan2(y2 - my, x2 - mx);
    const h = 26;
    return [
      P(`M${x1},${y1} Q${mx},${my} ${x2},${y2}`, { w: 7 }),
      P(`M${x2 - h * Math.cos(ang - 0.5)},${y2 - h * Math.sin(ang - 0.5)} L${x2},${y2} L${x2 - h * Math.cos(ang + 0.5)},${y2 - h * Math.sin(ang + 0.5)}`, { w: 7 }),
    ];
  };
  // Bulle de BD (texte centré en (x,y)), queue vers (tx,ty).
  E.bubble = (x, y, w, h, tx, ty, txt, o = {}) => {
    const r = Math.min(w, h) / 2;
    const d = `M${x - w / 2 + r},${y - h / 2} L${x + w / 2 - r},${y - h / 2} Q${x + w / 2},${y - h / 2} ${x + w / 2},${y - h / 2 + r} L${x + w / 2},${y + h / 2 - r} Q${x + w / 2},${y + h / 2} ${x + w / 2 - r},${y + h / 2} L${(x + tx) / 2 + 20},${y + h / 2} L${tx},${ty} L${(x + tx) / 2 - 14},${y + h / 2} L${x - w / 2 + r},${y + h / 2} Q${x - w / 2},${y + h / 2} ${x - w / 2},${y + h / 2 - r} L${x - w / 2},${y - h / 2 + r} Q${x - w / 2},${y - h / 2} ${x - w / 2 + r},${y - h / 2} Z`;
    return [P(d, { fill: o.fill || C.white, w: 7 }), T(txt, x, y + 4, { size: o.size || 54, font: o.font || 'marker', fill: o.color || C.ink })];
  };
})();
