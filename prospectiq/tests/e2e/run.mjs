// Test de bout en bout : vrai navigateur, vrai serveur Next.js (build de production), vraie base PostgreSQL (PGlite),
// sources externes simulées par tests/e2e/mock-server.mjs (données fictives).
// Prérequis : npm run build.  Lancement : npm run test:e2e
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startMock } from './mock-server.mjs';

// Playwright : dépendance locale si installée (npm i -D playwright), sinon installation globale (NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright');

const PORT = 3100;
const MOCK = 4010;
const APP = `http://localhost:${PORT}`;
const OUT = new URL('../../test-results/', import.meta.url).pathname;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const mock = await startMock(MOCK);
const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: new URL('../..', import.meta.url).pathname,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PGLITE_DIR: ':memory:',
    DATABASE_URL: '',
    APP_URL: APP,
    ADMIN_EMAILS: 'admin@prospectiq.test',
    SIRENE_API_URL: `http://localhost:${MOCK}/sirene`,
    BODACC_API_URL: `http://localhost:${MOCK}/bodacc`,
    GEO_API_URL: `http://localhost:${MOCK}/geo`,
    WEB_FETCH_OVERRIDE: `http://localhost:${MOCK}/web`,
    STRIPE_SECRET_KEY: '',
    AI_API_KEY: '',
    SMTP_URL: '',
    HTTP_PROXY: '',
    HTTPS_PROXY: '',
    http_proxy: '',
    https_proxy: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true, // groupe de processus : npx + next sont arrêtés ensemble
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

try {
  await fetch(APP);
  console.error(`Le port ${PORT} est déjà utilisé : arrêtez le serveur existant.`);
  process.exit(1);
} catch {}

for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(APP)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const results = [];
let failed = false;
let page;

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`  ✓ ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    failed = true;
    results.push(`  ✗ ${name}\n      ${String(e.message || e).split('\n').slice(0, 6).join('\n      ')}`);
    if (page) await page.screenshot({ path: `${OUT}echec-${results.length}.png`, fullPage: true }).catch(() => {});
    throw e;
  }
}

const api = (p, path, opts = {}) =>
  p.evaluate(
    async ([path, opts]) => {
      const r = await fetch(path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: opts.body ? { 'Content-Type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
      return { status: r.status, body: await r.json().catch(() => null) };
    },
    [path, opts],
  );

async function register(ctx, { name, email, password = 'motdepasse2026' }) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/inscription`);
  await p.fill('#name', name);
  await p.fill('#email', email);
  await p.fill('#password', password);
  await p.check('input[name="terms"]');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app/parametres?bienvenue=1');
  return p;
}

try {
  const ctxA = await browser.newContext({ acceptDownloads: true });
  page = await ctxA.newPage();

  await step('Accueil : titre, sous-titre, CTA, aucune fausse statistique', async () => {
    await page.goto(APP);
    assert.match((await page.locator('h1').innerText()).replace(/\s+/g, ' '), /^Contactez les entreprises au moment où elles /);
    assert.equal(await page.locator('h1 .sr-only').innerText(), 'ouvrent, sont rachetées, changent de dirigeant ou déménagent.');
    await page.getByText('Identifiez les entreprises à fort potentiel commercial grâce à l’analyse intelligente de leurs activités et de leur présence digitale.').waitFor();
    await page.getByRole('button', { name: 'Trouver mes prospects' }).waitFor();
    await page.getByText('Exemple illustratif · entreprise fictive').waitFor();
    const body = await page.locator('body').innerText();
    assert.doesNotMatch(body, /\d[\d\s]* clients satisfaits|témoignage|\+\d+ ?%/i);
    await page.screenshot({ path: `${OUT}accueil.png`, fullPage: true });
  });

  await step('Accueil : recherche de démonstration sur les données (simulées)', async () => {
    await page.selectOption('[data-testid=demo-sector]', 'restauration');
    await page.fill('[data-testid=demo-postal]', '69002');
    await page.click('[data-testid=demo-run]');
    await page.locator('[data-testid=demo-results]').waitFor();
    const txt = await page.locator('[data-testid=demo-results]').innerText();
    assert.match(txt, /Le Comptoir Demo/);
    assert.doesNotMatch(txt, /Traiteur Opposant|TRAITEUR OPPOSANT/i, 'une entreprise en opposition ne doit jamais apparaître');
  });

  await step('Centre de confiance : sources vérifiées, sous-traitants réels, illustration signalée', async () => {
    await page.goto(APP);
    await page.getByText('Illustration · entreprise fictive').first().waitFor();
    await page.goto(`${APP}/confiance`);
    await page.locator('[data-testid=sources-status]').waitFor();
    const txt = await page.locator('main').innerText();
    assert.match(txt, /État des sources publiques/);
    // Stripe n'est pas configuré dans ce test : il doit apparaître « Non utilisé », jamais « Actif ».
    const stripe = await page.locator('li', { hasText: 'Paiement et facturation' }).innerText();
    assert.match(stripe, /Non utilisé/);
    const sec = await page.request.get(`${APP}/.well-known/security.txt`);
    assert.equal(sec.status(), 404, 'security.txt ne doit pas exister sans contact renseigné');
  });

  await step('Audit de site gratuit : robots.txt respecté, rapport sans coordonnées', async () => {
    const p = await browser.newPage();
    await p.goto(`${APP}/outils/audit-site`);
    await p.fill('[data-testid=audit-url]', 'www.robots-interdit.fr');
    await p.click('[data-testid=audit-run]');
    await p.getByText(/robots\.txt de www\.robots-interdit\.fr refuse/).waitFor({ timeout: 30000 });
    await p.fill('[data-testid=audit-url]', 'https://www.audit-demo.fr');
    await p.click('[data-testid=audit-run]');
    await p.waitForURL(/\/rapport\//, { timeout: 30000 });
    await p.locator('[data-testid=report]').waitFor();
    const txt = await p.locator('main').innerText();
    assert.match(txt, /www\.audit-demo\.fr/);
    assert.match(txt, /Adapter le site au mobile/);
    assert.match(txt, /Mettre le site à jour/);
    assert.doesNotMatch(txt, /04 00 00 00 99|contact@audit-demo\.fr/, 'aucune coordonnée dans un rapport public');
    // Même site dans la journée : le rapport existant est réutilisé (le site n'est pas sollicité à nouveau)
    const again = await api(p, '/api/public/audit', { body: { url: 'www.audit-demo.fr' } });
    assert.equal(again.body.cached, true);
    await p.screenshot({ path: `${OUT}rapport-audit.png`, fullPage: true });
    await p.close();
  });

  await step('Validation des formulaires : mot de passe trop faible refusé', async () => {
    const p = await ctxA.newPage();
    await p.goto(`${APP}/inscription`);
    await p.fill('#name', 'Test');
    await p.fill('#email', 'faible@prospectiq.test');
    await p.fill('#password', 'abcdefghijk');
    await p.check('input[name="terms"]');
    await p.click('button[type="submit"]');
    await p.getByText(/lettres et des chiffres/).first().waitFor();
    assert.match(p.url(), /inscription/);
    await p.close();
  });

  await step('Pages protégées : redirection vers la connexion', async () => {
    const p = await browser.newPage();
    await p.goto(`${APP}/app/crm`);
    await p.waitForURL('**/connexion**');
    const r = await p.request.get(`${APP}/api/prospects`);
    assert.equal(r.status(), 401);
    await p.close();
  });

  await step('Inscription (administrateur) et configuration de l’offre', async () => {
    page = await register(ctxA, { name: 'Alex Admin', email: 'admin@prospectiq.test' });
    await page.getByText('Bienvenue sur Pro Spectre').waitFor();
    await page.check('[data-testid=service-site_web]');
    await page.check('[data-testid=service-reseaux_sociaux]');
    await page.fill('#sender', 'Alex Admin');
    await page.click('[data-testid=save-offer]');
    await page.getByText('Modifications enregistrées.').waitFor();
    const s = await api(page, '/api/settings');
    assert.deepEqual(s.body.offer.services.sort(), ['reseaux_sociaux', 'site_web']);
  });

  await step('Recherche avancée : secteur + code postal, exclusion des oppositions', async () => {
    await page.goto(`${APP}/app/recherche`);
    await page.selectOption('[data-testid=sector]', 'restauration');
    await page.getByRole('button', { name: 'Ville', exact: true }).click();
    await page.fill('[data-testid=postal-code]', '69002');
    await page.click('[data-testid=run-search]');
    await page.locator('[data-testid=results]').waitFor();
    assert.match(await page.locator('[data-testid=result-total]').innerText(), /4 entreprises/);
    await page.locator('[data-testid=excluded-note]').waitFor();
    const names = await page.locator('[data-testid=result-name]').allInnerTexts();
    assert.equal(names.length, 3);
    assert.ok(!names.some((n) => /opposant/i.test(n)));
    await page.screenshot({ path: `${OUT}recherche.png`, fullPage: true });
  });

  await step('Analyse depuis les résultats : site vérifié par SIREN, signaux BODACC', async () => {
    const card = page.locator('li', { has: page.locator('[data-testid=result-name]', { hasText: 'Le Comptoir Demo' }) });
    await card.locator('[data-testid=analyze]').click();
    await card.getByRole('link', { name: 'Voir la fiche' }).waitFor({ timeout: 30000 });
    await card.getByRole('link', { name: 'Voir la fiche' }).click();
    await page.waitForURL('**/app/entreprise/100000001');
    await page.locator('[data-testid=summary]').waitFor();
    const body = await page.locator('main').innerText();
    assert.match(body, /SIREN trouvé dans les mentions légales/);
    assert.match(body, /contact@comptoirdemo\.fr/);
    assert.doesNotMatch(body, /gerant\.prive@/, 'adresse nominative non conservée');
    assert.match(body, /© 2019|2019/);
    assert.match(body, /BODACC/);
    assert.doesNotMatch(body, /1975/, 'jamais de date de naissance');
    assert.equal((body.match(/Création d’entreprise publiée au BODACC/g) || []).length >= 1, true);
    const signalsCard = await page.locator('text=Signaux détectés').locator('xpath=ancestor::div[contains(@class,"rounded-[22px]")][1]').innerText();
    assert.equal((signalsCard.match(/Création d’entreprise publiée au BODACC/g) || []).length, 1, 'signal BODACC en double');
    const strengths = await page.locator('text=Points forts').locator('xpath=..').innerText();
    assert.doesNotMatch(strengths, /Réservation/, 'une mention téléphonique n’est pas une réservation en ligne');
    const score = Number((await page.locator('[data-testid=score]').innerText()).match(/\d+/)[0]);
    assert.ok(score >= 0 && score <= 100);
    await page.screenshot({ path: `${OUT}fiche.png`, fullPage: true });
  });

  await step('Fiche : CRM, favori, statut, note, contact, historique', async () => {
    await page.click('[data-testid=add-crm]');
    await page.getByText('Ajouté au CRM.').waitFor();
    await page.click('[data-testid=favorite]');
    await page.getByText('Ajouté aux favoris.').waitFor();
    await page.selectOption('[data-testid=status]', 'a_contacter');
    await page.getByText('Statut mis à jour.').waitFor();
    await page.fill('[data-testid=note-input]', 'Appel prévu jeudi avec le gérant.');
    await page.click('[data-testid=add-note]');
    await page.getByText('Note ajoutée.').waitFor();
    await page.click('[data-testid=mark-contacted]');
    await page.getByText('Marqué comme contacté.').waitFor();
    const hist = await page.locator('[data-testid=history]').innerText();
    assert.match(hist, /Appel prévu jeudi/);
    assert.equal(await page.locator('[data-testid=status]').inputValue(), 'contacte');
  });

  await step('Fiche d’une entreprise sans site trouvé : « Non trouvé », jamais affirmé absent', async () => {
    await page.goto(`${APP}/app/entreprise/100000002`);
    await page.click('[data-testid=run-analysis]');
    await page.locator('[data-testid=summary]').waitFor({ timeout: 30000 });
    const body = await page.locator('main').innerText();
    assert.match(body, /ne prouve pas l’absence|à confirmer/);
  });

  await step('Procédure collective : score plafonné et risque affiché', async () => {
    const r = await api(page, '/api/companies/100000004/analyze', { body: {} });
    assert.equal(r.status, 200);
    assert.ok(r.body.analysis.score.total <= 25);
  });

  await step('Générateur de messages : 3 variantes, limite, aucune relation inventée', async () => {
    await page.goto(`${APP}/app/messages?siren=100000001`);
    await page.locator('[data-testid=prospect]').waitFor();
    await page.click('[data-testid=generate]');
    await page.locator('[data-testid=variant]').first().waitFor();
    assert.equal(await page.locator('[data-testid=variant]').count(), 3);
    const texts = await page.locator('[data-testid=variant] textarea').evaluateAll((els) => els.map((e) => e.value));
    for (const t of texts) {
      assert.doesNotMatch(t, /suite à notre|comme convenu|nous nous sommes/i);
      assert.ok(t.length <= 1400);
    }
    assert.ok(texts.some((t) => /Comptoir Demo/.test(t)));
    for (const t of texts) assert.doesNotMatch(t, /\b(à|de) Le Comptoir/, 'contraction française');
    await page.getByRole('button', { name: 'LinkedIn' }).click();
    await page.click('[data-testid=generate]');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid=variant] textarea')].every((e) => e.value.length <= 300 && !e.value.startsWith('Objet')));
    await page.screenshot({ path: `${OUT}messages.png`, fullPage: true });
  });

  await step('CRM : tableau, recherche, fonctionnalités Pro verrouillées en Découverte', async () => {
    await page.goto(`${APP}/app/crm`);
    await page.locator('[data-testid=crm-table]').waitFor();
    assert.match(await page.locator('[data-testid=crm-table]').innerText(), /Le Comptoir Demo/);
    await page.click('[data-testid=kanban-toggle]');
    await page.getByText('La vue Kanban est incluse à partir de l’offre Pro.').waitFor();
    const exp = await page.request.get(`${APP}/api/prospects/export`);
    assert.equal(exp.status(), 402);
  });

  await step('Radar : alerte de zone (opposition et hors zone exclues), signal du portefeuille, badge', async () => {
    await page.goto(`${APP}/app/recherche`);
    await page.selectOption('[data-testid=sector]', 'restauration');
    await page.getByRole('button', { name: 'Ville', exact: true }).click();
    await page.fill('[data-testid=postal-code]', '69002');
    await page.click('[data-testid=run-search]');
    await page.locator('[data-testid=results]').waitFor();
    await page.click('[data-testid=create-alert]');
    await page.getByText(/Alerte Radar créée : 2 entreprises détectées/).waitFor({ timeout: 30000 });
    // Limite de l'offre Découverte : une seule alerte
    const other = await api(page, '/api/search', { body: { sector: 'restauration', department: '69' } });
    const second = await api(page, '/api/radar/alerts', { body: { searchId: other.body.searchId } });
    assert.equal(second.status, 402, JSON.stringify(second.body));
    // Portefeuille : la Brasserie Exemple entre au CRM ; une annonce de changement de dirigeant vient d'être publiée
    const add = await api(page, '/api/prospects', { body: { siren: '100000002' } });
    assert.equal(add.status, 200, JSON.stringify(add.body));
    await page.goto(`${APP}/app/radar`);
    await page.click('[data-testid=radar-run]');
    await page.getByText(/1 nouveauté détectée/).waitFor({ timeout: 30000 });
    // La liste se recharge après le message : attendre la nouvelle annonce avant de lire le fil.
    await page.locator('[data-testid=radar-feed]').getByText(/Signal : Brasserie Exemple/).waitFor({ timeout: 15000 });
    const feed = await page.locator('[data-testid=radar-feed]').innerText();
    assert.match(feed, /Nouvelle entreprise : Brasserie Exemple/);
    assert.match(feed, /Cession de fonds de commerce : Societe Quota 77/i);
    assert.match(feed, /Signal : Brasserie Exemple/);
    assert.match(feed, /Changement de dirigeant/);
    assert.doesNotMatch(feed, /Opposant/i, 'une entreprise en opposition au démarchage n’est jamais signalée');
    assert.doesNotMatch(feed, /Quota 78/i, 'annonce hors du code postal surveillé');
    assert.equal(await page.locator('[data-testid=radar-alert]').count(), 1);
    await page.screenshot({ path: `${OUT}radar.png`, fullPage: true });
    await page.goto(`${APP}/app`);
    await page.locator('[data-testid=radar-badge]').waitFor();
    await page.locator('[data-testid=radar-banner]').waitFor();
    // Les 5 étapes de démarrage sont faites (offre, recherche, 3 analyses, alerte, message) : la liste disparaît.
    const o = (await api(page, '/api/dashboard')).body.onboarding;
    assert.ok(o.offer && o.searches > 0 && o.analyses >= 3 && o.alerts === 1 && o.messages > 0, JSON.stringify(o));
    assert.equal(await page.locator('[data-testid=onboarding]').count(), 0);
  });

  await step('Fiche : rapport d’audit partageable, sans coordonnées', async () => {
    await page.goto(`${APP}/app/entreprise/100000001`);
    await page.click('[data-testid=share-audit]');
    await page.getByText('Lien du rapport copié').waitFor();
    const link = await page.getByRole('link', { name: 'Ouvrir le rapport' }).getAttribute('href');
    assert.match(link, /^\/rapport\/[A-Za-z0-9_-]+$/);
    const p2 = await browser.newPage();
    await p2.goto(`${APP}${link}`);
    const txt = await p2.locator('main').innerText();
    assert.match(txt, /www\.comptoirdemo\.fr/);
    assert.match(txt, /Recommandations/);
    assert.doesNotMatch(txt, /contact@comptoirdemo\.fr|04 00 00 00 01/, 'aucune coordonnée dans un rapport public');
    assert.equal(await p2.locator('meta[name=robots]').getAttribute('content'), 'noindex, nofollow');
    await p2.close();
  });

  await step('Tableau de bord : compteurs réels', async () => {
    await page.goto(`${APP}/app`);
    await page.getByText('Tableau de bord').first().waitFor();
    const r = await api(page, '/api/dashboard');
    assert.equal(r.status, 200);
    await page.screenshot({ path: `${OUT}dashboard.png`, fullPage: true });
  });

  await step('Abonnement : état honnête quand Stripe n’est pas configuré', async () => {
    await page.goto(`${APP}/app/abonnement`);
    await page.locator('[data-testid=billing-disabled]').waitFor();
    assert.equal(await page.locator('[data-testid=subscribe-pro]').isDisabled(), true);
    const r = await api(page, '/api/billing/checkout', { body: { plan: 'pro' } });
    assert.equal(r.status, 503);
  });

  await step('Quotas serveur : 20 prospects par mois en Découverte, puis refus 402', async () => {
    const used = (await api(page, '/api/me')).body.usage.prospects;
    assert.equal(used, 3);
    for (let i = 0; i < 17; i++) {
      const r = await api(page, `/api/companies/2000000${String(i).padStart(2, '0')}/analyze`, { body: {} });
      assert.equal(r.status, 200, `analyse ${i}: ${JSON.stringify(r.body)}`);
    }
    const over = await api(page, '/api/companies/200000099/analyze', { body: {} });
    assert.equal(over.status, 402);
    assert.equal(over.body.code, 'quota_prospects');
    const again = await api(page, '/api/companies/100000001/analyze', { body: { force: true } });
    assert.equal(again.status, 200, 'ré-analyser une entreprise déjà décomptée reste possible');
  });

  let prospectIdA;
  await step('Isolation : un autre compte ne voit ni ne modifie les prospects', async () => {
    prospectIdA = (await api(page, '/api/prospects')).body.prospects[0].id;
    const ctxB = await browser.newContext();
    const pB = await register(ctxB, { name: 'Bea Membre', email: 'bea@prospectiq.test' });
    assert.equal((await api(pB, '/api/prospects')).body.prospects.length, 0);
    // Nouveau compte : le démarrage guidé s'affiche, avec 0 étape faite
    await pB.goto(`${APP}/app`);
    await pB.locator('[data-testid=onboarding]').getByText(/0 étape sur 5/).waitFor();
    const patch = await api(pB, `/api/prospects/${prospectIdA}`, { method: 'PATCH', body: { status: 'client' } });
    assert.equal(patch.status, 404);
    const admin = await api(pB, '/api/admin/overview');
    assert.equal(admin.status, 403);
    await pB.goto(`${APP}/admin`);
    await pB.waitForURL(`${APP}/app`);
    // Suppression de compte (RGPD)
    await pB.goto(`${APP}/app/parametres`);
    await pB.getByRole('button', { name: 'Supprimer mon compte' }).click();
    await pB.fill('#delpw', 'motdepasse2026');
    await pB.getByRole('button', { name: 'Supprimer définitivement' }).click();
    await pB.waitForURL(`${APP}/`);
    const login = await pB.request.post(`${APP}/api/auth/login`, { data: { email: 'bea@prospectiq.test', password: 'motdepasse2026' }, headers: { Origin: APP } });
    assert.equal(login.status(), 401);
    await ctxB.close();
  });

  await step('CSRF : requête d’une autre origine refusée', async () => {
    const r = await page.request.post(`${APP}/api/prospects`, { data: { siren: '100000002' }, headers: { Origin: 'https://site-malveillant.example' } });
    assert.equal(r.status(), 403);
  });

  await step('Administration : vue d’ensemble, changement d’offre, déblocage Pro', async () => {
    await page.goto(`${APP}/admin`);
    await page.locator('[data-testid=admin-overview]').waitFor();
    await page.getByRole('tab', { name: /Utilisateurs/ }).click();
    const row = page.locator('[data-testid=admin-users] tr', { hasText: 'admin@prospectiq.test' });
    await row.getByLabel('Offre').selectOption('pro');
    await page.getByText('Offre modifiée.').waitFor();
    await page.getByRole('tab', { name: /Erreurs API/ }).click();
    await page.screenshot({ path: `${OUT}admin.png`, fullPage: true });
    await page.goto(`${APP}/app/crm`);
    await page.click('[data-testid=kanban-toggle]');
    await page.locator('[data-testid=kanban]').waitFor();
    const exp = await page.request.get(`${APP}/api/prospects/export`);
    assert.equal(exp.status(), 200);
    const csv = await exp.text();
    assert.match(csv, /Comptoir Demo/i);
  });

  await step('Recherches : sauvegarde, relance avec comparaison, listes (Pro)', async () => {
    const searches = (await api(page, '/api/searches')).body.searches;
    assert.ok(searches.length >= 1);
    const save = await api(page, `/api/searches/${searches[0].id}`, { method: 'PATCH', body: { saved: true, name: 'Restaurants Lyon 2e' } });
    assert.equal(save.status, 200);
    await page.goto(`${APP}/app/recherches`);
    await page.getByText('Restaurants Lyon 2e').waitFor();
    await page.locator('[data-testid=rerun]').first().click();
    await page.locator('[data-testid=diff]').waitFor();
    await page.keyboard.press('Escape');
    await page.goto(`${APP}/app/listes`);
    await page.fill('[data-testid=list-name]', 'Campagne printemps');
    await page.click('[data-testid=list-create]');
    await page.getByText('Liste créée.').waitFor();
  });

  await step('Opposition publique → traitement admin → exclusion des résultats', async () => {
    const p = await browser.newPage();
    await p.goto(`${APP}/opposition`);
    await p.fill('[data-testid=opp-siren]', '100000002');
    await p.fill('[data-testid=opp-message]', 'Je suis le gérant et je m’oppose au référencement de ma société.');
    await p.click('[data-testid=opp-submit]');
    await p.locator('[data-testid=opposition-sent]').waitFor();
    await p.close();
    await page.goto(`${APP}/admin`);
    await page.getByRole('tab', { name: /Signalements/ }).click();
    await page.getByRole('button', { name: /Appliquer l’opposition/ }).click();
    await page.getByText(/Opposition appliquée/).waitFor();
    const s = await api(page, '/api/search', { body: { sector: 'restauration', postalCode: '69002' } });
    assert.equal(s.status, 200, JSON.stringify(s.body));
    assert.ok(!s.body.rows.some((r) => r.company.siren === '100000002'));
    const sheet = await api(page, '/api/companies/100000002/analyze', { body: {} });
    assert.equal(sheet.status, 403);
  });

  await step('Export RGPD des données du compte', async () => {
    const r = await page.request.get(`${APP}/api/me/export`);
    assert.equal(r.status(), 200);
    const data = await r.json();
    assert.ok(data.user || data.account || data.profile);
  });

  await step('Mobile : pas de défilement horizontal (accueil, recherche, fiche)', async () => {
    const m = await browser.newContext({ viewport: { width: 375, height: 800 }, storageState: await ctxA.storageState() });
    const mp = await m.newPage();
    for (const path of ['/', '/app/recherche', '/app/entreprise/100000001', '/app/crm']) {
      await mp.goto(`${APP}${path}`);
      await mp.waitForLoadState('networkidle');
      const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${path} déborde de ${overflow}px`);
    }
    await mp.goto(`${APP}/`);
    await mp.screenshot({ path: `${OUT}mobile-accueil.png`, fullPage: false });
    await m.close();
  });

  await step('Déconnexion', async () => {
    await page.goto(`${APP}/app`);
    await page.click('[data-testid=logout]');
    await page.waitForURL('**/connexion');
    await page.goto(`${APP}/app`);
    await page.waitForURL('**/connexion**');
  });
} catch {
  // détail dans le rapport ci-dessous
} finally {
  console.log(results.join('\n'));
  if (failed) console.log('\n--- journal serveur (fin) ---\n' + serverLog.slice(-3000));
  await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {}
  mock.close();
  console.log(failed ? '\nÉCHEC' : `\n${results.length} étapes réussies`);
  process.exit(failed ? 1 : 0);
}
