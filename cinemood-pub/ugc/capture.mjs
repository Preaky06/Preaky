// Capture image par image (30 i/s) d'un « enregistrement d'écran » sur le vrai site :
// accroche dans une appli de streaming générique, saisie de l'adresse, parcours de 12
// questions, chargement, résultats. Horloge et animations sont pilotées : même entrée,
// mêmes images.
//   SITE_DIR=… IMG_DIR=… node ugc/capture.mjs <dossier de sortie>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { newPhone, HOST, DRIVER, gate, PHONE } from './site.mjs';
import { FILMS } from './catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const FPS = 30, SITE_H = 615, HOOK_H = 671;
const meta = { fps: FPS, scale: PHONE.scale, siteH: SITE_H, hookH: HOOK_H, frames: [], taps: [], drags: [], marks: {} };
let F = 0;
const dtAt = (f) => Math.round(((f + 1) * 1000) / FPS) - Math.round((f * 1000) / FPS);
const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);

async function snap(page, kind, extra = {}) {
  const img = page ? `f${String(F).padStart(5, '0')}.png` : null;
  if (page) await page.screenshot({ path: path.join(OUT, img) });
  meta.frames.push({ f: F, kind, img, ...extra });
  F++;
}

const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });

/* ---------- le site, préparé avant de filmer ---------- */
const { page: site } = await newPhone(browser, SITE_H);
await site.addInitScript(DRIVER);
await site.clock.install({ time: new Date('2026-10-12T21:47:00+02:00') });
await site.goto(HOST, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 300; i++) {
  await site.clock.runFor(100);
  if (await site.getByText('Commencer', { exact: true }).count()) break;
  await site.waitForTimeout(20);
}
await site.evaluate(() => document.fonts.ready);
await site.waitForTimeout(1500);

async function siteFrame(extra) {
  const dt = dtAt(F);
  await site.clock.runFor(dt);
  await site.evaluate((d) => window.__step(d), dt);
  await snap(site, 'site', extra);
}
async function siteSkip(ms) { // coupe franche : le temps passe sans être filmé
  for (let t = 0; t < ms; t += 33) { await site.clock.runFor(33); await site.evaluate(() => window.__step(33)); }
}
async function tap(locator) {
  const b = await locator.boundingBox();
  const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 40);
  meta.taps.push({ f: F, x, y, view: 'site' });
  await site.touchscreen.tap(x, y);
}
const scrollY = () => site.evaluate(() => window.__scrollPos());
async function dragTo(target, frames, fingerX = 300) { // défilement au doigt vers la position target
  const y0 = await scrollY(), dy = target - y0;
  const f0 = F, held = Math.round(frames * 0.45);
  meta.drags.push({ f0, f1: f0 + held, x: fingerX, y0: 470, y1: 470 - Math.max(-260, Math.min(260, dy * 0.7)), view: 'site' });
  for (let k = 1; k <= frames; k++) {
    await site.evaluate((y) => window.__scroll(y), Math.round(y0 + dy * ease(k / frames)));
    await siteFrame();
  }
}
const absY = async (loc) => (await loc.boundingBox()).y + (await scrollY());

/* ---------- 1. l'accroche : un catalogue qui défile sans fin ---------- */
const hctx = await browser.newContext({ viewport: { width: PHONE.width, height: HOOK_H }, deviceScaleFactor: PHONE.scale, isMobile: true, hasTouch: true });
await hctx.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host !== 'app.local') return route.abort();
  if (u.pathname === '/hook.html') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(HERE, 'hook.html')) });
  if (u.pathname.startsWith('/fonts/')) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(ROOT, 'src/fonts', path.basename(u.pathname))) });
  if (u.pathname.startsWith('/img/')) return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(process.env.IMG_DIR, path.basename(u.pathname))) });
  return route.abort();
});
const hook = await hctx.newPage();
const ids = FILMS.filter((f) => !f.hero).map((f) => f.id).concat([9004, 9002, 9006]);
await hook.goto('https://app.local/hook.html?ids=' + ids.join(','));
await hook.evaluate(() => document.fonts.ready);
await hook.waitForFunction(() => [...document.images].every((i) => i.complete));
meta.marks.hook = F;
const flings = [[4, 32, 1050], [34, 61, 1250], [63, 87, 1050]];
for (const [a, b] of flings) meta.drags.push({ f0: a, f1: a + Math.round((b - a) * 0.32), x: 290, y0: 540, y1: 250, view: 'hook' });
for (let f = 0; f < 88; f++) {
  let y = 0;
  for (const [a, b, d] of flings) y += f >= b ? d : f > a ? d * ease((f - a) / (b - a)) : 0;
  await hook.evaluate((v) => window.scrollTo(0, v), Math.round(y));
  await snap(hook, 'hook');
}
await hctx.close();

/* ---------- 2. on tape l'adresse ---------- */
meta.marks.type = F;
const URL_TXT = 'cinem00d.com';
for (let k = 0; k < 52; k++) {
  const n = Math.max(0, Math.min(URL_TXT.length, Math.floor((k - 6) / 2.2)));
  await snap(null, 'blank', { url: { text: URL_TXT.slice(0, n), focus: k < 36, cursor: k < 36 && Math.floor(k / 8) % 2 === 0, progress: k >= 36 ? (k - 36) / 16 : null } });
}

/* ---------- 3. l'accueil, puis « Commencer » ---------- */
meta.marks.home = F;
for (let k = 0; k < 40; k++) await siteFrame();
await tap(site.getByText('Commencer', { exact: true }).first());

/* ---------- 4. les questions ---------- */
meta.marks.q1 = F;
for (let k = 0; k < 18; k++) await siteFrame();
const evad = site.getByText('M’évader', { exact: true }).last();
await dragTo((await absY(evad)) - 330, 16);
for (let k = 0; k < 8; k++) await siteFrame();
await tap(evad);
meta.marks.q2 = F;
// le calque garde son défilement d'une question à l'autre : on remonte au doigt pour lire la question
for (let k = 0; k < 4; k++) await siteFrame();
await dragTo(0, 12);
for (let k = 0; k < 8; k++) await siteFrame();
await tap(site.getByText('Un autre monde', { exact: true }).last());
meta.marks.q3 = F;
for (let k = 0; k < 22; k++) await siteFrame();
await tap(site.getByText('L’espace', { exact: true }).last());
for (let k = 0; k < 6; k++) await siteFrame();
await siteSkip(350);
meta.marks.ff = F;
const REST = ['Équilibré', 'À deux', '1h45 – 2h10', 'Peu importe', 'De n’importe où', 'Peu importe', 'Par vagues', 'Un peu', 'Celui qui met tout le monde d’accord'];
for (let i = 0; i < REST.length; i++) {
  // passage accéléré : si l'option est hors champ, on recadre pendant la coupe
  const opt = site.getByText(REST[i], { exact: true }).last();
  const ob = await opt.boundingBox();
  if (ob && (ob.y + ob.height > SITE_H - 40 || ob.y < 60)) await site.evaluate((y) => window.__scroll(y), Math.max(0, (await absY(opt)) - 300));
  for (let k = 0; k < 6; k++) await siteFrame({ ff: true });
  if (i === REST.length - 1) gate.closed = true;
  await tap(site.getByText(REST[i], { exact: true }).last());
  for (let k = 0; k < 3; k++) await siteFrame({ ff: true });
  if (i < REST.length - 1) await siteSkip(420);
}
meta.marks.ffEnd = F;

/* ---------- 5. le chargement, puis les résultats ---------- */
meta.marks.loading = F;
for (let k = 0; k < 38; k++) await siteFrame();
gate.open();
for (let i = 0; i < 200; i++) {
  if (await site.getByText('Pourquoi lui', { exact: true }).count()) break;
  await site.clock.runFor(60);
  await site.waitForTimeout(40);
}
await site.waitForTimeout(1500);
await site.evaluate(() => window.__scroll(0));
meta.marks.results = F;
for (let k = 0; k < 30; k++) await siteFrame();
const t1 = site.getByText('L’Écho des étoiles', { exact: true }).first();
const card1 = await absY(t1);
const poster1 = await site.evaluate(() => { const el = [...document.querySelectorAll('.cm-best-poster')][0]; return el ? el.getBoundingClientRect().top + window.scrollY : null; });
await dragTo((poster1 ?? card1 - 360) - 64, 20);
meta.marks.card = F;
for (let k = 0; k < 34; k++) await siteFrame();
await dragTo(card1 - 96, 18);
meta.marks.title = F;
for (let k = 0; k < 40; k++) await siteFrame();
const why = site.getByText('Pourquoi lui', { exact: true }).first();
const whyY = await absY(why);
await dragTo(whyY - 200, 18);
meta.marks.why = F;
const wb = await why.boundingBox();
meta.whyBox = { x: wb.x, y: wb.y, w: wb.width, h: wb.height };
for (let k = 0; k < 62; k++) await siteFrame();
const t2 = await absY(site.getByText('Le Dernier Signal', { exact: true }).first());
await dragTo(t2 - 420, 16);
meta.marks.card2 = F;
for (let k = 0; k < 30; k++) await siteFrame();
const t3 = await absY(site.getByText('Cap sur l’aurore', { exact: true }).first());
await dragTo(t3 - 420, 16);
meta.marks.card3 = F;
for (let k = 0; k < 44; k++) await siteFrame();
meta.marks.end = F;

fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));
console.log(`${F} images (${(F / FPS).toFixed(1)} s) → ${OUT}`, JSON.stringify(meta.marks));
await browser.close();
