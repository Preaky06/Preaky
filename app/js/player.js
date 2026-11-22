// Le lecteur plein écran : intro → décompte → partie → récompenses.
// Parcours : séance du jour, jeu solo, partie à plusieurs (face-à-face, tour par tour, contre l'ordi).
import { h, frag, Scope, dayKey, hashStr, timeScale } from './util.js';
import { icon, GEM } from './icons.js';
import { gameBadge, gameArt, domainChip, tipBlock, openSheet, segmented, avatarEl, gemPill, PCOLORS, addPlayerSheet, streakCard } from './ui.js';
import { avatarSVG, randomAvatar } from './avatar.js';
import { sfx, buzz } from './audio.js';
import { makeRng, randomSeed } from './rng.js';
import * as store from './store.js';
import { SOLO, gameById } from './games/index.js';
import { DOMAIN_ORDER, DEFIS } from './content.js';
import { confetti, countUp } from './fx.js';

const ABORT = Symbol('abort');
let rerender = () => {};
export const setRerender = fn => { rerender = fn; };
const settings = () => store.settings();

const DARK = new Set(['w-bubbles', 'w-night', 'w-ocean', 'w-golf', 'w-tug', 'w-draw', 'w-dots', 'w-duel']);
const worldOf = g => g.world || `w-${g.domain}`;
const ROBOT = { color: 'nuit', eyes: 'etoiles', mouth: 'dents', hat: 'casque', glasses: 'none' };

// history.back() est asynchrone : ce compteur distingue nos retours programmés du bouton retour.
let pendingBacks = 0;
let programmaticPop = false;
addEventListener('popstate', () => {
  programmaticPop = pendingBacks > 0;
  if (programmaticPop) pendingBacks--;
});

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
  show(node, world = '') {
    this.el.className = `player ${world} ${DARK.has(world) ? 'is-dark' : ''}`;
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
  back() {
    if (this.closed) return;
    if (programmaticPop) {
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
  if (busy) return;
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

// ---------- Séance du jour ----------
// Un jeu par domaine ; dans chaque domaine, celui joué le moins récemment (hors aujourd'hui).
export function pickSession(pl = store.me()) {
  const today = dayKey();
  const last = {};
  for (const e of pl?.history || []) if (dayKey(new Date(e.t)) !== today) last[e.g] = e.t;
  return DOMAIN_ORDER.map(dom => SOLO
    .filter(g => g.domain === dom)
    .map(g => ({ g, k: last[g.id] || 0, tie: hashStr(today + g.id) }))
    .sort((a, b) => a.k - b.k || a.tie - b.tie)[0].g);
}

// ---------- Écrans communs ----------
function topBar(P, right) {
  return h('div', { class: 'pbar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fermer', onClick: () => P.quit() }, icon('close')),
    h('span', { class: 'grow' }),
    right || null);
}

const cta = (...kids) => h('div', { class: 'sticky-cta' }, kids);

function introScreen(P, game, { level, step, onStart }) {
  const compact = store.playsOf(game.id) >= 2;
  return h('section', { class: `screen intro d-${game.domain}` },
    topBar(P, step && h('span', { class: 'chip chip-glass' }, step)),
    h('div', { class: 'intro-hero' },
      gameArt(game, 'intro-art'),
      domainChip(game.domain),
      h('h1', { class: 'intro-title', tabindex: '-1', 'data-focus': '' }, game.name),
      h('p', { class: 'intro-trains' }, `Entraîne : ${game.trains.toLowerCase()}`)),
    !compact && game.demo && h('div', { class: 'demo', html: game.demo() }),
    h('div', { class: 'intro-card' }, h('h2', { class: 'label' }, 'Le but'), h('p', {}, game.rule)),
    tipBlock(game.tip, { collapsed: compact }),
    cta(
      h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: onStart }, icon('play'), 'Jouer'),
      h('p', { class: 'cta-meta' }, `${game.duration} · Niveau ${level}${settings().zen ? ' · Mode zen' : ''}`)));
}

async function countdown(P, game) {
  const num = h('span', { class: 'cd-num', 'aria-live': 'assertive' });
  P.show(h('section', { class: `screen countdown-wrap d-${game.domain}` },
    h('div', { class: 'countdown' }, gameArt(game, 'cd-art'), num, h('p', { class: 'cd-hint' }, game.short))), worldOf(game));
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
  const stage = h('div', { class: `stage stage-${game.id} ${game.kind === 'arcade' || game.id === 'golf' ? 'stage-canvas' : ''}` });
  const scoreEl = h('span', { class: 'hud-score', hidden: true }, h('b', {}, '0'));
  const livesEl = h('span', { class: 'hud-lives', hidden: true });
  const screen = h('section', { class: `screen play d-${game.domain} ${game.faceToFace ? 'is-ftf' : ''}` },
    h('div', { class: 'pbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Pause', onClick: () => P.pause() }, icon('pause')),
      progress,
      livesEl,
      scoreEl,
      level != null && h('span', { class: 'chip chip-glass hud-lvl' }, `Niv. ${level}`)),
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
      screen.classList.remove('flash-good', 'flash-bad', 'flash-rule');
      void screen.offsetWidth;
      screen.classList.add(`flash-${kind}`);
    },
    score(v) {
      scoreEl.hidden = false;
      scoreEl.firstChild.textContent = String(v);
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    },
    lives(n, max) {
      livesEl.hidden = false;
      livesEl.replaceChildren(...Array.from({ length: max }, (_, i) => h('span', { class: `heart${i < n ? ' on' : ''}` }, icon('heart'))));
    },
  };
  return { screen, stage, hud };
}

async function playSolo(P, game, { level, seed = randomSeed(), step, skipIntro = false }) {
  if (!skipIntro) await P.ask(done => P.show(introScreen(P, game, { level, step, onStart: done }), worldOf(game)));
  await countdown(P, game);
  const scope = new Scope();
  P.scope = scope;
  const { screen, stage, hud } = gameScreen(P, game, level);
  P.show(screen, worldOf(game));
  const res = await P.race(game.play({ stage, level, rng: makeRng(seed), zen: settings().zen, scope, hud, sfx, buzz, pause: () => P.pause() }));
  scope.dispose();
  P.scope = null;
  return res;
}

function headline(res, info) {
  if (info.isRecord) return 'Nouveau record !';
  if (info.firstTime) return 'Première partie !';
  if (res.accuracy >= 0.85) return 'Excellent !';
  if (res.accuracy >= 0.6) return 'Bien joué !';
  return 'Ça, c’est de l’entraînement';
}

function levelUpSheet(P, reward) {
  sfx.levelup();
  confetti({ count: 160 });
  openSheet(P.el, {
    art: h('div', { class: 'lvlup-art' }, avatarEl(store.me().avatar, 120, 'happy'), h('span', { class: 'lvlup-badge' }, String(reward.levelAfter))),
    title: `Niveau ${reward.levelAfter} !`,
    text: `Tu montes de niveau. Cadeau : ${reward.levelBonus} gemmes pour la boutique.`,
    actions: [{ label: 'Trop bien !', primary: true }],
  });
}

// Bloc « récompenses » : XP, gemmes, barre de niveau animée.
function rewardBlock(P, reward, { delay = 350 } = {}) {
  const pl = store.me();
  const before = store.levelInfo(pl.xp - reward.xp);
  const after = store.levelInfo(pl.xp);
  const fill = h('i', { style: `width:${Math.round(before.frac * 100)}%` });
  const lvl = h('span', { class: 'rw-lvl-n' }, `Niveau ${before.level}`);
  const xpN = h('b', {}, '0');
  const gemN = h('b', {}, '0');
  const node = h('div', { class: 'rewards' },
    h('div', { class: 'rw-chips' },
      h('span', { class: 'rw-chip rw-xp' }, '+', xpN, ' XP'),
      h('span', { class: 'rw-chip rw-gem' }, '+', gemN, frag(GEM))),
    h('div', { class: 'rw-lvl' }, lvl, h('span', { class: 'rw-track' }, fill), h('span', { class: 'rw-next' }, `${pl.xp - after.cur} / ${after.next - after.cur} XP`)));
  setTimeout(() => {
    countUp(xpN, reward.xp, { dur: 700 });
    countUp(gemN, reward.coins + reward.levelBonus, { dur: 700 });
    sfx.coin();
    if (reward.levelAfter > reward.levelBefore) {
      fill.style.width = '100%';
      setTimeout(() => {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        void fill.offsetWidth;
        fill.style.transition = '';
        fill.style.width = `${Math.round(after.frac * 100)}%`;
        lvl.textContent = `Niveau ${after.level}`;
        levelUpSheet(P, reward);
      }, 750);
    } else {
      fill.style.width = `${Math.round(after.frac * 100)}%`;
    }
  }, delay * timeScale());
  return node;
}

function resultScreen(P, game, res, info, { cta: ctaLabel, onNext, secondary }) {
  const pl = store.me();
  const mood = info.isRecord ? 'wow' : res.accuracy >= 0.5 ? 'happy' : null;
  const scoreEl = h('p', { class: 'score-big' }, '0');
  const compare = info.firstTime
    ? 'C’est ta première mesure. La prochaine fois, tu te compares à toi-même.'
    : `Ta moyenne récente : ${info.avg} · Ton record : ${info.best}`;
  const lvlLine = info.newLevel > info.prevLevel
    ? h('p', { class: 'level-pill up' }, icon('up'), `Difficulté ${info.prevLevel} → ${info.newLevel}`)
    : info.newLevel < info.prevLevel
      ? h('p', { class: 'level-pill' }, `Difficulté ajustée : ${info.prevLevel} → ${info.newLevel}`)
      : h('p', { class: 'level-pill' }, `Difficulté ${info.prevLevel} maintenue`);
  const node = h('section', { class: `screen result d-${game.domain}` },
    topBar(P, h('span', { class: 'chip chip-glass' }, game.name)),
    h('div', { class: 'res-hero' },
      info.isRecord && h('p', { class: 'ribbon' }, 'Record battu'),
      avatarEl(pl.avatar, 104, mood, 'res-av'),
      h('h1', { class: 'res-title', tabindex: '-1', 'data-focus': '' }, headline(res, info)),
      scoreEl,
      h('p', { class: 'score-unit' }, game.unit(res.score))),
    rewardBlock(P, info.reward),
    h('div', { class: 'res-card' },
      h('p', { class: 'compare' }, compare),
      lvlLine,
      h('dl', { class: 'stats' }, res.stats.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))))),
    res.accuracy < 0.6 && h('div', { class: 'coach' }, h('p', { class: 'label' }, 'Pour la prochaine fois'), tipBlock(game.tip)),
    cta(
      h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: onNext }, ctaLabel),
      secondary && h('button', { class: 'btn btn-glass btn-block', type: 'button', onClick: secondary.onClick }, secondary.label)));
  setTimeout(() => countUp(scoreEl, res.score, { dur: 800 }), 60);
  if (info.isRecord) setTimeout(() => confetti(), 300);
  return node;
}

// ---------- Séance du jour ----------
async function runSession(P) {
  const games = pickSession();
  const results = [];
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const res = await playSolo(P, game, { level: store.levelOf(game.id), step: `Jeu ${i + 1} sur ${games.length}` });
    const info = store.recordGame(game.id, res, 'session');
    results.push({ game, res, info });
    const last = i === games.length - 1;
    if (info.isRecord) sfx.win();
    await P.ask(done => P.show(resultScreen(P, game, res, info, { cta: last ? 'Voir le bilan' : 'Jeu suivant', onNext: done }), worldOf(game)));
  }
  const bonus = store.recordSession();
  sfx.win();
  confetti({ count: 150 });
  await P.ask(done => P.show(summaryScreen(P, results, bonus, done), 'w-summary'));
}

function summaryScreen(P, results, bonus, onDone) {
  const pl = store.me();
  const defi = DEFIS[hashStr(dayKey()) % DEFIS.length];
  const total = results.reduce((a, r) => ({ xp: a.xp + r.info.reward.xp, coins: a.coins + r.info.reward.coins + r.info.reward.levelBonus }), { xp: bonus.xp, coins: bonus.coins + bonus.levelBonus });
  const streakHost = h('div');
  const drawStreak = () => streakHost.replaceChildren(streakCard(pl, {
    onClaim: () => { const n = store.claim(pl); if (n) { sfx.coin(); confetti({ count: 80, y: 0.6 }); drawStreak(); } },
    onPlay: () => {},
  }));
  drawStreak();
  return h('section', { class: 'screen summary' },
    topBar(P),
    h('div', { class: 'res-hero' },
      avatarEl(pl.avatar, 112, 'happy', 'res-av bob'),
      h('p', { class: 'eyebrow' }, 'Séance terminée'),
      h('h1', { class: 'res-title', tabindex: '-1', 'data-focus': '' }, `Bravo ${pl.name} !`),
      h('div', { class: 'rw-chips' }, h('span', { class: 'rw-chip rw-xp' }, `+${total.xp} XP`), h('span', { class: 'rw-chip rw-gem' }, `+${total.coins}`, frag(GEM)))),
    h('ol', { class: 'sum-list' }, results.map(({ game, res, info }) => h('li', { class: 'sum-item' },
      gameBadge(game),
      h('span', { class: 'grow' }, h('span', { class: 'sum-name' }, game.name), h('span', { class: 'sum-unit' }, game.unit(res.score))),
      h('span', { class: 'sum-score' }, String(res.score)),
      info.isRecord && h('span', { class: 'sum-rec' }, 'Record')))),
    streakHost,
    h('div', { class: 'defi' },
      h('p', { class: 'eyebrow' }, 'Ton défi « vraie vie »'),
      h('h2', { class: 'h3' }, defi.title),
      h('p', {}, defi.text),
      h('p', { class: 'small muted' }, 'C’est là que l’entraînement sert vraiment : dans ta journée.')),
    cta(h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: onDone }, 'Terminer')));
}

async function runFree(P, game) {
  let skipIntro = false;
  for (;;) {
    const res = await playSolo(P, game, { level: store.levelOf(game.id), skipIntro });
    const info = store.recordGame(game.id, res, 'free');
    if (info.isRecord) sfx.win();
    const again = await P.ask(done => P.show(resultScreen(P, game, res, info, {
      cta: 'Rejouer', onNext: () => done(true),
      secondary: { label: 'Terminer', onClick: () => done(false) },
    }), worldOf(game)));
    if (!again) return;
    skipIntro = true;
  }
}

// ---------- Parties à plusieurs ----------
function partySetup(P, game, done) {
  const conf = game.party;
  const profiles = store.players();
  const guests = [];
  let selected = [store.me().id];
  let mode = conf.ai ? 'ai' : 'human';
  let aiLevel = 2;
  let gameId = SOLO[0].id;
  const levels = {};
  const options = Object.fromEntries((conf.options || []).map(([k, , , def]) => [k, def]));

  const grid = h('div', { class: 'pp-grid', role: 'group', 'aria-label': 'Joueurs' });
  const levelBox = h('div', { class: 'pp-levels' });
  const hint = h('p', { class: 'pp-hint' });
  const go = h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button' }, icon('play'), 'C’est parti !');
  const maxSel = () => (conf.ai && mode === 'ai' ? 1 : conf.max);
  const minSel = () => (conf.ai ? (mode === 'ai' ? 1 : 2) : conf.min);
  const who = k => profiles.find(p => p.id === k) || guests.find(g => g.id === k);

  function chip(p) {
    const idx = selected.indexOf(p.id);
    const b = h('button', { class: `pp-chip${idx >= 0 ? ' on' : ''}`, type: 'button', 'aria-pressed': String(idx >= 0), style: idx >= 0 ? `--pc:${PCOLORS[idx]}` : '' },
      avatarEl(p.avatar, 46),
      h('span', { class: 'pp-name' }, p.name),
      idx >= 0 && h('span', { class: 'pp-num' }, `J${idx + 1}`));
    b.addEventListener('click', () => {
      if (idx >= 0) selected = selected.filter(x => x !== p.id);
      else if (selected.length < maxSel()) selected.push(p.id);
      else selected = [...selected.slice(0, maxSel() - 1), p.id];
      draw();
    });
    return b;
  }

  function draw() {
    selected = selected.filter(k => who(k)).slice(0, maxSel());
    grid.replaceChildren(
      ...profiles.map(chip),
      ...guests.map(chip),
      h('button', { class: 'pp-add', type: 'button', onClick: () => { const n = guests.length + 1; const g = { id: `guest${n}`, name: `Invité ${n}`, avatar: randomAvatar(), guest: true }; guests.push(g); if (selected.length < maxSel()) selected.push(g.id); draw(); } }, icon('plus'), h('span', {}, 'Invité')),
      h('button', { class: 'pp-add', type: 'button', onClick: () => addPlayerSheet(P.el, pl => { profiles.splice(0, profiles.length, ...store.players()); if (selected.length < maxSel()) selected.push(pl.id); draw(); }) }, icon('user'), h('span', {}, 'Nouveau joueur')));
    if (conf.perPlayerLevel) {
      levelBox.replaceChildren(...selected.map((k, i) => h('div', { class: 'pp-level' },
        h('span', { class: 'pp-level-who', style: `--pc:${PCOLORS[i]}` }, avatarEl(who(k).avatar, 30), who(k).name),
        segmented(`lvl-${k}`, conf.perPlayerLevel.map(([v, l]) => [v, l]), levels[k] || 2, v => { levels[k] = Number(v); }, `Difficulté de ${who(k).name}`, 'seg-sm'))));
    }
    const need = minSel();
    hint.textContent = selected.length < need ? `Choisis ${need === 1 ? 'un joueur' : `${need} joueurs`} (touche « Invité » pour un joueur sans profil).` : conf.max > 2 && mode !== 'ai' ? `${selected.length} joueur${selected.length > 1 ? 's' : ''} · jusqu’à ${conf.max}` : '';
    go.disabled = selected.length < need;
  }

  go.addEventListener('click', () => {
    const players = selected.map((k, i) => {
      const p = who(k);
      return { id: p.guest ? null : p.id, name: p.name, avatar: p.avatar, color: PCOLORS[i], level: levels[k] || 2 };
    });
    if (conf.ai && mode === 'ai') players.push({ id: null, name: 'Robot Preaky', avatar: ROBOT, color: PCOLORS[1], ai: true, aiLevel });
    done({ players, options: { ...options }, gameId });
  });

  const sections = [];
  if (conf.ai) {
    const aiSeg = segmented('ai-level', [[1, 'Facile'], [2, 'Moyen'], [3, 'Malin']], aiLevel, v => { aiLevel = Number(v); }, 'Niveau de l’ordinateur', 'seg-sm');
    const aiRow = h('div', { class: 'pp-ai' }, h('span', { class: 'pp-level-who' }, avatarEl(ROBOT, 30), 'Robot Preaky'), aiSeg);
    sections.push(h('div', { class: 'field' }, h('p', { class: 'label' }, 'Adversaire'),
      segmented('party-mode', [['ai', 'Contre l’ordi'], ['human', 'Entre amis']], mode, v => { mode = v; aiRow.hidden = v !== 'ai'; draw(); }, 'Adversaire'),
      aiRow));
  }
  if (conf.pickGame) {
    const picks = SOLO.map(g => {
      const b = h('button', { class: 'pick', type: 'button', role: 'radio', 'aria-checked': String(g.id === gameId) }, gameBadge(g), h('span', {}, g.name));
      b.addEventListener('click', () => { gameId = g.id; picks.forEach(x => x.setAttribute('aria-checked', String(x === b))); });
      return b;
    });
    sections.push(h('div', { class: 'field' }, h('p', { class: 'label', id: 'duel-game-l' }, 'Le jeu'), h('div', { class: 'pick-grid', role: 'radiogroup', 'aria-labelledby': 'duel-game-l' }, picks)));
  }
  for (const [k, lab, opts] of conf.options || []) {
    sections.push(h('div', { class: 'field' }, h('p', { class: 'label' }, lab), segmented(`opt-${k}`, opts, options[k], v => { options[k] = Number(v); }, lab)));
  }

  draw();
  return h('section', { class: `screen setup d-${game.domain}` },
    topBar(P),
    h('div', { class: 'setup-hero' }, gameArt(game, 'setup-art'), h('div', {},
      h('h1', { class: 'intro-title', tabindex: '-1', 'data-focus': '' }, game.name),
      h('p', { class: 'intro-trains' }, game.tagline))),
    game.rule && h('div', { class: 'intro-card' }, h('h2', { class: 'label' }, 'Comment on joue'), h('p', {}, game.rule)),
    ...sections,
    h('div', { class: 'field' }, h('p', { class: 'label' }, 'Qui joue ?'), grid, hint),
    conf.perPlayerLevel && h('div', { class: 'field' }, h('p', { class: 'label' }, 'Difficulté de chacun'), h('p', { class: 'small muted' }, 'Chacun son niveau : petits et grands peuvent jouer à égalité.'), levelBox),
    cta(go));
}

function ftfIntro(P, game, cfg, done) {
  const [p1, p2] = cfg.players;
  return h('section', { class: 'screen ftf-intro' },
    topBar(P),
    h('div', { class: 'ftf-scene', 'aria-hidden': 'true' },
      h('div', { class: 'ftf-p ftf-top' }, avatarEl(p2.avatar, 76, 'wow'), h('span', {}, p2.name)),
      h('div', { class: 'ftf-phone' }, h('span', { class: 'ftf-phone-half' }), h('span', { class: 'ftf-phone-half' })),
      h('div', { class: 'ftf-p' }, avatarEl(p1.avatar, 76, 'happy'), h('span', {}, p1.name))),
    h('h1', { class: 'intro-title center', tabindex: '-1', 'data-focus': '' }, 'Face à face !'),
    h('p', { class: 'lead center' }, `Posez le téléphone à plat entre vous. ${p2.name} se met en haut, ${p1.name} en bas. Chacun a sa moitié d’écran.`),
    cta(h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: done }, 'On est prêts !')));
}

function handoffScreen(P, game, player, first, done) {
  return h('section', { class: 'screen handoff' },
    topBar(P),
    h('div', { class: 'handoff-body' },
      avatarEl(player.avatar, 130, 'wow', 'bob'),
      h('p', { class: 'eyebrow' }, first ? 'On commence par' : 'Passe le téléphone à'),
      h('h1', { class: 'handoff-name', tabindex: '-1', 'data-focus': '' }, player.name),
      h('div', { class: 'handoff-game' }, gameBadge(game), h('span', {}, h('b', {}, game.name), h('br'), game.rule))),
    cta(h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: done }, `C’est ${player.name}, je suis prêt·e`)));
}

async function runDuelRounds(P, cfg) {
  const g = gameById(cfg.gameId);
  const seed = randomSeed();
  const scores = [];
  for (let i = 0; i < cfg.players.length; i++) {
    await P.ask(done => P.show(handoffScreen(P, g, cfg.players[i], i === 0, done), worldOf(g)));
    const r = await playSolo(P, g, { level: cfg.options.level || 2, seed, skipIntro: true });
    scores.push(r.score);
  }
  const best = Math.max(...scores);
  const winners = scores.map((s, i) => (s === best ? i : -1)).filter(i => i >= 0);
  return { winner: winners.length === 1 ? winners[0] : -1, scores, unit: g.unit, playedGame: g, stats: [] };
}

function partyResult(P, game, cfg, res, rewards, done) {
  const shown = res.playedGame || game;
  const order = cfg.players.map((_, i) => i).sort((a, b) => (res.lowerIsBetter ? res.scores[a] - res.scores[b] : res.scores[b] - res.scores[a]));
  const w = res.winner;
  const solo = cfg.players.length === 1;
  const champ = w >= 0 ? cfg.players[w] : null;
  const title = solo ? (w === 0 ? 'Sous le par, bravo !' : 'Parcours terminé !') : champ ? `${champ.name} gagne !` : 'Égalité parfaite !';
  const unit = n => (res.lowerIsBetter ? (n <= 1 ? 'coup' : 'coups') : (res.unit || shown.unit)(n));
  if (champ && !champ.ai) setTimeout(() => confetti({ count: 170 }), 250);
  return h('section', { class: 'screen result party-result' },
    topBar(P, h('span', { class: 'chip chip-glass' }, shown.name)),
    h('div', { class: 'res-hero' },
      h('div', { class: 'champ' }, champ && h('span', { class: 'crown', 'aria-hidden': 'true', html: '<svg viewBox="0 0 64 40"><path d="M6 36 2 6l16 12L32 0l14 18L62 6l-4 30z" fill="#FFC21A" stroke="#B97F00" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="26" r="4" fill="#FF3D7F"/><circle cx="16" cy="28" r="3" fill="#3DB4FF"/><circle cx="48" cy="28" r="3" fill="#3DB4FF"/></svg>' }), avatarEl((champ || cfg.players[0]).avatar, 120, champ || solo ? 'happy' : 'wow', 'res-av')),
      h('h1', { class: 'res-title', tabindex: '-1', 'data-focus': '' }, title),
      solo && res.par != null && h('p', { class: 'score-unit' }, `${res.scores[0]} coups pour un par de ${res.par}`)),
    h('ol', { class: 'podium-list' }, order.map((i, rank) => {
      const p = cfg.players[i];
      const rw = p.id && rewards[p.id];
      return h('li', { class: `pod-row${i === w ? ' win' : ''}`, style: `--pc:${p.color}` },
        h('span', { class: 'pod-rank' }, String(rank + 1)),
        avatarEl(p.avatar, 44),
        h('span', { class: 'pod-name' }, p.name, rw ? h('small', {}, `+${rw.xp} XP · +${rw.coins + rw.levelBonus}`, frag(GEM)) : p.ai ? h('small', {}, 'Ordinateur') : p.id ? null : h('small', {}, 'Invité')),
        h('span', { class: 'pod-score' }, String(res.scores[i]), h('small', {}, unit(res.scores[i]))));
    })),
    res.stats?.length ? h('dl', { class: 'stats' }, res.stats.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))) : null,
    shown.tip && h('div', { class: 'coach' }, h('p', { class: 'label' }, 'Le secret de ce jeu'), tipBlock(shown.tip, { collapsed: true })),
    cta(
      h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: () => done('again') }, icon('refresh'), solo ? 'Rejouer' : 'Revanche !'),
      h('div', { class: 'cta-row' },
        h('button', { class: 'btn btn-glass', type: 'button', onClick: () => done('change') }, 'Changer'),
        h('button', { class: 'btn btn-glass', type: 'button', onClick: () => done('end') }, 'Terminer'))));
}

async function runParty(P, game) {
  let cfg = await P.ask(done => P.show(partySetup(P, game, done), worldOf(game)));
  for (;;) {
    let res;
    if (game.id === 'duel') {
      res = await runDuelRounds(P, cfg);
    } else {
      if (game.faceToFace) await P.ask(done => P.show(ftfIntro(P, game, cfg, done), worldOf(game)));
      await countdown(P, game);
      const scope = new Scope();
      P.scope = scope;
      const { screen, stage, hud } = gameScreen(P, game, null);
      P.show(screen, worldOf(game));
      res = await P.race(game.play({ stage, players: cfg.players, options: cfg.options, rng: makeRng(randomSeed()), zen: settings().zen, scope, hud, sfx, buzz, pause: () => P.pause() }));
      scope.dispose();
      P.scope = null;
    }
    if (cfg.players.length === 1 && res.par != null) res.winner = res.scores[0] <= res.par ? 0 : -1;
    const rewards = store.recordParty(cfg.players
      .map((p, i) => ({ id: p.id, win: res.winner === i && cfg.players.length > 1, draw: res.winner < 0 || cfg.players.length === 1 }))
      .filter(x => x.id));
    sfx.win();
    const next = await P.ask(done => P.show(partyResult(P, game, cfg, res, rewards, done), worldOf(res.playedGame || game)));
    if (next === 'end') return;
    if (next === 'change') cfg = await P.ask(done => P.show(partySetup(P, game, done), worldOf(game)));
    else if (game.id === 'duel' || game.faceToFace) cfg = { ...cfg, players: [...cfg.players.slice(1), cfg.players[0]].map((p, i) => ({ ...p, color: PCOLORS[i] })) };
  }
}

export const startSession = () => flow(runSession);
export function startGame(id) {
  const g = gameById(id);
  if (!g) return;
  flow(P => (g.kind === 'party' ? runParty(P, g) : runFree(P, g)));
}
