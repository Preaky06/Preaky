// Ouvre le vrai site CinéMood (dossier SITE_DIR, issu de l'archive du site) dans un
// Chromium mobile, hors ligne : React/Babel et polices servis en local, TMDB remplacé
// par le catalogue fictif, affiches générées par posters.mjs (dossier IMG_DIR).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tmdb } from './mock.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(ROOT, 'node_modules');
export const HOST = 'https://cinem00d.com/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
const CDN = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': 'react/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js': '@babel/standalone/babel.min.js',
};
const FONT_CSS = [['Anton', 400, 'anton.woff2'], ['Archivo', 400, 'archivo-400.woff2'], ['Archivo', 500, 'archivo-500.woff2'],
  ['Archivo', 600, 'archivo-600.woff2'], ['Archivo', 700, 'archivo-700.woff2']]
  .map(([f, w, file]) => `@font-face{font-family:'${f}';font-style:normal;font-weight:${w};font-display:block;src:url(${HOST}__fonts/${file}) format('woff2')}`).join('\n');

export const PHONE = { width: 412, scale: 1080 / 412 };

/* retient les réponses du catalogue tant que gate.closed : l'écran de chargement dure le temps voulu */
export const gate = { closed: false, waiters: [], open() { this.closed = false; this.waiters.splice(0).forEach((f) => f()); } };
const passGate = () => (gate.closed ? new Promise((r) => gate.waiters.push(r)) : Promise.resolve());

/* défilement « smooth » et animations CSS pilotés image par image (window.__step) */
export const DRIVER = `(() => {
  const native = window.scrollTo.bind(window);
  let anim = null;
  window.scrollTo = function (a, b) {
    let top, smooth = false;
    if (a && typeof a === 'object') { top = a.top == null ? window.scrollY : a.top; smooth = a.behavior === 'smooth'; } else top = b;
    if (smooth) anim = { from: window.scrollY, to: top, t: 0, d: 420 }; else { anim = null; native(0, top); }
  };
  /* le parcours vit dans un calque fixe qui défile lui-même ; sinon c'est la fenêtre */
  const scroller = () => {
    const c = [...document.querySelectorAll('div')].filter((d) => { const s = getComputedStyle(d); return s.position === 'fixed' && /(auto|scroll)/.test(s.overflowY) && d.scrollHeight > d.clientHeight + 4; });
    return c.length ? c[c.length - 1] : null;
  };
  window.__scroll = (y) => { anim = null; const s = scroller(); if (s) { s.style.scrollBehavior = 'auto'; s.scrollTop = y; } else native(0, y); };
  window.__scrollPos = () => { const s = scroller(); return s ? s.scrollTop : window.scrollY; };
  const nativeEl = Element.prototype.scrollTo;
  Element.prototype.scrollTo = function (a) {
    if (a && typeof a === 'object' && a.behavior === 'smooth') { anim = { el: this, from: this.scrollTop, to: a.top == null ? this.scrollTop : a.top, t: 0, d: 420 }; return; }
    return nativeEl.apply(this, arguments);
  };
  const seen = new WeakSet(), T = new WeakMap();
  window.__step = (dt) => {
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) { seen.add(a); try { a.pause(); } catch (e) {} T.set(a, 0); }
      const t = T.get(a) + dt; T.set(a, t);
      try { a.currentTime = t; } catch (e) {}
    }
    if (anim) {
      anim.t += dt;
      const u = Math.min(1, anim.t / anim.d), e = 1 - Math.pow(1 - u, 3), y = anim.from + (anim.to - anim.from) * e;
      if (anim.el) { anim.el.style.scrollBehavior = 'auto'; anim.el.scrollTop = y; } else native(0, y);
      if (u >= 1) anim = null;
    }
  };
  addEventListener('DOMContentLoaded', () => { document.documentElement.style.scrollBehavior = 'auto'; });
})();`;

export async function newPhone(browser, height) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height }, deviceScaleFactor: PHONE.scale, isMobile: true, hasTouch: true,
    locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  });
  const SITE = process.env.SITE_DIR, IMG = process.env.IMG_DIR;
  const log = [];
  await ctx.route('**/*', async (route) => {
    const u = route.request().url();
    const send = (body, type, status = 200) => route.fulfill({ status, contentType: type, body });
    if (CDN[u]) return send(fs.readFileSync(path.join(NM, CDN[u])), 'application/javascript');
    if (u.startsWith('https://fonts.googleapis.com/')) return send(FONT_CSS, 'text/css');
    if (u.startsWith('https://image.tmdb.org/t/p/')) {
      const name = path.basename(new URL(u).pathname).replace(/\.\w+$/, '');
      const f = path.join(IMG, (/^cmb?\d+$/.test(name) ? name : 'hero') + '.png');
      return send(fs.readFileSync(f), 'image/png');
    }
    const url = new URL(u);
    if (u.startsWith('https://api.themoviedb.org/3/') || (u.startsWith(HOST) && url.pathname.startsWith('/tmdb/'))) {
      await passGate();
      const r = tmdb(url.pathname, url.searchParams);
      log.push(url.pathname + url.search.slice(0, 120));
      return r ? send(JSON.stringify(r), 'application/json') : send('{"status_message":"not found"}', 'application/json', 404);
    }
    if (u.startsWith(HOST)) {
      if (url.pathname.startsWith('/__fonts/')) return send(fs.readFileSync(path.join(ROOT, 'src/fonts', path.basename(url.pathname))), 'font/woff2');
      if (url.pathname.startsWith('/api/')) return send('{"ok":true}', 'application/json');
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const f = path.join(SITE, rel);
      if (f.startsWith(SITE) && fs.existsSync(f) && fs.statSync(f).isFile()) return send(fs.readFileSync(f), TYPES[path.extname(f)] || 'application/octet-stream');
      return send('', 'text/plain', 404);
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text().slice(0, 200)); });
  return { ctx, page, log };
}
