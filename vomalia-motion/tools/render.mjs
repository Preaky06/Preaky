// Frame-by-frame export: seeks the deterministic timeline, screenshots each frame, pipes to ffmpeg.
// usage: node tools/render.mjs page.html out.mp4 [--fps 30] [--cues cues.json] [--stills 1.2,5,9.8 --dir frames/]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt; };
const page_ = resolve(argv[0]), out = argv[1] && !argv[1].startsWith('--') ? resolve(argv[1]) : null;
const fps = +opt('fps', 30);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto('file://' + page_ + '?render=1');
await page.evaluate(() => window.__ready);
const dur = await page.evaluate(() => window.DUR);

const cues = opt('cues');
if (cues) writeFileSync(cues, JSON.stringify(await page.evaluate(() => window.CUES), null, 1));

const stills = opt('stills');
if (stills) {
  const dir = resolve(opt('dir', '.'));
  mkdirSync(dir, { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: `${dir}/t${t.toFixed(2)}.png` });
  }
  console.log('stills written to', dir);
}

if (out) {
  const n = Math.round(dur * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg exit ' + c)) : res()));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.__seek(t), i / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 100 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await done;
  console.log('video written to', out, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
