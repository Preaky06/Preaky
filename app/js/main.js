// Démarrage, navigation par onglets, réglages globaux.
import { h } from './util.js';
import { icon } from './icons.js';
import * as store from './store.js';
import { configureFeedback, unlockAudio } from './audio.js';
import { setRerender } from './player.js';
import { renderHome, renderGames, renderLeaderboard, renderShop, renderMe, renderOnboarding } from './screens.js';

const TABS = [
  ['accueil', 'Accueil', 'home', renderHome],
  ['jeux', 'Jeux', 'games', renderGames],
  ['classement', 'Classement', 'podium', renderLeaderboard],
  ['boutique', 'Boutique', 'shop', renderShop],
  ['moi', 'Moi', 'user', renderMe],
];

const root = document.getElementById('app');
let view = null;
let nav = null;
let currentTab = null;

const app = {
  applySettings() {
    const s = store.settings();
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
    view = null;
    renderOnboarding(root, app);
  },
  refresh({ keepScroll = false } = {}) {
    const y = window.scrollY;
    route({ focus: false, keepScroll });
    if (keepScroll) window.scrollTo(0, y);
  },
};

function route({ focus = true, keepScroll = false } = {}) {
  if (!view || !store.db().onboarded) return;
  const hash = location.hash.slice(1);
  const tab = TABS.find(t => t[0] === hash) || TABS[0];
  nav.querySelectorAll('.nav-item').forEach(a => {
    if (a.dataset.tab === tab[0]) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.body.dataset.tab = tab[0];
  const changed = currentTab !== tab[0];
  currentTab = tab[0];
  tab[3](view, app);
  if (changed && !keepScroll) window.scrollTo(0, 0);
  if (focus && changed) view.querySelector('[data-focus]')?.focus({ preventScroll: true });
}

function injectDefs() {
  document.body.insertAdjacentHTML('beforeend',
    '<svg class="defs" aria-hidden="true" focusable="false"><defs><pattern id="pm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" style="fill:#fff"/><rect width="3.2" height="7" style="fill:#1E1A16"/></pattern></defs></svg>');
}

function registerServiceWorker() {
  if (!document.querySelector('link[rel="manifest"]') || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function boot() {
  store.load();
  app.applySettings();
  injectDefs();
  setRerender(() => route({ focus: false, keepScroll: true }));
  addEventListener('hashchange', () => route());
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  if (store.db().onboarded) app.start();
  else renderOnboarding(root, app);
  registerServiceWorker();
}

boot();
