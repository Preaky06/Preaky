// Balance — raisonnement déductif : convertir des poids grâce aux indices.
import { h, clamp, tap, fmtSec } from '../util.js';

const STAR = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 7.5 : 17;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a) + 1.5).toFixed(1)}`);
  }
  return `<path d="M${pts.join('L')}Z"/>`;
})();

const KINDS = [
  { name: 'rond', color: '--cyan', draw: '<circle r="15"/>' },
  { name: 'carré', color: '--mag', draw: '<rect x="-13.5" y="-13.5" width="27" height="27" rx="5"/>' },
  { name: 'triangle', color: '--yel', draw: '<path d="M0 -16 17 13H-17Z"/>' },
  { name: 'étoile', color: '--ink', draw: STAR },
];

const shape = (k, cls = 'bl-shape') => `<svg class="${cls}" viewBox="-20 -20 40 40" aria-hidden="true" focusable="false"><g style="fill:var(${KINDS[k].color});stroke:var(--shape-stroke);stroke-width:2.5;stroke-linejoin:round">${KINDS[k].draw}</g></svg>`;
const shapes = (list, cls) => list.map(k => shape(k, cls)).join('');

export function makeBalance(rng, lvl) {
  const tier = lvl <= 3 ? 1 : lvl <= 7 ? 2 : lvl <= 12 ? 3 : 4;
  const nk = tier === 1 ? 2 : tier === 4 ? 4 : 3;
  const kinds = [...rng.shuffle([0, 1, 2]), 3].slice(0, nk); // kinds[0] = l'unité
  const w = [1];
  const clues = [];
  const k1 = rng.int(2, tier === 1 ? 3 : 4);
  w.push(k1);
  clues.push({ L: [kinds[1]], R: Array(k1).fill(kinds[0]) });
  if (nk >= 3) {
    if (tier === 2) {
      const k2 = rng.pick([2, 3, 4, 5].filter(x => x !== k1));
      w.push(k2);
      clues.push({ L: [kinds[2]], R: Array(k2).fill(kinds[0]) });
    } else {
      const j = rng.int(1, 2);
      w.push(k1 + j);
      clues.push({ L: [kinds[2]], R: [kinds[1], ...Array(j).fill(kinds[0])] });
    }
  }
  if (nk === 4) {
    if (rng.chance(0.5) && k1 * 2 !== w[2]) {
      w.push(k1 * 2);
      clues.push({ L: [kinds[3]], R: [kinds[1], kinds[1]] });
    } else {
      const j = rng.int(1, 2);
      w.push(w[2] + j);
      clues.push({ L: [kinds[3]], R: [kinds[2], ...Array(j).fill(kinds[0])] });
    }
  }
  const weight = k => w[kinds.indexOf(k)];
  const sum = list => list.reduce((a, k) => a + weight(k), 0);
  const sort = list => list.slice().sort((a, b) => weight(b) - weight(a));
  const sig = list => sort(list).join(',');

  const maxItems = tier === 1 ? 4 : 5;
  const wantEqual = rng.chance(tier === 1 ? 0.15 : 0.22);
  let q = null;
  for (let tries = 0; tries < 400 && !q; tries++) {
    const L = Array.from({ length: rng.int(1, maxItems) }, () => rng.pick(kinds));
    const R = Array.from({ length: rng.int(1, maxItems) }, () => rng.pick(kinds));
    if (![...L, ...R].some(k => k !== kinds[0])) continue;
    if (sig(L) === sig(R)) continue;
    if (clues.some(c => sig(c.L) === sig(L) && sig(c.R) === sig(R))) continue;
    const diff = sum(L) - sum(R);
    if (wantEqual ? diff !== 0 : diff === 0) continue;
    if (tier === 4 && Math.abs(diff) > 2) continue;
    // Piège : le côté le plus lourd n'a souvent PAS le plus d'objets.
    if (diff !== 0 && tries < 300) {
      const heavy = diff > 0 ? L.length : R.length;
      const light = diff > 0 ? R.length : L.length;
      if (heavy > light && rng.chance(0.75)) continue;
    }
    q = { L: sort(L), R: sort(R) };
  }
  if (!q) q = { L: [kinds[1]], R: Array(k1 + 1).fill(kinds[0]) };
  const sl = sum(q.L);
  const sr = sum(q.R);
  return { kinds, w, clues, ...q, sl, sr, answer: Math.sign(sl - sr) };
}

function scaleEl(L, R) {
  const pan = (items, side) => h('div', { class: `pan pan-${side}` },
    h('span', { class: 'pan-strings', html: '<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M50 1 6 29M50 1l44 28" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>' }),
    h('span', { class: 'pan-dish', html: shapes(items) }));
  return h('div', { class: 'scale', role: 'img', 'aria-label': `Balance : ${L.length} objet(s) à gauche, ${R.length} à droite` },
    h('span', { class: 'post' }), h('span', { class: 'foot' }),
    h('div', { class: 'beam' }, pan(L, 'l'), pan(R, 'r')),
    h('span', { class: 'pivot' }, '?'));
}

export default {
  id: 'balance',
  domain: 'logique',
  name: 'Balance',
  tagline: 'Déduis quel côté est le plus lourd.',
  trains: 'Déduction, raisonnement par substitution',
  rule: 'Les indices disent ce que pèse chaque forme. Sers-t’en pour deviner de quel côté penche la balance.',
  short: 'Quel côté est le plus lourd ?',
  duration: '≈ 2 min',
  unit: n => (n <= 1 ? 'bonne réponse sur 8' : 'bonnes réponses sur 8'),
  tip: {
    title: 'Tout convertir dans la même unité',
    text: 'Remplace chaque forme par le nombre de petites formes qu’elle vaut, puis compte de chaque côté. Ne te fie pas au nombre d’objets.',
    life: 'Comparer des prix : ramène tout au prix au kilo ou au litre avant de choisir.',
  },
  demo() {
    return `<div class="demo-bl" aria-hidden="true"><span class="clue">${shape(2)}<b>=</b>${shapes([0, 0, 0])}</span><span class="demo-arrow">↓</span><span class="clue">${shapes([2])}<b class="gt" aria-label="plus lourd que">&gt;</b>${shapes([0, 0])}</span></div>
      <p class="demo-cap">Un triangle vaut 3 ronds : il pèse plus que 2 ronds.</p>`;
  },

  async play({ stage, level, rng, scope, hud, sfx, buzz }) {
    const ITEMS = 8;
    let correct = 0;
    const times = [];

    for (let i = 0; i < ITEMS; i++) {
      hud.progress(i / ITEMS);
      hud.label(`Balance ${i + 1} sur ${ITEMS}`);
      const p = makeBalance(rng, level + (i >= 4 ? 1 : 0));

      const clues = h('div', { class: 'clues' }, h('p', { class: 'label' }, 'On sait que'),
        h('div', { class: 'clue-list' }, p.clues.map(c => h('span', { class: 'clue', html: `${shapes(c.L)}<b>=</b>${shapes(c.R)}` }))));
      const scale = scaleEl(p.L, p.R);
      const answers = [[1, 'Gauche'], [0, 'Égalité'], [-1, 'Droite']].map(([v, label]) => h('button', { class: 'bl-ans', type: 'button', 'data-v': v }, label));
      const explain = h('div', { class: 'explain', hidden: true });
      stage.replaceChildren(h('div', { class: 'bl' }, clues, scale, h('p', { class: 'pt-ask' }, 'Quel côté est le plus lourd ?'), h('div', { class: 'bl-answers' }, answers), explain));

      const t0 = scope.now();
      const choice = await new Promise(resolve => {
        let done = false;
        answers.forEach(b => tap(scope, b, () => { if (!done) { done = true; resolve(Number(b.dataset.v)); } }));
      });
      times.push(scope.now() - t0);

      const ok = choice === p.answer;
      scale.style.setProperty('--tilt', `${-p.answer * 9}deg`);
      scale.querySelector('.pivot').textContent = ok ? '✓' : '!';
      answers.forEach(b => {
        const v = Number(b.dataset.v);
        b.disabled = true;
        if (v === p.answer) b.classList.add('ok');
        else if (v === choice) b.classList.add('ko');
      });

      const unit = shape(p.kinds[0], 'bl-inline');
      const conv = p.kinds.slice(1).filter(k => p.L.includes(k) || p.R.includes(k)).map(k => `${shape(k, 'bl-inline')} = ${p.w[p.kinds.indexOf(k)]} ${unit}`).join(' · ');
      const verdict = p.answer > 0 ? 'La gauche est plus lourde.' : p.answer < 0 ? 'La droite est plus lourde.' : 'C’est l’équilibre.';
      const detail = `<p>${conv ? `${conv}<br>` : ''}À gauche : <b>${p.sl}</b> ${unit} · À droite : <b>${p.sr}</b> ${unit}</p><p><b>${verdict}</b></p>`;
      explain.hidden = false;

      if (ok) {
        correct++;
        sfx.good();
        buzz(15);
        hud.flash('good');
        explain.innerHTML = detail;
        await scope.sleep(2000);
      } else {
        sfx.bad();
        buzz([30, 40, 30]);
        hud.flash('bad');
        explain.innerHTML = detail;
        const next = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, 'Suivant');
        explain.append(next);
        await new Promise(resolve => tap(scope, next, resolve));
      }
    }
    hud.progress(1);

    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    return {
      score: correct,
      accuracy: correct / ITEMS,
      nextLevel: clamp(correct >= 7 ? level + 1 : correct <= 4 ? level - 1 : level, 1, 20),
      stats: [
        ['Bonnes réponses', `${correct} / ${ITEMS}`],
        ['Temps moyen de réflexion', fmtSec(mean)],
      ],
    };
  },
};
