// Capture des images fixes à des instants donnés : node stills.js <dossier> 1.2 3.5 ...
const { chromium } = require('playwright');
const path = require('path');

const out = process.argv[2];
const times = process.argv.slice(3).map(Number);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render');
  await page.evaluate(() => window.ready);
  for (const t of times) {
    await page.evaluate(t => render(t), t);
    await page.locator('#stage').screenshot({ path: path.join(out, `t${t.toFixed(2)}.png`) });
  }
  await browser.close();
})();
