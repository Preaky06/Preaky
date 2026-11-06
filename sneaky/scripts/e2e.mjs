// Parcours complet sur 4 « téléphones » simulés + captures d'écran.
// Usage : node scripts/e2e.mjs [url] [dossierCaptures]
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const URL = process.argv[2] ?? 'http://localhost:3100';
const OUT = process.argv[3] ?? '/tmp/shots';
const names = ['Léa', 'Tom', 'Inès', 'Hugo'];
const errors = [];
const browser = await chromium.launch();
const phone = { ...devices['iPhone 13'] };
delete phone.defaultBrowserType;

const pages = [];
for (let i = 0; i < names.length; i++) {
  const ctx = await browser.newContext({ ...phone, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors.push(`[${names[i]}] ${e.message}`); console.log('PAGEERROR', names[i], e.message); });
  page.on('framenavigated', (f) => f === page.mainFrame() && console.log('NAV', names[i], f.url()));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${names[i]}] console: ${m.text()}`));
  pages.push(page);
}
const [host, ...guests] = pages;
const shot = async (p, name) => {
  await p.waitForTimeout(450);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log('📸', name);
};

await host.goto(URL);
await host.fill('#codename', names[0]);
await shot(host, '01-accueil');
await host.click('text=Créer une opération');
await host.waitForSelector('.code-letters');
const code = (await host.locator('.code-letters').innerText()).replace(/\s/g, '');
console.log('Code :', code);

for (let i = 0; i < guests.length; i++) {
  const g = guests[i];
  await g.goto(`${URL}/?code=${code}`);
  await g.fill('#codename', names[i + 1]);
  await g.click('text=Infiltrer le salon');
  await g.waitForSelector('.code-letters');
}
// Réglages : 2 séries de 3 questions, tour de parole activé
for (let k = 0; k < 2; k++) await host.click('[aria-label="Moins Séries"]');
for (let k = 0; k < 2; k++) await host.click('[aria-label="Moins Questions par série"]');
await host.waitForTimeout(300);
await shot(host, '02-salon-hote');
await host.evaluate(() => window.scrollTo(0, 99999));
await shot(host, '03-salon-hote-reglages');
await shot(guests[0], '04-salon-invite');

const tv = await browser.newPage({ viewport: { width: 1280, height: 800 } });
tv.on('pageerror', (e) => errors.push(`[TV] ${e.message}`));
await tv.goto(`${URL}/?board=${code}`);
await tv.waitForSelector('.code-letters');
await shot(tv, '25-plateau-tv-salon');

await host.click('text=Lancer l’opération');
await host.waitForSelector('.scanner');
await shot(host, '05-role-cache');

let moleIndex = -1;
let owlIndex = -1;
for (let i = 0; i < pages.length; i++) {
  const p = pages[i];
  await p.locator('.scanner').scrollIntoViewIfNeeded();
  const box = await p.locator('.scanner').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(1100);
  const isMole = (await p.locator('.role-mole').count()) > 0;
  const isOwl = (await p.locator('.role-owl').count()) > 0;
  if (isMole) moleIndex = i;
  if (isOwl) owlIndex = i;
  await shot(p, `06-role-${isMole ? 'taupe' : isOwl ? 'chouette' : 'agent'}-${names[i]}`);
  await p.mouse.up();
}
console.log('Taupe :', names[moleIndex], '· Chouette :', names[owlIndex]);
if (owlIndex < 0 || owlIndex === moleIndex) throw new Error('Pas de Chouette distincte à 4 joueurs');
for (const p of pages) {
  const txt = await p.locator('.bottom-bar .btn-xl').first().innerText().catch(() => '(aucun bouton)');
  if (!txt.includes('compris')) console.log('⚠️ bouton inattendu :', txt, await p.locator('.topbar-phase').innerText().catch(() => '?'));
  await p.click('text=J’ai compris');
}

async function playRound(round) {
  for (let q = 0; q < 3; q++) {
    for (const p of pages) await p.waitForSelector('.screen.question', { timeout: 20000 });
    if (round === 1 && q === 0) {
      await shot(host, '07-question');
      // Un joueur recharge sa page en pleine question : il doit retrouver la partie.
      await guests[1].reload();
      await guests[1].waitForSelector('.screen.question', { timeout: 10000 });
      console.log('🔁 Rechargement en pleine partie : OK');
      const mole = pages[moleIndex];
      // La taupe voit la bonne réponse directement à l'écran ; les agents voient « ? ».
      const shown = (await mole.locator('.secret-letter').innerText()).trim();
      for (let i = 0; i < pages.length; i++) {
        if (i === moleIndex) continue;
        const t = (await pages[i].locator('.secret-letter').innerText()).trim();
        if (t !== '?') throw new Error(`Un agent voit une réponse : ${t}`);
      }
      const greenIdx = await mole.locator('.option').evaluateAll((els) => els.findIndex((e) => e.classList.contains('option-secret')));
      if ('ABCD'[greenIdx] !== shown) throw new Error(`Réponse verte ${greenIdx} ≠ ${shown}`);
      for (let i = 0; i < pages.length; i++) {
        if (i !== moleIndex && (await pages[i].locator('.option-secret').count()) > 0) throw new Error('Un agent voit une réponse en vert');
      }
      await shot(mole, '07b-question-taupe');
      await mole.click('.dossier-fab');
      const inDossier = (await mole.locator('.intel-answer-letter').innerText()).trim();
      if (!/^[ABCD]$/.test(shown) || shown !== inDossier) throw new Error(`Réponse affichée ${shown} ≠ dossier ${inDossier}`);
      console.log(`🎯 La taupe voit la réponse ${shown} à l'écran, les agents voient « ? »`);
      await shot(mole, '08-dossier-taupe');
      if (round === 1) {
        await mole.click('.gadget >> nth=0');
        await mole.waitForTimeout(300);
        const enabled = await mole.locator('button.gadget:not([disabled])').count();
        if (enabled !== 0) throw new Error(`Encore ${enabled} gadget(s) utilisable(s) après le premier`);
        console.log('🕶️ Un seul gadget par série : OK');
        await shot(mole, '08b-dossier-gadget-utilise');
      }
      await mole.keyboard.press('Escape');
      const agent = pages[(moleIndex + 1) % pages.length];
      await agent.click('.dossier-fab');
      await shot(agent, '09-dossier-agent');
      await agent.keyboard.press('Escape');
    }
    let good = -1;
    if (round === 2) {
      const mole = pages[moleIndex];
      await mole.click('.dossier-fab');
      good = 'ABCD'.indexOf((await mole.locator('.intel-answer-letter').innerText()).trim());
      if (q === 0) {
        await mole.locator('.gadget').nth(2).click();
        await mole.waitForTimeout(300);
      }
      await mole.keyboard.press('Escape');
      if (q === 0) await shot(tv, '26-plateau-tv-question');
    }
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const pickIdx = good >= 0 ? (i === moleIndex ? (good + 1) % 4 : good) : (i + q) % 2;
      await p.locator('.option').nth(pickIdx).click();
      if (round === 1 && q === 0 && i === 0) await shot(p, '10-question-choisie');
      await p.locator('.bottom-bar .btn-xl').click();
    }
    await host.waitForSelector('.result-stamp', { timeout: 20000 });
    if (round === 2 && q === 0) await shot(tv, '29-plateau-tv-resultat');
    if (round === 1 && q < 2) await shot(host, `11-resultat-q${q + 1}`);
    if (round === 1 && q === 0) {
      const owl = pages[owlIndex];
      await owl.click('.dossier-fab');
      await owl.locator('.owl-target', { hasText: names[moleIndex] }).click();
      await owl.waitForSelector('.owl-result');
      const seen = await owl.locator('.owl-result').innerText();
      if (!/EST la taupe/.test(seen)) throw new Error(`Œil de nuit incorrect : ${seen}`);
      console.log('🦉 La Chouette a observé la taupe :', seen.split('\n')[0]);
      await shot(owl, '11b-chouette-oeil-de-nuit');
      await owl.keyboard.press('Escape');
    }
    if (round === 1 && q === 1) await shot(pages[moleIndex], '12-jam-attendu');
    if (round === 1 && q === 0) {
      // Réunion d'urgence par un agent
      const agent = pages[(moleIndex + 1) % pages.length];
      await agent.click('.btn-emergency');
      await agent.click('.btn-emergency');
      await host.waitForSelector('.meeting', { timeout: 10000 });
      await shot(host, '13-reunion-urgence');
      await host.click('.tabs button >> nth=1');
      await shot(host, '14-reunion-suspects');
      await host.locator('.suspect >> nth=1').click();
      await shot(host, '15-fiche-suspect');
      await host.locator('.sheet .btn-danger').click();
      await host.keyboard.press('Escape');
      await guests[1].locator('.reaction-bar button >> nth=1').click();
      await host.click('.tabs button >> nth=2');
      await shot(host, '16-reunion-journal');
      for (const p of pages) await p.click('text=Passer au vote');
      await host.waitForSelector('.vote-grid', { timeout: 10000 });
      await shot(host, '17-vote');
      for (const p of pages) await p.click('text=Je passe');
      await host.waitForSelector('.tally', { timeout: 10000 });
      await host.waitForTimeout(4300);
      await shot(host, '18-verdict');
    }
  }
  await host.waitForSelector('.meeting', { timeout: 30000 });
  if (round === 1) await shot(host, '19-briefing');
  if (round === 2) {
    await host.click('.tabs button >> nth=0');
    await shot(host, '19b-briefing-indices');
    await host.evaluate(() => window.scrollTo(0, 400));
    await shot(host, '19c-briefing-indices-bas');
    await shot(tv, '27-plateau-tv-briefing');
  }
  for (const p of pages) await p.click('text=Passer au vote');
  await host.waitForSelector('.vote-grid', { timeout: 10000 });
  // Tout le monde vote contre la taupe (la taupe vote contre le joueur suivant)
  for (let i = 0; i < pages.length; i++) {
    const target = i === moleIndex ? names[(i + 1) % pages.length] : names[moleIndex];
    await pages[i].locator('.vote-card', { hasText: target }).click();
  }
  await host.waitForSelector('.tally', { timeout: 10000 });
  await host.waitForTimeout(4500);
  if (round === 1) await shot(host, '20-verdict-taupe');
  if (round === 2) await shot(tv, '28-plateau-tv-verdict');
  // Taupe démasquée + Chouette en jeu → contre-attaque.
  const mole = pages[moleIndex];
  await mole.waitForSelector('.hunt', { timeout: 20000 });
  await shot(mole, `30-contre-attaque-taupe-s${round}`);
  await shot(pages[owlIndex], `31-contre-attaque-autres-s${round}`);
  const target = round === 1 ? names[owlIndex] : names[[0, 1, 2, 3].find((i) => i !== moleIndex && i !== owlIndex)];
  await mole.locator('.hunt-card', { hasText: target }).click();
  await mole.locator('.btn-hunt').click();
  await host.waitForSelector('.hunt-verdict', { timeout: 10000 });
  const verdict = await host.locator('.hunt-verdict').innerText();
  const captured = /capturée/i.test(verdict);
  if (captured !== (round === 1)) throw new Error(`Contre-attaque inattendue : ${verdict}`);
  console.log(`🦉 Contre-attaque série ${round} : ${captured ? 'Chouette capturée' : 'ratée'}`);
  await shot(host, `32-contre-attaque-verdict-s${round}`);
  await host.waitForSelector('.mole-reveal', { timeout: 20000 });
  if (round === 1) {
    await shot(host, '21-fin-serie');
    await host.evaluate(() => window.scrollTo(0, 99999));
    await shot(host, '22-fin-serie-bas');
  }
  for (const p of pages) await p.locator('.bottom-bar .btn-primary').click();
}

await playRound(1);
await host.waitForSelector('.scanner', { timeout: 20000 });
moleIndex = -1;
owlIndex = -1;
for (let i = 0; i < pages.length; i++) {
  const p = pages[i];
  await p.locator('.scanner').scrollIntoViewIfNeeded();
  const box = await p.locator('.scanner').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(1000);
  if ((await p.locator('.role-mole').count()) > 0) moleIndex = i;
  if ((await p.locator('.role-owl').count()) > 0) owlIndex = i;
  await p.mouse.up();
  await p.click('text=J’ai compris');
}
await playRound(2);
await host.waitForSelector('.podium', { timeout: 20000 });
await shot(host, '23-fin-partie');
await host.evaluate(() => window.scrollTo(0, 99999));
await shot(host, '24-fin-partie-bas');

// Plateau TV
await host.click('text=Nouvelle opération');
await tv.waitForSelector('.code-letters');

console.log(errors.length ? `\n❌ Erreurs :\n${errors.join('\n')}` : '\n✅ Aucune erreur JavaScript');
await browser.close();
process.exit(errors.length ? 1 : 0);
