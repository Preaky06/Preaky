// Le lecteur plein écran : intro → décompte → partie → résultat.
// Trois parcours : séance du jour, jeu libre, duel à deux.
import { h, frag, Scope, dayKey, hashStr, timeScale } from './util.js';
import { icon } from './icons.js';
import { gameBadge, domainChip, tipBlock, weekStrip, weekMessage, openSheet, segmented } from './ui.js';
import { mascot } from './mascot.js';
import { sfx, buzz } from './audio.js';
import { makeRng, randomSeed } from './rng.js';
import * as store from './store.js';
import { GAMES, gameById } from './games/index.js';
import { DOMAIN_ORDER, DEFIS } from './content.js';

const ABORT = Symbol('abort');
let rerender = () => {};

// history.back() est asynchrone (plusieurs centaines de ms parfois). Ce compteur, lu avant
// les écouteurs des lecteurs, distingue nos retours programmés du bouton retour de l'utilisateur.
let pendingBacks = 0;
let programmaticPop = false;
addEventListener('popstate', () => {
  programmaticPop = pendingBacks > 0;
  if (programmaticPop) pendingBacks--;
});
export const setRerender = fn => { rerender = fn; };
const settings = () => store.db().settings;

class Player {
  constructor() {
    this.el = h('div', { class: 'player', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Partie en cours' });
    this.inner = h('div', { class: 'player-inner' });
    this.el.append(this.inner);
    this.scope = null;
    this.sheet = null;
    this.closed = false;
    this.abortP = new Promise((_, reject) => { this.rejectAbort = reject; });
    this.abortP.catch(() => {});
    this.onPop = () => this.back();
    this.onVis = () => { if (document.hidden) this.pause(); };
  }
  open() {
    document.body.append(this.el);
    document.body.classList.add('player-open');
    try { history.pushState({ pm: 1 }, ''); } catch { /* historique indisponible */ }
    addEventListener('popstate', this.onPop);
    document.addEventListener('visibilitychange', this.onVis);
  }
  show(node) {
    this.inner.replaceChildren(node);
    this.el.scrollTop = 0;
    node.classList.add('enter');
    node.querySelector('[data-focus]')?.focus({ preventScroll: true });
  }
  race(p) { return Promise.race([p, this.abortP]); }
  delay(ms) { return this.race(new Promise(r => setTimeout(r, ms * timeScale()))); }
  ask(build) { return this.race(new Promise(resolve => build(resolve))); }
  quit() {
    if (this.closed) return;
    this.scope?.dispose();
    this.rejectAbort(ABORT);
  }
  // Ferme le lecteur et retire l'entrée d'historique qu'il avait ajoutée.
  close() {
    if (this.closed) return;
    this.closed = true;
    this.scope?.dispose();
    removeEventListener('popstate', this.onPop);
    document.removeEventListener('visibilitychange', this.onVis);
    this.el.remove();
    document.body.classList.remove('player-open');
    if (history.state?.pm) {
      pendingBacks++;
      try { history.back(); } catch { pendingBacks--; }
    }
    rerender();
  }
  // Bouton « retour » du téléphone : pause pendant une partie, sinon on ferme.
  back() {
    if (this.closed) return;
    if (programmaticPop) {
      // Retour déclenché par la fermeture du lecteur précédent (arrivé en retard) : on l'ignore.
      try { history.pushState({ pm: 1 }, ''); } catch { /* ignore */ }
      return;
    }
    if (this.scope && !this.scope.dead) {
      try { history.pushState({ pm: 1 }, ''); } catch { /* ignore */ }
      this.pause();
    } else {
      this.quit();
    }
  }
  pause() {
    if (!this.scope || this.scope.dead || this.sheet) return;
    this.scope.pause();
    this.el.classList.add('is-paused');
    const resume = () => { this.sheet = null; this.el.classList.remove('is-paused'); this.scope?.resume(); };
    this.sheet = openSheet(this.el, {
      title: 'Pause',
      text: 'Prends ton temps. La partie reprend exactement où tu l’as laissée.',
      actions: [
        { label: 'Reprendre', primary: true, onClick: resume },
        { label: 'Quitter la partie', onClick: () => { this.sheet = null; this.quit(); } },
      ],
      onDismiss: resume,
    });
  }
}

let busy = false;

async function flow(run) {
  if (busy) return; // double tap ou fermeture encore en cours
  busy = true;
  const P = new Player();
  P.open();
  try {
    await run(P);
  } catch (e) {
    if (e !== ABORT) console.error(e);
  }
  P.close();
  busy = false;
}

// ---------- Choix de la séance du jour ----------
// Un jeu par domaine ; dans chaque domaine, celui joué le moins récemment (hors aujourd'hui),
// pour que la séance reste stable dans la journée.
export function pickSession() {
  const today = dayKey();
  const last = {};
  for (const e of store.db().history) {
    if (dayKey(new Date(e.t)) !== today) last[e.g] = e.t;
  }
  return DOMAIN_ORDER.map(dom => GAMES
    .filter(g => g.domain === dom)
    .map(g => ({ g, k: last[g.id] || 0, tie: hashStr(today + g.id) }))
    .sort((a, b) => a.k - b.k || a.tie - b.tie)[0].g);
}

// ---------- Écrans ----------
function topBar(P, right) {
  return h('div', { class: 'pbar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fermer', onClick: () => P.quit() }, icon('close')),
    h('span', { class: 'grow' }),
    right);
}

function introScreen(P, game, { level, step, onStart }) {
  const compact = store.playsOf(game.id) >= 2;
  return h('section', { class: `screen intro d-${game.domain}` },
    topBar(P, step && h('span', { class: 'chip chip-plain' }, step)),
    h('div', { class: 'intro-head' },
      domainChip(game.domain),
      h('h1', { class: 'display intro-title', tabindex: '-1', 'data-focus': '' }, game.name),
      h('p', { class: 'intro-trains' }, `Entraîne : ${game.trains.toLowerCase()}`)),
    !compact && h('div', { class: 'demo', html: game.demo() }),
    h('div', { class: 'intro-rule' }, h('h2', { class: 'label' }, 'Le but'), h('p', {}, game.rule)),
    tipBlock(game.tip, { collapsed: compact }),
    h('div', { class: 'sticky-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: onStart }, icon('play'), 'Jouer'),
      h('p', { class: 'muted small center' }, `${game.duration} · Niveau ${level}${settings().zen ? ' · Mode zen' : ''}`)));
}

async function countdown(P, game) {
  const num = h('span', { class: 'cd-num', 'aria-live': 'assertive' });
  P.show(h('section', { class: `screen countdown-wrap d-${game.domain}` },
    h('div', { class: 'countdown' }, num, h('p', { class: 'cd-hint' }, game.short))));
  for (const n of ['3', '2', '1']) {
    num.textContent = n;
    num.classList.remove('pop');
    void num.offsetWidth;
    num.classList.add('pop');
    sfx.tick(0);
    await P.delay(settings().zen ? 700 : 560);
  }
  sfx.go();
}

function gameScreen(P, game, level) {
  const bar = h('i');
  const progress = h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Avancement', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, bar);
  const label = h('p', { class: 'hud-label', 'aria-live': 'polite' });
  const stage = h('div', { class: `stage stage-${game.id}` });
  const screen = h('section', { class: `screen play d-${game.domain}` },
    h('div', { class: 'pbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Pause', onClick: () => P.pause() }, icon('pause')),
      progress,
      h('span', { class: 'chip' }, `Niv. ${level}`)),
    label, stage);
  let last = -1;
  const hud = {
    progress(f) {
      const v = Math.round(Math.max(0, Math.min(1, f)) * 100);
      if (v === last) return;
      last = v;
      bar.style.width = `${v}%`;
      progress.setAttribute('aria-valuenow', String(v));
    },
    label(t) { label.textContent = t; },
    flash(kind) {
      screen.classList.remove('flash-good', 'flash-bad');
      void screen.offsetWidth;
      screen.classList.add(`flash-${kind}`);
    },
  };
  return { screen, stage, hud };
}

async function playGame(P, game, { level, seed = randomSeed(), step, skipIntro = false }) {
  if (!skipIntro) await P.ask(done => P.show(introScreen(P, game, { level, step, onStart: done })));
  await countdown(P, game);
  const scope = new Scope();
  P.scope = scope;
  const { screen, stage, hud } = gameScreen(P, game, level);
  P.show(screen);
  const res = await P.race(game.play({ stage, level, rng: makeRng(seed), zen: settings().zen, scope, hud, sfx, buzz }));
  scope.dispose();
  P.scope = null;
  return res;
}

function headline(res, info) {
  if (info.isRecord) return 'Nouveau record !';
  if (info.firstTime) return 'Première partie !';
  if (res.accuracy >= 0.85) return 'Excellent !';
  if (res.accuracy >= 0.6) return 'Bien joué';
  return 'Ça, c’est de l’entraînement';
}

function levelLine(info) {
  if (info.newLevel > info.prevLevel) return h('p', { class: 'level-pill up' }, icon('up'), `Niveau ${info.prevLevel} → ${info.newLevel}`);
  if (info.newLevel < info.prevLevel) return h('p', { class: 'level-pill' }, `Niveau ajusté : ${info.prevLevel} → ${info.newLevel}, pour progresser au bon rythme`);
  return h('p', { class: 'level-pill' }, `Niveau ${info.prevLevel} maintenu`);
}

function resultScreen(P, game, res, info, { cta, onNext, secondary }) {
  const mood = info.isRecord ? 'wow' : res.accuracy >= 0.5 ? 'happy' : 'calm';
  const compare = info.firstTime
    ? 'C’est ta première mesure. La prochaine fois, tu te compares à toi-même.'
    : `Ta moyenne récente : ${info.avg} · Ton record : ${info.best}`;
  return h('section', { class: `screen result d-${game.domain}` },
    topBar(P, h('span', { class: 'chip' }, game.name)),
    h('div', { class: 'res-head' },
      frag(mascot(mood, { size: 104, color: 'var(--d)' })),
      h('h1', { class: 'display res-title', tabindex: '-1', 'data-focus': '' }, headline(res, info))),
    h('div', { class: 'score' },
      h('p', { class: 'score-big' }, String(res.score)),
      h('p', { class: 'score-unit' }, game.unit(res.score))),
    h('p', { class: 'compare' }, compare),
    levelLine(info),
    h('dl', { class: 'stats' }, res.stats.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))),
    res.accuracy < 0.6 && h('div', { class: 'coach' }, h('p', { class: 'label' }, 'Pour la prochaine fois'), tipBlock(game.tip)),
    h('div', { class: 'sticky-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: onNext }, cta),
      secondary && h('button', { class: 'btn btn-ghost btn-block', type: 'button', onClick: secondary.onClick }, secondary.label)));
}

function summaryScreen(P, results, onDone) {
  const name = store.db().profile.name.trim();
  const defi = DEFIS[hashStr(dayKey()) % DEFIS.length];
  const week = weekStrip();
  return h('section', { class: 'screen summary' },
    topBar(P),
    h('div', { class: 'res-head' },
      frag(mascot('happy', { size: 112, color: 'var(--cyan)', cls: 'bob' })),
      h('p', { class: 'eyebrow' }, 'Séance terminée'),
      h('h1', { class: 'display res-title', tabindex: '-1', 'data-focus': '' }, name ? `Bravo ${name} !` : 'Bravo !')),
    h('ol', { class: 'sum-list' }, results.map(({ game, res, info }) => h('li', { class: `sum-item d-${game.domain}` },
      gameBadge(game),
      h('span', { class: 'grow' }, h('span', { class: 'sum-name' }, game.name), h('span', { class: 'sum-unit' }, game.unit(res.score))),
      h('span', { class: 'sum-score' }, String(res.score)),
      info.newLevel > info.prevLevel && h('span', { class: 'sum-up', 'aria-label': 'Niveau supérieur' }, icon('up'))))),
    h('div', { class: 'card week-card' },
      h('div', { class: 'row-between' }, h('h2', { class: 'h3' }, 'Cette semaine'), h('span', { class: 'week-count' }, h('b', {}, String(week.active)), ' / 7 jours')),
      week.el,
      h('p', { class: 'muted small' }, weekMessage(week.active))),
    h('div', { class: 'defi' },
      h('p', { class: 'eyebrow' }, 'Ton défi « vraie vie »'),
      h('h2', { class: 'h3' }, defi.title),
      h('p', {}, defi.text),
      h('p', { class: 'small muted' }, 'C’est là que l’entraînement sert vraiment : dans ta journée.')),
    h('div', { class: 'sticky-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: onDone }, 'Terminer')));
}

// ---------- Parcours ----------
async function runSession(P) {
  const games = pickSession();
  const results = [];
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const res = await playGame(P, game, { level: store.levelOf(game.id), step: `Jeu ${i + 1} sur ${games.length}` });
    const info = store.recordGame(game.id, res, 'session');
    results.push({ game, res, info });
    const last = i === games.length - 1;
    if (last) store.recordSession();
    if (info.isRecord) sfx.win();
    await P.ask(done => P.show(resultScreen(P, game, res, info, { cta: last ? 'Voir le bilan' : 'Jeu suivant', onNext: done })));
  }
  sfx.win();
  await P.ask(done => P.show(summaryScreen(P, results, done)));
}

async function runFree(P, game) {
  let skipIntro = false;
  for (;;) {
    const res = await playGame(P, game, { level: store.levelOf(game.id), skipIntro });
    const info = store.recordGame(game.id, res, 'free');
    if (info.isRecord) sfx.win();
    const again = await P.ask(done => P.show(resultScreen(P, game, res, info, {
      cta: 'Rejouer', onNext: () => done(true),
      secondary: { label: 'Terminer', onClick: () => done(false) },
    })));
    if (!again) return;
    skipIntro = true;
  }
}

// ---------- Duel à deux ----------
const DUO_LEVELS = [[2, 'Facile'], [6, 'Moyen'], [10, 'Costaud']];

function duoSetup(P, done) {
  const me = store.db().profile.name.trim();
  let gameId = GAMES[0].id;
  let level = 2;
  const n1 = h('input', { class: 'input', id: 'duo-p1', type: 'text', maxlength: '20', placeholder: 'Joueur 1', value: me, autocomplete: 'off' });
  const n2 = h('input', { class: 'input', id: 'duo-p2', type: 'text', maxlength: '20', placeholder: 'Joueur 2', autocomplete: 'off' });
  const picks = GAMES.map(g => {
    const b = h('button', { class: `pick d-${g.domain}`, type: 'button', role: 'radio', 'aria-checked': String(g.id === gameId) }, gameBadge(g), h('span', {}, g.name));
    b.addEventListener('click', () => { gameId = g.id; picks.forEach(x => x.setAttribute('aria-checked', String(x === b))); });
    return b;
  });
  const start = () => done({
    gameId, level,
    names: [n1.value.trim() || 'Joueur 1', n2.value.trim() || 'Joueur 2'],
  });
  return h('section', { class: 'screen duo-setup' },
    topBar(P),
    h('div', { class: 'intro-head' },
      h('h1', { class: 'display intro-title', tabindex: '-1', 'data-focus': '' }, 'À deux'),
      h('p', { class: 'lead' }, 'Le même jeu avec exactement les mêmes défis. Chacun joue à son tour sur ce téléphone.')),
    h('div', { class: 'field' }, h('p', { class: 'label' }, 'Les joueurs'),
      h('div', { class: 'two-inputs' },
        h('label', { class: 'sr', for: 'duo-p1' }, 'Prénom du joueur 1'), n1,
        h('label', { class: 'sr', for: 'duo-p2' }, 'Prénom du joueur 2'), n2)),
    h('div', { class: 'field' }, h('p', { class: 'label', id: 'duo-game-l' }, 'Le jeu'),
      h('div', { class: 'pick-grid', role: 'radiogroup', 'aria-labelledby': 'duo-game-l' }, picks)),
    h('div', { class: 'field' }, h('p', { class: 'label' }, 'Difficulté'),
      segmented('duo-level', DUO_LEVELS, level, v => { level = Number(v); }, 'Difficulté')),
    h('div', { class: 'sticky-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: start }, icon('duo'), 'Commencer le duel')));
}

function handoffScreen(P, game, name, first, done) {
  return h('section', { class: `screen handoff d-${game.domain}` },
    topBar(P),
    h('div', { class: 'handoff-body' },
      frag(mascot('wow', { size: 120, color: 'var(--d)', cls: 'bob' })),
      h('p', { class: 'eyebrow' }, first ? 'On commence par' : 'Passe le téléphone à'),
      h('h1', { class: 'display handoff-name', tabindex: '-1', 'data-focus': '' }, name),
      h('div', { class: 'handoff-game' }, gameBadge(game), h('span', {}, h('b', {}, game.name), h('br'), game.rule))),
    h('div', { class: 'sticky-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: done }, `C’est ${name}, je suis prêt·e`)));
}

function podiumScreen(P, game, cfg, scores, done) {
  const [a, b] = scores.map(s => s.score);
  const winner = a === b ? -1 : a > b ? 0 : 1;
  const rows = cfg.names.map((n, i) => h('div', { class: `pod-row${winner === i ? ' win' : ''}` },
    winner === i ? icon('trophy') : h('span', { class: 'pod-rank' }, String(i + 1)),
    h('span', { class: 'pod-name' }, n),
    h('span', { class: 'pod-score' }, String(scores[i].score))));
  return h('section', { class: `screen result d-${game.domain}` },
    topBar(P),
    h('div', { class: 'res-head' },
      frag(mascot(winner < 0 ? 'happy' : 'wow', { size: 104, color: 'var(--d)' })),
      h('h1', { class: 'display res-title', tabindex: '-1', 'data-focus': '' }, winner < 0 ? 'Égalité parfaite !' : `${cfg.names[winner]} gagne !`),
      h('p', { class: 'muted' }, `${game.name} · ${game.unit(2)}`)),
    h('div', { class: 'podium' }, rows),
    h('div', { class: 'coach' }, h('p', { class: 'label' }, 'Le secret de ce jeu'), tipBlock(game.tip)),
    h('div', { class: 'sticky-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-lg', type: 'button', onClick: () => done(true) }, icon('refresh'), 'Revanche'),
      h('button', { class: 'btn btn-ghost btn-block', type: 'button', onClick: () => done(false) }, 'Terminer')));
}

async function runDuo(P) {
  let cfg = await P.ask(done => P.show(duoSetup(P, done)));
  for (;;) {
    const game = gameById(cfg.gameId);
    const seed = randomSeed();
    const scores = [];
    for (let p = 0; p < 2; p++) {
      await P.ask(done => P.show(handoffScreen(P, game, cfg.names[p], p === 0, done)));
      scores.push(await playGame(P, game, { level: cfg.level, seed, skipIntro: true }));
      store.touchDay();
      store.save();
    }
    sfx.win();
    const again = await P.ask(done => P.show(podiumScreen(P, game, cfg, scores, done)));
    if (!again) return;
    cfg = { ...cfg, names: [cfg.names[1], cfg.names[0]] };
  }
}

export const startSession = () => flow(runSession);
export const startFree = id => flow(P => runFree(P, gameById(id)));
export const startDuo = () => flow(runDuo);
