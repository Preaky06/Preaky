// Rendu image par image du film dans Chromium (headless).
//   node render.mjs stills <w> <h> <outDir> <t1> <t2> ...     → PNG à des instants donnés
//   node render.mjs frames <w> <h> <outDir> [workers] [from] [to] → toutes les images (PNG)
//   node render.mjs neon <w> <h> <outDir>                     → intensité du néon par image (JSON)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const HOST = 'http://film.local/';
const PAGE = process.env.PAGE || 'index.html'; // motion.html pour la version motion design
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.woff2': 'font/woff2' };

const [mode, ws, hs, outDir, ...rest] = process.argv.slice(2);
const W = parseInt(ws, 10), H = parseInt(hs, 10);
fs.mkdirSync(outDir, { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (!u.startsWith(HOST)) return route.abort();
    const rel = decodeURIComponent(u.slice(HOST.length).split('?')[0]) || PAGE;
    const file = path.join(SRC, rel);
    if (!file.startsWith(SRC) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(HOST + PAGE);
  await page.evaluate(([w, h]) => window.setup(w, h), [W, H]);
  return page;
}

async function shot(page, f, file) {
  await page.evaluate((fr) => window.renderFrame(fr), f);
  await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
}

const launch = () => chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });
const browser = await launch();
if (mode === 'stills') {
  const page = await openPage(browser);
  for (const ts of rest) {
    const t = parseFloat(ts);
    const f = Math.round(t * 60);
    const t0 = Date.now();
    await shot(page, f, path.join(outDir, `t${t.toFixed(2).padStart(5, '0')}.png`));
    console.log(`t=${t} (${Date.now() - t0} ms)`);
  }
} else if (mode === 'neon') {
  // intensité du néon image par image, pour synchroniser le grésillement sonore
  const page = await openPage(browser);
  const lv = await page.evaluate(() => Array.from({ length: 30 * 60 }, (_, f) => neonLevelAt(f)));
  fs.writeFileSync(path.join(outDir, 'neon.json'), JSON.stringify(lv.map(v => Math.round(v * 1000) / 1000)));
  console.log('neon.json écrit');
} else if (mode === 'frames') {
  const workers = parseInt(rest[0] || '4', 10);
  const from = parseInt(rest[1] || '0', 10), to = parseInt(rest[2] || String(30 * 60), 10);
  const all = [];
  for (let f = from; f < to; f++) if (!fs.existsSync(path.join(outDir, `f${String(f).padStart(5, '0')}.png`))) all.push(f);
  let next = 0, done = 0;
  const t0 = Date.now();
  // un navigateur par worker : l'encodage des captures se fait alors en parallèle
  await Promise.all(Array.from({ length: workers }, async () => {
    const own = await launch();
    const page = await openPage(own);
    while (next < all.length) {
      const f = all[next++];
      await shot(page, f, path.join(outDir, `f${String(f).padStart(5, '0')}.png`));
      done++;
      if (done % 120 === 0) console.log(`${done}/${all.length} images — ${((Date.now() - t0) / done).toFixed(0)} ms/image`);
    }
    await own.close();
  }));
  console.log(`terminé : ${done} images en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close();
