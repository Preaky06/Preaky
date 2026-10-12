// Montage de la vidéo UGC à partir de la capture (capture.mjs) :
// téléphone (barre d'état, navigateur), doigt, sous-titres, zooms, mentions.
//   node ugc/compose.mjs <dossier capture> <dossier images finales>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const RAW = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(RAW, 'meta.json'), 'utf8'));
const M = meta.marks, K = meta.scale, STATUS = 112, SITE_Y = 260;
const N = meta.frames.length;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeIO = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };

/* sous-titres : [début, fin, texte, hauteur du centre] */
export const CAPTIONS = [
  [M.hook + 3, M.type - 1, 'pov : ça fait 40 min que tu scrolles pour trouver UN film 🫠', 860],
  [M.type + 2, M.home - 1, 'jusqu’à ce qu’on me montre ce site 👀', 860],
  [M.home + 4, M.q1 - 1, '12 questions sur ton moment', 1430],
  [M.q1 + 2, M.q2 - 1, 'ce soir j’avais envie de m’évader', 640],
  [M.q2 + 3, M.ff - 1, 'un autre monde… l’espace 🚀', 640],
  [M.ff + 1, M.ffEnd - 1, 'avec qui, combien de temps, quelle époque…', 640],
  [M.loading + 2, M.results - 1, 'et en une minute…', 1330],
  [M.results + 3, M.title - 1, '8 films classés pour MON moment', 700],
  [M.title + 3, M.why - 1, 'le n°1 colle à 98 % 😳', 1460],
  [M.why + 4, M.card2 - 1, 'et il t’explique POURQUOI ce film 🤯', 560],
  [M.card2 + 2, M.card3 + 8, 'gratuit, sans compte', 640],
  [M.card3 + 10, N, 'le site : cinem00d.com 🎬', 1250],
];
/* zooms de montage : [début, fin, facteur, foyer x, foyer y, montée, descente] */
const wb = meta.whyBox;
const ZOOMS = [
  [M.title + 2, M.why - 1, 1.08, 700, SITE_Y + 230 * K, 10, 6],
  [M.why + 6, M.card2 - 2, 1.32, 540, SITE_Y + (wb.y + 70) * K, 9, 6],
  [M.card3 + 10, N + 20, 1.18, 540, 186, 14, 1],
];

function zoomAt(f) {
  let best = { z: 1, fx: 540, fy: 960 };
  for (const [a, b, z, fx, fy, up, down] of ZOOMS) {
    if (f < a || f > b) continue;
    const e = Math.min(easeIO((f - a) / up), easeIO((b - f) / down));
    const zz = 1 + (z - 1) * e;
    if (zz > best.z) best = { z: zz, fx, fy };
  }
  return best;
}
function touchesAt(f) {
  const out = [];
  const top = (v) => (v === 'hook' ? STATUS : SITE_Y);
  for (const t of meta.taps) {
    const d = f - t.f;
    if (d < -3 || d > 10) continue;
    out.push({ x: t.x * K, y: top(t.view) + t.y * K, a: d < 0 ? (d + 4) / 4 : 1 - d / 11, ring: d >= 0 ? d / 9 : null });
  }
  for (const g of meta.drags) {
    if (f < g.f0 - 2 || f > g.f1 + 3) continue;
    const u = clamp((f - g.f0) / Math.max(1, g.f1 - g.f0));
    const a = f < g.f0 ? (f - g.f0 + 3) / 3 : f > g.f1 ? 1 - (f - g.f1) / 4 : 1;
    out.push({ x: g.x * K, y: top(g.view) + (g.y0 + (g.y1 - g.y0) * easeIO(u)) * K, a, ring: null });
  }
  return out;
}

const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host !== 'compose.local') return route.abort();
  if (u.pathname === '/') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(HERE, 'compose.html')) });
  if (u.pathname.startsWith('/fonts/')) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(ROOT, 'src/fonts', path.basename(u.pathname))) });
  if (u.pathname.startsWith('/raw/')) return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(RAW, path.basename(u.pathname))) });
  return route.abort();
});
await page.goto('https://compose.local/');
await page.evaluate(() => window.ready);
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
const t0 = Date.now();
for (let f = 0; f < N; f++) {
  if (only && !only.includes(f)) continue;
  const fr = meta.frames[f];
  const cap = CAPTIONS.find(([a, b]) => f >= a && f < b);
  const s = {
    kind: fr.kind, img: fr.img, url: fr.url || null, touches: touchesAt(f), zoom: zoomAt(f),
    caption: cap ? { text: cap[2], age: f - cap[0], y: cap[3] } : null,
    sticker: fr.ff ? '⏩ ×4' : null,
    note: f >= M.results ? 'démo · titres fictifs' : null,
  };
  await page.evaluate((st) => window.renderFrame(st), s);
  await page.screenshot({ path: path.join(OUT, `u${String(f).padStart(5, '0')}.png`) });
  if (f % 100 === 0) console.log(`${f}/${N} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
console.log(`montage : ${only ? only.length : N} images → ${OUT}`);
await browser.close();
