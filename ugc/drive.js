// Rejoue le parcours de la pub sur le vrai site, en servant TMDB depuis tmdb-cache/.
// Les URL absentes du cache sont ajoutées à tmdb-requests.txt (sans clé) pour GitHub Actions.
// Usage : SITE=/chemin/site.html node drive.js [capture-dir]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const { stripKey, cacheName } = require('./tmdb-key-free');

const SITE = process.env.SITE;
const CACHE = path.join(__dirname, 'tmdb-cache');
const REQ = path.join(__dirname, 'tmdb-requests.txt');
// M'évader, un autre monde, l'espace, équilibré, à deux, durée peu importe, époque peu importe,
// de n'importe où, un film très connu, entre les deux, un peu, celui qui met tout le monde d'accord
const ANSWERS = '611225611225';

async function openSite(browser) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const misses = new Set();
  await page.route(/^https:\/\/(api\.themoviedb\.org|image\.tmdb\.org)\//, route => {
    const url = route.request().url();
    const file = path.join(CACHE, cacheName(url));
    if (fs.existsSync(file)) {
      const json = file.endsWith('.json');
      return route.fulfill({ status: 200, body: fs.readFileSync(file),
        contentType: json ? 'application/json' : 'image/jpeg',
        headers: { 'access-control-allow-origin': '*' } });
    }
    misses.add(stripKey(url));
    return route.abort();
  });
  await page.route(/youtube|ytimg|googlevideo/, r => r.abort());
  await page.goto('file://' + SITE);
  await page.waitForTimeout(3500);
  return { page, misses };
}

module.exports = { openSite, ANSWERS };

if (require.main === module) {
  (async () => {
    const browser = await chromium.launch();
    const { page, misses } = await openSite(browser);
    const shots = process.argv[2];
    await page.getByText('Commencer', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    for (const k of ANSWERS) { await page.keyboard.press(k); await page.waitForTimeout(700); }
    await page.waitForTimeout(9000);
    if (shots) {
      await page.screenshot({ path: path.join(shots, 'result.png') });
      await page.screenshot({ path: path.join(shots, 'result-full.png'), fullPage: true });
    }
    console.log((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 600));
    const known = fs.existsSync(REQ) ? fs.readFileSync(REQ, 'utf8').split('\n').filter(Boolean) : [];
    const fresh = [...misses].filter(u => !known.includes(u));
    fs.writeFileSync(REQ, [...known, ...fresh].join('\n') + '\n');
    console.log(`\n${misses.size} URL absentes du cache, ${fresh.length} nouvelles`);
    await browser.close();
  })();
}
