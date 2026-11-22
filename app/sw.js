// Service worker : l'appli fonctionne hors connexion une fois ouverte une première fois.
const VERSION = 'preaky-mind-v1';
const FONT_CACHE = 'preaky-mind-fonts';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './js/main.js',
  './js/util.js',
  './js/rng.js',
  './js/store.js',
  './js/audio.js',
  './js/icons.js',
  './js/mascot.js',
  './js/content.js',
  './js/ui.js',
  './js/install.js',
  './js/player.js',
  './js/screens.js',
  './js/games/index.js',
  './js/games/arrows.js',
  './js/games/oddone.js',
  './js/games/sequence.js',
  './js/games/digits.js',
  './js/games/patterns.js',
  './js/games/balance.js',
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
