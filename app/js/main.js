// Démarrage, navigation (par ancre d'URL, pour que le bouton retour du téléphone marche), réglages.
import { h } from './util.js';
import * as store from './store.js';
import { configureFeedback, unlockAudio } from './audio.js';
import { renderHome, renderPuzzle, renderSettings } from './screens.js';
import { renderPlay, leavePlay } from './play.js';
import { puzzleById } from './puzzles/index.js';

const root = document.getElementById('app');
const view = h('main', { class: 'shell', id: 'view' });
root.replaceChildren(view);

const stack = [];
let themeSetByApp = false;

const app = {
  go(target) {
    if (location.hash.slice(1) === target) route();
    else location.hash = target;
  },
  // Retour : on remonte l'historique si on vient de l'appli, sinon on va à l'écran parent.
  back(fallback) {
    if (stack.length > 1) history.back();
    else app.go(fallback);
  },
  applySettings() {
    const s = store.settings();
    const el = document.documentElement;
    el.dataset.text = s.text;
    if (s.theme === 'auto') { if (themeSetByApp) { delete el.dataset.theme; themeSetByApp = false; } }
    else { el.dataset.theme = s.theme; themeSetByApp = true; }
    configureFeedback(s);
  },
};

function route() {
  const hash = location.hash.slice(1);
  if (stack.length > 1 && stack[stack.length - 2] === hash) stack.pop();
  else if (stack[stack.length - 1] !== hash) stack.push(hash);
  leavePlay();
  document.body.dataset.screen = hash === 'jouer' ? 'play' : 'menu';
  if (hash === 'jouer') renderPlay(view, app);
  else if (hash === 'reglages') renderSettings(view, app);
  else if (puzzleById(hash)) renderPuzzle(view, app, hash);
  else renderHome(view, app);
  window.scrollTo(0, 0);
  view.querySelector('[data-focus]')?.focus({ preventScroll: true });
}

function registerServiceWorker() {
  if (!document.querySelector('link[rel="manifest"]') || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

store.load();
app.applySettings();
addEventListener('hashchange', route);
document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
if (location.hash === '#jouer') history.replaceState(null, '', location.pathname + location.search);
route();
registerServiceWorker();
