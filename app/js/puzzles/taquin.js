// Taquin — remettre les plaquettes numérotées dans l'ordre en les faisant glisser.
import { h } from '../util.js';

// Meilleur coup suivant (IDA*, distance de Manhattan) — utilisé pour l'indice en 3 × 3.
export function bestNextMove(tiles, n) {
  const t = tiles.slice();
  const dist = () => {
    let d = 0;
    for (let i = 0; i < t.length; i++) {
      const v = t[i];
      if (v) d += Math.abs(Math.floor((v - 1) / n) - Math.floor(i / n)) + Math.abs(((v - 1) % n) - (i % n));
    }
    return d;
  };
  let first = -1;
  let nodes = 0;
  const search = (e, g, bound, prev) => {
    const hv = dist();
    if (g + hv > bound) return g + hv;
    if (hv === 0) return -1;
    if (++nodes > 2e6) return Infinity;
    let min = Infinity;
    const r = Math.floor(e / n);
    const c = e % n;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
      const j = rr * n + cc;
      if (j === prev) continue;
      t[e] = t[j];
      t[j] = 0;
      if (g === 0) first = t[e];
      const res = search(j, g + 1, bound, e);
      if (res === -1) return -1;
      t[j] = t[e];
      t[e] = 0;
      if (res < min) min = res;
    }
    return min;
  };
  let bound = dist();
  if (!bound) return -1;
  for (let k = 0; k < 60; k++) {
    const res = search(t.indexOf(0), 0, bound, -1);
    if (res === -1) return first;
    if (res === Infinity) return -1;
    bound = res;
  }
  return -1;
}

export default {
  id: 'taquin',
  name: 'Taquin',
  short: 'Remets les plaquettes dans l’ordre.',
  icon: 'taquin',
  rules: [
    'Fais glisser les plaquettes dans la case vide pour les remettre dans l’ordre : 1, 2, 3… de gauche à droite et de haut en bas.',
    'Touche une plaquette sur la même ligne ou la même colonne que la case vide : elle glisse, avec ses voisines si besoin.',
    'Méthode : range d’abord la première ligne, puis la première colonne. Le reste devient un taquin plus petit.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '3 × 3, peu mélangé', n: 3, shuffle: 22 },
    { id: 'facile', label: 'Facile', detail: '3 × 3', n: 3, shuffle: 200 },
    { id: 'moyen', label: 'Moyen', detail: '4 × 4', n: 4, shuffle: 400 },
    { id: 'difficile', label: 'Difficile', detail: '5 × 5', n: 5, shuffle: 900 },
  ],
  daily: 'facile',

  create(level, rng) {
    const n = level.n;
    const solved = [...Array(n * n - 1).keys()].map(i => i + 1).concat(0);
    for (;;) {
      const t = solved.slice();
      let e = n * n - 1;
      let prev = -1;
      for (let k = 0; k < level.shuffle; k++) {
        const r = Math.floor(e / n);
        const c = e % n;
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dr, dc]) => [r + dr, c + dc])
          .filter(([rr, cc]) => rr >= 0 && rr < n && cc >= 0 && cc < n)
          .map(([rr, cc]) => rr * n + cc)
          .filter(j => j !== prev);
        const j = rng.pick(opts);
        t[e] = t[j];
        t[j] = 0;
        prev = e;
        e = j;
      }
      const misplaced = t.filter((v, i) => v && v !== i + 1).length;
      if (misplaced >= Math.min(n * n - 2, 5)) return { n, tiles: t };
    }
  },

  start(ctx) {
    const { n } = ctx.puzzle;
    const st = ctx.state || { tiles: ctx.puzzle.tiles.slice(), moves: 0 };
    const history = [];
    const board = h('div', { class: 'tq', style: `--n:${n}`, role: 'group', 'aria-label': `Taquin ${n} par ${n}` });
    const els = {};
    for (let v = 1; v < n * n; v++) {
      const b = h('button', { class: 'tq-tile', type: 'button', 'data-v': v }, h('span', { class: 'tq-face' }, String(v)));
      b.addEventListener('click', () => press(st.tiles.indexOf(v)));
      els[v] = b;
      board.append(b);
    }
    ctx.board.append(board);
    const undoBtn = ctx.tool('undo', 'Annuler', undo);
    ctx.tool('hint', 'Indice', hint);

    function press(i) {
      const e = st.tiles.indexOf(0);
      const [er, ec, r, c] = [Math.floor(e / n), e % n, Math.floor(i / n), i % n];
      if (i === e || (er !== r && ec !== c)) { ctx.status('Touche une plaquette alignée avec la case vide.'); return; }
      history.push(st.tiles.slice());
      const step = er === r ? (c > ec ? 1 : -1) : (r > er ? n : -n);
      let cur = e;
      while (cur !== i) {
        st.tiles[cur] = st.tiles[cur + step];
        st.tiles[cur + step] = 0;
        cur += step;
        st.moves++;
      }
      ctx.sfx.tap();
      commit();
    }

    function undo() {
      const prev = history.pop();
      if (!prev) return;
      st.tiles = prev;
      commit();
    }

    function hint() {
      if (n === 3) {
        const v = bestNextMove(st.tiles, n);
        if (v > 0) {
          ctx.useHint();
          els[v].classList.add('flash');
          setTimeout(() => els[v].classList.remove('flash'), 1500);
          ctx.status(`Indice : fais glisser la plaquette ${v}.`);
        }
        return;
      }
      ctx.useHint();
      const firstWrong = st.tiles.findIndex((v, i) => v !== i + 1 && i < n * n - 1);
      const want = firstWrong + 1;
      ctx.status(firstWrong < n
        ? `Indice : commence par la première ligne. Amène la plaquette ${want} à sa place.`
        : `Indice : la plaquette ${want} n’est pas encore à sa place. Ne dérange pas celles déjà rangées.`);
      if (els[want]) { els[want].classList.add('flash'); setTimeout(() => els[want].classList.remove('flash'), 1500); }
    }

    function render() {
      st.tiles.forEach((v, i) => {
        if (!v) return;
        const el = els[v];
        el.style.setProperty('--x', i % n);
        el.style.setProperty('--y', Math.floor(i / n));
        el.classList.toggle('ok', v === i + 1);
        el.setAttribute('aria-label', `Plaquette ${v}${v === i + 1 ? ', à sa place' : ''}`);
      });
      undoBtn.disabled = !history.length;
      ctx.progress(`${st.moves} coup${st.moves > 1 ? 's' : ''}`);
    }

    function commit() {
      ctx.save(st);
      render();
      if (st.tiles.every((v, i) => v === (i === n * n - 1 ? 0 : i + 1))) ctx.solved({ moves: st.moves });
    }

    ctx.onKey(e => {
      const em = st.tiles.indexOf(0);
      const map = { ArrowUp: em + n, ArrowDown: em - n, ArrowLeft: (em % n) < n - 1 ? em + 1 : -1, ArrowRight: (em % n) > 0 ? em - 1 : -1 };
      const j = map[e.key];
      if (j === undefined) return false;
      if (j >= 0 && j < n * n) press(j);
      return true;
    });
    render();
  },
};
