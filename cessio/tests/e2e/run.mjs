// Tests de bout en bout : parcours réel dans Chromium, vérification du contenu des fichiers produits.
// Usage : node tests/e2e/run.mjs   (Playwright + Chromium requis)
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { unzipSync } from 'fflate';
import { endDate, dateShort } from '../../src/assets/js/core/format.mjs';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright introuvable : npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = join(ROOT, '.e2e-dist');
const PORT = 8830 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}`;
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

async function pdfText(bytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') }).promise;
  let text = '';
  let images = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    text += (await page.getTextContent()).items.map((it) => it.str).join(' ') + '\n';
    images += (await page.getOperatorList()).fnArray.filter((f) => f === pdfjs.OPS.paintImageXObject).length;
  }
  const pages = doc.numPages;
  await doc.destroy();
  return { text: text.replace(/\s+/g, ' '), pages, images };
}

const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ ok: true });
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ ok: false });
    console.log(`  ✗ ${name}\n    ${String(e.stack || e).split('\n').slice(0, 4).join('\n    ')}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const eq = (a, b, m) => assert(JSON.stringify(a) === JSON.stringify(b), `${m} : attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);
const has = (text, needle, m = 'texte attendu') => assert(text.includes(needle), `${m} : « ${needle} » absent`);

execFileSync('node', [join(ROOT, 'scripts/build.mjs'), '--config', join(ROOT, 'tests/e2e/test.config.mjs'), '--out', OUT], { stdio: 'inherit' });
const server = spawn('node', [join(ROOT, 'scripts/dev.mjs'), '--dir', OUT, '--port', String(PORT), '--config', join(ROOT, 'tests/e2e/test.config.mjs'), '--mock'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
const consoleErrors = [];
context.on('page', (p) => {
  p.on('pageerror', (e) => consoleErrors.push(`${p.url()} : ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && consoleErrors.push(`${p.url()} : ${m.text()}`));
});
const page = await context.newPage();

// ── Helpers ──
async function download(selector) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click(selector)]);
  return { bytes: readFileSync(await dl.path()), name: dl.suggestedFilename() };
}
async function expectPaywall(planWord) {
  const dlg = page.locator('dialog.modal[open]');
  await dlg.waitFor({ timeout: 5000 });
  has(await dlg.innerText(), `Passez à ${planWord}`, 'fenêtre d’abonnement');
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });
}
const seg = (text) => page.locator('.segmented label', { hasText: text }).first().click();
const badge = () => page.locator('[data-plan-badge]').first().innerText();
async function activate(key) {
  await page.goto(`${BASE}/compte`);
  await page.fill('[data-testid=license-input]', key);
  await page.click('[data-testid=license-activate]');
  await page.locator('[data-testid=plan-name]').waitFor();
}
async function fillParties(client = 'Boulangerie Dupont') {
  await page.fill('[data-testid=author-name]', 'Maël Gillet');
  await page.fill('[data-testid=author-address]', '1 rue des Arts, 06000 Nice');
  await page.fill('[data-testid=client-name]', client);
  await page.fill('[data-testid=client-address]', '2 place du Marché, 06000 Nice');
}
async function newWizard() {
  await page.goto(`${BASE}/app#nouveau`);
  await page.evaluate(() => localStorage.removeItem('cessio.draft.v1'));
  await page.reload();
  await page.waitForSelector('[data-testid=author-name]');
}
/** Contrat complet rapide : retourne quand l'étape 5 est affichée. */
async function quickContract(client, { fee = 1000 } = {}) {
  await newWizard();
  await fillParties(client);
  await page.click('[data-testid=next]');
  await page.fill('[data-testid=work-title-0]', `Logo ${client}`);
  await page.click('[data-testid=next]');
  await page.click('[data-testid=next]');
  await page.fill('[data-testid=creation-fee]', String(fee));
  await page.click('[data-testid=next]');
  await page.waitForSelector('[data-testid=doc-preview]');
}
const today = await page.evaluate(() => 0).then(() => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)).toISOString().slice(0, 10);
});

console.log(`\nTests E2E sur ${BASE}\n`);

await test('Accueil : promesse, 3 plans, FAQ', async () => {
  await page.goto(BASE + '/');
  has(await page.locator('h1').innerText(), 'Vos créations valent');
  eq(await page.locator('.plan-card').count(), 3, 'plans');
  assert((await page.locator('.faq details').count()) >= 5, 'FAQ');
});

await test('Calculateur public : calcul exact puis bascule vers l’assistant pré-rempli', async () => {
  await page.goto(`${BASE}/calculateur-prix-cession-droits-auteur`);
  await page.fill('[data-testid=calc-fee]', '2000');
  // web 15 % + réseaux 10 % + imprimés 15 % = 40 % de 2000 = 800
  eq(await page.locator('[data-testid=calc-total]').innerText(), '800 € HT', 'total France 5 ans exclusif');
  await page.locator('.segmented label', { hasText: 'Monde entier' }).click();
  eq(await page.locator('[data-testid=calc-total]').innerText(), '1 280 € HT', 'monde × 1,6');
  await page.click('[data-testid=calc-to-contract]');
  await page.waitForURL(/\/app#nouveau/);
  await page.waitForSelector('[data-testid=author-name]');
  eq(await page.locator('[data-testid=total]').innerText(), '1 280 € HT', 'total repris dans l’assistant');
});

await test('Assistant : les champs obligatoires bloquent l’étape suivante', async () => {
  await newWizard();
  await page.click('[data-testid=next]');
  await page.locator('.toast.err').first().waitFor();
  eq(await page.locator('[data-testid=author-name]').getAttribute('aria-invalid'), 'true', 'champ signalé');
  eq(await page.locator('.stepper .current .num').innerText(), '1', 'reste à l’étape 1');
});

let firstNumber;
await test('Assistant complet : droits, usages, prix calculé, aperçu et PDF conforme', async () => {
  await newWizard();
  await fillParties();
  await page.click('[data-testid=next]');
  await page.fill('[data-testid=work-title-0]', 'Logo Boulangerie Dupont');
  await page.click('[data-testid=next]');
  await page.check('[data-path="rights.trademark"]');
  await page.check('[data-testid=mode-print]');
  await page.check('[data-testid=mode-trademark]');
  await seg('Union européenne');
  await seg('3 ans');
  await page.click('[data-testid=next]');
  await page.fill('[data-testid=creation-fee]', '1500');
  // 1500 × UE 1,3 × 3 ans 0,85 : web 15 % → 249, réseaux 10 % → 166, imprimés 15 % → 249, marque 50 % → 829
  eq(await page.locator('[data-testid=total]').innerText(), '1 493 € HT', 'total calculé');
  await page.fill('[data-testid=amount-print]', '300');
  eq(await page.locator('[data-testid=total]').innerText(), '1 544 € HT', 'montant modifié');
  await page.click('[data-testid=next]');
  const preview = await page.locator('[data-testid=doc-preview]').innerText();
  has(preview, 'Article 2 – Droits cédés');
  has(preview, 'Droit de dépôt à titre de marque');
  const { bytes, name } = await download('[data-testid=export-pdf]');
  const pdf = await pdfText(bytes);
  firstNumber = name.match(/^(ces-\d{4}-\d{3})/)?.[1];
  assert(firstNumber, `numéro dans le nom de fichier : ${name}`);
  for (const needle of [
    'Contrat de cession de droits d’auteur',
    'Boulangerie Dupont',
    'l’ensemble des États membres de l’Union européenne',
    `pour une durée de 3 ans à compter du ${dateShort(today)}, soit jusqu’au ${dateShort(endDate(today, 3))} inclus`,
    'Imprimés de communication 300 € HT (forfait)',
    'Total forfaitaire 1 544 € HT',
    'il n’est pas cédé',
    'Généré avec Cessio',
  ]) has(pdf.text, needle, 'PDF');
  assert(pdf.pages >= 3, 'contrat de plusieurs pages');
});

await test('Récapitulatif client, clause devis copiée, Word réservé à Solo', async () => {
  const recap = await pdfText((await download('[data-testid=export-summary]')).bytes);
  has(recap.text, 'Ce qui n’est pas cédé');
  has(recap.text, 'Union européenne');
  await page.click('[data-testid=copy-quote]');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  has(clip, 'Sous réserve du complet paiement', 'clause');
  has(clip, 'art. L131-3', 'clause');
  await page.click('[data-testid=export-docx]');
  await expectPaywall('Solo');
});

await test('Registre : contrat présent, statut « Signé » conservé après rechargement', async () => {
  await page.click('[data-testid=tab-registre]');
  const row = page.locator('[data-testid=registry] .reg-row').first();
  has(await row.innerText(), 'Boulangerie Dupont');
  await row.locator('[data-testid=status]').selectOption('signe');
  await page.reload();
  eq(await page.locator('[data-testid=registry] .reg-row').first().locator('[data-testid=status]').inputValue(), 'signe', 'statut');
  has(await page.locator('[data-testid=tab-registre]').innerText(), '(1)', 'compteur');
});

await test('Renouvellement : démarre le lendemain de l’échéance ; limite de 3 contrats en Gratuit', async () => {
  await page.locator('.reg-row').first().getByRole('button', { name: 'Préparer le renouvellement' }).click();
  await page.waitForURL(/#contrat\//);
  await page.waitForSelector('[data-testid=doc-preview]');
  const next = endDate(today, 3);
  const d = new Date(`${next}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  has(await page.locator('[data-testid=doc-preview]').innerText(), `à compter du ${dateShort(d.toISOString().slice(0, 10))}`, 'nouvelle période');
  await quickContract('Client Trois');
  await page.click('[data-testid=save]');
  await page.locator('.toast.ok').last().waitFor();
  await quickContract('Client Quatre');
  await page.click('[data-testid=save]');
  await expectPaywall('Solo');
});

await test('Agenda (.ics) et CSV réservés aux plans payants', async () => {
  await page.goto(`${BASE}/app#registre`);
  await page.click('[data-testid=export-ics]');
  await expectPaywall('Solo');
  await page.click('[data-testid=export-csv]');
  await expectPaywall('Studio');
});

await test('Sauvegarde puis restauration du registre', async () => {
  const { bytes } = await download('[data-testid=backup]');
  const data = JSON.parse(bytes.toString('utf8'));
  eq(data.contracts.length, 3, 'contrats sauvegardés');
  const dir = mkdtempSync(join(tmpdir(), 'cessio-'));
  const file = join(dir, 'sauvegarde.json');
  writeFileSync(file, bytes);
  await page.evaluate(() => localStorage.removeItem('cessio.contracts.v1'));
  await page.reload();
  await page.locator('.empty').waitFor();
  await page.setInputFiles('.reg-actions input[type=file]', file);
  await page.locator('.toast.ok').last().waitFor();
  eq(await page.locator('[data-testid=registry] .reg-row').count(), 3, 'contrats restaurés');
  rmSync(dir, { recursive: true, force: true });
});

await test('Licence : clé inconnue refusée, Solo activé', async () => {
  await page.goto(`${BASE}/compte`);
  await page.fill('[data-testid=license-input]', 'NOPE-NOPE-NOPE');
  await page.click('[data-testid=license-activate]');
  await page.waitForFunction(() => document.querySelector('[data-testid=license-error]')?.textContent.includes('introuvable'));
  await activate('SOLO-TEST-0000-0001');
  eq(await badge(), 'Solo', 'badge');
});

await test('Solo : PDF sans mention, avec logo ; Word lisible par pandoc ; agenda .ics', async () => {
  await page.goto(`${BASE}/app#reglages`);
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 80;
      const x = c.getContext('2d');
      x.fillStyle = '#5b4bff';
      x.fillRect(0, 0, 80, 80);
      x.fillStyle = '#14131a';
      x.font = 'bold 40px sans-serif';
      x.fillText('Studio', 92, 54);
      return c.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  const dir = mkdtempSync(join(tmpdir(), 'cessio-'));
  writeFileSync(join(dir, 'logo.png'), png);
  await page.locator('button', { hasText: 'Ajouter mon logo' }).click();
  await page.setInputFiles('.settings-section input[type=file]', join(dir, 'logo.png'));
  await page.locator('.logo-preview').waitFor();
  await page.goto(`${BASE}/app#registre`);
  await page.locator('.reg-row', { hasText: 'Boulangerie Dupont' }).first().getByRole('button', { name: 'Ouvrir et modifier' }).click();
  await page.waitForSelector('[data-testid=doc-preview]');
  const pdf = await pdfText((await download('[data-testid=export-pdf]')).bytes);
  assert(!pdf.text.includes('Généré avec'), 'pas de mention en plan Solo');
  eq(pdf.images, 1, 'logo présent');
  const docx = await download('[data-testid=export-docx]');
  assert(docx.name.endsWith('.docx'), docx.name);
  const files = unzipSync(new Uint8Array(docx.bytes));
  has(new TextDecoder().decode(files['word/document.xml']), 'Boulangerie Dupont', 'document.xml');
  const path = join(dir, 'contrat.docx');
  writeFileSync(path, docx.bytes);
  try {
    has(execFileSync('pandoc', ['-f', 'docx', '-t', 'plain', path], { encoding: 'utf8' }), 'Droit de dépôt à titre de marque', 'pandoc');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  await page.goto(`${BASE}/app#registre`);
  const ics = await download('[data-testid=export-ics]');
  const icsText = ics.bytes.toString('utf8');
  has(icsText, 'BEGIN:VCALENDAR');
  has(icsText, `DTSTART;VALUE=DATE:${endDate(today, 3).replace(/-/g, '')}`, 'échéance dans l’agenda');
  rmSync(dir, { recursive: true, force: true });
});

await test('Solo : un 4e contrat est accepté ; les pourcentages modifiés ne changent pas les contrats existants', async () => {
  await page.goto(`${BASE}/app#reglages`);
  const web = page.locator('.pct-row', { hasText: 'Site internet' }).locator('input');
  await web.fill('30');
  await web.dispatchEvent('change');
  await page.goto(`${BASE}/app#registre`);
  await page.locator('.reg-row', { hasText: 'Client Trois' }).getByRole('button', { name: 'Ouvrir et modifier' }).click();
  await page.waitForSelector('[data-testid=doc-preview]');
  eq(await page.locator('[data-testid=total]').innerText(), '250 € HT', 'contrat existant inchangé (15 % + 10 %)');
  await quickContract('Client Quatre');
  eq(await page.locator('[data-testid=total]').innerText(), '400 € HT', 'nouveau contrat à 30 % + 10 %');
  await page.click('[data-testid=save]');
  await page.locator('.toast.ok').last().waitFor();
});

await test('Client particulier et vente de produits dérivés au pourcentage', async () => {
  await newWizard();
  await fillParties('Paul Martin');
  await page.locator('.segmented label', { hasText: 'Particulier' }).click();
  await page.fill('[data-testid=client-name]', 'Paul Martin');
  await page.fill('[data-testid=client-address]', '3 rue Haute, 69001 Lyon');
  await page.click('[data-testid=next]');
  await page.fill('[data-testid=work-title-0]', 'Illustration « Le Phare »');
  await page.click('[data-testid=next]');
  await page.check('[data-testid=mode-merch]');
  await page.click('[data-testid=next]');
  const merchType = page.locator('.price-row', { hasText: 'Produits dérivés' }).locator('select');
  await merchType.selectOption('proportionnel');
  await page.click('[data-testid=next]');
  const text = await page.locator('[data-testid=doc-preview]').innerText();
  has(text, '8 % des recettes HT');
  has(text, 'médiateur de la consommation');
  assert(!text.includes('40 €'), 'pas d’indemnité de recouvrement pour un particulier');
});

await test('Studio : CSV du registre et plusieurs profils d’auteur', async () => {
  await page.goto(`${BASE}/compte`);
  page.once('dialog', (d) => d.accept());
  await page.click('[data-testid=license-deactivate]');
  await page.locator('[data-testid=license-input]').waitFor();
  await activate('STUDIO-TEST-0000-0002');
  await page.goto(`${BASE}/app#registre`);
  const csv = (await download('[data-testid=export-csv]')).bytes.toString('utf8');
  assert(csv.startsWith('﻿Numéro;Statut;'), 'en-tête CSV');
  has(csv, 'Boulangerie Dupont');
  await page.goto(`${BASE}/app#reglages`);
  await page.click('[data-testid=add-profile]');
  eq(await page.locator('.card.profile').count(), 2, 'deux profils');
});

await test('Échéance proche : alerte dans le registre et pastille sur l’onglet', async () => {
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('cessio.contracts.v1'));
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    d.setUTCDate(d.getUTCDate() + 20);
    list[0] = { ...list[0], status: 'signe', duration: '1', startDate: d.toISOString().slice(0, 10) };
    localStorage.setItem('cessio.contracts.v1', JSON.stringify(list));
  });
  await page.goto(`${BASE}/app#registre`);
  await page.locator('[data-testid=expiry-alert]').waitFor();
  has(await page.locator('.badge.soon').first().innerText(), 'Expire dans');
  await page.locator('[data-testid=tab-registre] .dot').waitFor();
});

await test('Tarifs : liens de paiement mensuels/annuels et plan courant', async () => {
  await page.goto(`${BASE}/tarifs`);
  eq(await page.locator('.plan-card[data-plan=solo] [data-checkout]').getAttribute('href'), 'https://checkout.example/solo-monthly', 'mensuel');
  await page.click('.billing-toggle [data-period=yearly]');
  eq(await page.locator('.plan-card[data-plan=solo] [data-checkout]').getAttribute('href'), 'https://checkout.example/solo-yearly', 'annuel');
  eq(await page.locator('.plan-card[data-plan=studio] [data-checkout]').innerText(), 'Votre plan actuel', 'plan courant');
});

await test('Mobile : aucune page ni étape de l’assistant ne déborde', async () => {
  const m = await browser.newContext({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true });
  const p = await m.newPage();
  for (const path of ['/', '/tarifs', '/calculateur-prix-cession-droits-auteur', '/guide-cession-droits-auteur', '/compte', '/app#nouveau', '/app#registre', '/app#reglages']) {
    await p.goto(BASE + path);
    await p.waitForTimeout(150);
    eq(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, `débordement ${path}`);
  }
  await p.goto(`${BASE}/app#nouveau`);
  for (let s = 2; s <= 5; s++) {
    await p.locator('.stepper button').nth(s - 1).click();
    eq(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, `débordement étape ${s}`);
  }
  await m.close();
});

await test('Hors ligne : l’application se recharge et génère un contrat sans réseau', async () => {
  const off = await browser.newContext({ acceptDownloads: true });
  const p = await off.newPage();
  await p.goto(`${BASE}/app`);
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise((r) => (navigator.serviceWorker.controller ? r() : navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })));
    for (let i = 0; i < 100; i++) {
      const keys = await caches.keys();
      const c = keys.length && (await caches.open(keys[0]));
      if (c && (await c.match('/assets/vendor/pdf-lib/pdf-lib.esm.min.js')) && (await c.match('/assets/js/app/wizard.mjs'))) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('pré-cache incomplet');
  });
  await off.setOffline(true);
  await p.reload();
  await p.waitForSelector('[data-testid=author-name]');
  await p.fill('[data-testid=author-name]', 'Hors Ligne');
  await p.fill('[data-testid=author-address]', 'Nice');
  await p.fill('[data-testid=client-name]', 'Client Avion');
  await p.fill('[data-testid=client-address]', 'Paris');
  await p.click('[data-testid=next]');
  await p.fill('[data-testid=work-title-0]', 'Affiche');
  await p.locator('.stepper button').nth(4).click();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-testid=export-pdf]')]);
  has((await pdfText(readFileSync(await dl.path()))).text, 'Client Avion', 'PDF hors ligne');
  await off.close();
});

await test('Aucune erreur JavaScript ni violation CSP', async () => {
  eq(consoleErrors, [], 'erreurs console');
});

await browser.close();
server.kill();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} tests réussis`);
process.exit(failed ? 1 : 0);
