// Les cinq onglets + le premier lancement.
import { h, frag, mount, dayKey, hashStr, fmtNum, weekKey } from './util.js';
import { icon, GEM } from './icons.js';
import { avatarSVG, ITEMS, SLOTS, COLORS } from './avatar.js';
import { topHeader, streakCard, sectionHead, pageHead, gameBadge, gameArt, avatarEl, gemPill, levelBar, tipBlock, openSheet, toggle, segmented, addPlayerSheet, weekStrip } from './ui.js';
import * as store from './store.js';
import { ARCADE, PARTY, CLASSICS, SOLO, GAMES } from './games/index.js';
import { DOMAINS, EXTRA_TECHNIQUES, SCIENCE } from './content.js';
import { pickSession, startSession, startGame } from './player.js';
import { canVibrate, sfx } from './audio.js';
import { confetti } from './fx.js';
import * as install from './install.js';

const go = tab => { location.hash = tab; };

function claimDaily(app) {
  const n = store.claim();
  if (!n) return;
  sfx.coin();
  confetti({ count: 90, y: 0.25 });
  app.refresh();
}

// ---------- Accueil ----------
export function renderHome(view, app) {
  const pl = store.me();
  mount(view,
    topHeader(pl, { onAvatar: () => go('moi'), onGems: () => go('boutique') }),
    streakCard(pl, { onClaim: () => claimDaily(app), onPlay: () => startSession() }),
    sessionCard(pickSession(), store.doneToday()),
    sectionHead('Arcade', h('a', { class: 'sec-link', href: '#jeux' }, 'Tout voir', icon('chevR'))),
    h('div', { class: 'carousel', role: 'list' }, ARCADE.map(arcadeCard)),
    sectionHead('En famille, entre amis'),
    h('p', { class: 'sec-sub' }, 'Sur un seul téléphone. Face à face, chacun son tour ou contre l’ordi.'),
    partyStack(),
    sectionHead('Classiques du cerveau'),
    h('div', { class: 'classic-grid' }, CLASSICS.map(classicCard)),
    techniqueCard());
}

function sessionCard(games, done) {
  return h('section', { class: 'session' },
    h('div', { class: 'session-head' },
      h('div', {},
        h('p', { class: 'eyebrow' }, done ? 'Séance du jour · faite' : 'Séance du jour'),
        h('h2', { class: 'session-title' }, done ? 'Bien joué pour aujourd’hui !' : '3 jeux · 5 minutes')),
      h('span', { class: 'session-bonus' }, '+50 XP', h('small', {}, 'bonus'))),
    h('ol', { class: 'session-games' }, games.map(g => h('li', { class: `sg d-${g.domain}` },
      gameBadge(g),
      h('span', { class: 'sg-name' }, g.name),
      done ? h('span', { class: 'sg-check' }, icon('check')) : null))),
    h('button', { class: `btn btn-block btn-xl ${done ? 'btn-ghost' : 'btn-primary'}`, type: 'button', onClick: () => startSession() },
      done ? [icon('refresh'), 'Refaire une séance'] : [icon('play'), 'Lancer ma séance']));
}

function arcadeCard(g) {
  const rec = store.recordOf(g.id);
  return h('button', { class: `arc-card ${g.world}`, type: 'button', role: 'listitem', onClick: () => startGame(g.id) },
    gameArt(g, 'arc-art'),
    h('span', { class: 'arc-body' },
      h('span', { class: 'arc-name' }, g.name),
      h('span', { class: 'arc-tag' }, g.tagline),
      h('span', { class: 'arc-meta' }, rec != null ? `Record ${rec}` : 'Nouveau !', ` · Niv. ${store.levelOf(g.id)}`)),
    h('span', { class: 'arc-play' }, icon('play')));
}

const STACK_COLORS = { tug: 'pink', draw: 'blue', dots: 'lime', golf: 'sun', duel: 'peach' };
function partyStack() {
  return h('div', { class: 'stack-cards' }, PARTY.map((g, i) => h('button', { class: `stk stk-${STACK_COLORS[g.id]}`, type: 'button', onClick: () => startGame(g.id), style: `z-index:${i + 1}` },
    h('span', { class: 'stk-body' },
      h('span', { class: 'stk-name' }, g.name),
      h('span', { class: 'stk-tag' }, g.tagline),
      h('span', { class: 'stk-meta' }, g.faceToFace ? 'Face à face · 2 joueurs' : g.party.ai ? 'Contre l’ordi ou à 2' : g.party.max > 2 ? `1 à ${g.party.max} joueurs` : '2 joueurs'),
      i === PARTY.length - 1 && h('span', { class: 'stk-go' }, 'C’est parti')),
    gameArt(g, 'stk-art'))));
}

function classicCard(g) {
  return h('button', { class: `cl-card d-${g.domain}`, type: 'button', onClick: () => startGame(g.id) },
    gameBadge(g, 'lg'),
    h('span', { class: 'cl-name' }, g.name),
    h('span', { class: 'cl-meta' }, `Niv. ${store.levelOf(g.id)}`));
}

function allTechniques() { return [...SOLO.map(g => g.tip), ...EXTRA_TECHNIQUES]; }

function techniqueCard() {
  const all = allTechniques();
  const t = all[hashStr(`tech${dayKey()}`) % all.length];
  return h('section', { class: 'tech-card' },
    h('p', { class: 'eyebrow' }, icon('bulb'), 'Technique du jour'),
    h('h2', { class: 'h3' }, t.title),
    h('p', {}, t.text),
    h('p', { class: 'small tip-life' }, h('b', {}, 'Dans la vraie vie : '), t.life));
}

// ---------- Jeux ----------
let filter = 'tous';
export function renderGames(view, app) {
  const groups = [
    ['arcade', 'Arcade', 'Des jeux d’action qui entraînent l’attention, la mémoire et le calcul.', ARCADE],
    ['party', 'À plusieurs', 'Face à face, chacun son tour ou contre l’ordi, sur un seul téléphone.', PARTY],
    ['classic', 'Classiques du cerveau', 'Des exercices éprouvés, plus calmes, qui s’adaptent à ton niveau.', CLASSICS],
  ];
  const chips = segmented('game-filter', [['tous', 'Tous'], ['arcade', 'Arcade'], ['party', 'À plusieurs'], ['classic', 'Classiques']], filter, v => { filter = v; app.refresh(); }, 'Filtrer les jeux', 'seg-chips');
  mount(view,
    pageHead('Jeux', `${GAMES.length + 1} jeux, de 1 à 4 joueurs.`),
    chips,
    groups.filter(([k]) => filter === 'tous' || filter === k).map(([k, title, sub, list]) => h('section', { class: 'cat' },
      sectionHead(title), h('p', { class: 'sec-sub' }, sub),
      h('div', { class: 'cat-list' }, list.map(g => catalogCard(g, k))))));
}

function catalogCard(g, kind) {
  const plays = store.playsOf(g.id);
  const meta = kind === 'party'
    ? (g.faceToFace ? 'Face à face · 2 joueurs' : g.party?.ai ? 'Contre l’ordi ou à 2' : `Jusqu’à ${g.party?.max} joueurs`)
    : `Niveau ${store.levelOf(g.id)} · ${plays ? `record ${store.recordOf(g.id)}` : 'jamais joué'}`;
  return h('button', { class: `cat-card ${kind === 'classic' ? `cc-${g.domain}` : g.world}`, type: 'button', onClick: () => startGame(g.id) },
    gameArt(g, 'cat-art'),
    h('span', { class: 'cat-body' },
      h('span', { class: 'cat-name' }, g.name),
      h('span', { class: 'cat-tag' }, g.tagline),
      h('span', { class: 'cat-meta' }, meta)),
    h('span', { class: 'cat-go' }, icon('play')));
}

// ---------- Classement ----------
let lbMode = 'week';
export function renderLeaderboard(view, app) {
  const wk = weekKey();
  const prevWeek = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return weekKey(d); })();
  const players = store.players();
  const pts = p => (lbMode === 'week' ? store.weeklyXp(p, wk) : p.xp);
  const ranked = players.slice().sort((a, b) => pts(b) - pts(a));
  const trend = p => Math.sign(store.weeklyXp(p, wk) - store.weeklyXp(p, prevWeek));
  const slot = (p, place) => {
    if (!p) return h('div', { class: `pod pod-${place} empty` }, h('span', { class: 'pod-av ghost' }, '?'), h('span', { class: 'pod-who' }, '…'), h('span', { class: 'pod-block' }, String(place)));
    return h('div', { class: `pod pod-${place}` },
      avatarEl(p.avatar, place === 1 ? 74 : 60, place === 1 ? 'happy' : null, 'pod-av'),
      h('span', { class: 'pod-who' }, p.name),
      h('span', { class: 'pod-pts' }, `${pts(p)} XP`),
      h('span', { class: 'pod-block' }, String(place)));
  };
  mount(view,
    h('section', { class: 'lb-top' },
      h('h1', { class: 'lb-title', tabindex: '-1', 'data-focus': '' }, 'Classement'),
      segmented('lb-mode', [['week', 'Cette semaine'], ['all', 'Depuis le début']], lbMode, v => { lbMode = v; app.refresh(); }, 'Période', 'seg-orange'),
      h('div', { class: 'podium' }, slot(ranked[1], 2), slot(ranked[0], 1), slot(ranked[2], 3))),
    h('section', { class: 'lb-sheet' },
      ranked.length > 3 && h('ol', { class: 'lb-list', start: '4' }, ranked.slice(3).map((p, i) => h('li', { class: 'lb-row' },
        h('span', { class: 'lb-rank' }, String(i + 4).padStart(2, '0')),
        avatarEl(p.avatar, 44),
        h('span', { class: 'lb-name' }, p.name, h('small', {}, `${pts(p)} XP`)),
        h('span', { class: `lb-trend t${trend(p)}`, 'aria-label': trend(p) > 0 ? 'en hausse' : trend(p) < 0 ? 'en baisse' : 'stable' })))),
      h('div', { class: 'lb-invite' },
        h('div', { class: 'lb-invite-art', html: avatarSVG({ color: 'framboise', eyes: 'joyeux', mouth: 'grand', hat: 'fete', glasses: 'none' }, { size: 56 }) + avatarSVG({ color: 'ciel', eyes: 'rond', mouth: 'o', hat: 'none', glasses: 'rondes' }, { size: 48 }) }),
        h('div', {},
          h('h2', { class: 'h3' }, players.length < 2 ? 'Lance la compétition familiale' : 'Ajoute encore du monde'),
          h('p', { class: 'small muted' }, 'Chaque joueur de ce téléphone a son avatar et sa progression. L’XP de la semaine fait le classement, remis à zéro chaque lundi.')),
        h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => addPlayerSheet(document.body, () => app.refresh()) }, icon('plus'), 'Ajouter un joueur')),
      h('p', { class: 'small muted center' }, 'Le classement reste sur cet appareil : pas de compte, pas d’inconnus.')));
}

// ---------- Boutique ----------
let shopSlot = 'hat';
let tryOn = null;
export function renderShop(view, app) {
  const pl = store.me();
  const preview = { ...pl.avatar, ...(tryOn ? { [tryOn.slot]: tryOn.v } : {}) };
  const items = ITEMS.filter(i => i.slot === shopSlot);
  const sel = tryOn && tryOn.slot === shopSlot ? tryOn : null;
  const owned = it => pl.owned.includes(it.id);
  const worn = it => pl.avatar[it.slot] === it.v;
  let action = null;
  if (sel) {
    if (owned(sel)) {
      action = h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', disabled: worn(sel), onClick: () => { store.equip(sel); tryOn = null; sfx.tap(); app.refresh(); } }, worn(sel) ? 'Déjà porté' : `Porter « ${sel.name} »`);
    } else if (pl.coins >= sel.price) {
      action = h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: () => { if (store.buy(sel)) { sfx.coin(); confetti({ count: 120, y: 0.3 }); tryOn = null; app.refresh(); } } }, `Acheter « ${sel.name} » · ${sel.price}`, frag(GEM));
    } else {
      action = h('button', { class: 'btn btn-block btn-xl btn-ghost', type: 'button', disabled: true }, `Il te manque ${sel.price - pl.coins}`, frag(GEM));
    }
  }
  mount(view,
    h('section', { class: 'shop-top' },
      h('div', { class: 'shop-bar' }, h('h1', { class: 'shop-title', tabindex: '-1', 'data-focus': '' }, 'Boutique'), gemPill(pl.coins, 'big')),
      h('div', { class: 'shop-stage' },
        h('div', { class: 'shop-av', html: avatarSVG(preview, { size: 170 }) }),
        h('div', { class: 'shop-id' },
          h('p', { class: 'shop-name' }, pl.name),
          levelBar(pl, { compact: true }),
          h('p', { class: 'shop-hint' }, sel ? (owned(sel) ? 'Tu l’as déjà !' : 'Essayage en cours…') : 'Touche un objet pour l’essayer.')))),
    segmented('shop-slot', SLOTS.map(([k, l]) => [k, l]), shopSlot, v => { shopSlot = v; tryOn = null; app.refresh(); }, 'Catégorie', 'seg-chips'),
    h('div', { class: 'shop-grid' }, items.map(it => {
      const av = { ...pl.avatar, [it.slot]: it.v };
      const st = worn(it) ? 'worn' : owned(it) ? 'owned' : '';
      return h('button', { class: `shop-item ${st}${sel && sel.id === it.id ? ' sel' : ''}`, type: 'button', 'aria-pressed': String(!!(sel && sel.id === it.id)), onClick: () => { tryOn = it; sfx.tap(); app.refresh({ keepScroll: true }); } },
        h('span', { class: 'si-av', html: it.slot === 'color' ? `<span class="swatch" style="--a:${COLORS[it.v][0]};--b:${COLORS[it.v][1]};--c:${COLORS[it.v][2]}"></span>` : avatarSVG(av, { size: 70 }) }),
        h('span', { class: 'si-name' }, it.name),
        worn(it) ? h('span', { class: 'si-tag worn' }, icon('check'), 'Porté') : owned(it) ? h('span', { class: 'si-tag' }, 'À toi') : it.price === 0 ? h('span', { class: 'si-tag' }, 'Gratuit') : h('span', { class: `si-price${pl.coins < it.price ? ' poor' : ''}` }, String(it.price), frag(GEM)));
    })),
    action && h('div', { class: 'shop-action' }, action),
    h('p', { class: 'small muted center' }, 'Les gemmes se gagnent en jouant : chaque partie, la séance du jour, la série, les victoires. Rien à acheter avec de l’argent réel.'));
}

// ---------- Moi ----------
function sparkline(values) {
  const W = 200;
  const H = 48;
  const P = 5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [P + (i * (W - 2 * P)) / (values.length - 1), H - P - ((v - min) / span) * (H - 2 * P)]);
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const end = pts[pts.length - 1];
  return frag(`<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="M${pts[0][0]},${H - P} L${line.split(' ').join(' L')} L${end[0]},${H - P}Z" style="fill:var(--d-soft)"/><polyline points="${line}" fill="none" style="stroke:var(--d-deep)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${end[0]}" cy="${end[1]}" r="5" style="fill:var(--d-deep)"/></svg>`);
}

function progRow(g) {
  const hist = store.historyOf(g.id, 14);
  return h('article', { class: `prog-card d-${g.domain}` },
    gameBadge(g),
    h('div', { class: 'grow' }, h('h3', { class: 'pc-name' }, g.name), h('p', { class: 'small muted' }, hist.length ? `Niveau ${store.levelOf(g.id)} · ${store.playsOf(g.id)} partie${store.playsOf(g.id) > 1 ? 's' : ''}` : 'Pas encore joué')),
    hist.length ? h('div', { class: 'pc-nums' }, h('span', {}, h('b', {}, String(store.recordOf(g.id))), ' record')) : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onClick: () => startGame(g.id) }, 'Essayer'),
    hist.length > 1 && sparkline(hist.map(e => e.s)));
}

export function renderMe(view, app) {
  const pl = store.me();
  const s = store.settings();
  const players = store.players();
  const stat = (v, l) => h('div', { class: 'stat' }, h('b', {}, String(v)), h('span', {}, l));
  const items = [
    ...SOLO.map(g => ({ ...g.tip, unlocked: store.playsOf(g.id) > 0, how: `Joue à ${g.name} pour la débloquer.` })),
    ...EXTRA_TECHNIQUES.map(t => ({ ...t, unlocked: pl.sessions >= t.unlock, how: `Débloquée après ${t.unlock} séance${t.unlock > 1 ? 's' : ''} du jour.` })),
  ];
  const nameInput = h('input', { id: 'set-name', class: 'input', type: 'text', value: pl.name, maxlength: '18', autocomplete: 'given-name' });
  nameInput.addEventListener('change', () => { pl.name = nameInput.value.trim().slice(0, 18) || pl.name; store.save(); app.refresh({ keepScroll: true }); });
  const row = (label, control, desc, forId) => h('div', { class: 'setting' },
    h('div', { class: 'grow' }, h('label', { class: 'setting-label', for: forId }, label), desc && h('p', { class: 'muted small' }, desc)), control);
  const group = (title, ...rows) => h('section', { class: 'group' }, h('h2', { class: 'label' }, title), h('div', { class: 'group-body' }, rows));
  const week = weekStrip(pl);

  mount(view,
    h('section', { class: 'me-top' },
      h('button', { class: 'me-av', type: 'button', 'aria-label': 'Personnaliser mon avatar', onClick: () => go('boutique') }, avatarEl(pl.avatar, 120), h('span', { class: 'me-edit' }, icon('shop'))),
      h('h1', { class: 'me-name', tabindex: '-1', 'data-focus': '' }, pl.name),
      levelBar(pl)),
    h('div', { class: 'stats-row' },
      stat(store.streak(pl), 'jours de série'),
      stat(pl.history.length, 'parties solo'),
      stat(pl.wins, pl.wins > 1 ? 'victoires' : 'victoire')),
    h('section', { class: 'card' }, h('div', { class: 'row-between' }, h('h2', { class: 'h3' }, 'Cette semaine'), h('span', { class: 'muted small' }, `${week.active} / 7 jours`)), week.el),
    h('section', { class: 'group' },
      h('div', { class: 'row-between' }, h('h2', { class: 'label' }, 'Joueurs de ce téléphone'), h('button', { class: 'link-btn', type: 'button', onClick: () => addPlayerSheet(document.body, () => app.refresh()) }, icon('plus'), 'Ajouter')),
      h('div', { class: 'players-list' }, players.map(p => h('button', { class: `player-row${p.id === pl.id ? ' current' : ''}`, type: 'button', onClick: () => { if (p.id !== pl.id) { store.setCurrent(p.id); sfx.tap(); app.refresh(); } } },
        avatarEl(p.avatar, 42),
        h('span', { class: 'grow' }, h('span', { class: 'pr-name' }, p.name), h('span', { class: 'pr-meta' }, `Niveau ${store.levelInfo(p.xp).level} · ${p.coins} gemmes`)),
        p.id === pl.id ? h('span', { class: 'pr-badge' }, 'Joue en ce moment') : h('span', { class: 'pr-switch' }, icon('swap'), 'Jouer'))))),
    h('section', { class: 'stack' }, sectionHead('Mes progrès'), h('div', { class: 'prog-list' }, SOLO.map(progRow))),
    h('section', { class: 'stack' },
      sectionHead('Ma boîte à techniques', h('span', { class: 'muted small' }, `${items.filter(i => i.unlocked).length} sur ${items.length}`)),
      h('div', { class: 'tool-list' }, items.map(t => (t.unlocked
        ? h('details', { class: 'tool' }, h('summary', {}, icon('bulb'), h('span', { class: 'grow' }, t.title), icon('chev', 'ic chev')), h('p', {}, t.text), h('p', { class: 'small muted' }, h('b', {}, 'Dans la vraie vie : '), t.life))
        : h('div', { class: 'tool locked' }, icon('lock'), h('span', { class: 'grow' }, h('span', { class: 'tool-title' }, t.title), h('span', { class: 'small muted' }, t.how))))))),
    h('section', { class: 'science' },
      h('p', { class: 'eyebrow' }, icon('science'), 'Ce que dit la science'),
      h('h2', { class: 'h3' }, 'On ne te promet pas de miracle.'),
      h('ul', { class: 'science-list' }, SCIENCE.map(x => h('li', {}, h('b', {}, x.t), ' ', x.d)))),
    group('Profil', h('div', { class: 'setting stack-setting' }, h('label', { class: 'setting-label', for: 'set-name' }, 'Prénom'), nameInput)),
    group('Confort de jeu',
      h('div', { class: 'setting stack-setting' },
        h('span', { class: 'setting-label' }, 'Taille du texte'),
        segmented('set-text', [['m', h('span', {}, 'Aa'), 'Normale'], ['l', h('span', {}, 'Aa'), 'Grande'], ['xl', h('span', {}, 'Aa'), 'Très grande']], s.text, v => { s.text = v; store.save(); app.applySettings(); }, 'Taille du texte', 'seg-size')),
      row('Mode zen', toggle('set-zen', s.zen, v => { s.zen = v; store.save(); }), 'Pas de chrono, plus de temps pour mémoriser. Les jeux s’adaptent à ta précision, pas à ta vitesse.', 'set-zen'),
      row('Sons', toggle('set-sound', s.sound, v => { s.sound = v; store.save(); app.applySettings(); }), null, 'set-sound'),
      canVibrate() && row('Vibrations', toggle('set-haptics', s.haptics, v => { s.haptics = v; store.save(); app.applySettings(); }), null, 'set-haptics')),
    install.available() && group('Écran d’accueil', h('div', { class: 'setting stack-setting' }, h('p', {}, install.hint()), install.canPrompt() && h('button', { class: 'btn btn-primary', type: 'button', onClick: () => install.prompt() }, icon('install'), 'Installer Preaky Mind'))),
    group('Données',
      h('div', { class: 'setting stack-setting' },
        h('p', {}, 'Tout reste sur cet appareil : pas de compte, pas de pub, pas de suivi.'),
        !store.isPersistent() && h('p', { class: 'warn small' }, 'Ce navigateur bloque la sauvegarde : la progression sera perdue à la fermeture.'),
        players.length > 1 && h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => openSheet(document.body, { title: `Supprimer ${pl.name} ?`, text: 'Son avatar, ses gemmes et sa progression seront effacés.', actions: [{ label: 'Supprimer ce joueur', danger: true, onClick: () => { store.removePlayer(pl.id); app.refresh(); } }, { label: 'Annuler' }] }) }, icon('trash'), `Supprimer le joueur ${pl.name}`),
        h('button', { class: 'btn btn-danger-ghost', type: 'button', onClick: () => openSheet(document.body, { title: 'Tout effacer ?', text: 'Tous les joueurs, niveaux, gemmes et historiques seront supprimés de cet appareil.', actions: [{ label: 'Tout effacer', danger: true, onClick: () => { store.reset(); app.restart(); } }, { label: 'Annuler' }] }) }, icon('trash'), 'Tout effacer'))),
    h('footer', { class: 'about' }, h('p', { class: 'muted small' }, 'Preaky Mind · version 2.0 · une création Preaky')));
}

// ---------- Premier lancement ----------
export function renderOnboarding(root, app) {
  let style = '';
  const av = { color: 'mandarine', eyes: 'rond', mouth: 'sourire', hat: 'none', glasses: 'none' };
  const nameInput = h('input', { id: 'onb-name', class: 'input', type: 'text', maxlength: '18', autocomplete: 'given-name', placeholder: 'Par exemple : Lucie' });

  const welcome = () => h('section', { class: 'onb onb-welcome' },
    h('div', { class: 'onb-art' },
      h('span', { class: 'blob b1' }), h('span', { class: 'blob b2' }), h('span', { class: 'blob b3' }),
      h('span', { class: 'onb-av a1', html: avatarSVG({ color: 'framboise', eyes: 'joyeux', mouth: 'grand', hat: 'fete', glasses: 'none' }, { size: 96 }) }),
      h('span', { class: 'onb-av a2', html: avatarSVG({ color: 'mandarine', eyes: 'rond', mouth: 'sourire', hat: 'couronne', glasses: 'none' }, { size: 140 }) }),
      h('span', { class: 'onb-av a3', html: avatarSVG({ color: 'ciel', eyes: 'clin', mouth: 'langue', hat: 'none', glasses: 'rondes' }, { size: 92 }) })),
    h('div', { class: 'onb-text' },
      h('h1', { class: 'onb-title', tabindex: '-1', 'data-focus': '' }, 'Preaky Mind'),
      h('p', { class: 'lead' }, 'Des mini-jeux de fou pour garder l’esprit vif. Seul, en famille ou entre amis.')),
    h('ul', { class: 'onb-points' },
      h('li', {}, h('span', { class: 'pt-ic o' }, icon('bolt')), h('span', {}, h('b', {}, '13 jeux'), ' : arcade, face-à-face, golf, stratégie…')),
      h('li', {}, h('span', { class: 'pt-ic p' }, icon('duo')), h('span', {}, h('b', {}, 'Jusqu’à 4 joueurs'), ' sur un seul téléphone.')),
      h('li', {}, h('span', { class: 'pt-ic b' }, icon('bulb')), h('span', {}, h('b', {}, 'Une vraie technique'), ' à réutiliser dans la vie, à chaque jeu.'))),
    h('div', { class: 'onb-cta' },
      h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: () => draw(maker) }, 'Créer mon perso'),
      h('p', { class: 'muted small center' }, 'Sans compte, sans pub. Tout reste sur ton téléphone.')));

  const maker = () => {
    const preview = h('div', { class: 'maker-av', html: avatarSVG(av, { size: 150 }) });
    const optionEls = [];
    const refresh = () => {
      preview.innerHTML = avatarSVG(av, { size: 150 });
      for (const { el, slot, v } of optionEls) if (slot !== 'color') el.innerHTML = avatarSVG({ ...av, [slot]: v }, { size: 46 });
    };
    const row = (slot, title) => {
      const opts = ITEMS.filter(i => i.slot === slot && i.price === 0);
      const btns = opts.map(it => {
        const b = h('button', { class: 'maker-opt', type: 'button', 'aria-pressed': String(av[slot] === it.v), 'aria-label': it.name, html: slot === 'color' ? `<span class="swatch" style="--a:${COLORS[it.v][0]};--b:${COLORS[it.v][1]};--c:${COLORS[it.v][2]}"></span>` : avatarSVG({ ...av, [slot]: it.v }, { size: 46 }) });
        b.addEventListener('click', () => { av[slot] = it.v; btns.forEach(x => x.setAttribute('aria-pressed', String(x === b))); refresh(); sfx.tap(); });
        optionEls.push({ el: b, slot, v: it.v });
        return b;
      });
      return h('div', { class: 'field' }, h('p', { class: 'label' }, title), h('div', { class: 'maker-row' }, btns));
    };
    return h('section', { class: 'onb' },
      h('div', { class: 'pbar' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', onClick: () => draw(welcome) }, icon('back'))),
      h('h1', { class: 'onb-q', tabindex: '-1', 'data-focus': '' }, 'Crée ton perso'),
      preview,
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'onb-name' }, 'Ton prénom'), nameInput),
      row('color', 'Couleur'),
      row('eyes', 'Yeux'),
      row('mouth', 'Bouche'),
      h('p', { class: 'small muted' }, 'Chapeaux, lunettes et couleurs rares t’attendent dans la boutique.'),
      h('div', { class: 'onb-cta' }, h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', onClick: () => draw(stepStyle) }, 'Continuer')));
  };

  const stepStyle = () => {
    const goBtn = h('button', { class: 'btn btn-primary btn-block btn-xl', type: 'button', disabled: !style, onClick: finish }, 'C’est parti !');
    const choice = (id, ic, title, text, cls) => {
      const b = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': String(style === id) },
        h('span', { class: `choice-ic ${cls}` }, icon(ic)),
        h('span', { class: 'grow' }, h('span', { class: 'choice-title' }, title), h('span', { class: 'choice-text' }, text)));
      b.addEventListener('click', () => {
        style = id;
        b.parentElement.querySelectorAll('.choice').forEach(x => x.setAttribute('aria-checked', String(x === b)));
        goBtn.disabled = false;
        document.documentElement.dataset.text = id === 'tranquille' ? 'l' : 'm';
      });
      return b;
    };
    return h('section', { class: 'onb' },
      h('div', { class: 'pbar' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', onClick: () => draw(maker) }, icon('back'))),
      h('div', { class: 'onb-text' },
        h('h1', { class: 'onb-q', tabindex: '-1', 'data-focus': '' }, 'Comment veux-tu jouer ?'),
        h('p', { class: 'muted' }, 'Tu pourras changer d’avis à tout moment.')),
      h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': 'Style de jeu' },
        choice('dynamique', 'bolt', 'Dynamique', 'Avec chrono. Ça va vite, ça pique un peu.', 'o'),
        choice('tranquille', 'leaf', 'Tranquille', 'Sans chrono, texte plus grand. Tu prends ton temps.', 'b')),
      h('div', { class: 'onb-cta' }, goBtn));
  };

  function finish() {
    const d = store.db();
    const pl = store.createPlayer(nameInput.value.trim() || 'Moi', { ...av }, { makeCurrent: true });
    pl.style = style;
    d.onboarded = true;
    d.settings.zen = style === 'tranquille';
    d.settings.text = style === 'tranquille' ? 'l' : 'm';
    store.save();
    app.applySettings();
    app.start();
  }

  function draw(step) {
    const node = step();
    root.replaceChildren(node);
    node.classList.add('enter');
    window.scrollTo(0, 0);
    node.querySelector('[data-focus]')?.focus({ preventScroll: true });
  }
  draw(welcome);
}
