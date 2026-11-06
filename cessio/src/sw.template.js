// Service worker : l'application reste utilisable hors ligne.
// Stratégie : réseau d'abord (jamais de version périmée en ligne), cache en secours.
// Les bibliothèques lourdes (assets/vendor) sont servies depuis le cache en priorité.
const VERSION = '__VERSION__';
const CACHE = `app-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.filter((u) => !u.includes('/wasm/')).map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await caches.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const home = await cache.match('/');
      if (home) return home;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(url.pathname.startsWith('/assets/vendor/') ? cacheFirst(request) : networkFirst(request));
});
