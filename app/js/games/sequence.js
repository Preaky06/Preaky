// Séquence — tâche des blocs de Corsi (mémoire de travail visuo-spatiale).
import { h, clamp, tap } from '../util.js';

export default {
  id: 'sequence',
  domain: 'memoire',
  name: 'Séquence',
  tagline: 'Retiens l’ordre des cases qui s’allument.',
  trains: 'Mémoire de travail visuelle et spatiale',
  rule: 'Des cases s’allument une à une. Touche-les ensuite dans le même ordre.',
  short: 'Regarde, retiens l’ordre, puis touche les cases.',
  duration: '≈ 1 min',
  unit: n => (n <= 1 ? 'case retenue d’affilée' : 'cases retenues d’affilée'),
  tip: {
    title: 'Dessine la forme',
    text: 'Ne retiens pas des cases isolées : relie-les dans ta tête pour former un dessin (un Z, une flèche, un escalier). Une forme se retient bien mieux qu’une liste de positions.',
    life: 'Retenir un trajet, un schéma de déverrouillage, l’endroit où tu t’es garé.',
  },
  demo() {
    const n = [0, 1, 0, 0, 2, 0, 3, 0, 0];
    return `<div class="demo-seq" aria-hidden="true">${n.map(v => `<span class="${v ? 'on' : ''}">${v || ''}</span>`).join('')}</div>
      <p class="demo-cap">3 cases ? Retiens plutôt « une ligne qui descend vers la gauche ».</p>`;
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const size = level >= 5 ? 4 : 3;
    const N = size * size;
    const TRIALS = 8;
    const on = zen ? 820 : clamp(720 - level * 18, 430, 720);
    const off = zen ? 320 : 210;
    let span = clamp(level + 1, 2, 14);

    const grid = h('div', { class: 'seq-grid', style: `--n:${size}` });
    const tiles = Array.from({ length: N }, (_, i) => h('button', { class: 'tile seq-tile', type: 'button', 'aria-label': `Case ${i + 1}` }));
    grid.append(...tiles);
    stage.replaceChildren(grid);

    let accept = null;
    tiles.forEach((t, i) => tap(scope, t, () => accept && accept(i)));
    const flash = (i, cls, ms) => {
      tiles[i].classList.add(cls);
      scope.timeout(() => tiles[i].classList.remove(cls), ms);
    };

    let best = 0;
    let ok = 0;
    for (let t = 0; t < TRIALS; t++) {
      hud.progress(t / TRIALS);
      hud.label(`Regarde bien… ${span} cases`);
      grid.classList.add('is-watching');

      const seq = [];
      for (let k = 0; k < span; k++) {
        let i;
        do { i = rng.int(0, N - 1); } while (seq.length && (i === seq[seq.length - 1] || (span <= N && seq.includes(i))));
        seq.push(i);
      }

      await scope.sleep(650);
      for (let k = 0; k < seq.length; k++) {
        flash(seq[k], 'lit', on);
        sfx.tick(k);
        await scope.sleep(on + off);
      }
      grid.classList.remove('is-watching');
      hud.label(`À toi ! 0 / ${span}`);

      const success = await new Promise(resolve => {
        let pos = 0;
        accept = i => {
          if (i === seq[pos]) {
            flash(i, 'hit', 240);
            sfx.tap();
            pos++;
            hud.label(`À toi ! ${pos} / ${span}`);
            if (pos === seq.length) { accept = null; resolve(true); }
          } else {
            accept = null;
            flash(i, 'miss', 520);
            resolve(false);
          }
        };
      });

      if (success) {
        ok++;
        best = Math.max(best, span);
        sfx.good();
        buzz(15);
        hud.flash('good');
        hud.label('Bravo !');
        span++;
        await scope.sleep(750);
      } else {
        sfx.bad();
        buzz([30, 40, 30]);
        hud.flash('bad');
        hud.label('Raté. Voici le bon ordre :');
        await scope.sleep(450);
        for (const i of seq) {
          flash(i, 'show', 280);
          await scope.sleep(360);
        }
        await scope.sleep(450);
        span = Math.max(2, span - 1);
      }
    }
    hud.progress(1);

    return {
      score: best,
      accuracy: ok / TRIALS,
      // Prochaine partie : on démarre une case sous ton meilleur empan.
      nextLevel: best ? clamp(best - 2, 1, 18) : Math.max(1, level - 1),
      stats: [
        ['Plus longue séquence', `${best} case${best > 1 ? 's' : ''}`],
        ['Séquences réussies', `${ok} / ${TRIALS}`],
      ],
    };
  },
};
