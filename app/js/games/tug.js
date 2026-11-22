// Tir à la corde — duel de calcul mental en face-à-face sur un seul téléphone.
// Chaque joueur a SA difficulté : un enfant et un grand-parent peuvent s'affronter à égalité.
import { h, clamp, tap } from '../util.js';
import { avatarSVG } from '../avatar.js';
import { icon } from '../icons.js';

function question(rng, d) {
  let text;
  let ans;
  if (d <= 1) {
    const a = rng.int(1, 9); const b = rng.int(1, 9);
    text = `${a} + ${b}`; ans = a + b;
  } else if (d === 2) {
    if (rng.chance(0.5)) { const a = rng.int(11, 39); const b = rng.int(2, 9); text = `${a} + ${b}`; ans = a + b; }
    else { const a = rng.int(12, 40); const b = rng.int(2, 9); text = `${a} − ${b}`; ans = a - b; }
  } else if (d === 3) {
    const r = rng.next();
    if (r < 0.6) { const a = rng.int(2, 9); const b = rng.int(3, 9); text = `${a} × ${b}`; ans = a * b; }
    else { const a = rng.int(21, 79); const b = rng.int(11, 19); text = `${a} + ${b}`; ans = a + b; }
  } else {
    const a = rng.int(3, 9); const b = rng.int(3, 9); const c = rng.int(2, 12);
    if (rng.chance(0.5)) { text = `${a} × ${b} + ${c}`; ans = a * b + c; } else { text = `${a} × ${b} − ${c}`; ans = a * b - c; }
  }
  const opts = new Set([ans]);
  const deltas = rng.shuffle([1, -1, 2, -2, 10, -10, 3, 5]);
  for (const dlt of deltas) { if (opts.size >= 4) break; if (ans + dlt >= 0) opts.add(ans + dlt); }
  return { text, ans, options: rng.shuffle([...opts]) };
}

export default {
  id: 'tug',
  domain: 'logique',
  kind: 'party',
  world: 'w-tug',
  name: 'Tir à la corde',
  tagline: 'Calcule plus vite que l’autre pour tirer la corde.',
  trains: 'Calcul mental rapide',
  rule: 'Posez le téléphone à plat entre vous deux. Chaque bonne réponse tire la corde de ton côté. Le premier qui l’amène dans son camp gagne. Une erreur bloque ton côté une seconde.',
  short: 'Réponds juste pour tirer !',
  duration: '≈ 1 min',
  faceToFace: true,
  unit: () => 'tirages',
  party: { min: 2, max: 2, perPlayerLevel: [[1, 'Facile'], [2, 'Moyen'], [3, 'Costaud'], [4, 'Expert']] },
  tip: {
    title: 'Arrondis, puis corrige',
    text: 'Pour 38 + 7, fais 38 + 2 = 40, puis + 5 = 45. Passer par la dizaine est plus rapide que de compter.',
    life: 'Au marché : 2,95 € + 1,98 €, c’est 3 + 2 moins 7 centimes.',
  },

  async play({ stage, players, rng, scope, sfx, buzz, hud, pause }) {
    const NEED = 6;
    const DURATION = 90;
    let pos = 0; // >0 : vers le joueur 1 (en bas)
    let over = false;
    let finish;
    const done = new Promise(r => { finish = r; });
    const pulls = [0, 0];
    const errors = [0, 0];

    const knot = h('div', { class: 'tug-knot' }, h('span', { class: 'tug-flag' }));
    const rope = h('div', { class: 'tug-rope', 'aria-hidden': 'true' }, h('div', { class: 'tug-line' }), h('div', { class: 'tug-camp top' }), h('div', { class: 'tug-camp bottom' }), knot);
    const timer = h('i');
    const pauseBtn = h('button', { class: 'ftf-pause', type: 'button', 'aria-label': 'Pause', onClick: pause }, icon('pause'));

    const sides = players.map((p, idx) => {
      const q = h('p', { class: 'tug-q', 'aria-live': 'polite' });
      const btns = [0, 1, 2, 3].map(() => h('button', { class: 'tug-btn', type: 'button' }));
      const flash = h('p', { class: 'tug-msg' });
      const half = h('div', { class: `ftf-half tug-half ${idx === 1 ? 'flip' : ''}`, style: `--pc:${p.color}` },
        h('div', { class: 'ftf-who' }, h('span', { class: 'ftf-av', html: avatarSVG(p.avatar, { size: 40 }) }), h('span', { class: 'ftf-name' }, p.name)),
        q,
        h('div', { class: 'tug-grid' }, btns),
        flash);
      const side = { p, idx, q, btns, half, flash, cur: null, locked: false, level: p.level || 1 };
      btns.forEach(b => tap(scope, b, () => answer(side, Number(b.dataset.v), b)));
      return side;
    });

    stage.replaceChildren(h('div', { class: 'tug ftf' }, sides[1].half, h('div', { class: 'ftf-mid' }, h('div', { class: 'ftf-timer' }, timer), pauseBtn), sides[0].half, rope));
    hud.label('');

    function ask(side) {
      side.cur = question(rng, side.level);
      side.q.textContent = `${side.cur.text} = ?`;
      side.btns.forEach((b, i) => { b.textContent = side.cur.options[i]; b.dataset.v = side.cur.options[i]; b.classList.remove('ok', 'ko'); });
      side.q.classList.remove('pop');
      void side.q.offsetWidth;
      side.q.classList.add('pop');
    }

    function render() {
      const k = clamp(pos / NEED, -1, 1);
      rope.style.setProperty('--k', k.toFixed(3));
    }

    function answer(side, v, btn) {
      if (over || side.locked) return;
      if (v === side.cur.ans) {
        btn.classList.add('ok');
        pulls[side.idx]++;
        pos += side.idx === 0 ? 1 : -1;
        sfx.tug();
        buzz(12);
        rope.classList.remove('jerk-down', 'jerk-up');
        void rope.offsetWidth;
        rope.classList.add(side.idx === 0 ? 'jerk-down' : 'jerk-up');
        render();
        if (Math.abs(pos) >= NEED) { win(pos > 0 ? 0 : 1); return; }
        scope.timeout(() => ask(side), 120);
      } else {
        btn.classList.add('ko');
        errors[side.idx]++;
        side.locked = true;
        side.half.classList.add('locked');
        side.flash.textContent = 'Oups ! 1 seconde de pénalité';
        sfx.bad();
        buzz([30, 30, 30]);
        scope.timeout(() => { side.locked = false; side.half.classList.remove('locked'); side.flash.textContent = ''; ask(side); }, 1000);
      }
    }

    function win(idx) {
      if (over) return;
      over = true;
      rope.classList.add(idx === 0 ? 'won-down' : idx === 1 ? 'won-up' : 'won-draw');
      sides.forEach(s => s.half.classList.add(s.idx === idx ? 'winner' : idx < 0 ? 'draw' : 'loser'));
      if (idx >= 0) sides[idx].flash.textContent = 'VICTOIRE !';
      sfx.win();
      scope.timeout(() => finish(idx), 1500);
    }

    sides.forEach(ask);
    render();
    let t = 0;
    scope.raf(now => {
      if (over) return;
      if (!t) t = now;
      const f = (now - t) / 1000 / DURATION;
      timer.style.transform = `scaleX(${clamp(1 - f, 0, 1)})`;
      hud.progress(f);
      if (f >= 1) win(pos === 0 ? -1 : pos > 0 ? 0 : 1);
    });

    const winner = await done;
    return {
      winner,
      scores: pulls,
      stats: players.map((p, i) => [p.name, `${pulls[i]} bonne${pulls[i] > 1 ? 's' : ''} réponse${pulls[i] > 1 ? 's' : ''}, ${errors[i]} erreur${errors[i] > 1 ? 's' : ''}`]),
    };
  },
};
