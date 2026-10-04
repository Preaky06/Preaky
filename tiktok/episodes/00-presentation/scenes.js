/* Épisode 0 — Présentation de la chaîne (≈ 1 min).
 *
 * Le tableau blanc est une grille 3×3 parcourue en spirale :
 *
 *   [1 Accroche] [2 Enfance ] [3 École    ]
 *   [8 Patate  ] [  FIN     ] [4 Graphisme]
 *   [7 DM      ] [6 Chaîne  ] [5 Scotch   ]
 *
 * À la fin, la caméra dézoome pour révéler tout le tableau autour du logo.
 * Tous les instants sont calés sur la voix : E.L('id') = réplique, E.Wd('id', 'mot') = mot.
 */
window.EPISODE = (E) => {
  const { C, P, T, G, props: K } = E;
  const L = E.L, W = E.Wd;
  const CW = 1150, RH = 1800;
  const cell = (c, r) => E.scene(`c${c}${r}`, c * CW, r * RH);
  const pan = (t, c, r, z = 1, dur = 0.55, dy = -40) => E.camTo(t, c * CW, r * RH + dy, z, dur);
  const handle = (E.timing.meta && E.timing.meta.handle) || '@preaky';

  // =====================================================================
  // 1. ACCROCHE — "Ma vie est tellement absurde… que j'ai décidé de la dessiner."
  // =====================================================================
  const s1 = cell(0, 0);
  E.camSet(0, 20, 1.4);
  E.camTo(0.6, 0, -40, 1, 2.6, 'inOut', false);
  const mael = E.draw(s1, E.mael({
    armR: 'wave', mouth: 'smile',
    faces: { proud: { eyes: 'happy', brows: 'up', mouth: 'grin' } },
  }), { at: -0.45, dur: 2.9, x: 0, y: 470, s: 1.15 });
  E.blink(mael, 2.5, 8.6, 0);
  E.draw(s1, [T('MA VIE EN DESSIN', 0, -480, { size: 88, font: 'marker' }), P('M-300,-418 C-150,-404 120,-430 300,-414', { w: 9, stroke: C.coral })],
    { at: W('hook1', 'dessiner') - 0.55, dur: 1.0 });
  E.sfx('ding', W('hook1', 'dessiner') + 0.4);

  // "Moi, c'est Maël. J'ai 20 ans."
  E.talk(mael, L('hook2').start, L('hook2').end);
  E.swing(mael.parts.armR, L('hook2').start, L('hook3').start, 12, 2.4);
  E.draw(s1, [T('MAËL', -350, -150, { size: 74, font: 'marker', rot: -8 }), ...E.arrow(-350, -100, -200, -10, 50)],
    { at: W('hook2', 'mael') - 0.1, dur: 0.6 });
  E.draw(s1, [T('20 ANS', -370, 200, { size: 70, font: 'marker', rot: 7, fill: C.coral }), ...E.arrow(-330, 160, -190, 110, -40)],
    { at: W('hook2', '20') - 0.1, dur: 0.6 });

  // "Et oui, je me suis dessiné plus beau qu'en vrai."
  const tBeau = W('hook3', 'beau');
  E.expr(mael, 'proud', tBeau - 0.1, L('hook3').end + 0.5);
  [[-200, -110, 34], [180, -250, 28], [-230, 60, 22], [230, 110, 30], [10, -250, 22]].forEach(([x, y, r], i) =>
    E.pop(s1, [E.sparkle(0, 0, r)], { at: tBeau + i * 0.06, x, y, silent: i > 0 }));
  E.sfx('shine', tBeau);
  const tVrai = W('hook3', "qu'en");
  E.draw(s1, [
    P(E.rect(-115, -150, 230, 250, 14), { fill: C.white, w: 6 }),
    T('EN VRAI :', 0, -124, { size: 38, font: 'hand' }),
  ], { at: tVrai - 0.3, dur: 0.3, x: 385, y: 330, r: 4 });
  E.draw(s1, E.person({ hair: 'spiky', hairColor: '#6b5040', top: 'hoodie', topColor: '#a9a9a0', eyes: 'tired', mouth: 'wavy', brows: 'worried', blush: false }),
    { at: tVrai + 0.02, dur: 0.6, x: 385, y: 424, s: 0.33, r: 4, color: 'each' });

  pan(L('hook3').end + 0.42, 1, 0);

  // =====================================================================
  // 2. ENFANCE — "Petit, j'avais un seul talent : dessiner partout."
  // =====================================================================
  const s2 = cell(1, 0);
  const kid = E.draw(s2, E.maelKid({
    armR: 'up', mouth: 'grin', eyes: 'normal', look: 'up',
    holdR: (x, y) => [G(K.marker(C.blue), { tf: `translate(${x},${y - 30}) rotate(12)` })],
    faces: { scared: { eyes: 'wide', brows: 'worried', mouth: 'wavy' } },
  }), { at: L('kid1').start + 0.05, dur: 1.9, x: -300, y: 470, s: 1.05 });
  E.blink(kid, L('kid1').start + 2, 18.5, 1);
  E.draw(s2, [T('MOI, PETIT', 0, 0, { size: 66, font: 'hand' })], { at: W('kid1', 'talent'), dur: 0.5, x: -300, y: -150, r: -6 });

  // "Sur mes cahiers. Sur la table. Sur le mur du salon."
  E.draw(s2, K.notebook(), { at: W('kid2', 'cahiers') - 0.15, dur: 0.75, x: 80, y: 212, s: 0.75, r: -5 });
  E.draw(s2, K.table(380), { at: W('kid2', 'table') - 0.1, dur: 0.75, x: 80, y: 300 });
  E.draw(s2, K.wall(), { at: W('kid2', 'mur') - 0.1, dur: 1.25, y: 30, s: 0.98 });

  // "Ma mère a… moyennement apprécié."
  const mom = E.draw(s2, E.person({
    hair: 'long', hairColor: '#3b2a20', top: 'dress', topColor: C.purple, shoes: C.red,
    armL: 'hips', armR: 'hips', brows: 'angry', mouth: 'frown', lashes: true, red: true,
  }), { at: W('kid3', 'mere') - 0.15, dur: 0.95, x: 345, y: 470, s: 0.95, flip: true });
  const tMoy = W('kid3', 'moyennement');
  E.pop(s2, [E.puff(0, 0, 34)], { at: tMoy + 0.1, x: 230, y: -60 });
  E.pop(s2, [E.puff(0, 0, 26)], { at: tMoy + 0.25, x: 470, y: -90, silent: true });
  E.pop(s2, E.bang(0, 0, 1.1), { at: tMoy + 0.35, x: 470, y: -230, r: 10, silent: true });
  const tApp = W('kid3', 'apprecie');
  E.expr(kid, 'scared', tMoy, 19);
  E.pop(s2, [E.sweat(0, 0, 1.2)], { at: tMoy + 0.2, x: -170, y: -10 });
  E.pop(s2, [E.sweat(0, 0, 0.9)], { at: tMoy + 0.35, x: -440, y: 30, silent: true });
  E.punch(tApp, 0.1, 0.5);
  E.shake(tApp, 0.45, 9);
  E.sfx('boom', tApp);

  pan(L('kid3').end + 0.32, 2, 0);

  // =====================================================================
  // 3. ÉCOLE — "À l'école, les profs disaient que j'étais tout le temps dans la lune."
  // =====================================================================
  const s3 = cell(2, 0);
  const t3 = L('school1').start;
  E.draw(s3, K.blackboard(520, 270, '2 + 2 = ?'), { at: t3 - 0.15, dur: 0.75, x: -190, y: -385 });
  const prof = E.draw(s3, E.person({
    hair: 'bald', hairColor: '#8b8b8b', top: 'shirt', topColor: '#cfe3ff', pants: '#5b5b66',
    glasses: true, mustache: true, armR: 'point', brows: 'angry', mouth: 'o',
  }), { at: t3 + 0.65, dur: 0.95, x: -330, y: 470, s: 0.95 });
  const pupil = E.draw(s3, E.maelKid({ armL: 'down', armR: 'down', eyes: 'normal', look: 'up', mouth: 'smile' }),
    { at: t3 + 1.65, dur: 0.75, x: 250, y: 440, s: 0.9 });
  E.draw(s3, [...K.desk(), G(K.notebook(false), { tf: 'translate(0,-40) scale(0.62)' })], { at: t3 + 2.4, dur: 0.45, x: 250, y: 330 });
  const tLune = W('school1', 'lune');
  E.pop(s3, E.bubble(0, 0, 360, 130, -150, 120, 'MAËL ?!', { size: 64 }), { at: tLune - 0.25, x: -110, y: -110 });
  E.pop(s3, [E.puff(0, 0, 20), E.puff(46, -40, 26), E.puff(110, -90, 34)], { at: W('school1', 'dans'), x: 300, y: 30, silent: true });

  // "Faux. J'étais en train de la dessiner." → zoom dans le cahier
  const tFaux = L('school2').start;
  E.camTo(tFaux + 0.05, 2 * CW + 250, 290 + 0, 2.5, 0.42, 'inOut');
  E.sfx('zoom', tFaux + 0.05);
  E.draw(s3, K.moon(), { at: W('school2', 'dessiner') - 0.55, dur: 1.15, x: 250 + 44, y: 292, s: 0.3, lw: 1.5 });
  E.blink(pupil, t3 + 3, 25, 2);
  E.blink(prof, t3 + 2, 25, 0);

  pan(L('school2').end + 0.3, 2, 1, 1, 0.65);

  // =====================================================================
  // 4. GRAPHISME — "Alors j'en ai fait mon truc : logos, affiches, identités visuelles…"
  // =====================================================================
  const s4 = cell(2, 1);
  const t4 = L('design1').start;
  const designer = E.draw(s4, E.mael({ armL: 'shrug', armR: 'shrug', eyes: 'normal', mouth: 'grin', brows: 'up',
    faces: { proud: { eyes: 'happy', brows: 'up', mouth: 'grin' } } }), { at: t4 + 0.05, dur: 1.3, x: 0, y: 470, s: 0.98 });
  E.blink(designer, t4 + 1.5, 32, 1);
  E.draw(s4, K.logo(), { at: W('design1', 'logos') - 0.1, dur: 0.55, x: -320, y: -380, s: 0.95 });
  E.draw(s4, K.poster(), { at: W('design1', 'affiches') - 0.1, dur: 0.6, x: 330, y: -360, s: 0.85, r: 6 });
  E.draw(s4, K.palette(), { at: W('design1', 'identites') - 0.1, dur: 0.5, x: -350, y: -70, s: 0.75 });
  E.draw(s4, K.type(), { at: W('design1', 'visuelles') - 0.05, dur: 0.45, x: 350, y: -40, s: 0.7, r: -5 });

  // "Et aujourd'hui, je suis en formation community manager."
  const tForm = W('design2', 'formation');
  const card = E.draw(s4, K.cmCard(), { at: tForm - 0.3, dur: 0.9, x: 0, y: -210, r: -3 });
  E.camTo(tForm - 0.35, 2 * CW, RH - 150, 1.12, 0.5, 'inOut', false);
  const bar = E.el('rect', { x: -294, y: 66, height: 34, rx: 17, width: 0, fill: C.coral }, card.g);
  const barT0 = card.end + 0.05, barT1 = L('design2').end + 0.1;
  E.anim((t) => E.set(bar, 'width', (588 * 0.68 * E.ease.out(E.clamp((t - barT0) / (barT1 - barT0)))).toFixed(1)));
  E.expr(designer, 'proud', W('design2', 'manager'), 33);
  E.pop(s4, [E.sparkle(0, 0, 30)], { at: W('design2', 'manager') + 0.1, x: 360, y: -330 });

  pan(L('design2').end + 0.15, 2, 2);

  // =====================================================================
  // 5. SCOTCH — "Mon job : garder les gens scotchés aux réseaux."
  // =====================================================================
  const s5 = cell(2, 2);
  const t5 = L('night1').start;
  E.draw(s5, K.phone(400, 740), { at: t5 + 0.05, dur: 1.0, x: 0, y: -120, s: 0.95 });
  const tGens = W('night1', 'gens');
  const people = [[-80, -250, C.green], [80, -60, C.pink], [-70, 110, C.blue]];
  people.forEach(([x, y, col], i) => E.draw(s5, E.person({ hair: ['bun', 'spiky', 'messy'][i], hairColor: ['#c47a3a', '#222', '#7a4b2a'][i], top: 'tee', topColor: col, eyes: 'wide', mouth: 'o' }),
    { at: tGens - 0.15 + i * 0.22, dur: 0.22, x, y, s: 0.26, color: 'instant' }));
  E.draw(s5, [T('LES GENS', 0, 0, { size: 56, font: 'marker', rot: -8 }), ...E.arrow(20, 40, 150, 140, 40)], { at: tGens + 0.1, dur: 0.5, x: -330, y: -430 });
  const tScot = W('night1', 'scotches');
  people.forEach(([x, y], i) => {
    E.pop(s5, K.tape(150, 40), { at: tScot + i * 0.12, x, y: y - 50, r: -24 + i * 18, silent: true });
    E.sfx('tape', tScot + i * 0.12);
  });
  E.pop(s5, [E.heart(0, 0, 1)], { at: W('night1', 'reseaux'), x: 300, y: -260, r: 10 });
  E.pop(s5, [E.heart(0, 0, 0.7, C.pink)], { at: W('night1', 'reseaux') + 0.12, x: 330, y: -120, r: -8, silent: true });

  // "Le problème… c'est que le premier scotché, c'est moi."
  E.pop(s5, K.clock('03:47'), { at: W('night2', 'probleme'), x: 360, y: 60, r: 6 });
  E.sfx('tick', W('night2', 'probleme') + 0.05);
  const tired = E.draw(s5, E.mael({ armL: 'front', armR: 'front', eyes: 'tired', mouth: 'flat', brows: 'worried',
    holdR: (x, y) => [P(E.rect(x - 44, y - 70, 70, 120, 14), { fill: '#2a2a33', w: 6 }), P(E.rect(x - 36, y - 60, 54, 96, 8), { fill: C.glow, stroke: false, back: false })] }),
    { at: W('night2', 'premier') - 0.55, dur: 0.85, x: -10, y: 480, s: 0.8 });
  const tMoi = W('night2', 'moi');
  [[-10, 300, -20], [-10, 360, 22]].forEach(([x, y, r], i) => {
    E.pop(s5, K.tape(440, 70), { at: tMoi - 0.45 + i * 0.16, x, y, r, silent: true });
    E.sfx('tape', tMoi - 0.45 + i * 0.16);
  });
  E.draw(s5, [T('MOI', 0, 0, { size: 70, font: 'marker', fill: C.red, rot: -6 }), ...E.arrow(40, 40, 170, 120, -40)], { at: tMoi - 0.05, dur: 0.45, x: -390, y: 120 });
  E.punch(tMoi, 0.1, 0.5);

  pan(L('night2').end + 0.3, 1, 2);

  // =====================================================================
  // 6. LA CHAÎNE — "Alors tant qu'à scroller, autant créer."
  // =====================================================================
  const s6 = cell(1, 2);
  const t6 = L('chan1').start;
  const creator = E.draw(s6, E.mael({
    armL: 'idle', armR: 'up', eyes: 'tired', mouth: 'flat',
    holdR: (x, y) => [G(K.marker(C.coral), { tf: `translate(${x},${y - 30}) rotate(10)` })],
    faces: { go: { eyes: 'normal', brows: 'determined', mouth: 'smirk', look: 'up' } },
  }), { at: t6 + 0.05, dur: 1.1, x: -290, y: 480, s: 0.85 });
  const tCreer = W('chan1', 'creer');
  E.expr(creator, 'go', tCreer - 0.1, 46);
  E.pop(s6, [E.sparkle(0, 0, 30), E.sparkle(60, 50, 18)], { at: tCreer, x: -120, y: 60 });
  E.pop(s6, E.lines(0, 0, 3, 36, -60, 20), { at: tCreer + 0.05, x: -230, y: 20, silent: true });
  E.blink(creator, tCreer + 0.5, 46, 2);

  // "Ici, je dessine mes galères, mes pires hontes…"
  const tGal = W('chan2', 'galeres');
  E.draw(s6, K.panel(450, 320, 'MES GALÈRES', C.blue), { at: tGal - 0.35, dur: 0.45, x: -255, y: -330 });
  E.draw(s6, E.mael({ eyes: 'normal', brows: 'worried', mouth: 'frown', armL: 'down', armR: 'down' }), { at: tGal + 0.1, dur: 0.45, x: -255, y: -190, s: 0.3 });
  E.draw(s6, K.rainCloud(), { at: tGal + 0.55, dur: 0.35, x: -255, y: -400, s: 0.75 });
  const tHon = W('chan2', 'hontes');
  E.draw(s6, K.panel(450, 320, 'MES HONTES', C.pink), { at: tHon - 0.35, dur: 0.45, x: 255, y: -330 });
  E.draw(s6, E.mael({ eyes: 'closed', brows: 'worried', mouth: 'wavy', armL: 'face', armR: 'face', red: true }), { at: tHon + 0.1, dur: 0.5, x: 255, y: -190, s: 0.3 });
  E.pop(s6, [E.sweat(0, 0, 0.8)], { at: tHon + 0.7, x: 330, y: -400, silent: true });

  // "et vos histoires les plus folles."
  const tHis = W('chan3', 'histoires');
  E.draw(s6, K.panel(520, 360, 'VOS HISTOIRES', C.yellow), { at: tHis - 0.35, dur: 0.45, x: 215, y: 175 });
  E.draw(s6, K.ufo(), { at: tHis + 0.1, dur: 0.5, x: 215, y: 110, s: 0.62 });
  const abducted = E.draw(s6, E.person({ hair: 'bun', hairColor: '#c47a3a', top: 'tee', topColor: C.green, eyes: 'wide', mouth: 'scream', armL: 'up', armR: 'up' }),
    { at: tHis + 0.6, dur: 0.3, x: 215, y: 300, s: 0.24, color: 'instant' });
  E.bob(abducted, tHis + 0.9, 60, 7, 1.3);
  E.sfx('ufo', tHis + 0.3);

  pan(L('chan3').end + 0.15, 0, 2);

  // =====================================================================
  // 7. DM — "T'as vécu un truc de dingue ? Envoie-le-moi en DM : je le dessine."
  // =====================================================================
  const s7 = cell(0, 2);
  const t7 = L('dm1').start;
  E.draw(s7, [
    ...K.phone(360, 640).slice(0, 3),
    T('MESSAGES', 0, -240, { size: 34, font: 'titan' }),
    P(E.rect(-140, -190, 260, 110, 30), { fill: C.pink, w: 5 }),
    T("J'AI UNE", -10, -158, { size: 30, font: 'titan', fill: C.white }),
    T('HISTOIRE !!', -10, -118, { size: 30, font: 'titan', fill: C.white }),
    P(E.rect(-130, -50, 140, 64, 30), { fill: '#dfe3ea', w: 5 }),
    P('M-96,-18 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M-60,-18 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M-24,-18 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', { w: 5 }),
  ], { at: t7 + 0.05, dur: 1.15, x: -260, y: -60, r: -7, s: 0.95 });
  const catcher = E.draw(s7, E.mael({ armR: 'up', armL: 'idle', eyes: 'normal', mouth: 'smile', look: 'left',
    faces: { yes: { eyes: 'happy', brows: 'up', mouth: 'grin' } } }), { at: t7 + 1.25, dur: 0.85, x: 280, y: 480, s: 0.85 });
  const tEnv = W('dm1', 'envoie');
  const plane = E.pop(s7, K.plane(), { at: tEnv, x: 0, y: 0, dur: 0.01, silent: true });
  E.sfx('swoosh', tEnv);
  // trajectoire : du téléphone vers la main levée de Maël
  const p0 = [-120, -330], p1 = [150, -580], p2 = [400, 105];
  E.move(plane.inner, tEnv, tEnv + 0.85, (q) => {
    const x = (1 - q) * (1 - q) * p0[0] + 2 * (1 - q) * q * p1[0] + q * q * p2[0];
    const y = (1 - q) * (1 - q) * p0[1] + 2 * (1 - q) * q * p1[1] + q * q * p2[1];
    return { x, y, r: -30 + q * 75, s: 0.95 - q * 0.35 };
  });
  E.pop(s7, [P(E.ell(0, 0, 30, 30), { fill: C.red, w: 6 }), T('1', 0, 3, { size: 40, font: 'titan', fill: C.white })], { at: W('dm1', 'dm'), x: -100, y: -380 });
  const tDes = W('dm1', 'dessine');
  E.expr(catcher, 'yes', tDes - 0.2, 60);
  E.pop(s7, [E.sparkle(0, 0, 28), E.sparkle(70, -40, 18)], { at: tDes, x: 430, y: -90 });
  E.blink(catcher, t7 + 2.2, 50, 1);

  pan(L('dm1').end + 0.02, 0, 1, 1, 0.42);

  // =====================================================================
  // 8. CTA — "Et abonne-toi. Sinon je te dessine en patate."
  // =====================================================================
  const s8 = cell(0, 1);
  const t8 = L('cta1').start;
  const btn = E.draw(s8, K.subscribe(), { at: L('dm1').end + 0.12, dur: 0.5, x: 0, y: -330, color: 'each' });
  const tClick = L('cta1').end + 0.12;
  const cur = E.pop(s8, K.cursor(), { at: tClick - 0.45, x: 120, y: -300, s: 0.9, silent: true });
  E.anim((t) => {
    const k = 1 - 0.13 * Math.sin(E.clamp((t - tClick + 0.12) / 0.32) * Math.PI);
    const q = E.ease.in(E.clamp((t - tClick - 0.35) / 0.4));
    E.set(cur.inner, 'transform', `translate(${(q * 520).toFixed(1)},${(q * 320).toFixed(1)}) scale(${k.toFixed(3)})`);
    E.set(cur.g, 'display', t > tClick + 0.8 ? 'none' : 'inline');
  });
  E.pop(s8, [P(E.rect(-300, -80, 600, 160, 80), { fill: '#b9b4ab', w: 9 }), T('ABONNÉ', 0, 6, { size: 86, font: 'titan', fill: C.white, stroke: C.ink, sw: 8 })],
    { at: tClick, x: 0, y: -330, dur: 0.25, silent: true });
  E.sfx('click', tClick);
  const tPat = W('cta2', 'patate');
  E.draw(s8, K.potato(), { at: W('cta2', 'dessine') - 0.35, dur: 1.0, x: 70, y: 190 });
  E.draw(s8, [T('TOI', 0, 0, { size: 84, font: 'marker', rot: -10, fill: C.red }), ...E.arrow(50, 30, 170, 130, -40)], { at: tPat - 0.05, dur: 0.45, x: -350, y: 70 });
  E.punch(tPat + 0.1, 0.12, 0.55);
  E.sfx('boing', tPat + 0.1);

  pan(L('cta2').end + 0.35, 1, 1, 1, 0.55);

  // =====================================================================
  // FIN — "Premier épisode… très vite."
  // =====================================================================
  const s9 = cell(1, 1);
  const t9 = L('end1').start;
  E.draw(s9, [T('PREAKY', 0, 0, { size: 200, font: 'titan', fill: C.coral, stroke: C.ink, sw: 16, ls: 4 })], { at: t9 - 0.3, dur: 0.9, y: -260 });
  E.draw(s9, [T('MA VIE EN DESSIN', 0, 0, { size: 66, font: 'marker' })], { at: t9 + 0.6, dur: 0.6, y: -90 });
  const waver = E.draw(s9, E.mael({ armR: 'wave', eyes: 'happy', mouth: 'grin', brows: 'up' }), { at: t9 + 0.1, dur: 0.8, x: -360, y: 490, s: 0.55 });
  E.swing(waver.parts.armR, t9 + 1, 60, 12, 2.2);
  E.pop(s9, K.stamp('ÉPISODE 1', 'TRÈS VITE !'), { at: W('end1', 'tres') - 0.05, x: 60, y: 120, r: -6, s: 1.05 });
  E.sfx('stamp', W('end1', 'tres') - 0.05);
  E.draw(s9, [T(handle, 0, 0, { size: 64, font: 'titan', fill: C.ink })], { at: L('end1').end - 0.25, dur: 0.5, x: 140, y: 370 });

  // dézoom final : tout le tableau
  const tOut = L('end1').end + 0.35;
  E.camTo(tOut, CW, RH - 30, 0.315, 1.4, 'inOut');
  E.sfx('reveal', tOut);
};
