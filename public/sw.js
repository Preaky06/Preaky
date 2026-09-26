// Service worker : l'interface et l'historique restent consultables hors ligne.
// Les appels /api/* ne sont jamais mis en cache (documents personnels).
const VERSION = "explisite-v3";
const SHELL = [
  "/", "/styles.css", "/app.js", "/i18n.js", "/samples.js", "/favicon.svg", "/manifest.webmanifest",
  "/fonts/fonts.css",
  "/fonts/fraunces-latin-full-normal.woff2", "/fonts/fraunces-latin-full-italic.woff2",
  "/fonts/bricolage-grotesque-latin-opsz-normal.woff2",
  "/fonts/jetbrains-mono-latin-400-normal.woff2", "/fonts/jetbrains-mono-latin-600-normal.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // Pages : réseau d'abord (contenu à jour), cache en secours.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Ressources statiques : cache d'abord, mise à jour en arrière-plan.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
