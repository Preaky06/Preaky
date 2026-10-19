// Captures haute définition de l'interface réelle (site hors ligne, catalogue fictif) pour le
// motion design : écrans du téléphone, tickets du questionnaire, cartes de résultats, accueil.
//   SITE_DIR=… IMG_DIR=… node explainer/capture.mjs <dossier de sortie>
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { newPhone, HOST, gate } from '../ugc/site.mjs';

const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const info = {};
const file = (n) => path.join(OUT, n + '.png');

/* « mêlé à la aventure » : faute du gabarit « Pourquoi lui » du site, corrigée à l'image */
const FIX = (page) => page.evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) if (n.nodeValue.includes('mêlé à la aventure')) n.nodeValue = n.nodeValue.replace(/mêlé à la aventure/g, 'mêlée d’aventure');
});
const toTop = (page) => page.evaluate(() => {
  for (const d of document.querySelectorAll('div')) { const s = getComputedStyle(d); if (s.position === 'fixed' && /(auto|scroll)/.test(s.overflowY)) d.scrollTop = 0; }
  window.scrollTo(0, 0);
});
const opt = (page, label) => page.locator('.cm-opt', { hasText: label }).last();
async function question(page, name, hover) {
  await toTop(page);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(900);
  await page.screenshot({ path: file(name) });
  if (hover) {
    const o = opt(page, hover);
    await o.scrollIntoViewIfNeeded();
    await o.hover();
    await page.waitForTimeout(800);
    await o.screenshot({ path: file(name + '_opt') });
    await toTop(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: file(name + '_hover') });
    info[name + '_opt'] = await o.boundingBox();
  }
}
async function pick(page, label) {
  const o = opt(page, label);
  await o.scrollIntoViewIfNeeded();
  await o.click();
  await page.waitForTimeout(700);
}
const PATH = [['m_q1', 'Rêveur', 'Rêveur'], ['m_q2', 'Dans l’espace', 'Dans l’espace'], ['m_q3', 'L’espace', null], ['m_q4', 'Un peu', null],
  ['m_q5', 'À deux', 'À deux'], ['m_q6', '1h45 – 2h10', '1h45 – 2h10'], ['m_q7', 'Peu importe', null], ['m_q8', 'Peu importe', null]];

async function run(o, prefix) {
  const { page } = await newPhone(browser, o.h, o);
  await page.goto(HOST);
  await page.waitForTimeout(4000);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: file(prefix + 'home') });
  info[prefix + 'h1'] = await page.locator('h1').first().boundingBox();
  info[prefix + 'neon'] = await page.locator('.cm-neon').first().boundingBox().catch(() => null);
  info[prefix + 'start'] = await page.getByText('Commencer', { exact: true }).first().boundingBox();
  if (!o.desktop) {
    await page.getByText('Commencer', { exact: true }).first().screenshot({ path: file('btn_start') });
    await page.getByText('Mode Duo', { exact: true }).first().locator('xpath=ancestor-or-self::*[self::button or self::a][1]').screenshot({ path: file('btn_duo') }).catch(() => {});
  }
  await page.getByText('Commencer', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  if (!o.desktop) {
    const tickets = page.locator('.cm-opt');
    const n = await tickets.count();
    info.ticketRadius = await tickets.first().evaluate((e) => getComputedStyle(e).borderRadius);
    for (let i = 0; i < n; i++) await tickets.nth(i).screenshot({ path: file(`ticket_${i + 1}`) });
    await page.mouse.move(2, 2);
  }
  for (let i = 0; i < PATH.length; i++) {
    const [name, label, hover] = PATH[i];
    if (!o.desktop) await question(page, name, hover);
    if (i === PATH.length - 1) gate.closed = true;
    await pick(page, label);
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: file(prefix + 'loading') });
  gate.open();
  await page.getByText('Pourquoi lui', { exact: true }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await FIX(page);
  await toTop(page);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: file(prefix + 'results') });
  await page.screenshot({ path: file(prefix + 'results_full'), fullPage: true });
  const cards = page.locator('.cm-best').locator('xpath=..');
  const nc = await cards.count();
  info[prefix + 'cards'] = nc;
  for (let i = 0; i < nc; i++) await cards.nth(i).screenshot({ path: file(`${prefix}card_${i + 1}`) });
  info[prefix + 'card1'] = await cards.first().boundingBox();
  info[prefix + 'why'] = await page.getByText('Pourquoi lui', { exact: true }).first().locator('xpath=..').boundingBox();
  info[prefix + 'pageH'] = await page.evaluate(() => document.documentElement.scrollHeight);
  if (!o.desktop) {
    await page.getByText('Pourquoi lui', { exact: true }).first().locator('xpath=..').screenshot({ path: file('why_1') });
    await page.getByText('Aucun ne me tente', { exact: true }).first().screenshot({ path: file('btn_none') }).catch(() => {});
  }
  {
    // la carte n°1 au montage : jauges à zéro
    await cards.first().evaluate((c) => {
      for (const b of c.querySelectorAll('div')) if (/width/.test(b.style.transition || '') && /%$/.test(b.style.width)) { b.dataset.w = b.style.width; b.style.transition = 'none'; b.style.width = '0%'; }
    });
    await page.waitForTimeout(200);
    await cards.first().screenshot({ path: file(prefix + 'card_1_bars0') });
    info[prefix + 'cardBox'] = await cards.first().evaluate((c) => {
      const r = c.getBoundingClientRect();
      const bars = [...c.querySelectorAll('div')].filter((b) => b.dataset.w).map((b) => { const t = b.parentElement.getBoundingClientRect(); return { x: t.left - r.left, y: t.top - r.top, w: t.width, h: t.height, v: parseFloat(b.dataset.w) }; });
      return { w: r.width, h: r.height, bars };
    });
  }
  await page.context().close();
}

const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb'] });
await run({ h: 880, scale: 3 }, 'm_');
await run({ h: 900, width: 1440, scale: 1.5, desktop: true }, 'd_');
fs.writeFileSync(path.join(OUT, 'info.json'), JSON.stringify(info, null, 1));
console.log(JSON.stringify(info).slice(0, 600));
await browser.close();
