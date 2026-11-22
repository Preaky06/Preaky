// Tours de Hanoï — déplacer la pile de disques sur la tour de droite, un disque à la fois,
// jamais un grand sur un petit.
import { h } from '../util.js';

// Coup optimal depuis n'importe quelle position (récursif) : [de, vers] ou null si résolu.
export function nextMove(pegs, n, target = 2) {
  const pos = [];
  pegs.forEach((p, i) => p.forEach(d => { pos[d] = i; }));
  const solve = (k, to) => {
    if (k === 0) return null;
    if (pos[k] === to) return solve(k - 1, to);
    const other = 3 - pos[k] - to;
    return solve(k - 1, other) || [pos[k], to];
  };
  return solve(n, target);
}

const NAMES = ['gauche', 'du milieu', 'de droite'];

export default {
  id: 'hanoi',
  name: 'Tours de Hanoï',
  short: 'Déplace la pile, un disque à la fois.',
  icon: 'hanoi',
  rules: [
    'Déplace toute la pile sur la tour de droite.',
    'Un seul disque à la fois, et jamais un disque sur un disque plus petit.',
    'Touche une tour pour soulever son disque du haut, puis touche la tour où le poser.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '3 disques · 7 coups minimum', n: 3 },
    { id: 'facile', label: 'Facile', detail: '4 disques · 15 coups minimum', n: 4 },
    { id: 'moyen', label: 'Moyen', detail: '5 disques · 31 coups minimum', n: 5 },
    { id: 'difficile', label: 'Difficile', detail: '6 disques · 63 coups minimum', n: 6 },
    { id: 'expert', label: 'Expert', detail: '7 disques · 127 coups minimum', n: 7 },
  ],
  daily: 'moyen',

  create(level) {
    return { n: level.n };
  },

  start(ctx) {
    const { n } = ctx.puzzle;
    const st = ctx.state || { pegs: [[...Array(n).keys()].map(i => n - i), [], []], moves: 0 };
    const history = [];
    let held = -1;
    const min = 2 ** n - 1;

    const board = h('div', { class: 'hn', style: `--n:${n}` });
    const pegEls = [0, 1, 2].map(p => {
      const b = h('button', { class: 'hn-peg', type: 'button', 'aria-label': `Tour ${NAMES[p]}` }, h('span', { class: 'hn-pole' }), h('span', { class: 'hn-stack' }), h('span', { class: 'hn-base' }));
      b.addEventListener('click', () => tapPeg(p));
      board.append(b);
      return b;
    });
    ctx.board.append(board, h('p', { class: 'hn-goal' }, `Objectif : la tour de droite. Minimum possible : ${min} coups.`));
    const undoBtn = ctx.tool('undo', 'Annuler', undo);
    ctx.tool('hint', 'Indice', hint);

    function tapPeg(p) {
      if (held < 0) {
        if (!st.pegs[p].length) { ctx.status('Cette tour est vide.'); return; }
        held = p;
        ctx.sfx.tap();
        render();
        return;
      }
      if (held === p) { held = -1; render(); return; }
      const d = st.pegs[held][st.pegs[held].length - 1];
      const top = st.pegs[p][st.pegs[p].length - 1];
      if (top && top < d) {
        ctx.status('Impossible : on ne pose jamais un disque sur un plus petit.', 'err');
        ctx.sfx.bad();
        ctx.buzz([20, 30, 20]);
        pegEls[p].classList.remove('shake');
        void pegEls[p].offsetWidth;
        pegEls[p].classList.add('shake');
        return;
      }
      history.push([held, p]);
      st.pegs[p].push(st.pegs[held].pop());
      st.moves++;
      held = -1;
      ctx.sfx.tap();
      ctx.status('');
      commit();
    }

    function undo() {
      const m = history.pop();
      if (!m) return;
      const [from, to] = m;
      st.pegs[from].push(st.pegs[to].pop());
      st.moves = Math.max(0, st.moves - 1);
      held = -1;
      commit();
    }

    function hint() {
      const m = nextMove(st.pegs, n);
      if (!m) return;
      ctx.useHint();
      const d = st.pegs[m[0]][st.pegs[m[0]].length - 1];
      held = -1;
      render();
      pegEls[m[0]].classList.add('flash');
      pegEls[m[1]].classList.add('flash');
      setTimeout(() => { pegEls[m[0]].classList.remove('flash'); pegEls[m[1]].classList.remove('flash'); }, 1600);
      ctx.status(`Indice : déplace le disque ${d} de la tour ${NAMES[m[0]]} vers la tour ${NAMES[m[1]]}.`);
    }

    function render() {
      pegEls.forEach((el, p) => {
        const stack = el.querySelector('.hn-stack');
        stack.replaceChildren(...st.pegs[p].map((d, k) => h('span', {
          class: `hn-disk${held === p && k === st.pegs[p].length - 1 ? ' up' : ''}`,
          style: `--w:${30 + (d / n) * 68}%;--k:${d}`,
        }, String(d))));
        el.classList.toggle('holding', held === p);
        el.setAttribute('aria-label', `Tour ${NAMES[p]} : ${st.pegs[p].length ? `disques ${st.pegs[p].join(', ')}` : 'vide'}${held === p ? ', disque soulevé' : ''}`);
      });
      undoBtn.disabled = !history.length;
      ctx.progress(`${st.moves} coup${st.moves > 1 ? 's' : ''} · minimum ${min}`);
    }

    function commit() {
      ctx.save(st);
      render();
      if (st.pegs[2].length === n) ctx.solved({ moves: st.moves, message: st.moves === min ? 'En un minimum de coups : parfait !' : `En ${st.moves} coups (le minimum est ${min}).` });
    }

    ctx.onKey(e => {
      const k = { 1: 0, 2: 1, 3: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 }[e.key];
      if (k === undefined) return false;
      tapPeg(k);
      return true;
    });
    render();
  },
};
