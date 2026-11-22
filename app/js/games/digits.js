// Chiffres — empan de chiffres, avec la technique du regroupement (chunking).
import { h, clamp, tap } from '../util.js';
import { iconHTML } from '../icons.js';

function chunk(digits) {
  const s = digits.join('');
  if (s.length <= 3) return [s];
  const parts = [];
  let i = 0;
  if (s.length % 2 === 1) { parts.push(s.slice(0, 3)); i = 3; }
  for (; i < s.length; i += 2) parts.push(s.slice(i, i + 2));
  return parts;
}

export default {
  id: 'digits',
  domain: 'memoire',
  name: 'Chiffres',
  tagline: 'Mémorise un nombre, puis retape-le.',
  trains: 'Mémoire à court terme verbale',
  rule: 'Un nombre s’affiche quelques secondes. Quand il disparaît, retape-le sur le clavier.',
  short: 'Retiens le nombre par paquets.',
  duration: '≈ 1 min',
  unit: n => (n <= 1 ? 'chiffre retenu' : 'chiffres retenus'),
  tip: {
    title: 'Fais des paquets',
    text: 'On retient environ 4 éléments à la fois. Découpe le nombre en paquets de deux et dis-les comme des nombres : 4-7-2-9-1-8 devient « quarante-sept, vingt-neuf, dix-huit ».',
    life: 'Numéros de téléphone, codes de porte, plaques d’immatriculation.',
  },
  demo() {
    return `<div class="demo-dg" aria-hidden="true"><span class="raw">472918</span><span class="demo-arrow">↓</span><span class="chunks"><b>47</b><b>29</b><b>18</b></span></div>
      <p class="demo-cap">6 chiffres isolés, c’est dur. 3 paquets, c’est facile.</p>`;
  },

  async play({ stage, level, rng, zen, scope, hud, sfx, buzz }) {
    const TRIALS = 6;
    const per = zen ? 1000 : clamp(820 - level * 20, 520, 820);
    let n = clamp(level + 2, 3, 16);
    let best = 0;
    let ok = 0;

    const number = h('div', { class: 'dg-number' });
    const slots = h('div', { class: 'dg-slots' });
    const bar = h('div', { class: 'dg-bar' }, h('i'));
    const screen = h('div', { class: 'dg-screen' }, number, slots, bar);
    const pad = h('div', { class: 'keypad' });
    let onKey = null;
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']) {
      if (!k) { pad.append(h('span')); continue; }
      const b = h('button', { class: `key${k === 'del' ? ' key-del' : ''}`, type: 'button', 'aria-label': k === 'del' ? 'Effacer' : k, html: k === 'del' ? iconHTML('backspace') : k });
      tap(scope, b, () => onKey && onKey(k));
      pad.append(b);
    }
    scope.on(window, 'keydown', e => {
      if (scope.paused || !onKey) return;
      if (/^[0-9]$/.test(e.key)) onKey(e.key);
      else if (e.key === 'Backspace') onKey('del');
    });
    const wrap = h('div', { class: 'dg' }, screen, pad);
    stage.replaceChildren(wrap);

    for (let t = 0; t < TRIALS; t++) {
      hud.progress(t / TRIALS);
      const digits = [];
      for (let i = 0; i < n; i++) {
        let d;
        do { d = rng.int(0, 9); } while (i && d === digits[i - 1]);
        digits.push(d);
      }

      // Phase 1 : mémoriser
      const dur = per * n;
      wrap.dataset.phase = 'show';
      hud.label(`Retiens ces ${n} chiffres`);
      number.style.fontSize = `${Math.min(2.8, 26 / n)}rem`;
      number.textContent = digits.join('');
      slots.replaceChildren();
      bar.firstChild.style.animation = 'none';
      void bar.offsetWidth;
      bar.firstChild.style.animation = `drain ${dur}ms linear forwards`;
      await scope.sleep(dur);

      // Phase 2 : restituer
      number.textContent = '';
      wrap.dataset.phase = 'input';
      hud.label('Retape le nombre');
      const cells = digits.map(() => h('span', { class: 'slot' }));
      slots.replaceChildren(...cells);
      const typed = await new Promise(resolve => {
        const arr = [];
        onKey = k => {
          if (k === 'del') arr.pop();
          else if (arr.length < n) { arr.push(Number(k)); sfx.tap(); }
          cells.forEach((c, i) => { c.textContent = arr[i] ?? ''; c.classList.toggle('filled', i < arr.length); });
          if (arr.length === n) { onKey = null; resolve(arr); }
        };
      });

      const correct = typed.every((d, i) => d === digits[i]);
      cells.forEach((c, i) => c.classList.add(typed[i] === digits[i] ? 'ok' : 'ko'));
      wrap.dataset.phase = 'feedback';
      if (correct) {
        ok++;
        best = Math.max(best, n);
        sfx.good();
        buzz(15);
        hud.flash('good');
        hud.label('Exact !');
        await scope.sleep(850);
        n++;
      } else {
        sfx.bad();
        buzz([30, 40, 30]);
        hud.flash('bad');
        hud.label('Presque. En paquets, c’était :');
        number.style.fontSize = `${Math.min(2.4, 22 / n)}rem`;
        number.replaceChildren(...chunk(digits).map(p => h('b', { class: 'chunk' }, p)));
        await scope.sleep(2100);
        n = Math.max(3, n - 1);
      }
    }
    hud.progress(1);

    return {
      score: best,
      accuracy: ok / TRIALS,
      nextLevel: best ? clamp(best - 3, 1, 18) : Math.max(1, level - 1),
      stats: [
        ['Plus long nombre retenu', `${best} chiffre${best > 1 ? 's' : ''}`],
        ['Nombres réussis', `${ok} / ${TRIALS}`],
      ],
    };
  },
};
