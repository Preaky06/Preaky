// Suites — raisonnement inductif : trouver la règle d'une suite de figures.
// Chaque figure a 4 attributs : forme, rotation, remplissage, nombre de points.
import { h, clamp, tap, fmtSec } from '../util.js';

const SHAPES = [
  'M0 -30 19 24 -19 24Z', // triangle pointu
  'M0 -32 24 -6H9V28H-9V-6H-24Z', // flèche
  'M-29 10A29 29 0 0 1 29 10Z', // demi-lune
  'M-20 -28H-6V12H20V26H-20Z', // L
];
const ATTRS = ['rot', 'shape', 'fill', 'dots'];
const key = f => `${f.shape}-${f.rot}-${f.fill}-${f.dots}`;

export function figure(f) {
  const fill = ['fill:var(--paper)', 'fill:url(#pm-hatch)', 'fill:currentColor'][f.fill];
  const dots = Array.from({ length: f.dots }, (_, i) => `<circle cx="${(i - (f.dots - 1) / 2) * 15}" cy="0" r="5.3" fill="currentColor"/>`).join('');
  return `<svg viewBox="0 0 100 100" class="fig" aria-hidden="true" focusable="false"><g transform="translate(50 43) rotate(${f.rot * 45})"><path d="${SHAPES[f.shape]}" style="${fill}" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></g><g transform="translate(50 89)">${dots}</g></svg>`;
}

function makeRule(rng, attr, lvl) {
  if (attr === 'rot') {
    const steps = lvl < 4 ? [2, -2] : lvl < 9 ? [2, -2, 1, -1] : [1, -1, 2, -2, 3, -3];
    return { type: 'step', d: rng.pick(steps), v0: rng.int(0, 7), mod: 8 };
  }
  if (attr === 'dots') {
    if (lvl < 4 || rng.chance(0.55)) return rng.chance(lvl < 4 ? 1 : 0.6) ? { type: 'step', d: 1, v0: 1 } : { type: 'step', d: -1, v0: 5 };
    const a = rng.int(1, 2);
    return { type: 'cycle', vals: [a, a + rng.int(1, 2)] };
  }
  const max = attr === 'shape' ? 4 : 3;
  const k = lvl < 4 ? 2 : rng.pick([2, 3]);
  return { type: 'cycle', vals: rng.shuffle([...Array(max).keys()]).slice(0, k) };
}

function constRule(rng, attr) {
  const v = { rot: rng.int(0, 7), shape: rng.int(0, 3), fill: rng.int(0, 2), dots: rng.int(1, 3) }[attr];
  return { type: 'const', v };
}

function valueAt(rule, i) {
  if (rule.type === 'const') return rule.v;
  if (rule.type === 'cycle') return rule.vals[i % rule.vals.length];
  if (rule.mod) return (((rule.v0 + i * rule.d) % rule.mod) + rule.mod) % rule.mod;
  return rule.v0 + i * rule.d;
}

function explain(rules) {
  const parts = [];
  const r = rules.rot;
  if (r.type === 'step') {
    const q = Math.abs(r.d);
    const amount = q === 2 ? 'd’un quart de tour' : q === 1 ? 'd’un huitième de tour' : 'de trois huitièmes de tour';
    parts.push(`la forme tourne ${amount} ${r.d > 0 ? 'dans le sens des aiguilles d’une montre' : 'dans le sens inverse des aiguilles d’une montre'}`);
  }
  if (rules.shape.type === 'cycle') parts.push(rules.shape.vals.length === 2 ? 'deux formes alternent' : 'trois formes reviennent en boucle');
  if (rules.fill.type === 'cycle') parts.push(rules.fill.vals.length === 2 ? 'le remplissage alterne' : 'trois remplissages reviennent en boucle');
  const d = rules.dots;
  if (d.type === 'step') parts.push(d.d > 0 ? 'il y a un point de plus à chaque case' : 'il y a un point de moins à chaque case');
  else if (d.type === 'cycle') parts.push('le nombre de points alterne');
  const txt = parts.join(' et ');
  return `${txt.charAt(0).toUpperCase()}${txt.slice(1)}.`;
}

function altValue(rng, attr, v) {
  if (attr === 'rot') return (v + rng.pick([1, 2, -1, -2, 4]) + 8) % 8;
  if (attr === 'shape') return (v + rng.int(1, 3)) % 4;
  if (attr === 'fill') return (v + rng.int(1, 2)) % 3;
  return rng.pick([v - 1, v + 1, v + 2, v - 2].filter(x => x >= 1 && x <= 5));
}

export function makePuzzle(rng, lvl) {
  const nVar = lvl <= 5 ? 1 : lvl <= 11 ? 2 : 3;
  const varying = rng.shuffle(ATTRS).slice(0, nVar);
  const rules = {};
  for (const a of ATTRS) rules[a] = varying.includes(a) ? makeRule(rng, a, lvl) : constRule(rng, a);
  const items = Array.from({ length: 5 }, (_, i) => Object.fromEntries(ATTRS.map(a => [a, valueAt(rules[a], i)])));
  const answer = items[4];
  const nOpts = lvl <= 3 ? 3 : 4;

  // Les leurres modifient d'abord un attribut qui varie (le vrai piège),
  // à commencer par « répéter la dernière case ».
  const seen = new Set([key(answer)]);
  const opts = [];
  const push = f => { if (opts.length < nOpts - 1 && !seen.has(key(f))) { seen.add(key(f)); opts.push(f); } };
  for (const a of varying) push({ ...answer, [a]: items[3][a] });
  for (const a of [...varying, ...varying, ...rng.shuffle(ATTRS)]) push({ ...answer, [a]: altValue(rng, a, answer[a]) });
  while (opts.length < nOpts - 1) push({ shape: rng.int(0, 3), rot: rng.int(0, 7), fill: rng.int(0, 2), dots: rng.int(1, 5) });

  const options = rng.shuffle([answer, ...opts]);
  return { shown: items.slice(0, 4), answer, options, correctIndex: options.indexOf(answer), explanation: explain(rules) };
}

export default {
  id: 'patterns',
  domain: 'logique',
  name: 'Suites',
  tagline: 'Trouve la règle et complète la suite.',
  trains: 'Raisonnement logique, repérage de règles',
  rule: 'Quatre cases suivent une règle (rotation, forme, remplissage, nombre de points). Choisis la case qui vient ensuite.',
  short: 'Quelle case continue la suite ?',
  duration: '≈ 2 min',
  unit: n => (n <= 1 ? 'bonne réponse sur 8' : 'bonnes réponses sur 8'),
  tip: {
    title: 'Une règle à la fois',
    text: 'Ne regarde pas tout en même temps. Vérifie d’abord la forme, puis la rotation, puis le remplissage, puis les points. Élimine les réponses au fur et à mesure.',
    life: 'Face à un problème compliqué, isole une seule question à la fois avant de passer à la suivante.',
  },
  demo() {
    const seq = [0, 2, 4, 6].map(rot => figure({ shape: 0, rot, fill: 2, dots: 1 }));
    return `<div class="demo-pt" aria-hidden="true">${seq.map(s => `<span>${s}</span>`).join('')}<span class="q">?</span></div>
      <p class="demo-cap">Le triangle tourne d’un quart de tour à chaque case.</p>`;
  },

  async play({ stage, level, rng, scope, hud, sfx, buzz }) {
    const ITEMS = 8;
    let correct = 0;
    const times = [];

    for (let i = 0; i < ITEMS; i++) {
      hud.progress(i / ITEMS);
      hud.label(`Suite ${i + 1} sur ${ITEMS}`);
      const p = makePuzzle(rng, level + (i >= 4 ? 1 : 0));

      const qCell = h('span', { class: 'pt-cell q' }, '?');
      const seqRow = h('div', { class: 'pt-seq' }, ...p.shown.map(f => h('span', { class: 'pt-cell', html: figure(f) })), qCell);
      const optEls = p.options.map((f, k) => h('button', { class: 'pt-opt', type: 'button', 'aria-label': `Réponse ${k + 1}`, html: figure(f) }));
      const optsRow = h('div', { class: `pt-options k${p.options.length}` }, optEls);
      const explain = h('div', { class: 'explain', hidden: true });
      stage.replaceChildren(h('div', { class: 'pt' }, seqRow, h('p', { class: 'pt-ask' }, 'Quelle case vient ensuite ?'), optsRow, explain));

      const t0 = scope.now();
      const choice = await new Promise(resolve => {
        let done = false;
        optEls.forEach((el, k) => tap(scope, el, () => { if (!done) { done = true; resolve(k); } }));
      });
      times.push(scope.now() - t0);

      const ok = choice === p.correctIndex;
      optEls.forEach((el, k) => {
        el.disabled = true;
        if (k === p.correctIndex) el.classList.add('ok');
        else if (k === choice) el.classList.add('ko');
      });
      qCell.innerHTML = figure(p.answer);
      qCell.classList.add(ok ? 'ok' : 'ko');

      if (ok) {
        correct++;
        sfx.good();
        buzz(15);
        hud.flash('good');
        explain.hidden = false;
        explain.replaceChildren(h('b', {}, 'Exact. '), p.explanation);
        await scope.sleep(1700);
      } else {
        sfx.bad();
        buzz([30, 40, 30]);
        hud.flash('bad');
        const next = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, 'Suivant');
        explain.hidden = false;
        explain.replaceChildren(h('p', {}, h('b', {}, 'La règle : '), p.explanation), next);
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
