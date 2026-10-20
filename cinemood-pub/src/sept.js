/* CinéMood — « 7 questions » (20,5 s) : la nouvelle interface et les nouvelles questions
   (site du 20 octobre, build f : 7 questions, choix plus larges, bouton « Je sais pas · Passer »).
   L'écran réel, de face et en grand ; chaque question passe avec son texte en entier et sa réponse ;
   deux zooms sur les nouveautés de l'interface. S'appuie sur launch.js (téléphone, projection) et
   mograph.js (textes, ressorts, doigt). */
'use strict';

const SDUR = 20.5;
const S7Q = [
  { kick: 'TON HUMEUR', q: 'Comment tu te sens ce soir\u00a0?', a: 'Rêveur' },
  { kick: 'RÊVEUR', q: 'Tu as envie de partir où\u00a0?', a: 'Dans l’espace' },
  { kick: 'TON SEUIL', q: 'Tu te sens prêt à être secoué comment\u00a0?', a: 'Un peu' },
  { kick: 'TON PUBLIC', q: 'Tu regardes avec qui\u00a0?', a: 'À deux' },
  { kick: 'TON TEMPS', q: 'Tu as combien de temps devant toi\u00a0?', a: 'Une soirée classique', ch: ['Pas trop long', 'Une soirée classique', 'Toute la soirée'] },
  { kick: 'TON ÉPOQUE', q: 'Plutôt récent ou plutôt ancien\u00a0?', a: 'Récent', ch: ['Récent', 'Années 80 à 2000', 'Ancien'] },
  { kick: 'DERNIÈRE QUESTION', q: 'Un film connu, ou une découverte\u00a0?', a: 'Une découverte', ch: ['Un film connu', 'Une découverte'] },
];
const S7TAP = [3.1, 4.25, 8.1, 9.3, 11.0, 12.7, 14.4]; // appui sur la réponse de chaque question
const S7IN = [1.7, 3.25, 4.4, 8.25, 9.45, 11.15, 12.85]; // l'écran de la question arrive (glisse depuis la droite)
const S7CAP = [[1.95, 3.3], [3.35, 4.45], [7.3, 8.35], [8.4, 9.5], [9.55, 11.2], [11.25, 12.9], [12.95, 14.6]];
const S7LOAD = 14.55, S7CARD = 14.9, S7END = 17.25, S7GO = 19.5;
const S7SCORE = [272, 546, 100, 66]; // « 90 % » sur la carte n°1 (px CSS)

const S7TEX = ['m_home', 'm_loading', 'm_card_1', 'm_card_1_bars0', 'm_card_2', 'm_card_3', 'm_card_4', 'm_card_5',
  'm_q1_s0', 'm_q1_s1', 'm_q1_s2', 'm_q2_s0', 'm_q2_s1', 'm_q3_s0', 'm_q3_s1', 'm_q4', 'm_q5', 'm_q6', 'm_q7'].concat([...Array(7).keys()].map((i) => `m_q${i + 1}_opt`));
async function loadSept() {
  INF = await (await fetch('tex/info.json')).json();
  await Promise.all(S7TEX.map(async (n) => {
    const bm = await createImageBitmap(await (await fetch(`tex/${n}.png`)).blob());
    const c = mkCanvas(bm.width, bm.height), g = c.getContext('2d');
    g.filter = 'brightness(1.22) contrast(1.06) saturate(1.08)'; g.drawImage(bm, 0, 0);
    TXR[n] = await createImageBitmap(c);
  }));
}

/* ---------- vue : téléphone de face ; deux zooms (rappel des réponses, bouton « Je sais pas ») ---------- */
const s7w = (x, y) => [x - SW / 2, y - SH / 2, 0];
function viewS7(t) {
  // [centre visé (px CSS de l'écran), zoom, ancre écran]
  const P = PORT
    ? { full: [206, 440, 1.3, 540, 1300], chips: [206, 110, 2.4, 540, 1060], skip: [206, 770, 2.0, 540, 1290], end: [206, 440, 1.0, 540, 1240] }
    : { full: [206, 440, 1.1, 1330, 540], chips: [206, 110, 2.3, 1380, 470], skip: [206, 770, 1.9, 1360, 560], end: [206, 440, 1.0, 1330, 540] };
  const keys = t >= S7END - 0.2 ? [[0, P.end], [SDUR, P.end]]
    : [[0, P.full], [4.55, P.full], [4.9, P.chips], [5.75, P.chips], [6.15, P.skip], [7.0, P.skip], [7.35, P.full], [SDUR, P.full]];
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, A] = keys[i], [t1, B] = keys[i + 1], u = EZ.inOut(prog(t, t0, t1));
  const v = A.map((a, j) => lerp(a, B[j], u));
  const pop = t >= S7END - 0.2 ? lerp(0.92, 1, EZ.out(prog(t, S7END - 0.15, S7END + 0.5))) : lerp(0.9, 1, EZ.out(prog(t, 0, 0.7)));
  return { yaw: 0, pitch: 0, roll: 0, zoom: v[2] * pop, T: s7w(v[0], v[1]), ax: v[3], ay: v[4] };
}
function s7r(rect) { // rectangle CSS de l'écran → rectangle à l'image
  const a = proj(s7w(rect[0], rect[1])), b = proj(s7w(rect[0] + rect[2], rect[1] + rect[3]));
  return [a.x, a.y, b.x - a.x, b.y - a.y];
}
/* projecteur : assombrit tout sauf la zone, l'entoure de rouge */
function s7spot(x, R, a) {
  if (a <= 0) return;
  const [X, Y, w, h] = R, r = Math.min(18, h / 3);
  x.save();
  x.beginPath(); x.rect(0, 0, W, H); x.roundRect(X - 10, Y - 10, w + 20, h + 20, r);
  x.fillStyle = `rgba(6,3,4,${0.62 * a})`; x.fill('evenodd');
  rrp(x, X - 10, Y - 10, w + 20, h + 20, r); x.lineWidth = 4; x.strokeStyle = redA(0.95 * a); x.stroke();
  x.restore();
}

/* ---------- l'écran : quelle page, défilée de combien, glissement entre deux pages ---------- */
function screenS7(t) {
  if (t >= S7END - 0.2) return { cur: 'home', prev: null, u: 1 };
  const seq = [[-1, 'home']].concat(S7IN.map((s, k) => [s, k]), [[S7LOAD, 'loading']]);
  let i = 0;
  while (i < seq.length - 1 && t >= seq[i + 1][0]) i++;
  return { cur: seq[i][1], prev: i > 0 ? seq[i - 1][1] : null, u: i > 0 ? EZ.inOut(prog(t, seq[i][0], seq[i][0] + 0.32)) : 1 };
}
function scrollS7(id, t) {
  if (id === 0) return INF.m_q1_ys[INF.m_q1_ys.length - 1] * EZ.inOut(prog(t, 2.5, 2.9)); // jusqu'à Rêveur, 9e humeur
  if (id === 2) return INF.m_q3_ys[1] * (EZ.inOut(prog(t, 5.8, 6.15)) - EZ.inOut(prog(t, 7.0, 7.3))); // jusqu'au bouton « Je sais pas »
  return 0;
}
function paintS7(g, id, dx, t) {
  const X = -SW / 2 + dx, Y = -SH / 2;
  if (id === 'home' || id === 'loading') { g.drawImage(TXR[`m_${id}`], X, Y, SW, SH); return; }
  const n = `m_q${id + 1}`, ys = INF[n + '_ys'], sy = scrollS7(id, t);
  if (ys) ys.forEach((y, j) => { const top = y - sy; if (top < SH && top > -SH) g.drawImage(TXR[`${n}_s${j}`], X, Y + top, SW, SH); });
  else g.drawImage(TXR[n], X, Y, SW, SH);
  // le ticket choisi s'allume juste avant l'appui
  const a = prog(t, S7TAP[id] - 0.14, S7TAP[id] - 0.02);
  if (a > 0) {
    const r = INF[n + '_opt'], ox = X + r.x, oy = Y + r.y - sy, ga = g.globalAlpha;
    g.globalAlpha = ga * a; g.drawImage(TXR[n + '_opt'], ox, oy, r.width, r.height);
    rrp(g, ox, oy, r.width, r.height, 8); g.lineWidth = 2.5; g.strokeStyle = redA(0.9); g.stroke();
    g.globalAlpha = ga;
  }
}
function tapRectS7(k) { // le ticket choisi, en px CSS de l'écran au moment de l'appui
  const r = INF[`m_q${k + 1}_opt`];
  return [r.x, r.y - scrollS7(k, S7TAP[k]), r.width, r.height];
}

function phoneS7(x, t, alpha) {
  if (alpha <= 0) return;
  const s = screenS7(t);
  drawPhone(x, [0, 0, 0], EX, EY, null, {
    alpha, glare: ((t * 0.12) % 1.6) - 0.3,
    over: (g) => {
      if (s.prev != null && s.u < 1) {
        paintS7(g, s.prev, -SW * 0.3 * s.u, t);
        g.fillStyle = `rgba(4,3,3,${0.55 * s.u})`; g.fillRect(-SW / 2, -SH / 2, SW, SH);
      }
      paintS7(g, s.cur, SW * (1 - s.u), t);
    },
  });
  // appuis : « Commencer », puis une réponse par question
  const taps = [[1.55, [INF.m_start.x, INF.m_start.y, INF.m_start.width, INF.m_start.height]]].concat(S7TAP.map((tp, k) => [tp, tapRectS7(k)]));
  if (t >= S7END - 0.2) taps.push([S7GO, [INF.m_start.x, INF.m_start.y, INF.m_start.width, INF.m_start.height]]);
  for (const [tp, rc] of taps) {
    if (t < tp - 0.32 || t > tp + 0.45) continue;
    const R = s7r(rc), px = R[0] + R[2] * 0.7, py = R[1] + R[3] * 0.5;
    finger(x, px, py, alpha * prog(t, tp - 0.32, tp - 0.18) * (1 - prog(t, tp + 0.12, tp + 0.3)), press(t, tp), false);
    ripple(x, px, py, t - tp, false);
  }
  if (t >= S7END - 0.2) return;
  // projecteurs : le rappel des réponses (question 3), puis le bouton « Je sais pas · Passer »
  const ch = INF.m_q3_head.chips;
  s7spot(x, s7r([ch.x - 8, ch.y - 8, ch.width + 16, ch.height + 16]), EZ.out(prog(t, 4.92, 5.15)) * (1 - prog(t, 5.65, 5.85)));
  const sk = INF.m_q3_skip, sy = scrollS7(2, t);
  s7spot(x, s7r([sk.x, sk.y - sy, sk.width, sk.height]), EZ.out(prog(t, 6.15, 6.35)) * (1 - prog(t, 6.95, 7.15)));
}

/* ---------- 14,9–17,25 s : la carte n°1, puis les quatre autres ---------- */
function cardS7(x, t) {
  const CW = INF.m_cardBox.w, CH = INF.m_cardBox.h;
  const base = PORT ? { k: 1.12, cx: 540, cy: 1300 } : { k: 0.92, cx: 1330, cy: 545 };
  const small = PORT ? { k: 0.6, cx: 540, cy: 1035 } : { k: 0.62, cx: 1500, cy: 540 };
  const show = EZ.out(prog(t, S7CARD, S7CARD + 0.45)), zOut = EZ.inOut(prog(t, 16.2, 16.6));
  const fade = 1 - prog(t, S7END - 0.25, S7END);
  if (show <= 0 || fade <= 0) return;
  const k = lerp(lerp(0.4, base.k, show), small.k, zOut);
  const cx = lerp(base.cx, small.cx, zOut), cy = lerp(base.cy, small.cy, zOut);
  const X0 = cx - (CW / 2) * k, Y0 = cy - (CH / 2) * k;
  x.save(); x.globalAlpha = clamp(show * 1.6) * fade;
  x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 60; x.shadowOffsetY = 26;
  rrp(x, X0, Y0, CW * k, CH * k, 16 * k); x.fillStyle = '#0b0809'; x.fill();
  x.shadowColor = 'transparent';
  x.save(); rrp(x, X0, Y0, CW * k, CH * k, 16 * k); x.clip();
  x.drawImage(TXR.m_card_1_bars0, X0, Y0, CW * k, CH * k);
  const bars = EZ.out(prog(t, 15.3, 16.0)); // les jauges se remplissent
  x.beginPath(); for (const b of INF.m_cardBox.bars) x.rect(X0 + b.x * k, Y0 + (b.y - 4) * k, b.w * (b.v / 100) * bars * k, (b.h + 8) * k);
  x.clip(); x.drawImage(TXR.m_card_1, X0, Y0, CW * k, CH * k);
  x.restore();
  rrp(x, X0, Y0, CW * k, CH * k, 16 * k); x.lineWidth = 2; x.strokeStyle = redA(0.55); x.stroke();
  x.restore();
  const R = [X0 + S7SCORE[0] * k, Y0 + S7SCORE[1] * k, S7SCORE[2] * k, S7SCORE[3] * k];
  s7spot(x, R, EZ.out(prog(t, 15.55, 15.8)) * (1 - prog(t, 16.1, 16.3)));
}
/* les quatre autres : l'affiche, l'étiquette et le pourcentage de chaque carte (posés après le fondu des textes) */
function altsS7(x, t) {
  const CW = INF.m_cardBox.w, fade = 1 - prog(t, S7END - 0.25, S7END);
  const A = PORT ? { x0: 101, y: 1400, w: 200, gap: 26 } : { x0: 140, y: 640, w: 170, gap: 24 }, crop = 625;
  for (let j = 0; j < 4; j++) {
    const u = EZ.out(prog(t, 16.35 + j * 0.07, 16.75 + j * 0.07)) * fade;
    if (u <= 0) continue;
    const w = A.w, h = (w * crop) / CW, X = A.x0 + j * (w + A.gap), Y = A.y + (1 - u) * 60;
    x.save(); x.globalAlpha = u;
    rrp(x, X, Y, w, h, 10); x.fillStyle = '#0b0809'; x.fill(); x.clip();
    x.drawImage(TXR[`m_card_${j + 2}`], 0, 0, CW * 3, crop * 3, X, Y, w, h);
    x.restore();
    x.save(); x.globalAlpha = u; rrp(x, X, Y, w, h, 10); x.lineWidth = 1.5; x.strokeStyle = redA(0.4); x.stroke(); x.restore();
  }
}

/* ---------- le film ---------- */
function sSept(x, t) {
  bgFill(x, 'blk');
  setCam(viewS7(t));
  const hg = x.createRadialGradient(CAM.ax, CAM.ay, 0, CAM.ax, CAM.ay, PORT ? 1100 : 900);
  hg.addColorStop(0, redA(0.26)); hg.addColorStop(0.5, redA(0.07)); hg.addColorStop(1, 'rgba(255,45,79,0)');
  x.fillStyle = hg; x.fillRect(0, 0, W, H);
  if (t < S7CARD + 0.5) phoneS7(x, t, prog(t, 0, 0.3) * (1 - EZ.out(prog(t, S7CARD, S7CARD + 0.4))));
  if (t > S7CARD && t < S7END) cardS7(x, t);
  if (t > S7END - 0.2) phoneS7(x, t, EZ.out(prog(t, S7END - 0.15, S7END + 0.25)));
  // fondu sombre derrière les textes : l'écran agrandi ne passe jamais sous un titre
  const g = PORT ? x.createLinearGradient(0, 0, 0, 740) : x.createLinearGradient(0, 0, 960, 0);
  g.addColorStop(0, PORT ? 'rgba(8,4,6,0.99)' : 'rgba(8,4,6,0.94)'); g.addColorStop(PORT ? 0.76 : 0.72, PORT ? 'rgba(8,4,6,0.94)' : 'rgba(8,4,6,0.82)'); g.addColorStop(1, 'rgba(8,4,6,0)');
  x.fillStyle = g;
  if (PORT) x.fillRect(0, 0, W, 740); else x.fillRect(0, 0, 960, H);
  if (t > 16.3 && t < S7END) altsS7(x, t);
  capsS7(x, t);
}

/* ---------- textes ---------- */
/* coupure équilibrée : même nombre de lignes, dans la plus petite largeur qui le permet (pas de mot seul en fin) */
function wrapS7(s, size, maxW) {
  const o = { fam: 'Anton' }, n = wrapText(s, size, maxW, o).length;
  let lo = maxW * 0.4, hi = maxW;
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (wrapText(s, size, m, o).length > n) lo = m; else hi = m; }
  return wrapText(s, size, hi, o);
}
/* pastilles (réponses) rangées en lignes dans la largeur w */
function pillsS7(labels, size, w, gap) {
  const o = { fam: 'Anton' }, rows = [[]];
  let rw = 0;
  for (const l of labels) {
    const pw = textWidth(l, size, o) + size * 1.4;
    if (rows[rows.length - 1].length && rw + gap + pw > w) { rows.push([]); rw = 0; }
    rows[rows.length - 1].push({ l, w: pw }); rw += (rw ? gap : 0) + pw;
  }
  return rows;
}
function pillS7(x, s, X, Y, w, h, size, u, on, dim) {
  if (u <= 0) return;
  x.save(); x.globalAlpha *= clamp(u) * (dim ? 0.42 : 1);
  const sc = 0.6 + 0.4 * u, cx = X + w / 2, cy = Y + h / 2;
  x.translate(cx, cy); x.scale(sc, sc); x.translate(-cx, -cy);
  rrp(x, X, Y, w, h, h / 2);
  if (on > 0) { x.fillStyle = redA(on); x.fill(); }
  x.lineWidth = 2.5; x.strokeStyle = on > 0 ? redA(1) : cream(0.45); x.stroke();
  drawText(x, s, cx, cy + size * 0.36, size, { fam: 'Anton', align: 'center', color: C.cream });
  x.restore();
}
function qCapS7(x, t, k) {
  const [t0, t1] = S7CAP[k];
  if (t < t0 || t > t1 + 0.45) return;
  const q = S7Q[k], out = prog(t, t1, t1 + 0.3);
  const L = PORT ? { x: CX, al: 'center', mid: 420, w: 980, cs: 60, ts: 78, lh: 84, ps: 36, ph: 70 }
    : { x: 140, al: 'left', mid: 540, w: 740, cs: 66, ts: 86, lh: 92, ps: 36, ph: 70 };
  const o = { align: L.al };
  const lines = wrapS7(q.q.toUpperCase(), L.ts, L.w);
  const rows = pillsS7((q.ch || [q.a]).map((s) => s.toUpperCase()), L.ps, L.w, 16);
  const hb = L.cs + 40 + lines.length * L.lh + 36 + rows.length * (L.ph + 16);
  let y = L.mid - hb / 2 + L.cs;
  // 05 / 7 · TON TEMPS · PLUS SIMPLE
  const cnt = `${String(k + 1).padStart(2, '0')} / 7`, cw = textWidth(cnt, L.cs, { fam: 'Anton' });
  const kk = { fam: 'Archivo', wt: 700, track: 0.28 }, kw = textWidth(q.kick, 24, kk);
  const badge = k >= 4 ? 'PLUS SIMPLE' : null, bw = badge ? textWidth(badge, 18, kk) + 30 : 0;
  const tot = cw + 26 + kw + (badge ? 22 + bw : 0);
  const x0 = L.al === 'center' ? L.x - tot / 2 : L.x;
  tl(x, cnt, x0, y, L.cs, t, t0, t1, { color: C.red });
  kick(x, q.kick, x0 + cw + 26, y - L.cs * 0.12, t, t0 + 0.05, t1, { color: cream(0.85) });
  if (badge) {
    const ba = EZ.out(prog(t, t0 + 0.2, t0 + 0.45)) * (1 - out), bx = x0 + cw + 26 + kw + 22, by = y - L.cs * 0.12 - 27;
    if (ba > 0) {
      x.save(); x.globalAlpha = ba; rrp(x, bx, by, bw, 36, 18); x.fillStyle = C.red; x.fill();
      drawText(x, badge, bx + 15, by + 25, 18, Object.assign({ color: C.cream }, kk)); x.restore();
    }
  }
  y += 40;
  lines.forEach((l, i) => { y += L.lh; tl(x, l, L.x, y - (L.lh - L.ts), L.ts, t, t0 + 0.08 + i * 0.05, t1, Object.assign({ color: C.cream }, o)); });
  y += 36;
  // les choix (questions 5 à 7), ou la réponse donnée (questions 1 à 4)
  const tap = S7TAP[k], on = EZ.out(prog(t, tap - 0.06, tap + 0.1));
  rows.forEach((row, ri) => {
    const rw = row.reduce((s, p) => s + p.w, 0) + 16 * (row.length - 1);
    let px = L.al === 'center' ? L.x - rw / 2 : L.x;
    row.forEach((p, pi) => {
      const idx = rows.slice(0, ri).reduce((s, r) => s + r.length, 0) + pi;
      const chosen = q.ch ? q.ch[idx] === q.a : true;
      const ta = q.ch ? t0 + 0.3 + idx * 0.08 : tap - 0.04;
      const u = (spr(t - ta, 16, 8) > 0 ? Math.min(1.08, spr(t - ta, 16, 8)) : 0) * (1 - out);
      pillS7(x, p.l, px, y, p.w, L.ph, L.ps, u, chosen ? on : 0, q.ch && !chosen && on > 0.5);
      px += p.w + 16;
    });
    y += L.ph + 16;
  });
}
function capsS7(x, t) {
  const L = PORT ? { x: CX, al: 'center', k: 210, y1: 330, y2: 430, ts: 96, s: 500, sw: 940 } : { x: 140, al: 'left', k: 375, y1: 495, y2: 595, ts: 88, s: 680, sw: 700 };
  const o = { align: L.al };
  // 1. accroche
  kick(x, 'NOUVELLE VERSION', L.x, L.k, t, 0.15, 1.8, o);
  tl(x, [['7', C.red], [' QUESTIONS.', C.cream]], L.x, L.y1 + (PORT ? 30 : 40), PORT ? 150 : 160, t, 0.2, 1.8, o);
  para(x, 'Des choix plus simples, une interface plus claire.', L.x, L.s + (PORT ? 0 : 20), PORT ? 38 : 40, L.sw, t, 0.5, 1.8, Object.assign({ wt: 600, color: cream(0.85) }, o));
  // 2. les questions, et entre la 2e et la 3e, deux nouveautés de l'interface
  for (let k = 0; k < 7; k++) qCapS7(x, t, k);
  const beats = [
    [4.5, 5.7, 'EN HAUT DE L’ÉCRAN', 'TES RÉPONSES', [['RESTENT AFFICHÉES.', C.red]], null],
    [6.0, 7.15, 'NOUVEAU', 'PAS SÛR ?', [['TU PASSES.', C.red]], '« Je sais pas · Passer » : la question ne pose aucune contrainte.'],
  ];
  for (const [a, b, kk, l1, l2, sub] of beats) {
    kick(x, kk, L.x, L.k, t, a, b, o);
    tl(x, l1, L.x, L.y1, L.ts, t, a + 0.05, b, o);
    tl(x, l2, L.x, L.y2, L.ts, t, a + 0.12, b + 0.03, o);
    if (sub) para(x, sub, L.x, L.s, PORT ? 36 : 34, L.sw, t, a + 0.3, b, Object.assign({ wt: 600, color: cream(0.85) }, o));
  }
  // 3. le résultat
  const R = PORT ? { k: 170, y1: 300, y2: 395, ts: 88 } : { k: 300, y1: 420, y2: 515, ts: 88 };
  kick(x, 'TON RÉSULTAT', L.x, R.k, t, 15.0, 17.1, o);
  tl(x, 'TON MEILLEUR CHOIX', L.x, R.y1, R.ts, t, 15.05, 16.05, o);
  tl(x, [['90 % POUR TON MOMENT.', C.red]], L.x, R.y2, R.ts * 0.72, t, 15.5, 16.05, o);
  tl(x, 'PUIS 4 AUTRES,', L.x, R.y1, R.ts, t, 16.4, 17.1, o);
  tl(x, [['CLASSÉS POUR TOI.', C.red]], L.x, R.y2, R.ts, t, 16.47, 17.12, o);
  // 4. fin
  const E5 = PORT ? { k: 150, w: 330, ws: 160, tg: 418, tgs: 50 } : { k: 330, w: 545, ws: 196, tg: 640, tgs: 56 }, e = S7END;
  kick(x, '7 QUESTIONS  ·  UNE MINUTE', L.x, E5.k, t, e + 0.2, null, o);
  const LW = layoutChars('CINÉMOOD', E5.ws, { fam: 'Anton' }), x0 = L.al === 'center' ? L.x - LW.w / 2 : L.x;
  LW.chars.forEach((c, i) => revealLine(x, c.ch, x0 + c.x, E5.w, E5.ws, (t - e - 0.3 - i * 0.04) / 0.55, { fam: 'Anton', color: i < 4 ? C.cream : C.red, ease: EZ.out, asc: 1.2, desc: 0.08 }));
  tl(x, [['TON HUMEUR CHOISIT TON ', C.cream], ['CINÉMA.', C.red]], L.x, E5.tg, E5.tgs, t, e + 0.6, null, o);
  const url = 'cinem00d.com', us = PORT ? 44 : 42, uo = { fam: 'Archivo', wt: 700 };
  const pw = textWidth(url, us, uo) + 130, ph = PORT ? 92 : 88, py = PORT ? 1788 : 760, pu = EZ.out(prog(t, e + 0.85, e + 1.2));
  if (pu > 0) {
    const px = L.al === 'center' ? CX - pw / 2 : L.x;
    rrp(x, L.al === 'center' ? CX - (pw / 2) * pu : px, py - ph / 2, pw * pu, ph, ph / 2);
    x.fillStyle = 'rgba(10,5,7,0.9)'; x.fill(); x.lineWidth = 3; x.strokeStyle = C.red; x.stroke();
    const n = Math.floor(url.length * prog(t, e + 1.0, e + 1.5));
    let cx = px + 44;
    for (let i = 0; i < n; i++) { drawText(x, url[i], cx, py + us * 0.36, us, Object.assign({ color: i === 5 || i === 6 ? C.red : C.cream }, uo)); cx += textWidth(url.slice(0, i + 1), us, uo) - textWidth(url.slice(0, i), us, uo); }
    if (t < e + 1.6 && Math.floor(t * 4) % 2 === 0) { x.fillStyle = C.cream; x.fillRect(cx + 3, py - 22, 3, 44); }
    const aa = EZ.out(prog(t, e + 1.55, e + 1.85));
    if (aa > 0) drawText(x, '→', px + pw - 64 - (1 - aa) * 20, py + us * 0.36, us, { fam: 'Archivo', wt: 700, color: redA(aa) });
  }
  if (!PORT) para(x, 'Gratuit, sans inscription  ·  interface réelle, films fictifs à titre d’illustration', L.x, 1015, 20, 1000, t, e + 1.65, null, { color: cream(0.42) });
  else para(x, 'Gratuit, sans inscription  ·  films fictifs, à titre d’illustration', CX, 1898, 19, 1000, t, e + 1.65, null, { align: 'center', color: cream(0.4) });
}

/* ---------- rendu ---------- */
function septBlurAt(t) {
  const W8 = [[1.65, 2.1], [2.45, 2.95], [4.5, 4.95], [5.7, 6.2], [6.95, 7.4], [14.85, 15.4], [14.5, 14.95], [16.15, 16.65], [17.0, 17.6]].concat(S7IN.slice(1).map((s) => [s - 0.05, s + 0.38]));
  return { n: W8.some(([a, b]) => t > a && t < b) ? 8 : 5, shutter: 0.5 };
}
function septFx(t) {
  const sh = { x: 0, y: 0 };
  let env = 0;
  for (const [t0, amp] of [[1.72, 6], [14.95, 3], [S7END + 0.3, 4]]) {
    const u = t - t0;
    if (u <= 0 || u >= 0.4) continue;
    const k = (1 - u / 0.4) ** 2, s = shake(t, amp * k, 26, t0 * 7);
    sh.x += s.x; sh.y += s.y; env += amp * k;
  }
  return { shake: sh, env, vignette: 0.28, grain: 0.04, bloom: 0.2 + 0.3 * tri(t - 1.7, 0.5), fade: Math.max(1 - t / 0.2, prog(t, SDUR - 0.4, SDUR)) };
}
