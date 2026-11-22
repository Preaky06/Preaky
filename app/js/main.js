// Démarrage, navigation par onglets, réglages globaux.
import { h } from './util.js';
import { icon } from './icons.js';
import * as store from './store.js';
import { configureFeedback, unlockAudio } from './audio.js';
import { setRerender } from './player.js';
import { renderToday, renderGames, renderProgress, renderSettings, renderOnboarding } from './screens.js';

const TABS = [
  ['aujourdhui', 'Aujourd’hui', 'home', renderToday],
  ['jeux', 'Jeux', 'games', renderGames],
  ['progres', 'Progrès', 'progress', renderProgress],
  ['reglages', 'Réglages', 'settings', renderSettings],
];

const root = document.getElementById('app');
let view = null;
let nav = null;

const app = {
  applySettings() {
    const s = store.db().settings;
    document.documentElement.dataset.text = s.text;
    configureFeedback(s);
  },
  start() {
    view = h('main', { class: 'shell', id: 'view' });
    nav = h('nav', { class: 'nav', 'aria-label': 'Navigation principale' },
      h('div', { class: 'nav-inner' }, TABS.map(([id, label, ic]) => h('a', { href: `#${id}`, class: 'nav-item', 'data-tab': id },
        h('span', { class: 'nav-ic' }, icon(ic)),
        h('span', { class: 'nav-label' }, label)))));
    root.replaceChildren(view, nav);
    route({ focus: false });
  },
  restart() {
    app.applySettings();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    renderOnboarding(root, app);
  },
};

function route({ focus = true } = {}) {
  if (!view || !store.db().profile.onboarded) return;
  const hash = location.hash.slice(1);
  const tab = TABS.find(t => t[0] === hash) || TABS[0];
  nav.querySelectorAll('.nav-item').forEach(a => {
    if (a.dataset.tab === tab[0]) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  tab[3](view, app);
  if (focus) {
    window.scrollTo(0, 0);
    view.querySelector('[data-focus]')?.focus({ preventScroll: true });
  }
}

function injectDefs() {
  document.body.insertAdjacentHTML('beforeend',
    '<svg class="defs" aria-hidden="true" focusable="false"><defs><pattern id="pm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" style="fill:var(--paper)"/><rect width="3.2" height="7" style="fill:var(--ink)"/></pattern></defs></svg>');
}

function registerServiceWorker() {
  // Uniquement pour la version installable (le manifeste est absent de l'aperçu).
  if (!document.querySelector('link[rel="manifest"]') || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function boot() {
  store.load();
  app.applySettings();
  injectDefs();
  setRerender(() => route({ focus: false }));
  addEventListener('hashchange', () => route());
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  if (store.db().profile.onboarded) app.start();
  else renderOnboarding(root, app);
  registerServiceWorker();
}

boot();
