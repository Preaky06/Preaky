// Pipopipette (jeu des petits carrés) — contre l'ordinateur ou à deux.
// Fermer une case la fait gagner ET permet de rejouer : il faut voir venir les chaînes.
import { h, tap } from '../util.js';
import { avatarSVG } from '../avatar.js';

export function makeBoard(n) {
  const edges = [];
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) edges.push({ t: 'h', r, c, owner: -1 });
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) edges.push({ t: 'v', r, c, owner: -1 });
  const idx = new Map(edges.map((e, i) => [`${e.t}${e.r},${e.c}`, i]));
  const boxEdges = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) boxEdges.push([idx.get(`h${r},${c}`), idx.get(`h${r + 1},${c}`), idx.get(`v${r},${c}`), idx.get(`v${r},${c + 1}`)]);
  const edgeBoxes = edges.map(() => []);
  boxEdges.forEach((es, b) => es.forEach(e => edgeBoxes[e].push(b)));
  return { n, edges, boxEdges, edgeBoxes, boxes: boxEdges.map(() => -1) };
}

const sidesOf = (B, drawn, b) => B.boxEdges[b].reduce((a, e) => a + (drawn[e] ? 1 : 0), 0);

// Combien de cases l'adversaire peut-il enchaîner si je joue l'arête e ?
function giveaway(B, drawn, e) {
  const d = drawn.slice();
  d[e] = true;
  let taken = 0;
  for (let guard = 0; guard < 100; guard++) {
    let moved = false;
    for (let b = 0; b < B.boxEdges.length; b++) {
      if (sidesOf(B, d, b) === 3) {
        const last = B.boxEdges[b].find(x => !d[x]);
        d[last] = true;
        taken += B.edgeBoxes[last].filter(bb => sidesOf(B, d, bb) === 4).length;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return taken;
}

export function aiMove(B, rng, level) {
  const drawn = B.edges.map(e => e.owner >= 0);
  const free = drawn.map((d, i) => (d ? -1 : i)).filter(i => i >= 0);
  const completing = free.filter(e => B.edgeBoxes[e].some(b => sidesOf(B, drawn, b) === 3));
  if (completing.length && (level >= 2 || rng.chance(0.6))) return rng.pick(completing);
  if (level <= 1) return rng.pick(free);
  const safe = free.filter(e => B.edgeBoxes[e].every(b => sidesOf(B, drawn, b) < 2));
  if (safe.length) return rng.pick(safe);
  if (level === 2) return rng.pick(free);
  let best = free[0];
  let min = Infinity;
  for (const e of free) {
    const g = giveaway(B, drawn, e);
    if (g < min) { min = g; best = e; }
  }
  return best;
}

export default {
  id: 'dots',
  domain: 'logique',
  kind: 'party',
  world: 'w-dots',
  name: 'Pipopipette',
  tagline: 'Ferme les cases, piège l’adversaire.',
  trains: 'Stratégie, anticipation',
  rule: 'À tour de rôle, tracez un trait entre deux points voisins. Celui qui ferme une case la gagne et rejoue. À la fin, le plus de cases l’emporte.',
  short: 'Ne laisse pas de case à 3 côtés !',
  duration: '≈ 3 min',
  unit: n => (n <= 1 ? 'case' : 'cases'),
  party: {
    min: 1, max: 2, ai: true,
    options: [['size', 'Taille', [[3, 'Petit · 3×3'], [4, 'Moyen · 4×4'], [5, 'Grand · 5×5']], 4]],
  },
  tip: {
    title: 'Ne donne jamais le 3e côté',
    text: 'Tracer le 3e côté d’une case, c’est l’offrir. En fin de partie, quand tout est risqué, sacrifie la chaîne la plus courte.',
    life: 'Négocier, jouer aux échecs ou planifier : se demander « qu’est-ce que ça permet à l’autre ? » avant d’agir.',
  },

  async play({ stage, players, options, rng, scope, sfx, buzz, hud }) {
    const n = options?.size || 4;
    const B = makeBoard(n);
    const score = players.map(() => 0);
    let turn = 0;
    const SZ = 100;
    const cell = SZ / n;
    const pad = 6;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${SZ + pad * 2} ${SZ + pad * 2}`);
    svg.setAttribute('class', 'dots-board');
    const gBoxes = document.createElementNS(ns, 'g');
    const gEdges = document.createElementNS(ns, 'g');
    const gDots = document.createElementNS(ns, 'g');
    svg.append(gBoxes, gEdges, gDots);
    const coords = e => (e.t === 'h' ? [e.c * cell, e.r * cell, (e.c + 1) * cell, e.r * cell] : [e.c * cell, e.r * cell, e.c * cell, (e.r + 1) * cell]);
    const edgeEls = B.edges.map(e => {
      const [x1, y1, x2, y2] = coords(e);
      const l = document.createElementNS(ns, 'line');
      for (const [k, v] of Object.entries({ x1, y1, x2, y2 })) l.setAttribute(k, v);
      l.setAttribute('class', 'dot-edge');
      gEdges.append(l);
      return l;
    });
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const d = document.createElementNS(ns, 'circle');
      d.setAttribute('cx', c * cell); d.setAttribute('cy', r * cell); d.setAttribute('r', 2.6);
      d.setAttribute('class', 'dot-pt');
      gDots.append(d);
    }

    const chips = players.map((p, i) => h('div', { class: 'dots-player', style: `--pc:${p.color}` },
      h('span', { class: 'ftf-av', html: avatarSVG(p.avatar, { size: 38, mood: null }) }),
      h('span', { class: 'dp-name' }, p.name),
      h('b', { class: 'dp-score' }, '0')));
    const hint = h('p', { class: 'dots-hint' });
    const boardWrap = h('div', { class: 'dots-wrap' }, svg);
    stage.replaceChildren(h('div', { class: 'dots' }, h('div', { class: 'dots-players' }, chips), boardWrap, hint));

    function ui() {
      chips.forEach((c, i) => { c.classList.toggle('active', i === turn); c.querySelector('.dp-score').textContent = score[i]; });
      const p = players[turn];
      hint.textContent = p.ai ? `${p.name} réfléchit…` : players.filter(x => !x.ai).length > 1 ? `À ${p.name} : trace un trait entre deux points.` : 'À toi : trace un trait entre deux points.';
      hud.label(`${score.reduce((a, b) => a + b, 0)} / ${n * n} cases`);
      hud.progress(score.reduce((a, b) => a + b, 0) / (n * n));
    }

    let accept = null;
    tap(scope, svg, e => {
      if (!accept) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const m = svg.getScreenCTM();
      if (!m) return;
      const { x, y } = pt.matrixTransform(m.inverse());
      let best = -1;
      let bd = cell * 0.42;
      B.edges.forEach((ed, i) => {
        if (ed.owner >= 0) return;
        const [x1, y1, x2, y2] = coords(ed);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const d = ed.t === 'h' ? Math.max(Math.abs(x - mx) - cell / 2, 0) + Math.abs(y - my) : Math.max(Math.abs(y - my) - cell / 2, 0) + Math.abs(x - mx);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) accept(best);
    });

    function play(i) {
      const ed = B.edges[i];
      ed.owner = turn;
      const el = edgeEls[i];
      el.classList.add('drawn');
      el.style.stroke = players[turn].color;
      sfx.tap();
      const drawn = B.edges.map(x => x.owner >= 0);
      let closed = 0;
      for (const b of B.edgeBoxes[i]) {
        if (B.boxes[b] < 0 && sidesOf(B, drawn, b) === 4) {
          B.boxes[b] = turn;
          closed++;
          score[turn]++;
          const r = Math.floor(b / n);
          const c = b % n;
          const rc = document.createElementNS(ns, 'rect');
          rc.setAttribute('x', c * cell + 1.6); rc.setAttribute('y', r * cell + 1.6);
          rc.setAttribute('width', cell - 3.2); rc.setAttribute('height', cell - 3.2);
          rc.setAttribute('rx', 2.5);
          rc.setAttribute('class', 'dot-box');
          rc.style.fill = players[turn].color;
          const tx = document.createElementNS(ns, 'text');
          tx.setAttribute('x', c * cell + cell / 2); tx.setAttribute('y', r * cell + cell / 2 + cell * 0.14);
          tx.setAttribute('class', 'dot-initial');
          tx.setAttribute('font-size', cell * 0.42);
          tx.textContent = players[turn].name.charAt(0).toUpperCase();
          gBoxes.append(rc, tx);
        }
      }
      if (closed) { sfx.pop(score[turn]); buzz(15); } else turn = (turn + 1) % players.length;
      ui();
    }

    ui();
    while (score.reduce((a, b) => a + b, 0) < n * n) {
      const p = players[turn];
      let move;
      if (p.ai) {
        await scope.sleep(520);
        move = aiMove(B, rng, p.aiLevel || 2);
      } else {
        move = await new Promise(resolve => { accept = i => { accept = null; resolve(i); }; });
      }
      play(move);
      await scope.sleep(120);
    }
    hud.progress(1);
    const best = Math.max(...score);
    const winners = score.map((s, i) => (s === best ? i : -1)).filter(i => i >= 0);
    return {
      winner: winners.length === 1 ? winners[0] : -1,
      scores: score,
      score: score[0],
      accuracy: score[0] / (n * n),
      nextLevel: 1,
      stats: players.map((p, i) => [p.name, `${score[i]} case${score[i] > 1 ? 's' : ''}`]),
    };
  },
};
