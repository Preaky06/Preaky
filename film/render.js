// Rendu du film : 1920×1080, H.264. Usage : [BLUR=1] node render.js [sortie.mp4]
// BLUR=1 : 120 i/s capturées, fusionnées deux à deux en 60 i/s (flou de mouvement).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, 'video.mp4');
const BLUR = process.env.BLUR === '1';
const FPS = BLUR ? 120 : 30;

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('ERR', e.message));
  await page.goto('file://' + path.join(__dirname, 'film.html') + '?render');
  await page.evaluate(() => window.ready);
  const frames = Math.round(await page.evaluate(() => window.DUR) * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    ...(BLUR ? ['-vf', "tmix=frames=2:weights='1 1',framestep=2", '-r', '60'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', OUT],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const stage = page.locator('#stage');
  for (let f = 0; f < frames; f++) {
    await page.evaluate(t => render(t), f / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (FPS * 2) === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('ok ->', OUT);
})();
