// Rendu image par image : 120 i/s capturés, fusionnés deux à deux en 60 i/s
// (flou de mouvement à obturateur 180°), encodés en H.264.
// Usage : node render.js [sortie.mp4]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, 'cinemood-motion-15s.mp4');
const CAPTURE_FPS = 120;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('ERR', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render');
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DUR);
  const frames = Math.round(dur * CAPTURE_FPS);

  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(CAPTURE_FPS), '-i', '-',
    '-vf', "tmix=frames=2:weights='1 1',framestep=2,format=yuv420p",
    '-r', '60',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high',
    '-tune', 'grain', '-movflags', '+faststart',
    OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const stage = page.locator('#stage');
  for (let f = 0; f < frames; f++) {
    await page.evaluate(t => render(t), f / CAPTURE_FPS);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('ok ->', OUT);
})();
