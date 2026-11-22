// Sudoku 4×4, 6×6 et 9×9 — grilles générées avec solution unique garantie.
import { h } from '../util.js';

const BOX = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };
const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

function boxOf(i, n) {
  const [br, bc] = BOX[n];
  const r = Math.floor(i / n);
  const c = i % n;
  return Math.floor(r / br) * (n / bc) + Math.floor(c / bc);
}

// Résout / compte les solutions (s'arrête à `limit`). Si `rng` est fourni, ordre aléatoire (génération).
function search(grid, n, { limit = 2, rng = null, out = null } = {}) {
  const g = grid.slice();
  const full = (1 << (n + 1)) - 2;
  const rows = new Array(n).fill(0);
  const cols = new Array(n).fill(0);
  const boxes = new Array(n).fill(0);
  for (let i = 0; i < n * n; i++) {
    const v = g[i];
    if (!v) continue;
    const r = Math.floor(i / n);
    const c = i % n;
    const b = boxOf(i, n);
    const bit = 1 << v;
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return 0;
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  const bxs = Array.from({ length: n * n }, (_, i) => boxOf(i, n));
  let count = 0;
  const rec = () => {
    let best = -1;
    let bestMask = 0;
    let bestN = 99;
    for (let i = 0; i < n * n; i++) {
      if (g[i]) continue;
      const m = full & ~(rows[Math.floor(i / n)] | cols[i % n] | boxes[bxs[i]]);
      const k = popcount(m);
      if (k < bestN) { bestN = k; best = i; bestMask = m; if (k <= 1) break; }
    }
    if (best < 0) {
      count++;
      if (out && count === 1) out.push(...g);
      return;
    }
    if (!bestMask) return;
    let digits = [];
    for (let d = 1; d <= n; d++) if (bestMask & (1 << d)) digits.push(d);
    if (rng) digits = rng.shuffle(digits);
    const r = Math.floor(best / n);
    const c = best % n;
    const b = bxs[best];
    for (const d of digits) {
      const bit = 1 << d;
      g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      rec();
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= limit) return;
    }
  };
  rec();
  return count;
}

export function generate(n, givens, rng) {
  const out = [];
  search(new Array(n * n).fill(0), n, { limit: 1, rng, out });
  const solution = out.slice(0, n * n);
  const grid = solution.slice();
  const total = n * n;
  // Retrait symétrique (comme dans les journaux), tant que la solution reste unique.
  const order = rng.shuffle([...Array(Math.ceil(total / 2)).keys()]);
  let filled = total;
  for (const i of order) {
    if (filled <= givens) break;
    const j = total - 1 - i;
    const a = grid[i];
    const b = grid[j];
    grid[i] = 0; grid[j] = 0;
    if (search(grid, n, { limit: 2 }) !== 1) { grid[i] = a; grid[j] = b; }
    else filled -= i === j ? 1 : 2;
  }
  // Seconde passe case par case pour atteindre la cible des niveaux les plus durs.
  for (const i of rng.shuffle([...Array(total).keys()])) {
    if (filled <= givens) break;
    if (!grid[i]) continue;
    const a = grid[i];
    grid[i] = 0;
    if (search(grid, n, { limit: 2 }) !== 1) grid[i] = a;
    else filled--;
  }
  return { n, grid, solution };
}

export default {
  id: 'sudoku',
  name: 'Sudoku',
  short: 'Remplis la grille sans répéter un chiffre.',
  icon: 'sudoku',
  rules: [
    'Chaque ligne, chaque colonne et chaque bloc contient tous les chiffres une seule fois.',
    'Touche une case, puis un chiffre. Le mode « Notes » permet d’écrire des petites possibilités au crayon.',
    'Quand tu poses un chiffre, il disparaît automatiquement des notes de la même ligne, colonne et bloc.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '4 × 4', n: 4, givens: 8 },
    { id: 'facile', label: 'Facile', detail: '6 × 6', n: 6, givens: 16 },
    { id: 'moyen', label: 'Moyen', detail: '9 × 9', n: 9, givens: 36 },
    { id: 'difficile', label: 'Difficile', detail: '9 × 9', n: 9, givens: 30 },
    { id: 'expert', label: 'Expert', detail: '9 × 9', n: 9, givens: 25 },
  ],
  daily: 'moyen',

  create(level, rng) {
    return generate(level.n, level.givens, rng);
  },

  start(ctx) {
    const { n, grid, solution } = ctx.puzzle;
    const [br, bc] = BOX[n];
    const st = ctx.state || { values: grid.slice(), notes: grid.map(() => []), moves: 0 };
    const history = [];
    let sel = grid.findIndex(v => !v);
    let notesMode = false;

    const board = h('div', { class: `sd sd-${n}`, role: 'grid', 'aria-label': `Grille de sudoku ${n} par ${n}`, style: `--n:${n}` });
    const cells = grid.map((_, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const cls = ['sd-cell'];
      if ((c + 1) % bc === 0 && c < n - 1) cls.push('br');
      if ((r + 1) % br === 0 && r < n - 1) cls.push('bb');
      const b = h('button', { class: cls.join(' '), type: 'button', 'data-i': i });
      b.addEventListener('click', () => { sel = i; render(); });
      return b;
    });
    board.append(...cells);
    ctx.board.append(board);

    const padBtns = [];
    for (let d = 1; d <= n; d++) {
      const b = h('button', { class: 'key', type: 'button', 'aria-label': `Chiffre ${d}` }, h('span', { class: 'key-d' }, String(d)), h('span', { class: 'key-left' }));
      b.addEventListener('click', () => input(d));
      padBtns.push(b);
    }
    ctx.pad.append(h('div', { class: `keys keys-${n}` }, padBtns));

    const undoBtn = ctx.tool('undo', 'Annuler', undo);
    ctx.tool('erase', 'Effacer', () => setCell(sel, 0));
    const notesBtn = ctx.tool('pencil', 'Notes', () => { notesMode = !notesMode; render(); }, { toggle: true });
    ctx.tool('hint', 'Indice', hint);

    const peers = i => {
      const r = Math.floor(i / n);
      const c = i % n;
      const b = boxOf(i, n);
      return grid.map((_, j) => j).filter(j => j !== i && (Math.floor(j / n) === r || j % n === c || boxOf(j, n) === b));
    };

    function snapshot(idx) { return idx.map(j => ({ j, v: st.values[j], notes: st.notes[j].slice() })); }

    function setCell(i, d) {
      if (i < 0 || grid[i]) return;
      if (st.values[i] === d && !st.notes[i].length) return;
      const affected = d ? [i, ...peers(i).filter(j => st.notes[j].includes(d))] : [i];
      history.push(snapshot(affected));
      st.values[i] = d;
      st.notes[i] = [];
      if (d) for (const j of affected.slice(1)) st.notes[j] = st.notes[j].filter(x => x !== d);
      st.moves++;
      ctx.sfx.tap();
      commit();
    }

    function input(d) {
      if (sel < 0 || grid[sel]) { ctx.status('Choisis d’abord une case vide.'); return; }
      if (notesMode) {
        if (st.values[sel]) return;
        history.push(snapshot([sel]));
        const ns = st.notes[sel];
        st.notes[sel] = ns.includes(d) ? ns.filter(x => x !== d) : [...ns, d].sort();
        commit();
        return;
      }
      setCell(sel, st.values[sel] === d ? 0 : d);
    }

    function undo() {
      const snap = history.pop();
      if (!snap) return;
      for (const { j, v, notes } of snap) { st.values[j] = v; st.notes[j] = notes; }
      commit();
    }

    function hint() {
      let i = sel >= 0 && !grid[sel] && st.values[sel] !== solution[sel] ? sel : -1;
      if (i < 0) {
        const wrong = st.values.findIndex((v, j) => v && v !== solution[j]);
        const empties = st.values.map((v, j) => (v ? -1 : j)).filter(j => j >= 0);
        i = wrong >= 0 ? wrong : empties.length ? empties[Math.floor(Math.random() * empties.length)] : -1;
      }
      if (i < 0) return;
      ctx.useHint();
      sel = i;
      setCell(i, solution[i]);
      cells[i].classList.add('flash');
      setTimeout(() => cells[i].classList.remove('flash'), 900);
    }

    function commit() {
      ctx.save(st);
      render();
      if (st.values.every((v, j) => v === solution[j])) ctx.solved({ moves: st.moves });
    }

    function render() {
      const sv = sel >= 0 ? st.values[sel] : 0;
      const peerSet = new Set(sel >= 0 ? peers(sel) : []);
      cells.forEach((el, i) => {
        const v = st.values[i];
        el.classList.toggle('given', !!grid[i]);
        el.classList.toggle('sel', i === sel);
        el.classList.toggle('peer', peerSet.has(i));
        el.classList.toggle('same', !!sv && v === sv && i !== sel);
        el.classList.toggle('err', ctx.settings.errors && !!v && !grid[i] && v !== solution[i]);
        const r = Math.floor(i / n) + 1;
        const c = (i % n) + 1;
        if (v) {
          el.textContent = String(v);
          el.setAttribute('aria-label', `Ligne ${r}, colonne ${c} : ${v}${grid[i] ? ', donné' : ''}`);
        } else if (st.notes[i].length) {
          el.replaceChildren(h('span', { class: 'notes' }, Array.from({ length: n }, (_, k) => h('i', {}, st.notes[i].includes(k + 1) ? String(k + 1) : ''))));
          el.setAttribute('aria-label', `Ligne ${r}, colonne ${c} : vide, notes ${st.notes[i].join(', ')}`);
        } else {
          el.textContent = '';
          el.setAttribute('aria-label', `Ligne ${r}, colonne ${c} : vide`);
        }
      });
      padBtns.forEach((b, k) => {
        const d = k + 1;
        const left = n - st.values.filter(v => v === d).length;
        b.querySelector('.key-left').textContent = left > 0 ? String(left) : '';
        b.classList.toggle('done', left <= 0);
      });
      notesBtn.setAttribute('aria-pressed', String(notesMode));
      undoBtn.disabled = !history.length;
      ctx.board.classList.toggle('notes-on', notesMode);
    }

    ctx.onKey(e => {
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) { input(Number(e.key)); return true; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { setCell(sel, 0); return true; }
      if (e.key === 'n' || e.key === 'N') { notesMode = !notesMode; render(); return true; }
      const mv = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) { sel = Math.max(0, Math.min(n * n - 1, (sel < 0 ? 0 : sel) + mv)); render(); cells[sel].focus(); return true; }
      return false;
    });
    render();
  },
};
