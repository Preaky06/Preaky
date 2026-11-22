// Dégaine ! — duel de réflexes ET de retenue : taper dès que la règle est vraie,
// jamais avant (sinon le point va à l'adversaire). Premier à 5 points.
import { h, clamp, tap } from '../util.js';
import { avatarSVG } from '../avatar.js';
import { icon, iconHTML } from '../icons.js';

const SHAPES = {
  etoile: '<path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z"/>',
  rond: '<circle cx="50" cy="50" r="38"/>',
  carre: '<rect x="14" y="14" width="72" height="72" rx="12"/>',
  coeur: '<path d="M50 88C18 64 8 48 8 32 8 18 19 8 32 8c8 0 14 4 18 11 4-7 10-11 18-11 13 0 24 10 24 24 0 16-10 32-42 56z"/>',
  losange: '<path d="M50 6 92 50 50 94 8 50z"/>',
  goutte: '<path d="M50 6C62 28 82 44 82 62a32 32 0 0 1-64 0C18 44 38 28 50 6z"/>',
};
const SHAPE_KEYS = Object.keys(SHAPES);
const COLORS = ['#FF5B1F', '#3DB4FF', '#FF4F9A', '#7ED957', '#8E6CFF', '#FFC21A'];
const PIPS = {
  1: [[50, 50]], 2: [[30, 30], [70, 70]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
  7: [[30, 24], [70, 24], [30, 50], [50, 50], [70, 50], [30, 76], [70, 76]], 8: [[30, 22], [70, 22], [30, 41], [70, 41], [30, 59], [70, 59], [30, 78], [70, 78]],
  9: [[26, 26], [50, 26], [74, 26], [26, 50], [50, 50], [74, 50], [26, 74], [50, 74], [74, 74]],
};

const card = inner => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
const shapeCard = (k, c) => card(`<g fill="${c}">${SHAPES[k]}</g>`);
const numCard = n => card(`<text x="50" y="72" text-anchor="middle" font-family="Titan One, sans-serif" font-size="66" fill="#1E1A16">${n}</text>`);
const dotsCard = n => card(PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#1E1A16"/>`).join(''));
const arrowCard = deg => `<span style="display:block;transform:rotate(${deg}deg)">${iconHTML('arrowR')}</span>`;

const RULES = [
  {
    text: 'les 2 cartes ont la MÊME FORME',
    gen(rng, match) {
      const a = rng.pick(SHAPE_KEYS);
      const b = match ? a : rng.pick(SHAPE_KEYS.filter(k => k !== a));
      const ca = rng.pick(COLORS);
      const cb = rng.chance(0.4) ? ca : rng.pick(COLORS); // la couleur est un piège
      return [shapeCard(a, ca), shapeCard(b, cb)];
    },
  },
  {
    text: 'les 2 nombres font 10 en tout',
    gen(rng, match) {
      const a = rng.int(1, 9);
      let b = 10 - a;
      if (!match) { do { b = rng.int(1, 9); } while (a + b === 10); }
      return [numCard(a), numCard(b)];
    },
  },
  {
    text: 'le chiffre et les points font le MÊME NOMBRE',
    gen(rng, match) {
      const a = rng.int(2, 9);
      let b = a;
      if (!match) { do { b = rng.int(1, 9); } while (b === a); }
      return [numCard(a), dotsCard(b)];
    },
  },
  {
    text: 'les 2 flèches vont dans la MÊME DIRECTION',
    gen(rng, match) {
      const a = rng.pick([0, 90, 180, 270]);
      const b = match ? a : rng.pick([0, 90, 180, 270].filter(x => x !== a));
      return [arrowCard(a), arrowCard(b)];
    },
  },
];

export default {
  id: 'draw',
  domain: 'concentration',
  kind: 'party',
  world: 'w-draw',
  name: 'Dégaine !',
  tagline: 'Le plus rapide… mais pas trop tôt !',
  trains: 'Réflexes et maîtrise de soi',
  rule: 'Posez le téléphone à plat entre vous deux. Les cartes changent sans arrêt : tape ta moitié d’écran dès que la règle est vraie. Trop tôt ? Le point va à l’autre. Premier à 5 points.',
  short: 'Attends le bon moment… et DÉGAINE !',
  duration: '≈ 2 min',
  faceToFace: true,
  unit: () => 'points',
  party: { min: 2, max: 2 },
  tip: {
    title: 'Garde le doigt prêt, pas pressé',
    text: 'Décide d’abord « oui ou non », puis tape. Le jeu récompense autant la retenue que la vitesse : c’est ce qu’on appelle le contrôle inhibiteur.',
    life: 'Ne pas répondre du tac au tac dans une dispute, ne pas freiner trop tard : même compétence.',
  },

  async play({ stage, players, rng, scope, sfx, buzz, hud, pause }) {
    const WIN = 5;
    const score = [0, 0];
    const fouls = [0, 0];
    let state = 'wait';
    let ruleIdx = rng.int(0, RULES.length - 1);
    let over = false;

    const halves = players.map((p, idx) => {
      const rule = h('p', { class: 'dr-rule' });
      const cards = h('div', { class: 'dr-cards' }, h('span', { class: 'dr-card' }), h('span', { class: 'dr-card' }));
      const pts = h('div', { class: 'dr-pts' }, Array.from({ length: WIN }, () => h('i')));
      const msg = h('p', { class: 'dr-msg' });
      const half = h('button', { class: `ftf-half dr-half ${idx === 1 ? 'flip' : ''}`, type: 'button', style: `--pc:${p.color}`, 'aria-label': `Dégainer : ${p.name}` },
        h('div', { class: 'ftf-who' }, h('span', { class: 'ftf-av', html: avatarSVG(p.avatar, { size: 40 }) }), h('span', { class: 'ftf-name' }, p.name), pts),
        msg, rule, cards);
      tap(scope, half, () => hit(idx));
      return { half, rule, cards, pts, msg };
    });
    const pauseBtn = h('button', { class: 'ftf-pause', type: 'button', 'aria-label': 'Pause', onClick: pause }, icon('pause'));
    stage.replaceChildren(h('div', { class: 'drw ftf' }, halves[1].half, h('div', { class: 'ftf-mid' }, pauseBtn), halves[0].half));
    hud.label('');

    let resolveRound = null;
    function hit(idx) {
      if (over || !resolveRound || state === 'wait') return;
      if (state === 'match') resolveRound({ winner: idx, kind: 'fast' });
      else resolveRound({ winner: 1 - idx, kind: 'foul', fouler: idx });
    }

    function show(cards) {
      halves.forEach(hv => {
        hv.cards.children[0].innerHTML = cards[0];
        hv.cards.children[1].innerHTML = cards[1];
        hv.cards.classList.remove('flip-in');
        void hv.cards.offsetWidth;
        hv.cards.classList.add('flip-in');
      });
    }

    function setMsg(i, text, cls = '') {
      halves[i].msg.textContent = text;
      halves[i].msg.className = `dr-msg ${cls}`;
    }

    while (!over) {
      const rule = RULES[ruleIdx];
      halves.forEach((hv, i) => { hv.rule.textContent = `Tape quand ${rule.text}`; setMsg(i, 'Prêt…'); hv.half.classList.remove('won', 'lost'); });
      state = 'wait';
      show(rule.gen(rng, false));
      await scope.sleep(1400);
      halves.forEach((_, i) => setMsg(i, ''));
      const res = await new Promise(resolve => {
        resolveRound = r => { resolveRound = null; resolve(r); };
        state = 'nomatch';
        let flips = 0;
        const matchAt = rng.int(2, 6);
        const flip = () => {
          if (!resolveRound) return;
          flips++;
          const isMatch = flips === matchAt || (flips > matchAt && rng.chance(0.3));
          state = isMatch ? 'match' : 'nomatch';
          show(rule.gen(rng, isMatch));
          sfx.tick(isMatch ? 4 : 0);
          scope.timeout(flip, isMatch ? 1700 : 900 + rng.int(0, 500));
        };
        scope.timeout(flip, 500);
      });
      state = 'wait';
      score[res.winner]++;
      const loser = 1 - res.winner;
      if (res.kind === 'foul') {
        fouls[res.fouler]++;
        setMsg(res.fouler, 'Trop tôt !', 'bad');
        setMsg(res.winner, '+1 cadeau !', 'good');
        sfx.bad();
        buzz([40, 30, 40]);
      } else {
        setMsg(res.winner, 'PAN ! +1', 'good');
        setMsg(loser, 'Trop lent…', '');
        sfx.bang();
        buzz(30);
      }
      halves[res.winner].half.classList.add('won');
      halves[loser].half.classList.add('lost');
      halves.forEach((hv, i) => [...hv.pts.children].forEach((d, k) => d.classList.toggle('on', k < score[i])));
      hud.progress(Math.max(...score) / WIN);
      if (score[res.winner] >= WIN) { over = true; sfx.win(); await scope.sleep(1400); break; }
      await scope.sleep(1500);
      ruleIdx = (ruleIdx + 1 + rng.int(0, RULES.length - 2)) % RULES.length;
    }

    const winner = score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1;
    return {
      winner,
      scores: score,
      stats: players.map((p, i) => [p.name, `${score[i]} point${score[i] > 1 ? 's' : ''}, ${fouls[i]} faux départ${fouls[i] > 1 ? 's' : ''}`]),
    };
  },
};
