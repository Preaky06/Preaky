// Captures fixes du film : node stills.js <dossier> 1.2 9.8 ...
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2], times = process.argv.slice(3).map(Number);
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file://' + path.join(__dirname, 'film.html') + '?render');
  await page.evaluate(() => window.ready);
  for (const t of times) {
    const t0 = Date.now();
    await page.evaluate(t => render(t), t);
    await page.locator('#stage').screenshot({ path: path.join(out, `t${t.toFixed(2)}.png`) });
    console.log(t, Date.now() - t0, 'ms');
  }
  await browser.close();
})();
