// Mots mêlés — retrouver les mots cachés dans la grille (glisser, ou toucher 1re puis dernière lettre).
import { h } from '../util.js';

const THEMES = {
  'Les animaux': ['CHAT', 'CHIEN', 'LAPIN', 'CHEVAL', 'TORTUE', 'LION', 'ZEBRE', 'GIRAFE', 'HIBOU', 'RENARD', 'MOUTON', 'CANARD', 'ECUREUIL', 'BALEINE', 'TIGRE', 'POULE', 'VACHE', 'SOURIS', 'OURS', 'LOUP'],
  'Les fruits': ['POMME', 'POIRE', 'CERISE', 'FRAISE', 'ORANGE', 'CITRON', 'PRUNE', 'MANGUE', 'ANANAS', 'BANANE', 'RAISIN', 'ABRICOT', 'MELON', 'PECHE', 'KIWI', 'FIGUE', 'MYRTILLE', 'GROSEILLE'],
  'La cuisine': ['FOUR', 'POELE', 'CASSEROLE', 'FARINE', 'BEURRE', 'SUCRE', 'OEUF', 'LAIT', 'TARTE', 'SOUPE', 'GRATIN', 'RECETTE', 'FOUET', 'LOUCHE', 'SEL', 'POIVRE', 'GATEAU', 'CREPE'],
  'Le jardin': ['ROSE', 'TULIPE', 'ARROSOIR', 'BECHE', 'GRAINE', 'HAIE', 'PELOUSE', 'POTAGER', 'SALADE', 'TOMATE', 'RATEAU', 'BUTTE', 'FLEUR', 'ARBRE', 'FEUILLE', 'RACINE', 'POMMIER', 'LILAS'],
  'La mer': ['VAGUE', 'PLAGE', 'SABLE', 'PHARE', 'BATEAU', 'CRABE', 'MOUETTE', 'MAREE', 'PORT', 'COQUILLAGE', 'ALGUE', 'DAUPHIN', 'VOILE', 'ANCRE', 'ILE', 'RECIF', 'PIEUVRE', 'OCEAN'],
  'La musique': ['PIANO', 'VIOLON', 'GUITARE', 'FLUTE', 'TAMBOUR', 'CHANT', 'NOTE', 'ACCORD', 'RYTHME', 'MELODIE', 'HARPE', 'TROMPETTE', 'ORGUE', 'CHORALE', 'OPERA', 'VALSE', 'TANGO', 'SOLO'],
  'Les sports': ['TENNIS', 'FOOT', 'RUGBY', 'BOXE', 'JUDO', 'NATATION', 'VELO', 'SKI', 'GOLF', 'VOILE', 'ESCRIME', 'MARATHON', 'BASKET', 'HANDBALL', 'AVIRON', 'KARATE', 'PETANQUE', 'COURSE'],
  'Les métiers': ['MEDECIN', 'BOULANGER', 'FACTEUR', 'POMPIER', 'JARDINIER', 'PILOTE', 'NOTAIRE', 'INFIRMIER', 'PEINTRE', 'MACON', 'COIFFEUR', 'AVOCAT', 'CUISINIER', 'FLEURISTE', 'PECHEUR', 'ARTISTE', 'JUGE', 'CHEF'],
  'La maison': ['SALON', 'CUISINE', 'CHAMBRE', 'GRENIER', 'CAVE', 'PORTE', 'FENETRE', 'TOIT', 'ESCALIER', 'FAUTEUIL', 'TABLE', 'CHAISE', 'LAMPE', 'TAPIS', 'MIROIR', 'BUREAU', 'COULOIR', 'VOLET'],
  'La météo': ['SOLEIL', 'PLUIE', 'NEIGE', 'ORAGE', 'NUAGE', 'VENT', 'BRUME', 'GRELE', 'ECLAIR', 'TONNERRE', 'ARCENCIEL', 'TEMPETE', 'CHALEUR', 'FROID', 'GIVRE', 'ROSEE', 'BROUILLARD', 'AVERSE'],
  'Le voyage': ['VALISE', 'TRAIN', 'AVION', 'GARE', 'BILLET', 'CARTE', 'HOTEL', 'PASSEPORT', 'ROUTE', 'TOURISTE', 'MUSEE', 'PLAN', 'GUIDE', 'BAGAGE', 'CROISIERE', 'TENTE', 'SAC', 'PHOTO'],
  'Les couleurs': ['ROUGE', 'BLEU', 'VERT', 'JAUNE', 'ORANGE', 'VIOLET', 'ROSE', 'NOIR', 'BLANC', 'GRIS', 'MARRON', 'TURQUOISE', 'BEIGE', 'BORDEAUX', 'CORAIL', 'INDIGO', 'OCRE', 'LILAS'],
};

const DIRS = { E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1], W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1] };
// Lettres de remplissage, pondérées comme en français.
const FILL = 'EEEEEEAAAAASSSSIIIIINNNNTTTTRRRRLLLUUUOOODDCCPPMMVGFBHQJXYZK';

export function makeWordSearch(level, rng) {
  const { n, count, dirs } = level;
  for (let attempt = 0; attempt < 30; attempt++) {
    const theme = rng.pick(Object.keys(THEMES));
    const pool = rng.shuffle(THEMES[theme].filter(w => w.length <= n));
    const grid = new Array(n * n).fill('');
    const words = [];
    for (const w of pool) {
      if (words.length >= count) break;
      const word = w;
      let placed = false;
      for (let k = 0; k < 150 && !placed; k++) {
        const d = rng.pick(dirs);
        const [dr, dc] = DIRS[d];
        const r0 = rng.int(0, n - 1);
        const c0 = rng.int(0, n - 1);
        const r1 = r0 + dr * (word.length - 1);
        const c1 = c0 + dc * (word.length - 1);
        if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const cell = grid[(r0 + dr * i) * n + c0 + dc * i];
          if (cell && cell !== word[i]) { ok = false; break; }
        }
        if (!ok) continue;
        const cells = [];
        for (let i = 0; i < word.length; i++) { const idx = (r0 + dr * i) * n + c0 + dc * i; grid[idx] = word[i]; cells.push(idx); }
        words.push({ word, cells });
        placed = true;
      }
    }
    if (words.length < count) continue;
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = FILL[rng.int(0, FILL.length - 1)];
    words.sort((a, b) => a.word.localeCompare(b.word));
    return { n, theme, grid, words };
  }
  throw new Error('Grille de mots mêlés impossible');
}

export default {
  id: 'mots',
  name: 'Mots mêlés',
  short: 'Retrouve les mots cachés dans la grille.',
  icon: 'mots',
  rules: [
    'Les mots de la liste sont cachés dans la grille, en ligne droite.',
    'Fais glisser ton doigt de la première à la dernière lettre. Tu peux aussi toucher la première lettre, puis la dernière.',
    'Selon le niveau, les mots vont dans 2 à 8 directions, y compris à l’envers.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '8 × 8 · 6 mots', n: 8, count: 6, dirs: ['E', 'S'] },
    { id: 'facile', label: 'Facile', detail: '10 × 10 · 8 mots', n: 10, count: 8, dirs: ['E', 'S', 'SE'] },
    { id: 'moyen', label: 'Moyen', detail: '11 × 11 · 10 mots', n: 11, count: 10, dirs: ['E', 'S', 'SE', 'W', 'N'] },
    { id: 'difficile', label: 'Difficile', detail: '12 × 12 · 12 mots', n: 12, count: 12, dirs: Object.keys(DIRS) },
  ],
  daily: 'facile',

  create(level, rng) {
    return makeWordSearch(level, rng);
  },

  start(ctx) {
    const { n, grid, words, theme } = ctx.puzzle;
    const st = ctx.state || { found: [], moves: 0 };
    const history = [];
    const board = h('div', { class: 'ws', style: `--n:${n}`, role: 'grid', 'aria-label': `Grille de ${n} par ${n} lettres` });
    const cells = grid.map((ch, i) => h('button', { class: 'ws-cell', type: 'button', 'data-i': i, 'aria-label': `${ch}, ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}` }, ch));
    board.append(...cells);
    const list = h('ul', { class: 'ws-words', 'aria-label': `Thème : ${theme}` }, words.map(w => h('li', { 'data-w': w.word }, w.word)));
    ctx.board.append(h('p', { class: 'ws-theme' }, theme), board, list);

    const undoBtn = ctx.tool('undo', 'Annuler', () => { const w = history.pop(); if (!w) return; st.found = st.found.filter(x => x !== w); commit(); });
    ctx.tool('hint', 'Indice', hint);

    let drag = null;
    let anchor = -1;
    const rc = i => [Math.floor(i / n), i % n];
    function lineCells(a, b) {
      const [r0, c0] = rc(a);
      const [r1, c1] = rc(b);
      let dr = r1 - r0;
      let dc = c1 - c0;
      const len = Math.max(Math.abs(dr), Math.abs(dc));
      if (!len) return [a];
      // On « aimante » vers la direction la plus proche parmi les 8.
      const ang = Math.atan2(dr, dc);
      const oct = Math.round(ang / (Math.PI / 4));
      dr = Math.round(Math.sin(oct * Math.PI / 4));
      dc = Math.round(Math.cos(oct * Math.PI / 4));
      const out = [];
      for (let k = 0; k <= len; k++) {
        const r = r0 + dr * k;
        const c = c0 + dc * k;
        if (r < 0 || r >= n || c < 0 || c >= n) break;
        out.push(r * n + c);
      }
      return out;
    }
    function showSel(list2) {
      cells.forEach((el, i) => el.classList.toggle('sel', list2.includes(i)));
    }
    function check(sel) {
      const txt = sel.map(i => grid[i]).join('');
      const rev = txt.split('').reverse().join('');
      const hit = words.find(w => !st.found.includes(w.word) && (w.word === txt || w.word === rev));
      if (hit) {
        st.found.push(hit.word);
        history.push(hit.word);
        st.moves++;
        ctx.sfx.good();
        ctx.buzz(15);
        ctx.status(`Trouvé : ${hit.word}`, 'ok');
        commit();
        return true;
      }
      if (sel.length > 1) { ctx.status('Ce n’est pas un mot de la liste.', ''); }
      return false;
    }
    const cellFrom = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      return el && el.classList?.contains('ws-cell') ? Number(el.dataset.i) : -1;
    };
    ctx.on(board, 'pointerdown', e => {
      const el = e.target.closest?.('.ws-cell');
      if (!el) return;
      e.preventDefault();
      drag = { start: Number(el.dataset.i), end: Number(el.dataset.i), moved: false };
      showSel(anchor >= 0 ? lineCells(anchor, drag.start) : [drag.start]);
    });
    ctx.on(window, 'pointermove', e => {
      if (!drag) return;
      const i = cellFrom(e);
      if (i < 0 || i === drag.end) return;
      drag.end = i;
      drag.moved = true;
      anchor = -1;
      showSel(lineCells(drag.start, i));
    });
    ctx.on(window, 'pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.moved) { check(lineCells(d.start, d.end)); showSel([]); return; }
      // Mode « deux touches » : 1re lettre puis dernière lettre.
      if (anchor < 0) { anchor = d.start; showSel([anchor]); ctx.status('Touche maintenant la dernière lettre du mot.'); return; }
      const sel = lineCells(anchor, d.start);
      anchor = -1;
      check(sel);
      showSel([]);
    });

    function hint() {
      const left = words.filter(w => !st.found.includes(w.word));
      if (!left.length) return;
      const w = left[Math.floor(Math.random() * left.length)];
      ctx.useHint();
      const el = cells[w.cells[0]];
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1800);
      ctx.status(`Indice : « ${w.word} » commence par la lettre qui clignote.`);
    }

    function render() {
      const foundCells = new Set(words.filter(w => st.found.includes(w.word)).flatMap(w => w.cells));
      cells.forEach((el, i) => el.classList.toggle('found', foundCells.has(i)));
      list.querySelectorAll('li').forEach(li => li.classList.toggle('found', st.found.includes(li.dataset.w)));
      undoBtn.disabled = !history.length;
      ctx.progress(`${st.found.length} / ${words.length} mots`);
    }

    function commit() {
      ctx.save(st);
      render();
      if (st.found.length === words.length) ctx.solved({ moves: st.moves });
    }
    render();
  },
};
