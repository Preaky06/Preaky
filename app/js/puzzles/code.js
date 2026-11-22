// Code secret — deviner un code de chiffres tous différents.
// Après chaque essai : combien de chiffres sont bien placés, combien sont présents mais mal placés.
import { h } from '../util.js';

export function score(code, guess) {
  let bien = 0;
  let mal = 0;
  guess.forEach((d, i) => {
    if (code[i] === d) bien++;
    else if (code.includes(d)) mal++;
  });
  return { bien, mal };
}

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export default {
  id: 'code',
  name: 'Code secret',
  short: 'Devine le code grâce aux indications.',
  icon: 'lock',
  rules: [
    'Un code secret est caché. Ses chiffres sont tous différents.',
    'Propose un code. On te dit combien de chiffres sont bien placés (●) et combien sont dans le code mais mal placés (○).',
    'Le bloc-notes sous le clavier sert à rayer les chiffres exclus et à marquer ceux dont tu es sûr.',
  ],
  levels: [
    { id: 'debutant', label: 'Débutant', detail: '3 chiffres, de 1 à 6', len: 3, digits: [1, 2, 3, 4, 5, 6] },
    { id: 'facile', label: 'Facile', detail: '4 chiffres, de 1 à 6', len: 4, digits: [1, 2, 3, 4, 5, 6] },
    { id: 'moyen', label: 'Moyen', detail: '4 chiffres, de 0 à 9', len: 4, digits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { id: 'difficile', label: 'Difficile', detail: '5 chiffres, de 0 à 9', len: 5, digits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  ],
  daily: 'moyen',

  create(level, rng) {
    return { len: level.len, digits: level.digits, code: rng.shuffle(level.digits).slice(0, level.len) };
  },

  start(ctx) {
    const { len, digits, code } = ctx.puzzle;
    const st = ctx.state || { guesses: [], cur: [], marks: {}, revealed: [], moves: 0 };

    const list = h('ol', { class: 'cs-list', 'aria-label': 'Essais' });
    const slots = h('div', { class: 'cs-slots', 'aria-live': 'polite' });
    const revealEl = h('p', { class: 'cs-reveal' });
    ctx.board.append(list, revealEl, slots);

    const keyEls = digits.map(d => {
      const b = h('button', { class: 'key cs-key', type: 'button', 'data-d': d }, h('span', { class: 'key-d' }, String(d)), h('span', { class: 'key-mark' }));
      b.addEventListener('click', () => type(d));
      return b;
    });
    const eraseBtn = h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => { st.cur.pop(); commit(false); } }, 'Effacer');
    const okBtn = h('button', { class: 'btn btn-primary', type: 'button', onClick: submit }, 'Valider');
    const noteKeys = digits.map(d => {
      const b = h('button', { class: 'cs-note', type: 'button', 'data-d': d }, String(d));
      b.addEventListener('click', () => {
        const m = st.marks[d] || 0;
        st.marks[d] = (m + 1) % 3; // 0 rien, 1 exclu, 2 sûr
        ctx.sfx.tap();
        commit(false);
      });
      return b;
    });
    ctx.pad.append(
      h('div', { class: `keys keys-code keys-${digits.length}` }, keyEls),
      h('div', { class: 'cs-actions' }, eraseBtn, okBtn),
      h('div', { class: 'cs-notes' }, h('p', { class: 'label' }, 'Bloc-notes : touche un chiffre pour le rayer, puis pour le marquer sûr'), h('div', { class: `cs-note-row cs-n${digits.length}` }, noteKeys)),
    );
    ctx.tool('hint', 'Indice', hint);

    function type(d) {
      if (st.cur.length >= len || st.cur.includes(d)) return;
      st.cur.push(d);
      ctx.sfx.tap();
      commit(false);
    }

    function submit() {
      if (st.cur.length !== len) return;
      const s = score(code, st.cur);
      st.guesses.push({ g: st.cur.slice(), ...s });
      st.cur = [];
      st.moves++;
      ctx.sfx[s.bien === len ? 'good' : 'tap']();
      ctx.status(s.bien === len ? '' : `${plural(s.bien, 'bien placé', 'bien placés')}, ${plural(s.mal, 'mal placé', 'mal placés')}.`);
      commit(true);
      list.lastElementChild?.scrollIntoView({ block: 'nearest' });
    }

    function hint() {
      const hidden = [...Array(len).keys()].filter(i => !st.revealed.includes(i));
      if (hidden.length <= 1) { ctx.status('Il ne reste plus d’indice à donner : à toi de finir !'); return; }
      ctx.useHint();
      const i = hidden[Math.floor(Math.random() * hidden.length)];
      st.revealed.push(i);
      st.marks[code[i]] = 2;
      ctx.status(`Indice : le chiffre n° ${i + 1} est ${code[i]}.`);
      commit(false);
    }

    function render() {
      list.replaceChildren(...st.guesses.map((x, k) => h('li', { class: 'cs-row', 'aria-label': `Essai ${k + 1} : ${x.g.join(' ')}, ${plural(x.bien, 'bien placé', 'bien placés')}, ${plural(x.mal, 'mal placé', 'mal placés')}` },
        h('span', { class: 'cs-n' }, String(k + 1)),
        h('span', { class: 'cs-digits' }, x.g.map(d => h('b', {}, String(d)))),
        h('span', { class: 'cs-fb', 'aria-hidden': 'true' },
          Array.from({ length: x.bien }, () => h('i', { class: 'pin full' })),
          Array.from({ length: x.mal }, () => h('i', { class: 'pin' })),
          h('small', {}, `${x.bien} ● · ${x.mal} ○`)))));
      if (!st.guesses.length) list.append(h('li', { class: 'cs-empty' }, `Propose un premier code de ${len} chiffres différents.`));
      slots.replaceChildren(...Array.from({ length: len }, (_, i) => h('span', { class: `cs-slot${i === st.cur.length ? ' next' : ''}${st.revealed.includes(i) ? ' known' : ''}` }, st.cur[i] != null ? String(st.cur[i]) : st.revealed.includes(i) ? String(code[i]) : '')));
      revealEl.textContent = st.revealed.length ? `Connu : ${st.revealed.sort().map(i => `n° ${i + 1} = ${code[i]}`).join(' · ')}` : '';
      keyEls.forEach((b, k) => {
        const d = digits[k];
        b.disabled = st.cur.includes(d) || st.cur.length >= len;
        b.classList.toggle('excl', st.marks[d] === 1);
        b.classList.toggle('sure', st.marks[d] === 2);
      });
      noteKeys.forEach((b, k) => {
        const m = st.marks[digits[k]] || 0;
        b.className = `cs-note${m === 1 ? ' excl' : m === 2 ? ' sure' : ''}`;
        b.setAttribute('aria-label', `Chiffre ${digits[k]} : ${m === 1 ? 'rayé' : m === 2 ? 'sûr' : 'aucune note'}`);
      });
      okBtn.disabled = st.cur.length !== len;
      eraseBtn.disabled = !st.cur.length;
      ctx.progress(`${st.guesses.length} essai${st.guesses.length > 1 ? 's' : ''}`);
    }

    function commit(check) {
      ctx.save(st);
      render();
      const last = st.guesses[st.guesses.length - 1];
      if (check && last && last.bien === len) ctx.solved({ moves: st.moves, message: `Le code était ${code.join(' ')}. Trouvé en ${plural(st.guesses.length, 'essai', 'essais')}.` });
    }

    ctx.onKey(e => {
      if (/^[0-9]$/.test(e.key) && digits.includes(Number(e.key))) { type(Number(e.key)); return true; }
      if (e.key === 'Backspace') { st.cur.pop(); commit(false); return true; }
      if (e.key === 'Enter') { submit(); return true; }
      return false;
    });
    render();
  },
};
