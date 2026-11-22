// Flèches — tâche de flanker d'Eriksen (attention sélective, contrôle inhibiteur).
import { h, clamp, tap, fmtPct, fmtSec } from '../util.js';
import { iconHTML } from '../icons.js';

const arrow = dir => iconHTML(dir < 0 ? 'arrowL' : 'arrowR');

export default {
  id: 'arrows',
  domain: 'concentration',
  name: 'Flèches',
  tagline: 'Seule la flèche du milieu compte.',
  trains: 'Attention sélective, résistance aux distractions',
  rule: 'Une rangée de flèches apparaît. Indique la direction de celle du milieu, sans te laisser piéger par les autres.',
  short: 'Seule la flèche du milieu compte.',
  duration: '≈ 45 s',
  unit: () => 'réponses justes par minute',
  tip: {
    title: 'Fixe le centre',
    text: 'Pose ton regard au milieu avant que les flèches arrivent. Les flèches des bords sont du bruit : ne les « écoute » pas, ne lis que la cible.',
    life: 'Pour te concentrer, retire une distraction à la fois : téléphone face cachée, un seul onglet ouvert.',
  },
  demo() {
    const dirs = [-1, -1, 1, -1, -1];
    return `<div class="demo-ar" aria-hidden="true">${dirs.map((d, i) => `<span class="${i === 2 ? 'target' : ''}">${arrow(d)}</span>`).join('')}</div>
      <p class="demo-cap">Ici, la bonne réponse est <b>droite</b>.</p>`;
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const TRIALS = zen ? 24 : 30;
    const side = level < 4 ? 1 : level < 10 ? 2 : 3;
    const pIncong = clamp(0.3 + level * 0.03, 0.3, 0.7);
    const deadline = zen ? null : clamp(2300 - level * 80, 900, 2300);
    const jitter = level >= 6;

    const row = h('div', { class: 'ar-row', style: `--count:${side * 2 + 1}` });
    const field = h('div', { class: 'ar-field' }, row);
    const btnL = h('button', { class: 'ar-btn', type: 'button', 'aria-label': 'Gauche', html: arrow(-1) });
    const btnR = h('button', { class: 'ar-btn', type: 'button', 'aria-label': 'Droite', html: arrow(1) });
    stage.replaceChildren(h('div', { class: 'ar' }, field, h('div', { class: 'ar-controls' }, btnL, btnR)));

    let respond = null;
    tap(scope, btnL, () => respond && respond(-1, btnL));
    tap(scope, btnR, () => respond && respond(1, btnR));
    scope.on(window, 'keydown', e => {
      if (scope.paused || !respond) return;
      if (e.key === 'ArrowLeft') respond(-1, btnL);
      if (e.key === 'ArrowRight') respond(1, btnR);
    });

    hud.label('Direction de la flèche du milieu ?');
    let correct = 0;
    let timeouts = 0;
    let rtTotal = 0;
    const rts = [];

    for (let t = 0; t < TRIALS; t++) {
      hud.progress(t / TRIALS);
      const dir = rng.chance(0.5) ? -1 : 1;
      const flank = rng.chance(pIncong) ? -dir : dir;
      const count = side * 2 + 1;
      row.replaceChildren(...Array.from({ length: count }, (_, i) => h('span', {
        class: `ar-arrow${i === side ? ' is-target' : ''}${i === side && level <= 2 ? ' hint' : ''}`,
        html: arrow(i === side ? dir : flank),
      })));
      row.style.transform = jitter ? `translate(${rng.int(-14, 14)}%, ${rng.int(-90, 90)}%)` : '';

      const t0 = scope.now();
      const res = await new Promise(resolve => {
        const timer = deadline ? scope.timeout(() => { respond = null; resolve({ timeout: true }); }, deadline) : null;
        respond = (d, btn) => { respond = null; scope.clear(timer); resolve({ d, btn, rt: scope.now() - t0 }); };
      });

      if (res.timeout) {
        timeouts++;
        rtTotal += deadline;
        sfx.bad();
        hud.label('Trop lent, pas grave. On continue !');
      } else if (res.d === dir) {
        correct++;
        rts.push(res.rt);
        rtTotal += res.rt;
        res.btn.classList.add('ok');
        sfx.tap();
        hud.label('Direction de la flèche du milieu ?');
      } else {
        rtTotal += res.rt;
        res.btn.classList.add('ko');
        sfx.bad();
        buzz(30);
        hud.flash('bad');
        hud.label('Piège ! Regarde seulement le milieu.');
      }
      await scope.sleep(zen ? 420 : 280);
      btnL.classList.remove('ok', 'ko');
      btnR.classList.remove('ok', 'ko');
      row.replaceChildren();
      await scope.sleep(zen ? 220 : 140);
    }
    hud.progress(1);

    const acc = correct / TRIALS;
    const mean = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
    let next = level;
    if (acc >= 0.93 && timeouts <= 1) next = level + (acc === 1 && mean < 650 && !zen ? 2 : 1);
    else if (acc < 0.8) next = level - 1;

    return {
      score: Math.round((correct * 60000) / Math.max(1, rtTotal)),
      accuracy: acc,
      nextLevel: clamp(next, 1, 20),
      stats: [
        ['Précision', fmtPct(acc)],
        ['Temps moyen par réponse', mean ? fmtSec(mean) : '—'],
        ...(timeouts ? [['Réponses trop lentes', String(timeouts)]] : []),
      ],
    };
  },
};
