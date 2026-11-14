// Tests de bout en bout : chaque outil est utilisé dans Chromium, et chaque fichier produit est vérifié.
// Usage : node tests/e2e/run.mjs   (nécessite Playwright + Chromium : npm i -D playwright && npx playwright install chromium)
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { unzipSync } from 'fflate';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright introuvable. Installe-le : npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, '.e2e-dist');
const FIX = join(ROOT, '.e2e-fixtures');
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}`;

// ── Fixtures ──
async function makePdf(name, pages, { size = [595.28, 841.89], rotate = 0 } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pages) {
    const p = doc.addPage(size);
    p.drawText(text, { x: 60, y: size[1] - 100, size: 24, font });
    if (rotate) p.setRotation(degrees(rotate));
  }
  writeFileSync(join(FIX, name), await doc.save());
}

// ── Vérifications (pdf.js côté Node) ──
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
async function inspect(bytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const ops = await page.getOperatorList();
    const items = content.items.map((it) => {
      const [x, y] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
      return { str: it.str, x, y };
    });
    pages.push({ text: items.map((i) => i.str).join(' '), items, width: viewport.width, height: viewport.height, rotate: page.rotate, images: ops.fnArray.filter((f) => f === pdfjs.OPS.paintImageXObject).length });
  }
  await doc.destroy();
  return pages;
}

// ── Petit exécuteur de tests ──
const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ name, ok: false, error: e });
    console.log(`  ✗ ${name}\n    ${String(e.stack || e).split('\n').slice(0, 4).join('\n    ')}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}
const eq = (a, b, m) => assert(JSON.stringify(a) === JSON.stringify(b), `${m}: attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);
const near = (a, b, tol, m) => assert(Math.abs(a - b) <= tol, `${m}: attendu ≈${b}, obtenu ${a}`);

// ── Démarrage ──
rmSync(FIX, { recursive: true, force: true });
mkdirSync(FIX, { recursive: true });
execFileSync('node', [join(ROOT, 'scripts/build.mjs'), '--config', join(ROOT, 'tests/e2e/test.config.mjs'), '--out', OUT], { stdio: 'inherit' });
await makePdf('a.pdf', ['Alpha page 1', 'Alpha page 2', 'Alpha page 3']);
await makePdf('b.pdf', ['Bravo page 1', 'Bravo page 2'], { size: [792, 612] });
await makePdf('rot.pdf', ['Rotated page'], { rotate: 90 });
writeFileSync(join(FIX, 'broken.pdf'), 'ceci n’est pas un PDF');

const server = spawn('node', [join(ROOT, 'scripts/dev.mjs'), '--dir', OUT, '--port', String(PORT), '--config', join(ROOT, 'tests/e2e/test.config.mjs'), '--mock'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const consoleErrors = [];
context.on('page', (p) => {
  p.on('pageerror', (e) => consoleErrors.push(`${p.url()} : ${e.message}`));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(`${p.url()} : ${m.text()}`);
  });
});
const page = await context.newPage();

// Images de test générées par le navigateur
await page.goto(BASE + '/');
const images = await page.evaluate(() => {
  const make = (w, h, type, alpha) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    if (!alpha) {
      x.fillStyle = '#ff5a36';
      x.fillRect(0, 0, w, h);
    } else {
      x.fillStyle = 'rgba(30,60,200,0.6)';
      x.beginPath();
      x.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2);
      x.fill();
    }
    return c.toDataURL(type, 0.9).split(',')[1];
  };
  return { jpg: make(800, 600, 'image/jpeg', false), png: make(300, 400, 'image/png', true) };
});
writeFileSync(join(FIX, 'photo.jpg'), Buffer.from(images.jpg, 'base64'));
writeFileSync(join(FIX, 'dessin.png'), Buffer.from(images.png, 'base64'));
const F = (n) => join(FIX, n);

// ── Helpers UI ──
async function openTool(slug) {
  await page.goto(`${BASE}/${slug}`);
  await page.waitForSelector('.dropzone');
}
const upload = (files) => page.setInputFiles('.dropzone input[type=file]', files.map(F));
async function runAndDownload(selector = '[data-testid=run]') {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click(selector)]);
  const bytes = readFileSync(await dl.path());
  return { bytes, name: dl.suggestedFilename() };
}
async function expectPaywall(text = 'Passez à') {
  const dlg = page.locator('dialog.modal[open]');
  await dlg.waitFor({ timeout: 5000 });
  const content = await dlg.innerText();
  assert(content.includes(text), `fenêtre d'abonnement attendue (« ${text} »), obtenu : ${content.slice(0, 120)}`);
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });
}
const waitThumbs = (n) => page.waitForFunction((k) => document.querySelectorAll('.thumb canvas, .thumb img').length >= k, n, { timeout: 20000 });
const badge = () => page.locator('[data-plan-badge]').first().innerText();
async function activateKey(key) {
  await page.goto(`${BASE}/compte`);
  await page.fill('[data-testid=license-input]', key);
  await page.click('[data-testid=license-activate]');
}

console.log(`\nTests E2E sur ${BASE}\n`);

await test('Accueil : 9 outils, FAQ, tarifs', async () => {
  await page.goto(BASE + '/');
  eq(await page.locator('#outils .tool-card').count(), 9, 'cartes outils');
  assert((await page.locator('.faq details').count()) >= 5, 'FAQ présente');
  eq(await page.locator('.plan-card').count(), 3, 'plans');
  eq(await badge(), 'Gratuit', 'badge');
});

await test('Fusionner : 2 PDF + 1 image → 6 pages dans le bon ordre', async () => {
  await openTool('fusionner-pdf');
  await upload(['a.pdf', 'b.pdf', 'dessin.png']);
  await waitThumbs(3);
  const { bytes, name } = await runAndDownload();
  eq(name, 'a-fusion.pdf', 'nom du fichier');
  const pages = await inspect(bytes);
  eq(pages.length, 6, 'pages');
  assert(pages[0].text.includes('Alpha page 1') && pages[3].text.includes('Bravo page 1'), 'ordre des pages');
  eq([Math.round(pages[3].width), Math.round(pages[3].height)], [792, 612], 'format page Bravo');
  eq(pages[5].images, 1, 'image insérée');
});

await test('Fusionner : réordonner puis fusionner', async () => {
  await openTool('fusionner-pdf');
  await upload(['a.pdf', 'b.pdf']);
  await waitThumbs(2);
  await page.locator('.file-card').nth(1).getByRole('button', { name: 'Déplacer avant' }).click();
  const pages = await inspect((await runAndDownload()).bytes);
  assert(pages[0].text.includes('Bravo page 1'), 'b.pdf doit passer en premier');
});

await test('Fusionner : limite du plan gratuit → fenêtre Pro', async () => {
  await openTool('fusionner-pdf');
  await upload(['a.pdf', 'b.pdf', 'rot.pdf', 'dessin.png']);
  await expectPaywall('Pro');
});

await test('Organiser : pivoter, supprimer, enregistrer', async () => {
  await openTool('organiser-pdf');
  await upload(['a.pdf']);
  await waitThumbs(3);
  await page.locator('.page-card').nth(0).getByRole('button', { name: 'Pivoter à droite' }).click();
  await page.locator('.page-card').nth(1).getByRole('button', { name: 'Supprimer' }).click();
  const pages = await inspect((await runAndDownload()).bytes);
  eq(pages.length, 2, 'pages restantes');
  eq(pages[0].rotate, 90, 'rotation');
  assert(pages[1].text.includes('Alpha page 3'), 'page 2 supprimée');
});

await test('Organiser : glisser-déposer pour réordonner', async () => {
  await openTool('organiser-pdf');
  await upload(['a.pdf']);
  await waitThumbs(3);
  const from = await page.locator('.page-card').nth(2).locator('.thumb').boundingBox();
  const to = await page.locator('.page-card').nth(0).locator('.thumb').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x + 8 - from.x) * i) / 12, from.y + from.height / 2);
  await page.mouse.up();
  const pages = await inspect((await runAndDownload()).bytes);
  eq(pages.map((p) => p.text.match(/\d/)[0]), ['3', '1', '2'], 'ordre après glisser-déposer');
});

await test('Organiser : extraire la sélection', async () => {
  await openTool('organiser-pdf');
  await upload(['a.pdf']);
  await waitThumbs(3);
  await page.locator('.page-card').nth(1).locator('.page-check').check();
  const pages = await inspect((await runAndDownload('[data-testid=extract]')).bytes);
  eq(pages.length, 1, 'une page');
  assert(pages[0].text.includes('Alpha page 2'), 'bonne page');
});

await test('Organiser : fichier invalide → message d’erreur', async () => {
  await openTool('organiser-pdf');
  await upload(['broken.pdf']);
  await page.locator('.toast.err').waitFor();
  await page.waitForSelector('.dropzone');
});

await test('Diviser : plages → ZIP de 2 PDF', async () => {
  await openTool('diviser-pdf');
  await upload(['a.pdf']);
  await page.fill('[data-testid=ranges]', '1, 2-3');
  const previewText = await page.locator('[data-testid=split-preview]').innerText();
  assert(!/\bnull\b|undefined/.test(previewText), `texte parasite dans l’aperçu : ${previewText}`);
  const { bytes, name } = await runAndDownload();
  eq(name, 'a-divise.zip', 'nom');
  const files = unzipSync(new Uint8Array(bytes));
  eq(Object.keys(files).sort(), ['a-pages-1.pdf', 'a-pages-2-3.pdf'], 'fichiers du ZIP');
  eq((await inspect(files['a-pages-2-3.pdf'])).length, 2, 'pages du 2e fichier');
});

await test('Diviser : extraire des pages dans l’ordre demandé', async () => {
  await openTool('diviser-pdf');
  await upload(['a.pdf']);
  await page.locator('.segmented label', { hasText: 'Extraire des pages' }).click();
  await page.fill('[data-testid=ranges]', '3, 1');
  const pages = await inspect((await runAndDownload()).bytes);
  eq(pages.map((p) => p.text.match(/\d/)[0]), ['3', '1'], 'ordre');
});

await test('Diviser : plage invalide → erreur affichée, pas de fichier', async () => {
  await openTool('diviser-pdf');
  await upload(['a.pdf']);
  await page.fill('[data-testid=ranges]', '2-9');
  const msg = await page.locator('[data-testid=split-preview] .notice.err').innerText();
  assert(msg.includes('n’existe pas'), msg);
});

await test('Images en PDF : format Lettre, orientation auto', async () => {
  await openTool('images-en-pdf');
  await upload(['photo.jpg', 'dessin.png']);
  await waitThumbs(2);
  await page.locator('.segmented label', { hasText: 'Lettre US' }).click();
  const pages = await inspect((await runAndDownload()).bytes);
  eq(pages.length, 2, 'pages');
  eq([Math.round(pages[0].width), Math.round(pages[0].height)], [792, 612], 'photo paysage');
  eq([Math.round(pages[1].width), Math.round(pages[1].height)], [612, 792], 'dessin portrait');
});

await test('Outil Pro en plan gratuit → export bloqué par la fenêtre Pro', async () => {
  await openTool('compresser-pdf');
  await upload(['a.pdf']);
  await page.click('[data-testid=run]');
  await expectPaywall('Pro');
});

await test('Compte : clé inconnue et clé d’un autre produit refusées', async () => {
  await activateKey('WRONG-KEY-123456');
  await page.waitForFunction(() => document.querySelector('[data-testid=license-error]')?.textContent.includes('introuvable'));
  await page.fill('[data-testid=license-input]', 'OTHER-PRODUCT-0003');
  await page.click('[data-testid=license-activate]');
  await page.waitForFunction(() => document.querySelector('[data-testid=license-error]')?.textContent.includes('aucun plan'));
});

await test('Compte : activation Pro', async () => {
  await activateKey('PRO-TEST-0000-0001');
  await page.locator('[data-testid=plan-name]').waitFor();
  eq(await page.locator('[data-testid=plan-name]').innerText(), 'Pro', 'plan');
  eq(await badge(), 'Pro', 'badge');
});

await test('Compresser (Pro) : niveau équilibré puis sans perte', async () => {
  await openTool('compresser-pdf');
  await upload(['a.pdf']);
  let pages = await inspect((await runAndDownload()).bytes);
  eq(pages.length, 3, 'pages');
  eq([Math.round(pages[0].width), Math.round(pages[0].height)], [595, 842], 'format conservé');
  await page.getByRole('button', { name: 'Modifier les réglages' }).click();
  await page.locator('.segmented label', { hasText: 'Sans perte' }).click();
  pages = await inspect((await runAndDownload()).bytes);
  assert(pages[2].text.includes('Alpha page 3'), 'texte conservé en sans perte');
});

await test('PDF en images : PNG en ZIP, puis une page en JPG', async () => {
  await openTool('pdf-en-images');
  await upload(['a.pdf']);
  await page.locator('.segmented label', { hasText: '72 dpi' }).click();
  let out = await runAndDownload();
  const files = unzipSync(new Uint8Array(out.bytes));
  eq(Object.keys(files).length, 3, 'images');
  eq([...files['a-page-1.png'].slice(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG', 'signature PNG');
  await page.getByRole('button', { name: 'Modifier les réglages' }).click();
  await page.locator('.segmented label', { hasText: /^JPG$/ }).click();
  await page.fill('[data-testid=pages]', '2');
  out = await runAndDownload();
  eq(out.name, 'a-page-2.jpg', 'nom');
  eq([out.bytes[0], out.bytes[1]], [0xff, 0xd8], 'signature JPEG');
});

await test('Filigrane (Pro) : texte présent sur toutes les pages', async () => {
  await openTool('filigrane-pdf');
  await upload(['a.pdf']);
  await page.waitForSelector('[data-testid=preview] canvas');
  await page.fill('[data-testid=wm-text]', 'COPIE privée');
  const pages = await inspect((await runAndDownload()).bytes);
  assert(pages.every((p) => p.text.includes('COPIE privée')), 'filigrane sur chaque page');
});

await test('Numéroter : « Page 1 sur 3 » et position sur page pivotée', async () => {
  await openTool('numeroter-pdf');
  await upload(['a.pdf']);
  await page.selectOption('select', 'page-n-total');
  let pages = await inspect((await runAndDownload()).bytes);
  assert(pages[0].text.includes('Page 1 sur 3') && pages[2].text.includes('Page 3 sur 3'), 'numéros');
  await openTool('numeroter-pdf');
  await upload(['rot.pdf']);
  pages = await inspect((await runAndDownload()).bytes);
  const item = pages[0].items.find((i) => i.str === '1');
  assert(item, 'numéro trouvé');
  near(item.x, pages[0].width / 2, 12, 'centré horizontalement (page pivotée)');
  near(item.y, pages[0].height - 28, 6, 'en bas de la page visible');
});

await test('Signer : signature dessinée + date, au bon endroit', async () => {
  await openTool('signer-pdf');
  await upload(['rot.pdf']);
  await page.waitForSelector('.page-stage canvas');
  await page.click('[data-testid=add-signature]');
  const pad = await page.locator('dialog .sig-pad').boundingBox();
  await page.mouse.move(pad.x + 40, pad.y + 120);
  await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(pad.x + 40 + i * 15, pad.y + 120 - Math.sin(i / 2) * 40);
  await page.mouse.up();
  await page.click('[data-testid=sig-save]');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=placed]').length === 1);
  await page.click('[data-testid=add-date]');
  const date = new Date().toLocaleDateString('fr-FR');
  const pages = await inspect((await runAndDownload()).bytes);
  eq(pages[0].images, 1, 'signature (image) présente');
  const item = pages[0].items.find((i) => i.str === date);
  assert(item, `date ${date} présente`);
  // La date est placée à 15 % de la largeur et 85 % de la hauteur visibles (+ ascendante)
  near(item.x, pages[0].width * 0.15, 3, 'position horizontale');
  near(item.y, pages[0].height * 0.85 + 0.78 * 12, 3, 'position verticale');
});

await test('Lots : plusieurs PDF en Pro → fenêtre Business', async () => {
  await openTool('filigrane-pdf');
  await upload(['a.pdf', 'b.pdf']);
  await expectPaywall('Business');
});

await test('Désactivation puis activation Business', async () => {
  await page.goto(`${BASE}/compte`);
  page.once('dialog', (d) => d.accept());
  await page.click('[data-testid=license-deactivate]');
  await page.locator('[data-testid=license-input]').waitFor();
  eq(await badge(), 'Gratuit', 'retour au gratuit');
  await activateKey('BIZ-TEST-0000-0002');
  await page.locator('[data-testid=plan-name]').waitFor();
  eq(await badge(), 'Business', 'badge');
});

await test('Lots (Business) : filigrane sur 2 PDF → ZIP', async () => {
  await openTool('filigrane-pdf');
  await upload(['a.pdf', 'b.pdf']);
  const { bytes, name } = await runAndDownload();
  eq(name, 'a-filigranes.zip', 'nom');
  const files = unzipSync(new Uint8Array(bytes));
  eq(Object.keys(files).sort(), ['a-filigrane.pdf', 'b-filigrane.pdf'], 'contenu');
  eq((await inspect(files['b-filigrane.pdf'])).length, 2, 'pages de b');
});

await test('Licence : délai de grâce hors ligne dépassé → retour au gratuit, revérification → rétabli', async () => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('plico.license.v1'));
    s.lastSuccess = Date.now() - 8 * 86400000;
    s.lastCheck = Date.now();
    localStorage.setItem('plico.license.v1', JSON.stringify(s));
  });
  await page.goto(`${BASE}/compte`);
  eq(await badge(), 'Gratuit', 'grâce expirée');
  await page.getByRole('button', { name: 'Revérifier maintenant' }).click();
  await page.locator('[data-testid=plan-name]').waitFor();
  eq(await badge(), 'Business', 'rétabli');
});

await test('API : limite d’appareils appliquée (3 pour Pro)', async () => {
  const call = () => fetch(`${BASE}/api/license`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate', key: 'PRO-TEST-0000-0001', label: 'test' }) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const r = [await call(), await call(), await call(), await call()];
  eq(r.slice(0, 3).map((x) => x.status), [200, 200, 200], '3 activations acceptées');
  eq([r[3].status, r[3].body.code], [403, 'device_limit'], '4e refusée');
});

await test('Tarifs : bascule annuelle et liens de paiement', async () => {
  await page.goto(`${BASE}/tarifs`);
  eq(await page.locator('.plan-card[data-plan=pro] [data-checkout]').getAttribute('href'), 'https://checkout.example/pro-monthly', 'lien mensuel');
  await page.click('.billing-toggle [data-period=yearly]');
  eq(await page.locator('.plan-card[data-plan=pro] [data-checkout]').getAttribute('href'), 'https://checkout.example/pro-yearly', 'lien annuel');
  assert(await page.locator('.plan-card[data-plan=pro] [data-price-yearly]').isVisible(), 'prix annuel visible');
  eq(await page.locator('.plan-card[data-plan=business] [data-checkout]').innerText(), 'Votre plan actuel', 'plan courant signalé');
});

await test('Mobile : aucune page ne déborde horizontalement', async () => {
  const m = await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });
  const p = await m.newPage();
  for (const path of ['/', '/tarifs', '/compte', '/fusionner-pdf', '/signer-pdf', '/cgv']) {
    await p.goto(BASE + path);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    eq(overflow, 0, `débordement sur ${path}`);
  }
  await m.close();
});

await test('Hors ligne : l’application se recharge et fusionne sans réseau', async () => {
  const off = await browser.newContext({ acceptDownloads: true });
  const p = await off.newPage();
  await p.goto(`${BASE}/fusionner-pdf`);
  await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await new Promise((r) => (navigator.serviceWorker.controller ? r() : navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })));
    // attendre la fin du pré-cache
    for (let i = 0; i < 100; i++) {
      const keys = await caches.keys();
      const c = keys.length && (await caches.open(keys[0]));
      if (c && (await c.match('/assets/vendor/pdf-lib/pdf-lib.esm.min.js')) && (await c.match('/assets/vendor/pdfjs/pdf.worker.min.mjs'))) return reg.active.state;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('pré-cache incomplet');
  });
  await off.setOffline(true);
  await p.reload();
  await p.waitForSelector('.dropzone');
  await p.setInputFiles('.dropzone input[type=file]', [F('a.pdf'), F('b.pdf')]);
  await p.waitForFunction(() => document.querySelectorAll('.thumb canvas').length >= 2, null, { timeout: 20000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-testid=run]')]);
  eq((await inspect(readFileSync(await dl.path()))).length, 5, 'pages fusionnées hors ligne');
  await off.close();
});

await test('Aucune erreur JavaScript ni violation CSP pendant toute la session', async () => {
  eq(consoleErrors, [], 'erreurs console');
});

await browser.close();
server.kill();
rmSync(FIX, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
process.exit(failed.length ? 1 : 0);
