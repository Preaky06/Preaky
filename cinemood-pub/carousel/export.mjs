// Exporte le carrousel : une image PNG 1080×1350 par slide, plus un PDF (format document LinkedIn).
//   node carousel/export.mjs [dossier de sortie]   (défaut : out/carousel)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'out', 'carousel'));
const HOST = 'http://carrousel.local/';
const TYPES = { '.html': 'text/html', '.woff2': 'font/woff2' };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.route('**/*', (route) => {
  const u = route.request().url();
  if (!u.startsWith(HOST)) return route.abort();
  const file = path.join(ROOT, decodeURIComponent(u.slice(HOST.length).split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
});
await page.goto(HOST + 'carousel/slides.html');
await page.evaluate(() => document.fonts.ready);

// contrôle : aucun texte ne doit dépasser la marge droite (96 px)
const over = await page.evaluate(() => [...document.querySelectorAll('section')].flatMap((s, i) => {
  const r0 = s.getBoundingClientRect();
  return [...s.querySelectorAll('div')].filter((d) => d.children.length === 0 || d.querySelector('span'))
    .map((d) => ({ i: i + 1, t: d.textContent.trim().slice(0, 40), right: Math.round(d.getBoundingClientRect().right - r0.left) }))
    .filter((o) => o.right > 990 && o.t);
}));
for (const o of over) console.log(`dépasse : slide ${o.i} « ${o.t} » → ${o.right} px`);

const slides = await page.$$('section');
for (let i = 0; i < slides.length; i++) {
  const f = path.join(OUT, `cinemood-carrousel-${String(i + 1).padStart(2, '0')}.png`);
  await slides[i].screenshot({ path: f });
}
await page.pdf({ path: path.join(OUT, 'cinemood-carrousel.pdf'), width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
console.log(`${slides.length} slides → ${OUT}`);
await browser.close();
