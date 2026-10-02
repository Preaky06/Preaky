// Enregistre le vrai parcours sur iPhone 13 (taps tactiles + défilements fluides) via le
// screencast de Chrome. Sortie : <dir>/frames/*.jpg (horodatées) + <dir>/events.json.
// Usage : SITE=/chemin/site.html node capture.js <dir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { openSite } = require('./drive');

const OUT = process.argv[2];
// libellés exacts des réponses, dans l'ordre du parcours
const PATH = ['M’évader', 'Un autre monde', 'L’espace', 'Équilibré', 'À deux', 'Peu importe',
  'Peu importe', 'De n’importe où', 'Un film très connu', 'Entre les deux', 'Un peu',
  'Celui qui met tout le monde d’accord'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
  const browser = await chromium.launch();
  const { page, misses } = await openSite(browser);
  const events = [];
  const now = () => Date.now() / 1000;

  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async f => {
    const ts = f.metadata.timestamp.toFixed(4);
    fs.writeFileSync(path.join(OUT, 'frames', `${ts}.jpg`), Buffer.from(f.data, 'base64'));
    n++;
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 });
  events.push({ type: 'start', t: now() });
  await sleep(1500);

  // défilement fluide (ease in-out) du conteneur qui scrolle, pour amener y au bon endroit
  async function smoothScrollBy(dy, ms = 520) {
    await page.evaluate(([dy, ms]) => new Promise(res => {
      const sc = document.scrollingElement;
      const cands = [...document.querySelectorAll('*')].filter(e => {
        const s = getComputedStyle(e);
        return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 300;
      });
      const el = cands.length ? cands[cands.length - 1] : sc;
      const y0 = el.scrollTop, t0 = performance.now();
      const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      (function step(t) {
        const k = Math.min(1, (t - t0) / ms);
        el.scrollTop = y0 + dy * ease(k);
        k < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    }), [dy, ms]);
  }

  async function tapText(label, { exact = true } = {}) {
    // .last() : les choix déjà faits réapparaissent en étiquettes en haut, avant les options
    const loc = page.getByText(label, { exact }).filter({ visible: true }).last();
    let box = await loc.boundingBox();
    const vh = page.viewportSize().height;
    if (box.y + box.height > vh - 40 || box.y < 140) {
      await smoothScrollBy(box.y + box.height / 2 - vh * .6);
      await sleep(250);
      box = await loc.boundingBox();
    }
    const x = box.x + Math.min(box.width * .35, 120), y = box.y + box.height / 2;
    events.push({ type: 'tap', t: now(), x, y, label });
    await page.touchscreen.tap(x, y);
  }

  await tapText('Commencer');
  await sleep(1100);
  for (const label of PATH) {
    await tapText(label);
    await sleep(900);
  }
  events.push({ type: 'submitted', t: now() });
  await page.getByText('LE MEILLEUR CHOIX').first().waitFor({ timeout: 30000 });
  events.push({ type: 'results', t: now() });
  await sleep(1300);

  // descend jusqu'à l'affiche du meilleur choix, puis jusqu'à « Pourquoi lui »
  const card = await page.getByText('LE MEILLEUR CHOIX').first().boundingBox();
  events.push({ type: 'scroll-poster', t: now() });
  await smoothScrollBy(card.y - 640, 900);
  await sleep(1400);
  // titre + score en haut du cadre, « Pourquoi lui » visible juste en dessous
  const title = await page.getByText('Interstellar', { exact: true }).first().boundingBox();
  events.push({ type: 'scroll-title', t: now() });
  await smoothScrollBy(title.y - 300, 800);
  await sleep(2200);
  events.push({ type: 'scroll-others', t: now() });
  await smoothScrollBy(5200, 2600);
  await sleep(800);
  events.push({ type: 'end', t: now() });

  await cdp.send('Page.stopScreencast');
  await sleep(300);
  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events, null, 1));
  console.log(`${n} images, ${events.length} événements, ${misses.size} URL hors cache`);
  await browser.close();
})();
