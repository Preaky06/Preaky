// Enregistre le vrai parcours sur ordinateur (1440×900, ×1,5) : clics souris, défilements fluides.
// TMDB est servi depuis ../ugc/tmdb-cache ; les URL manquantes s'ajoutent à ../ugc/tmdb-requests.txt.
// Sortie : <dir>/frames/*.jpg (horodatées) + <dir>/events.json (clics avec position du curseur).
// Usage : SITE=/chemin/site.html node capture-desktop.js <dir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { openSite } = require('../ugc/drive');

const OUT = process.argv[2];
const REQ = path.join(__dirname, '..', 'ugc', 'tmdb-requests.txt');
const PATH = ['M’évader', 'Un autre monde', 'L’espace', 'Équilibré', 'À deux', 'Peu importe',
  'Peu importe', 'De n’importe où', 'Un film très connu', 'Entre les deux', 'Un peu',
  'Celui qui met tout le monde d’accord'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
  const browser = await chromium.launch();
  const { page, misses } = await openSite(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const events = [];
  const now = () => Date.now() / 1000;
  let mx = 1100, my = 700;

  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async f => {
    fs.writeFileSync(path.join(OUT, 'frames', `${f.metadata.timestamp.toFixed(4)}.jpg`), Buffer.from(f.data, 'base64'));
    n++;
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 2160, maxHeight: 1350, everyNthFrame: 1 });
  events.push({ type: 'start', t: now() });
  await sleep(1600);

  async function smoothScrollBy(dy, ms = 600) {
    await page.evaluate(([dy, ms]) => new Promise(res => {
      const cands = [...document.querySelectorAll('*')].filter(e => {
        const s = getComputedStyle(e);
        return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 300;
      });
      const el = cands.length ? cands[cands.length - 1] : document.scrollingElement;
      const y0 = el.scrollTop, t0 = performance.now();
      const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      (function step(t) { const k = Math.min(1, (t - t0) / ms); el.scrollTop = y0 + dy * ease(k); k < 1 ? requestAnimationFrame(step) : res(); })(t0);
    }), [dy, ms]);
  }
  // déplacement de souris en courbe, enregistré pour dessiner un curseur propre au montage
  async function moveTo(x, y, ms = 420) {
    const x0 = mx, y0 = my, steps = Math.max(6, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const cx = x0 + (x - x0) * e, cy = y0 + (y - y0) * e - Math.sin(Math.PI * k) * 40;
      await page.mouse.move(cx, cy);
      events.push({ type: 'mouse', t: now(), x: cx, y: cy });
      await sleep(ms / steps);
    }
    mx = x; my = y;
  }
  async function clickText(label) {
    // .last() : les choix déjà faits réapparaissent en étiquettes en haut, avant les options
    const loc = page.getByText(label, { exact: true }).filter({ visible: true }).last();
    let box = await loc.boundingBox();
    if (box.y + box.height > 860 || box.y < 120) {
      await smoothScrollBy(box.y + box.height / 2 - 520);
      await sleep(200);
      box = await loc.boundingBox();
    }
    const x = box.x + Math.min(box.width * .3, 140), y = box.y + box.height / 2;
    await moveTo(x, y);
    events.push({ type: 'click', t: now(), x, y, label });
    await page.mouse.click(x, y);
  }

  await clickText('Commencer');
  await sleep(1100);
  for (const label of PATH) { await clickText(label); await sleep(800); }
  events.push({ type: 'submitted', t: now() });
  await page.getByText('LE MEILLEUR CHOIX').first().waitFor({ timeout: 30000 }).catch(() => {});
  events.push({ type: 'results', t: now() });
  await sleep(1500);
  const card = await page.getByText('LE MEILLEUR CHOIX').first().boundingBox().catch(() => null);
  if (card) {
    events.push({ type: 'scroll-card', t: now() });
    await smoothScrollBy(card.y - 160, 1000);
    await sleep(1800);
    events.push({ type: 'scroll-others', t: now() });
    await smoothScrollBy(2600, 2600);
    await sleep(900);
  }
  events.push({ type: 'end', t: now() });
  await cdp.send('Page.stopScreencast');
  await sleep(300);
  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events));
  const known = fs.readFileSync(REQ, 'utf8').split('\n').filter(Boolean);
  const fresh = [...misses].filter(u => !known.includes(u));
  fs.writeFileSync(REQ, [...known, ...fresh].join('\n') + '\n');
  console.log(`${n} images, ${events.filter(e => e.type === 'click').length} clics, ${misses.size} URL hors cache (${fresh.length} nouvelles)`);
  await browser.close();
})();
