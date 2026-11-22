// L'intrus — recherche visuelle : trouver l'élément différent dans une grille.
// Toutes les différences sont de forme ou d'orientation : jouable par les daltoniens.
import { h, clamp, tap, fmtSec } from '../util.js';

const wrap = inner => `<svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;

// Anneau de Landolt : un cercle avec une ouverture.
const ring = deg => wrap(`<path transform="rotate(${deg})" d="M31.7 9.3A33 33 0 1 1 31.7 -9.3" fill="none" stroke="currentColor" stroke-width="13"/>`);
const pointer = deg => wrap(`<path transform="rotate(${deg})" d="M0 -36 24 30 0 17 -24 30Z" fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>`);
const glyph = mode => {
  const t = ['', 'scale(-1 1)', 'rotate(180)', 'scale(1 -1)'][mode];
  return wrap(`<g transform="${t}"><path d="M-17 -38V30" stroke="currentColor" stroke-width="11" stroke-linecap="round" fill="none"/><circle cx="3" cy="12" r="20" fill="none" stroke="currentColor" stroke-width="11"/></g>`);
};
const PIPS = {
  1: [[0, 0]], 2: [[-18, -18], [18, 18]], 3: [[-18, -18], [0, 0], [18, 18]],
  4: [[-18, -18], [18, -18], [-18, 18], [18, 18]], 5: [[-18, -18], [18, -18], [0, 0], [-18, 18], [18, 18]],
  6: [[-18, -20], [18, -20], [-18, 0], [18, 0], [-18, 20], [18, 20]],
};
const dice = n => wrap(`<rect x="-40" y="-40" width="80" height="80" rx="18" fill="none" stroke="currentColor" stroke-width="7"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="currentColor"/>`).join('')}`);
const ellipse = ry => wrap(`<ellipse rx="35" ry="${ry}" fill="none" stroke="currentColor" stroke-width="10"/>`);

function makeRound(rng, level) {
  const fam = rng.pick(level < 3 ? ['ring', 'pointer', 'dice'] : ['ring', 'pointer', 'glyph', 'dice', 'ellipse']);
  const swap = pair => (rng.chance(0.5) ? pair : [pair[1], pair[0]]);
  switch (fam) {
    case 'ring': {
      const base = rng.pick([0, 90, 180, 270]);
      const d = level < 4 ? 180 : level < 9 ? 90 : 45;
      return [ring(base), ring(base + d * rng.pick([1, -1]))];
    }
    case 'pointer': {
      const base = rng.int(0, 7) * 45;
      const d = level < 4 ? 180 : level < 8 ? 90 : level < 13 ? 45 : 30;
      return [pointer(base), pointer(base + d * rng.pick([1, -1]))];
    }
    case 'glyph':
      return swap([glyph(0), glyph(level < 7 ? 2 : 1)]);
    case 'dice': {
      const pairs = level < 4 ? [[1, 6], [2, 5], [3, 6]] : level < 9 ? [[2, 4], [3, 5], [4, 6]] : [[4, 5], [5, 6], [3, 4]];
      const [a, b] = rng.pick(pairs);
      return swap([dice(a), dice(b)]);
    }
    default: {
      const k = level < 6 ? 0.68 : level < 11 ? 0.8 : 0.88;
      return swap([ellipse(35), ellipse(Math.round(35 * k))]);
    }
  }
}

export default {
  id: 'oddone',
  domain: 'concentration',
  name: 'L’intrus',
  tagline: 'Trouve l’élément différent, le plus vite possible.',
  trains: 'Recherche visuelle, attention au détail',
  rule: 'Tous les dessins sont identiques… sauf un. Touche l’intrus. La grille grandit quand tu progresses.',
  short: 'Touche l’élément différent.',
  duration: '1 min',
  unit: n => (n <= 1 ? 'intrus trouvé par minute' : 'intrus trouvés par minute'),
  tip: {
    title: 'Balaie ligne par ligne',
    text: 'Chercher au hasard fait repasser plusieurs fois au même endroit. Parcours la grille comme un texte : ligne du haut, de gauche à droite, puis la suivante.',
    life: 'Retrouver tes clés ou une erreur dans un document : fais le tour méthodiquement plutôt que de fouiller partout.',
  },
  demo() {
    const cells = Array.from({ length: 9 }, (_, i) => `<span class="${i === 5 ? 'odd' : ''}">${ring(i === 5 ? 90 : 0)}</span>`).join('');
    return `<div class="demo-oo" aria-hidden="true">${cells}</div><p class="demo-cap">L’ouverture d’un seul anneau est tournée vers le bas.</p>`;
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const n = level < 3 ? 3 : level < 6 ? 4 : level < 11 ? 5 : 6;
    const DURATION = 60000;
    const ROUNDS_ZEN = 12;
    const grid = h('div', { class: 'oo-grid', style: `--n:${n}` });
    stage.replaceChildren(grid);

    let found = 0;
    let errors = 0;
    const times = [];
    const start = scope.now();
    let endRound = null;
    let onTile = null;
    let over = false;

    // Un seul écouteur pour toute la grille (les cases changent à chaque manche).
    tap(scope, grid, e => {
      const tile = e.target.closest('.oo-tile');
      if (tile && onTile) onTile(Number(tile.dataset.i), tile);
    });

    hud.label('Trouve l’intrus');
    if (!zen) {
      scope.raf(now => {
        const f = (now - start) / DURATION;
        hud.progress(f);
        if (f >= 1 && !over) { over = true; endRound && endRound('end'); }
      });
    }

    while (!over && !(zen && found >= ROUNDS_ZEN)) {
      if (zen) hud.progress(found / ROUNDS_ZEN);
      const [normal, odd] = makeRound(rng, level);
      const target = rng.int(0, n * n - 1);
      const tiles = Array.from({ length: n * n }, (_, i) => h('button', { class: 'tile oo-tile', type: 'button', 'data-i': i, 'aria-label': `Dessin ${i + 1}`, html: i === target ? odd : normal }));
      grid.replaceChildren(...tiles);
      const t0 = scope.now();

      const r = await new Promise(resolve => {
        endRound = v => { endRound = null; onTile = null; resolve(v); };
        onTile = (i, tile) => {
          if (i === target) { endRound('hit'); return; }
          errors++;
          tile.classList.remove('ko');
          void tile.offsetWidth;
          tile.classList.add('ko');
          scope.timeout(() => tile.classList.remove('ko'), 450);
          sfx.bad();
          buzz(25);
        };
      });
      if (r === 'end') break;

      found++;
      times.push(scope.now() - t0);
      tiles[target].classList.add('ok');
      sfx.good();
      hud.label(found === 1 ? '1 trouvé' : `${found} trouvés`);
      await scope.sleep(260);
    }
    endRound = null;
    hud.progress(1);

    const elapsed = Math.max(1, scope.now() - start);
    const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const target = 900 + n * n * 90; // temps « confortable » attendu pour cette taille de grille
    let next = level;
    if (found >= 3 && mean < target && errors <= 2) next = level + 1;
    else if (!found || mean > target * 2 || errors > found * 0.5) next = level - 1;

    return {
      score: Math.round((found * 60000) / elapsed),
      accuracy: found / Math.max(1, found + errors),
      nextLevel: clamp(next, 1, 20),
      stats: [
        ['Intrus trouvés', String(found)],
        ['Temps moyen par grille', mean ? fmtSec(mean) : '—'],
        ['Erreurs', String(errors)],
      ],
    };
  },
};
