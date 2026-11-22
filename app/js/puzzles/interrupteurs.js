// Interrupteurs — chaque case inverse sa lumière et celles de ses 4 voisines. Tout éteindre.
// La grille est fabriquée à l'envers à partir de k appuis : on connaît donc une solution,
// et comme chaque appui s'annule lui-même, la solution restante = solution ⊕ appuis du joueur.
import { h } from '../util.js';

function press(lit, n, i) {
  const r = Math.floor(i / n);
  const c = i % n;
  for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) lit[rr * n + cc] ^= 1;
  }
}

export default {
  id: 'interrupteurs',
  name: 'Interrupteurs',
  short: 'Éteins toutes les lumières.',
  icon: 'bulb',
  rules: [
    'Toucher une case allume ou éteint cette case et ses voisines du dessus, du dessous, de gauche et de droite.',
    'Le but : éteindre toutes les lumières.',
    'Astuce : l’ordre des appuis ne change rien au résultat, et appuyer deux fois sur la même case revient à ne rien faire.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '3 × 3', n: 3, k: 3 },
    { id: 'facile', label: 'Facile', detail: '4 × 4', n: 4, k: 5 },
    { id: 'moyen', label: 'Moyen', detail: '5 × 5', n: 5, k: 7 },
    { id: 'difficile', label: 'Difficile', detail: '5 × 5', n: 5, k: 11 },
    { id: 'expert', label: 'Expert', detail: '6 × 6', n: 6, k: 15 },
  ],
  daily: 'moyen',

  create(level, rng) {
    const { n, k } = level;
    for (;;) {
      const presses = rng.shuffle([...Array(n * n).keys()]).slice(0, k);
      const lit = new Array(n * n).fill(0);
      presses.forEach(i => press(lit, n, i));
      if (lit.some(Boolean)) return { n, lit, presses, k };
    }
  },

  start(ctx) {
    const { n, presses, k } = ctx.puzzle;
    const st = ctx.state || { lit: ctx.puzzle.lit.slice(), pressed: new Array(n * n).fill(0), log: [], moves: 0 };
    const board = h('div', { class: 'io', style: `--n:${n}`, role: 'grid', 'aria-label': `Grille de ${n} par ${n} lumières` });
    const cells = st.lit.map((_, i) => {
      const b = h('button', { class: 'io-cell', type: 'button', 'data-i': i }, h('span', { class: 'io-bulb' }));
      b.addEventListener('click', () => tap(i));
      return b;
    });
    board.append(...cells);
    ctx.board.append(board, h('p', { class: 'hn-goal' }, `Une solution existe en ${k} appuis.`));
    const undoBtn = ctx.tool('undo', 'Annuler', undo);
    ctx.tool('hint', 'Indice', hint);

    function tap(i, record = true) {
      press(st.lit, n, i);
      st.pressed[i] ^= 1;
      if (record) { st.log.push(i); st.moves++; }
      ctx.sfx.tap();
      const r = Math.floor(i / n);
      const c = i % n;
      for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) {
          const el = cells[rr * n + cc];
          el.classList.remove('pulse');
          void el.offsetWidth;
          el.classList.add('pulse');
        }
      }
      commit();
    }

    function undo() {
      const i = st.log.pop();
      if (i === undefined) return;
      st.moves = Math.max(0, st.moves - 1);
      tap(i, false);
    }

    function hint() {
      const need = new Array(n * n).fill(0);
      presses.forEach(i => { need[i] ^= 1; });
      const todo = need.map((v, i) => v ^ st.pressed[i]).map((v, i) => (v ? i : -1)).filter(i => i >= 0);
      if (!todo.length) return;
      ctx.useHint();
      const i = todo[Math.floor(Math.random() * todo.length)];
      cells[i].classList.add('flash');
      setTimeout(() => cells[i].classList.remove('flash'), 1600);
      ctx.status(`Indice : touche la case qui clignote. Il reste ${todo.length} appui${todo.length > 1 ? 's' : ''} pour finir.`);
    }

    function render() {
      cells.forEach((el, i) => {
        el.classList.toggle('on', !!st.lit[i]);
        el.setAttribute('aria-label', `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1} : ${st.lit[i] ? 'allumée' : 'éteinte'}`);
      });
      undoBtn.disabled = !st.log.length;
      const on = st.lit.filter(Boolean).length;
      ctx.progress(`${on} lumière${on > 1 ? 's' : ''} allumée${on > 1 ? 's' : ''} · ${st.moves} appui${st.moves > 1 ? 's' : ''}`);
    }

    function commit() {
      ctx.save(st);
      render();
      if (st.lit.every(v => !v)) ctx.solved({ moves: st.moves });
    }
    render();
  },
};
