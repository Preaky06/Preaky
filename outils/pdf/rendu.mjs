// Rend le document composé en PDF A4 avec Chromium (Playwright).
// Usage : node rendu.mjs <racine du site> <document.html> <dossier des JPEG> <sortie.pdf>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const [root, doc, jpgDir, out] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const browser = await chromium.launch();
const page = await (await browser.newContext({ colorScheme: 'light' })).newPage();
page.on('pageerror', (e) => console.log('erreur de page :', e.message));
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.hostname === 'portfolio.local') {
    let f = u.pathname === '/document.html' ? doc : path.join(root, decodeURIComponent(u.pathname));
    if (u.pathname.startsWith('/assets/img/') && u.pathname.endsWith('.jpg')) f = path.join(jpgDir, path.basename(u.pathname));
    return fs.existsSync(f)
      ? route.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] ?? 'application/octet-stream' })
      : route.fulfill({ status: 404 });
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return route.continue();
  return route.abort();
});
await page.goto('http://portfolio.local/document.html', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
});
const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')));
if (broken.length) console.log('images manquantes :', broken);
await page.pdf({
  path: out,
  format: 'A4',
  scale: 0.7,
  printBackground: true,
  margin: { top: '14mm', bottom: '16mm', left: '0', right: '0' },
});
await browser.close();
console.log('rendu :', out);
