// Logimage (nonogramme) — retrouver un dessin grâce aux nombres des lignes et des colonnes.
// Chaque grille est vérifiée : elle se résout par pure logique, sans jamais deviner.
import { h } from '../util.js';

const PICTURES = {
  5: [
    ['un cœur', ['.#.#.', '#####', '#####', '.###.', '..#..']],
    ['une flèche', ['..#..', '.###.', '#####', '..#..', '..#..']],
    ['un sablier', ['#####', '.###.', '..#..', '.###.', '#####']],
    ['une maison', ['..#..', '.###.', '#####', '.#.#.', '.#.#.']],
    ['une tasse', ['.....', '####.', '#####', '####.', '.##..']],
    ['un poisson', ['.....', '.##.#', '#####', '.##.#', '.....']],
  ],
  8: [
    ['un sapin', ['...##...', '..####..', '.######.', '..####..', '.######.', '########', '...##...', '...##...']],
    ['un cœur', ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........']],
    ['une maison', ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.']],
    ['un champignon', ['..####..', '.##..##.', '########', '#..##..#', '########', '...##...', '..####..', '..####..']],
    ['un chat', ['#......#', '##....##', '########', '#.####.#', '########', '##.##.##', '.######.', '..#..#..']],
  ],
  10: [
    ['un sapin', ['....##....', '...####...', '..######..', '...####...', '..######..', '.########.', '..######..', '.########.', '##########', '....##....']],
    ['un bateau', ['....#.....', '....##....', '....###...', '....####..', '....#####.', '....#.....', '##########', '.########.', '..######..', '..........']],
    ['un cœur', ['.###..###.', '##########', '##########', '##########', '##########', '.########.', '..######..', '...####...', '....##....', '..........']],
    ['un chat', ['.#......#.', '.##....##.', '.########.', '##.####.##', '##########', '###.##.###', '.########.', '..######..', '...#..#...', '..##..##..']],
  ],
};

export const cluesOf = line => {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
};

// Toutes les façons de placer les blocs compatibles avec ce qu'on sait déjà → cases certaines.
export function lineSolve(clue, line) {
  const n = line.length;
  const canFill = new Array(n).fill(false);
  const canEmpty = new Array(n).fill(false);
  const cur = new Array(n).fill(0);
  let any = false;
  const tail = clue.map((_, k) => clue.slice(k + 1).reduce((a, b) => a + b + 1, 0));
  const place = (k, start) => {
    if (k === clue.length) {
      for (let i = start; i < n; i++) if (line[i] === 1) return;
      for (let i = start; i < n; i++) cur[i] = 0;
      any = true;
      for (let i = 0; i < n; i++) { if (cur[i]) canFill[i] = true; else canEmpty[i] = true; }
      return;
    }
    const len = clue[k];
    for (let s = start; s + len + tail[k] <= n; s++) {
      if (s > start && line[s - 1] === 1) break;
      let ok = true;
      for (let i = s; i < s + len; i++) if (line[i] === 0) { ok = false; break; }
      if (ok && s + len < n && line[s + len] === 1) ok = false;
      if (!ok) continue;
      for (let i = start; i < s; i++) cur[i] = 0;
      for (let i = s; i < s + len; i++) cur[i] = 1;
      if (s + len < n) cur[s + len] = 0;
      place(k + 1, Math.min(n, s + len + 1));
    }
  };
  place(0, 0);
  if (!any) return null;
  return line.map((v, i) => (canFill[i] && !canEmpty[i] ? 1 : !canFill[i] && canEmpty[i] ? 0 : v));
}

// Résolution « ligne par ligne » : true si la grille se résout entièrement sans hypothèse.
export function logicSolvable(rows, cols) {
  const n = rows.length;
  const g = Array.from({ length: n }, () => new Array(n).fill(-1));
  for (let pass = 0; pass < 200; pass++) {
    let changed = false;
    for (let r = 0; r < n; r++) {
      const res = lineSolve(rows[r], g[r]);
      if (!res) return false;
      res.forEach((v, c) => { if (g[r][c] !== v) { g[r][c] = v; changed = true; } });
    }
    for (let c = 0; c < n; c++) {
      const res = lineSolve(cols[c], g.map(row => row[c]));
      if (!res) return false;
      res.forEach((v, r) => { if (g[r][c] !== v) { g[r][c] = v; changed = true; } });
    }
    if (!changed) break;
  }
  return g.every(row => row.every(v => v !== -1));
}

function fromRows(rowsTxt) {
  return rowsTxt.map(r => [...r].map(ch => (ch === '#' ? 1 : 0)));
}

function cluesFor(grid) {
  const n = grid.length;
  return { rows: grid.map(cluesOf), cols: Array.from({ length: n }, (_, c) => cluesOf(grid.map(r => r[c]))) };
}

// Créature symétrique (style « pixel ») quand on a épuisé les dessins.
function creature(n, rng) {
  for (let t = 0; t < 400; t++) {
    const half = Math.ceil(n / 2);
    const g = Array.from({ length: n }, () => {
      const left = Array.from({ length: half }, () => (rng.next() < 0.58 ? 1 : 0));
      const right = left.slice(0, n - half).reverse();
      return [...left, ...right];
    });
    if (g.some(r => r.every(v => !v)) || g[0].every(v => !v)) continue;
    const { rows, cols } = cluesFor(g);
    if (logicSolvable(rows, cols)) return g;
  }
  return null;
}

export function makeLogimage(n, rng) {
  const pics = PICTURES[n].filter(([, rows]) => { const g = fromRows(rows); const c = cluesFor(g); return logicSolvable(c.rows, c.cols); });
  let name;
  let grid;
  if (pics.length && rng.next() < 0.65) {
    const [nm, rows] = rng.pick(pics);
    name = nm;
    grid = fromRows(rows);
  } else {
    grid = creature(n, rng);
    name = 'une petite créature';
    if (!grid) { const [nm, rows] = rng.pick(pics); name = nm; grid = fromRows(rows); }
  }
  return { n, name, solution: grid.flat(), ...cluesFor(grid) };
}

export const PICTURE_LIST = PICTURES;

export default {
  id: 'logimage',
  name: 'Logimage',
  short: 'Fais apparaître un dessin caché.',
  icon: 'logimage',
  rules: [
    'Les nombres indiquent les blocs de cases noires de chaque ligne et colonne, dans l’ordre. « 3 1 » : un bloc de 3, au moins une case blanche, puis un bloc de 1.',
    'Touche une case pour la noircir. En mode « Croix », marque les cases dont tu es sûr qu’elles restent blanches.',
    'Fais glisser ton doigt pour remplir plusieurs cases d’un coup. Un nombre grisé veut dire que sa ligne est complète.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '5 × 5', n: 5 },
    { id: 'facile', label: 'Facile', detail: '8 × 8', n: 8 },
    { id: 'moyen', label: 'Moyen', detail: '10 × 10', n: 10 },
  ],
  daily: 'facile',

  create(level, rng) {
    return makeLogimage(level.n, rng);
  },

  start(ctx) {
    const { n, rows, cols, solution, name } = ctx.puzzle;
    const st = ctx.state || { cells: new Array(n * n).fill(0), moves: 0 }; // 0 vide, 1 noir, 2 croix
    const history = [];
    let mode = 1;

    const maxRow = Math.max(...rows.map(r => r.length), 1);
    const maxCol = Math.max(...cols.map(c => c.length), 1);
    const grid = h('div', { class: `lg lg-${n}`, role: 'grid', 'aria-label': `Logimage ${n} par ${n}`, style: `--n:${n};--mr:${maxRow};--mc:${maxCol}` });
    grid.append(h('span', { class: 'lg-corner' }));
    const colEls = cols.map((c, j) => h('span', { class: `lg-cc${j % 5 === 4 && j < n - 1 ? ' b5' : ''}` }, (c.length ? c : [0]).map(x => h('b', {}, String(x)))));
    grid.append(...colEls);
    const rowEls = [];
    const cells = [];
    for (let r = 0; r < n; r++) {
      const re = h('span', { class: `lg-rc${r % 5 === 4 && r < n - 1 ? ' b5' : ''}` }, (rows[r].length ? rows[r] : [0]).map(x => h('b', {}, String(x))));
      rowEls.push(re);
      grid.append(re);
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const cls = ['lg-cell'];
        if (c % 5 === 4 && c < n - 1) cls.push('b5r');
        if (r % 5 === 4 && r < n - 1) cls.push('b5b');
        const el = h('button', { class: cls.join(' '), type: 'button', 'data-i': i, 'aria-label': `Ligne ${r + 1}, colonne ${c + 1}` });
        cells.push(el);
        grid.append(el);
      }
    }
    ctx.board.append(grid);

    const fit = () => {
      const avail = ctx.board.clientWidth;
      const clueW = rowEls[0].getBoundingClientRect().width || maxRow * 16;
      const cell = Math.max(20, Math.min(46, Math.floor((avail - clueW - 6) / n)));
      grid.style.setProperty('--cell', `${cell}px`);
    };
    grid.style.setProperty('--cell', '28px');
    requestAnimationFrame(fit);
    ctx.onResize(fit);

    const undoBtn = ctx.tool('undo', 'Annuler', undo);
    const modeBtn = ctx.tool('square', 'Mode : Remplir', () => { mode = mode === 1 ? 2 : 1; render(); }, { toggle: true });
    ctx.tool('hint', 'Indice', hint);

    // Tracé au doigt : une ligne ou une colonne à la fois.
    let stroke = null;
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && el.classList?.contains('lg-cell') ? Number(el.dataset.i) : -1;
    };
    const apply = i => {
      if (stroke.done.has(i)) return;
      const r0 = Math.floor(stroke.start / n);
      const c0 = stroke.start % n;
      const r = Math.floor(i / n);
      const c = i % n;
      if (!stroke.axis && i !== stroke.start) stroke.axis = r === r0 ? 'row' : c === c0 ? 'col' : null;
      if (stroke.axis === 'row' && r !== r0) return;
      if (stroke.axis === 'col' && c !== c0) return;
      if (!stroke.axis && i !== stroke.start) return;
      stroke.done.add(i);
      if (st.cells[i] === stroke.to) return;
      stroke.changes.push({ i, prev: st.cells[i] });
      st.cells[i] = stroke.to;
      render();
    };
    ctx.on(grid, 'pointerdown', e => {
      const i = e.target.closest?.('.lg-cell') ? Number(e.target.closest('.lg-cell').dataset.i) : -1;
      if (i < 0) return;
      e.preventDefault();
      stroke = { start: i, to: st.cells[i] === mode ? 0 : mode, done: new Set(), changes: [], axis: null };
      apply(i);
    });
    ctx.on(window, 'pointermove', e => {
      if (!stroke) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i >= 0) apply(i);
    });
    const end = () => {
      if (!stroke) return;
      if (stroke.changes.length) { history.push(stroke.changes); st.moves++; ctx.sfx.tap(); commit(); }
      stroke = null;
    };
    ctx.on(window, 'pointerup', end);
    ctx.on(window, 'pointercancel', end);
    ctx.on(grid, 'click', e => {
      if (e.detail !== 0) return; // clavier uniquement (Entrée/Espace)
      const el = e.target.closest?.('.lg-cell');
      if (!el) return;
      const i = Number(el.dataset.i);
      history.push([{ i, prev: st.cells[i] }]);
      st.cells[i] = st.cells[i] === mode ? 0 : mode;
      st.moves++;
      commit();
    });

    function undo() {
      const ch = history.pop();
      if (!ch) return;
      for (const { i, prev } of ch.slice().reverse()) st.cells[i] = prev;
      commit();
    }

    function hint() {
      const bad = [];
      const unknown = [];
      st.cells.forEach((v, i) => {
        const want = solution[i] ? 1 : 2;
        if (v && v !== want) bad.push(i);
        else if (!v) unknown.push(i);
      });
      const pool = bad.length ? bad : unknown.filter(i => solution[i]).length ? unknown.filter(i => solution[i]) : unknown;
      if (!pool.length) return;
      const i = pool[Math.floor(Math.random() * pool.length)];
      ctx.useHint();
      history.push([{ i, prev: st.cells[i] }]);
      st.cells[i] = solution[i] ? 1 : 2;
      cells[i].classList.add('flash');
      setTimeout(() => cells[i].classList.remove('flash'), 900);
      commit();
    }

    function lineDone(vals, clue) {
      const got = cluesOf(vals.map(v => (v === 1 ? 1 : 0)));
      return got.length === clue.length && got.every((x, k) => x === clue[k]);
    }

    function render() {
      cells.forEach((el, i) => {
        const v = st.cells[i];
        el.classList.toggle('f', v === 1);
        el.classList.toggle('x', v === 2);
        el.classList.toggle('err', ctx.settings.errors && v !== 0 && (v === 1) !== !!solution[i]);
      });
      for (let r = 0; r < n; r++) rowEls[r].classList.toggle('done', lineDone(st.cells.slice(r * n, r * n + n), rows[r]));
      for (let c = 0; c < n; c++) colEls[c].classList.toggle('done', lineDone(Array.from({ length: n }, (_, r) => st.cells[r * n + c]), cols[c]));
      modeBtn.setAttribute('aria-pressed', String(mode === 2));
      modeBtn.querySelector('.tool-l').textContent = mode === 1 ? 'Mode : Remplir' : 'Mode : Croix';
      modeBtn.querySelector('.tool-i').innerHTML = mode === 1 ? ctx.iconHTML('square') : ctx.iconHTML('cross');
      undoBtn.disabled = !history.length;
    }

    function commit() {
      ctx.save(st);
      render();
      if (st.cells.every((v, i) => (v === 1) === !!solution[i])) {
        grid.classList.add('solved');
        ctx.solved({ moves: st.moves, message: `C’était ${name} !` });
      }
    }
    render();
  },
};
