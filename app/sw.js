// Service worker : l'appli fonctionne hors connexion une fois ouverte une première fois.
const VERSION = 'preaky-mind-v2';
const FONT_CACHE = 'preaky-mind-fonts';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './js/audio.js',
  './js/avatar.js',
  './js/content.js',
  './js/engine.js',
  './js/fx.js',
  './js/icons.js',
  './js/illus.js',
  './js/install.js',
  './js/main.js',
  './js/player.js',
  './js/rng.js',
  './js/screens.js',
  './js/store.js',
  './js/ui.js',
  './js/util.js',
  './js/games/arrows.js',
  './js/games/balance.js',
  './js/games/bubbles.js',
  './js/games/constellation.js',
  './js/games/digits.js',
  './js/games/dots.js',
  './js/games/draw.js',
  './js/games/golf.js',
  './js/games/index.js',
  './js/games/oddone.js',
  './js/games/patterns.js',
  './js/games/slicer.js',
  './js/games/tug.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google : on sert le cache, et on le rafraîchit en arrière-plan.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONT_CACHE).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord (pour les mises à jour), cache si hors ligne.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
    return res;
  })));
});
