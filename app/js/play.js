// Écran de jeu commun à tous les casse-têtes : barre de titre, chrono, outils, sauvegarde, victoire.
import { h, mount, dayKey, timeScale } from './util.js';
import { icon, iconHTML } from './icons.js';
import { topbar, openSheet, fmtTime, fmtClock } from './ui.js';
import { makeRng, randomSeed } from './rng.js';
import { sfx, buzz } from './audio.js';
import * as store from './store.js';
import { puzzleById, levelOf } from './puzzles/index.js';

let active = null;   // partie affichée
let cleanup = [];

// Ouvre l'écran de jeu (ou le redessine si on y est déjà, ex. « Nouvelle grille »).
const goPlay = () => {
  if (location.hash === '#jouer') dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = 'jouer';
};

export function leavePlay() {
  cleanup.forEach(f => f());
  cleanup = [];
}

// Crée une nouvelle grille et l'enregistre comme partie en cours.
export function newGame(p, level, { daily = false, seed = randomSeed() } = {}) {
  const key = store.gameKey(p.id, daily);
  const data = p.create(level, makeRng(seed));
  const game = { id: p.id, level: level.id, daily, seed, puzzle: data, state: null, elapsed: 0, hints: 0 };
  store.putGame(key, game);
  active = { key, ...game };
  goPlay();
}

export function resumeGame(key) {
  const g = store.getGame(key);
  if (!g) return false;
  active = { key, ...g };
  goPlay();
  return true;
}

export const hasActive = () => !!active;

export function renderPlay(view, app) {
  leavePlay();
  if (!active) { app.go(''); return; }
  const A = active; // la partie de CET écran (active peut changer ensuite)
  const p = puzzleById(A.id);
  const level = levelOf(p, A.level);
  let solved = false;
  let keyHandler = null;
  const resizeFns = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); cleanup.push(() => target.removeEventListener(type, fn, opts)); };

  const settings = store.settings();
  const progressEl = h('span', { class: 'pl-progress' });
  const clockEl = h('span', { class: 'pl-clock', hidden: !settings.timer }, icon('clock'), h('span', {}, fmtClock(A.elapsed)));
  const statusEl = h('p', { class: 'pl-status', 'aria-live': 'polite' });
  const board = h('div', { class: `pl-board pb-${p.id}` });
  const tools = h('div', { class: 'pl-tools', role: 'toolbar', 'aria-label': 'Outils' });
  const pad = h('div', { class: 'pl-pad' });

  const persist = () => {
    if (solved) return;
    store.putGame(A.key, { id: A.id, level: A.level, daily: A.daily, seed: A.seed, puzzle: A.puzzle, state: A.state, elapsed: A.elapsed, hints: A.hints });
  };

  cleanup.push(() => persist());

  const back = () => {
    persist();
    app.back(A.daily ? '' : p.id);
  };

  const menu = () => openSheet({
    title: p.name,
    body: h('ul', { class: 'rules' }, p.rules.map(r => h('li', {}, r))),
    actions: [
      { label: 'Continuer', primary: true },
      { label: 'Recommencer cette grille', onClick: () => { A.state = null; A.hints = 0; A.elapsed = 0; persist(); renderPlay(view, app); } },
      ...(A.daily ? [] : [{ label: 'Nouvelle grille', onClick: () => newGame(p, level) }]),
    ],
  });

  mount(view,
    topbar({
      title: p.name,
      sub: `${A.daily ? 'Casse-tête du jour · ' : ''}${level.label} · ${level.detail}`,
      onBack: back,
      actions: [h('button', { class: 'pill-btn', type: 'button', onClick: menu, 'aria-label': 'Règles et options' }, icon('book'), 'Règles')],
    }),
    h('div', { class: 'pl-meta' }, progressEl, clockEl),
    statusEl,
    board,
    tools,
    pad);
  document.body.dataset.screen = 'play';

  let statusTimer = 0;
  const ctx = {
    board,
    tools,
    pad,
    puzzle: A.puzzle,
    state: A.state ? JSON.parse(JSON.stringify(A.state)) : null,
    settings,
    sfx,
    buzz,
    iconHTML,
    on,
    save(state) { A.state = JSON.parse(JSON.stringify(state)); persist(); },
    status(text, kind = '') {
      statusEl.textContent = text;
      statusEl.className = `pl-status ${kind}`;
      clearTimeout(statusTimer);
      if (text) statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 6000);
    },
    progress(text) { progressEl.textContent = text; },
    tool(name, label, onClick, { toggle = false } = {}) {
      const b = h('button', { class: 'tool', type: 'button', ...(toggle ? { 'aria-pressed': 'false' } : {}) },
        h('span', { class: 'tool-i', html: iconHTML(name) }), h('span', { class: 'tool-l' }, label));
      b.addEventListener('click', onClick);
      tools.append(b);
      return b;
    },
    useHint() { A.hints++; persist(); },
    onKey(fn) { keyHandler = fn; },
    onResize(fn) { resizeFns.push(fn); },
    solved(info) { if (!solved) { solved = true; finish(info); } },
  };

  // Chrono : n'avance que si l'écran est visible.
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    if (!solved && !document.hidden) {
      A.elapsed += (now - last) / timeScale();
      clockEl.lastChild.textContent = fmtClock(A.elapsed);
    }
    last = now;
  };
  const iv = setInterval(tick, 1000);
  const saver = setInterval(() => { if (!solved) persist(); }, 5000);
  cleanup.push(() => { clearInterval(iv); clearInterval(saver); clearTimeout(statusTimer); });
  on(document, 'visibilitychange', () => { last = performance.now(); if (document.hidden) persist(); });
  on(window, 'keydown', e => {
    if (document.querySelector('.sheet-backdrop')) return;
    if (e.target.closest?.('input')) return;
    if (keyHandler && keyHandler(e)) e.preventDefault();
  });
  on(window, 'resize', () => resizeFns.forEach(f => f()));

  p.start(ctx);

  // Première visite : on affiche la règle du jeu.
  if (!store.db().seen[p.id]) {
    store.db().seen[p.id] = true;
    store.save();
    openSheet({ title: `Comment jouer : ${p.name}`, body: h('ul', { class: 'rules' }, p.rules.map(r => h('li', {}, r))), actions: [{ label: 'J’ai compris', primary: true }] });
  }

  function finish(info) {
    tick();
    const ms = A.elapsed;
    const res = store.recordSolve(p.id, level.id, ms, A.hints, A.daily);
    store.dropGame(A.key);
    clockEl.classList.add('done');
    sfx.win();
    buzz([20, 60, 20]);
    const streak = A.daily ? store.dailyStreak() : 0;
    const s = store.statsOf(p.id, level.id);
    const rows = [
      ['Temps', fmtTime(ms)],
      ...(info.moves != null ? [['Coups', String(info.moves)]] : []),
      ['Indices utilisés', String(A.hints)],
      ['Record (sans indice)', s.best != null ? fmtTime(s.best) : '—'],
    ];
    setTimeout(() => openSheet({
      title: 'Bravo, c’est résolu !',
      body: h('div', { class: 'win' },
        info.message ? h('p', { class: 'win-msg' }, info.message) : null,
        res.record && res.prevBest != null ? h('p', { class: 'win-badge' }, icon('check'), 'Nouveau record pour ce niveau') : null,
        A.daily ? h('p', { class: 'win-badge' }, icon('check'), `Casse-tête du jour réussi${streak > 1 ? ` · ${streak} jours de suite` : ''}`) : null,
        h('dl', { class: 'win-stats' }, rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))))),
      actions: A.daily
        ? [{ label: 'Retour à l’accueil', primary: true, onClick: () => { active = null; app.go(''); } }]
        : [
          { label: 'Nouvelle grille', primary: true, onClick: () => newGame(p, level) },
          { label: 'Retour', onClick: () => { active = null; app.go(p.id); } },
        ],
    }), 650 * timeScale());
  }

  requestAnimationFrame(() => resizeFns.forEach(f => f()));
}

export function dailyKey() { return `jour-${dayKey()}`; }
