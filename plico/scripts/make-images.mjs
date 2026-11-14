// Génère les icônes PWA et l'image de partage (Open Graph) à partir de la marque.
// À relancer si tu changes le nom ou la couleur : node scripts/make-images.mjs (nécessite Playwright)
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import config from '../site.config.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const font = readFileSync(join(ROOT, 'src/assets/vendor/fonts/inter-latin.woff2')).toString('base64');
const accent = config.brand.accent;
const mark = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><path d="M8 2.5h11.5L28 11v15.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-21a3 3 0 0 1 3-3z" fill="${accent}"/><path d="M19.5 2.5V9a2 2 0 0 0 2 2H28" fill="none" stroke="#faf8f5" stroke-width="2" stroke-linejoin="round"/><path d="M10.5 18.5h11M10.5 23.5h7" stroke="#16130f" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const base = `<style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}*{margin:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#faf8f5;color:#16130f}</style>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`${base}<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:#faf8f5">${mark(Math.round(size * 0.58))}</div>`);
  await page.screenshot({ path: join(ROOT, `src/assets/img/icon-${size}.png`) });
}
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`${base}
<div style="width:1200px;height:630px;position:relative;overflow:hidden;padding:72px 80px;background:radial-gradient(600px 400px at 85% 30%, ${accent}33, transparent 70%), #faf8f5">
  <div style="display:flex;align-items:center;gap:16px;font-weight:800;font-size:38px;letter-spacing:-0.03em">${mark(54)}${config.brand.name}</div>
  <div style="margin-top:56px;font-size:76px;font-weight:800;letter-spacing:-0.045em;line-height:1.02;max-width:720px">Vos PDF, <span style="color:${accent}">sans jamais</span> les envoyer.</div>
  <div style="margin-top:34px;display:flex;gap:14px;font-size:24px;font-weight:600">
    ${['9 outils PDF', '100 % local', 'Hors ligne'].map((t) => `<span style="padding:10px 20px;border-radius:999px;background:#fff;border:1px solid #e6e0d7">${t}</span>`).join('')}
  </div>
  <div style="position:absolute;right:70px;top:120px;width:300px;height:400px;border-radius:18px;background:#fff;border:1px solid #e6e0d7;box-shadow:0 40px 80px -30px rgba(22,19,15,.35);transform:rotate(6deg);padding:34px">
    <div style="height:16px;width:60%;background:#16130f;border-radius:6px;margin-bottom:26px"></div>
    ${'<div style="height:10px;background:#f0ebe3;border-radius:5px;margin-bottom:14px"></div>'.repeat(4)}
    <div style="height:110px;border-radius:12px;background:linear-gradient(135deg,${accent}aa,${accent});margin:22px 0"></div>
    ${'<div style="height:10px;background:#f0ebe3;border-radius:5px;margin-bottom:14px"></div>'.repeat(3)}
  </div>
</div>`);
await page.screenshot({ path: join(ROOT, 'src/assets/img/og.png') });
await browser.close();
console.log('✓ Icônes et image de partage générées dans src/assets/img/');
