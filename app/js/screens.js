// Accueil, fiche d'un casse-tête, réglages.
import { h, mount, dayKey, weekDays } from './util.js';
import { icon } from './icons.js';
import { topbar, iconButton, openSheet, toggle, segmented, fmtTime } from './ui.js';
import * as store from './store.js';
import { PUZZLES, puzzleById, levelOf, dailyFor } from './puzzles/index.js';
import { newGame, resumeGame } from './play.js';
import { canVibrate } from './audio.js';
import * as install from './install.js';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const pIcon = p => h('span', { class: 'p-ic' }, icon(p.icon));

// ---------- Accueil ----------
export function renderHome(view, app) {
  const today = dayKey();
  const daily = dailyFor(today);
  const done = store.dailyDone(today);
  const dailyGame = store.getGame(`jour-${today}`);
  const last = store.lastGame();
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const startDaily = () => {
    if (dailyGame) resumeGame(`jour-${today}`);
    else newGame(daily.puzzle, daily.level, { daily: true, seed: daily.seed });
  };

  const week = weekDays().map((d, i) => {
    const k = dayKey(d);
    const ok = !!store.dailyDone(k);
    return h('li', { class: `wk${ok ? ' ok' : ''}${k === today ? ' today' : ''}${k > today ? ' future' : ''}` },
      h('span', { class: 'wk-dot' }, ok ? icon('check') : ''),
      h('span', { class: 'wk-l', 'aria-hidden': 'true' }, DAYS[i]),
      h('span', { class: 'sr' }, `${DAY_NAMES[i]} : ${ok ? 'résolu' : 'non résolu'}`));
  });
  const streak = store.dailyStreak();

  mount(view,
    h('header', { class: 'home-head' },
      h('div', {},
        h('p', { class: 'home-date' }, date),
        h('h1', { class: 'home-title', tabindex: '-1', 'data-focus': '' }, 'Casse-têtes')),
      iconButton('settings', 'Réglages', () => app.go('reglages'))),

    h('section', { class: 'card daily', 'aria-labelledby': 'daily-t' },
      h('p', { class: 'eyebrow', id: 'daily-t' }, 'Le casse-tête du jour'),
      h('div', { class: 'daily-row' },
        pIcon(daily.puzzle),
        h('div', { class: 'grow' },
          h('p', { class: 'daily-name' }, daily.puzzle.name),
          h('p', { class: 'muted' }, `${daily.level.label} · ${daily.level.detail}`))),
      done
        ? h('p', { class: 'daily-done' }, icon('check'), `Résolu en ${fmtTime(done.time)}. Revenez demain pour un nouveau défi.`)
        : h('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: startDaily }, dailyGame ? 'Reprendre' : 'Commencer'),
      h('div', { class: 'week-wrap' },
        h('ol', { class: 'week', 'aria-label': 'Cette semaine' }, week),
        h('p', { class: 'muted small' }, streak > 1 ? `${streak} jours de suite. Le même casse-tête pour tout le monde, chaque jour.` : 'Le même casse-tête pour tout le monde, chaque jour.'))),

    last && h('section', { class: 'card resume' },
      h('div', { class: 'daily-row' },
        pIcon(puzzleById(last.id)),
        h('div', { class: 'grow' },
          h('p', { class: 'eyebrow' }, 'Partie en cours'),
          h('p', { class: 'daily-name' }, puzzleById(last.id).name),
          h('p', { class: 'muted' }, `${levelOf(puzzleById(last.id), last.level).label} · ${fmtTime(last.elapsed)}`)),
        h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => resumeGame(last.key) }, 'Reprendre'))),

    h('section', { 'aria-labelledby': 'all-t' },
      h('h2', { class: 'sec-title', id: 'all-t' }, 'Tous les casse-têtes'),
      h('ul', { class: 'list' }, PUZZLES.map(p => {
        const n = store.solvedCount(p.id);
        return h('li', {}, h('button', { class: 'row', type: 'button', onClick: () => app.go(p.id) },
          pIcon(p),
          h('span', { class: 'row-body' },
            h('span', { class: 'row-title' }, p.name),
            h('span', { class: 'row-sub' }, p.short)),
          n ? h('span', { class: 'row-meta' }, `${n} résolu${n > 1 ? 's' : ''}`) : null,
          icon('chevR', 'ic row-chev')));
      }))),

    h('p', { class: 'foot muted small' }, store.totalSolved() ? `${store.totalSolved()} casse-tête${store.totalSolved() > 1 ? 's' : ''} résolu${store.totalSolved() > 1 ? 's' : ''} sur cet appareil.` : 'Tout reste sur cet appareil : pas de compte, pas de publicité.'));
}

// ---------- Fiche d'un casse-tête ----------
export function renderPuzzle(view, app, id) {
  const p = puzzleById(id);
  const current = store.getGame(p.id);
  const start = level => {
    if (current && current.state) {
      openSheet({
        title: 'Commencer une nouvelle grille ?',
        text: `Ta partie en cours (${levelOf(p, current.level).label}) sera abandonnée.`,
        actions: [
          { label: 'Nouvelle grille', primary: true, onClick: () => go(level) },
          { label: 'Reprendre ma partie', onClick: () => resumeGame(p.id) },
        ],
      });
    } else go(level);
  };
  const go = level => {
    view.setAttribute('aria-busy', 'true');
    // La génération peut prendre un instant (sudoku expert) : on laisse l'écran respirer.
    setTimeout(() => newGame(p, level), 30);
  };

  mount(view,
    topbar({ title: p.name, onBack: () => app.back('') }),
    h('p', { class: 'lead' }, p.short),
    h('section', { class: 'card' },
      h('h2', { class: 'eyebrow' }, 'Comment jouer'),
      h('ul', { class: 'rules' }, p.rules.map(r => h('li', {}, r)))),
    current && h('section', { class: 'card resume' },
      h('div', { class: 'daily-row' },
        h('div', { class: 'grow' },
          h('p', { class: 'eyebrow' }, 'Partie en cours'),
          h('p', { class: 'daily-name' }, levelOf(p, current.level).label),
          h('p', { class: 'muted' }, fmtTime(current.elapsed))),
        h('button', { class: 'btn btn-primary', type: 'button', onClick: () => resumeGame(p.id) }, 'Reprendre'))),
    h('section', { 'aria-labelledby': 'lv-t' },
      h('h2', { class: 'sec-title', id: 'lv-t' }, current ? 'Ou une nouvelle grille' : 'Choisis un niveau'),
      h('ul', { class: 'list' }, p.levels.map(l => {
        const s = store.statsOf(p.id, l.id);
        return h('li', {}, h('button', { class: 'row', type: 'button', onClick: () => start(l) },
          h('span', { class: 'row-body' },
            h('span', { class: 'row-title' }, l.label),
            h('span', { class: 'row-sub' }, l.detail)),
          h('span', { class: 'row-meta' }, s.solved ? `${s.solved} résolu${s.solved > 1 ? 's' : ''}${s.best != null ? ` · record ${fmtTime(s.best)}` : ''}` : ''),
          icon('chevR', 'ic row-chev')));
      }))));
}

// ---------- Réglages ----------
export function renderSettings(view, app) {
  const s = store.settings();
  const set = (k, v, apply = false) => { s[k] = v; store.save(); if (apply) app.applySettings(); };
  const row = (label, control, desc, forId) => h('div', { class: 'setting' },
    h('div', { class: 'grow' }, h('label', { class: 'setting-label', for: forId }, label), desc ? h('p', { class: 'muted small' }, desc) : null),
    control);
  const group = (title, ...rows) => h('section', { class: 'group' }, h('h2', { class: 'eyebrow' }, title), h('div', { class: 'card group-body' }, rows));

  mount(view,
    topbar({ title: 'Réglages', onBack: () => app.back('') }),
    group('Affichage',
      h('div', { class: 'setting stack' },
        h('span', { class: 'setting-label' }, 'Taille du texte'),
        segmented('set-text', [['m', h('span', {}, 'Aa'), 'Normale'], ['l', h('span', {}, 'Aa'), 'Grande'], ['xl', h('span', {}, 'Aa'), 'Très grande']], s.text, v => set('text', v, true), 'Taille du texte', 'seg-size')),
      h('div', { class: 'setting stack' },
        h('span', { class: 'setting-label' }, 'Apparence'),
        segmented('set-theme', [['auto', 'Auto', 'Automatique, comme le téléphone'], ['light', 'Claire'], ['dark', 'Sombre']], s.theme, v => set('theme', v, true), 'Apparence'))),
    group('Aide pendant le jeu',
      row('Signaler les erreurs', toggle('set-errors', s.errors, v => set('errors', v)), 'Une case fausse s’affiche en rouge. Désactive-le pour plus de défi.', 'set-errors'),
      row('Afficher le chronomètre', toggle('set-timer', s.timer, v => set('timer', v)), 'Le temps est toujours compté pour tes records, même caché.', 'set-timer')),
    group('Sons et vibrations',
      row('Sons', toggle('set-sound', s.sound, v => set('sound', v, true)), null, 'set-sound'),
      canVibrate() ? row('Vibrations', toggle('set-haptics', s.haptics, v => set('haptics', v, true)), null, 'set-haptics') : null),
    install.available() ? group('Écran d’accueil',
      h('div', { class: 'setting stack' },
        h('p', {}, install.hint()),
        install.canPrompt() ? h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => install.prompt() }, icon('install'), 'Installer l’application') : null)) : null,
    group('Mes données',
      h('div', { class: 'setting stack' },
        h('p', {}, 'Tes parties et tes records restent sur cet appareil. Pas de compte, pas de publicité, pas de suivi.'),
        store.isPersistent() ? null : h('p', { class: 'warn small' }, 'Ce navigateur bloque la sauvegarde : tes parties seront perdues à la fermeture.'),
        h('button', { class: 'btn btn-danger-ghost', type: 'button', onClick: () => openSheet({
          title: 'Tout effacer ?',
          text: 'Records, statistiques et parties en cours seront supprimés de cet appareil.',
          actions: [{ label: 'Tout effacer', danger: true, onClick: () => { store.reset(); app.applySettings(); app.go(''); } }, { label: 'Annuler' }],
        }) }, icon('trash'), 'Effacer mes données'))),
    group('À propos',
      h('div', { class: 'setting stack' },
        h('p', {}, 'Les casse-têtes font travailler la logique, la patience et la mémoire de travail. Les études montrent surtout qu’on progresse sur ce qu’on pratique : le vrai bénéfice, c’est le plaisir de chercher et l’habitude de réfléchir posément.'),
        h('p', { class: 'muted small' }, 'Preaky · Casse-têtes · version 3.0'))));
}
