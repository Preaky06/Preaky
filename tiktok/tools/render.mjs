#!/usr/bin/env node
/* Rendu d'un épisode en vidéo verticale 1080x1920.
 *
 *   node tools/render.mjs 00-presentation                 → vidéo complète
 *   node tools/render.mjs 00-presentation --stills 2,5.5  → images de contrôle (PNG)
 *   node tools/render.mjs 00-presentation --sheet 2       → planche contact (1 image toutes les 2 s)
 *
 * Prérequis : python3 tools/voice.py episodes/<ep>  (génère build/<ep>/timing.json + voice.wav)
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith('--')) || '00-presentation';
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

const BUILD = path.join(ROOT, 'build', ep);
const timing = JSON.parse(fs.readFileSync(path.join(BUILD, 'timing.json'), 'utf8'));
const FPS = timing.fps || 30;
const WORKERS = Number(opt('workers', 4));
const BOIL = Number(opt('boil', 3.5));

// --- petit serveur statique ---
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/engine/player.html?ep=${ep}`;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => typeof window.EPISODE === 'function');
  const info = await page.evaluate(([t, o]) => window.setup(t, o), [timing, { boil: BOIL }]);
  return { page, info };
}

const launch = () => chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });

if (flag('cover')) {
  // image de couverture : sans la main ni les sous-titres
  const browser = await launch();
  const { page } = await openPage(browser);
  const t = Number(opt('cover', '8.6'));
  await page.evaluate((tt) => { E.render(tt); E.hand.setAttribute('display', 'none'); E.capLayer.setAttribute('display', 'none'); }, t);
  const out = path.join(ROOT, 'exports', `${opt('name', ep)}_couverture.png`);
  await page.screenshot({ path: out });
  console.log('→', out);
  await browser.close();
  server.close();
  process.exit(0);
}

if (flag('stills') || flag('sheet')) {
  const browser = await launch();
  const { page, info } = await openPage(browser);
  fs.writeFileSync(path.join(BUILD, 'events.json'), JSON.stringify(info.events));
  const outDir = path.join(BUILD, 'stills');
  fs.mkdirSync(outDir, { recursive: true });
  let times;
  if (flag('sheet')) {
    const step = Number(opt('sheet', 2));
    times = [];
    for (let t = 0.5; t < info.duration; t += step) times.push(+t.toFixed(2));
  } else times = opt('stills', '1').split(',').map(Number);
  const files = [];
  for (const t of times) {
    await page.evaluate((tt) => E.render(tt), t);
    const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  if (flag('sheet')) {
    // planche contact via ffmpeg (6 colonnes)
    const cols = 6, rows = Math.ceil(files.length / cols);
    const list = path.join(outDir, 'list.txt');
    fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=270:480,tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', path.join(BUILD, 'sheet.png')], { stdio: 'inherit' });
    console.log('Planche :', path.join(BUILD, 'sheet.png'));
  } else console.log(files.join('\n'));
  await browser.close();
  server.close();
  process.exit(0);
}

// --- rendu complet ---
const framesDir = path.join(BUILD, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
const total = Math.ceil(timing.duration * FPS);
console.log(`Rendu de ${total} images (${timing.duration}s) avec ${WORKERS} workers…`);
const t0 = Date.now();
let done = 0;
const browsers = await Promise.all(Array.from({ length: WORKERS }, launch));
const pages = await Promise.all(browsers.map(openPage));
fs.writeFileSync(path.join(BUILD, 'events.json'), JSON.stringify(pages[0].info.events, null, 0));
await Promise.all(pages.map(async ({ page }, w) => {
  for (let i = w; i < total; i += WORKERS) {
    await page.evaluate((tt) => E.render(tt), i / FPS);
    await page.screenshot({ path: path.join(framesDir, `f_${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
    done++;
    if (done % 150 === 0) console.log(`  ${done}/${total} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}));
await Promise.all(browsers.map((b) => b.close()));
server.close();
console.log(`Images rendues en ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// --- audio (voix + bruitages + musique) ---
const py = spawnSync('python3', [path.join(ROOT, 'tools', 'audio.py'), ep], { stdio: 'inherit' });
if (py.status !== 0) process.exit(py.status);

// --- encodage ---
const outDir = path.join(ROOT, 'exports');
fs.mkdirSync(outDir, { recursive: true });
const name = opt('name', ep);
const encode = (audio, out) => {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f_%05d.jpg'), '-i', audio,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
  console.log('→', out);
};
encode(path.join(BUILD, 'mix.wav'), path.join(outDir, `${name}.mp4`));
encode(path.join(BUILD, 'mix_sans_musique.wav'), path.join(outDir, `${name}_sans-musique.mp4`));
