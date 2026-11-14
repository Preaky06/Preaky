// Génère les icônes PWA et l'image de partage (Open Graph). Relancer après un changement de marque.
// Usage : node scripts/make-images.mjs (nécessite Playwright)
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import config from '../site.config.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const font = readFileSync(join(ROOT, 'src/assets/vendor/fonts/inter-latin.woff2')).toString('base64');
const accent = config.brand.accent;
const mark = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="8" fill="${accent}"/><path d="M20.6 11.2a6.6 6.6 0 1 0 0 9.6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="22.4" cy="16" r="1.9" fill="#fff"/></svg>`;
const base = `<style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}*{margin:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#f7f7fa;color:#14131a}</style>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`${base}<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:#f7f7fa">${mark(Math.round(size * 0.62))}</div>`);
  await page.screenshot({ path: join(ROOT, `src/assets/img/icon-${size}.png`) });
}
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`${base}
<div style="width:1200px;height:630px;position:relative;overflow:hidden;padding:70px 80px;background:radial-gradient(620px 420px at 88% 30%, ${accent}2e, transparent 70%), #f7f7fa">
  <div style="display:flex;align-items:center;gap:16px;font-weight:800;font-size:38px;letter-spacing:-0.03em">${mark(54)}${config.brand.name}</div>
  <div style="margin-top:50px;font-size:70px;font-weight:800;letter-spacing:-0.045em;line-height:1.04;max-width:700px">Vos créations valent <span style="color:${accent}">plus que leur devis.</span></div>
  <div style="margin-top:30px;font-size:26px;color:#44434f;max-width:640px;line-height:1.35">Prix des droits, contrat de cession conforme au CPI, rappels d’échéance.</div>
  <div style="position:absolute;right:70px;top:110px;width:330px;border-radius:16px;background:#fff;border:1px solid #e3e3ec;box-shadow:0 40px 80px -30px rgba(20,19,26,.35);transform:rotate(3deg);padding:30px;font-size:17px">
    <div style="font-weight:800;font-size:20px;padding-bottom:10px;border-bottom:4px solid ${accent};display:inline-block">Contrat de cession</div>
    ${[['Site internet', '180 €'], ['Imprimés', '180 €'], ['Enseigne', '360 €'], ['Marque', '600 €']].map(([a, b]) => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ececf1"><span>${a}</span><b>${b}</b></div>`).join('')}
    <div style="display:flex;justify-content:space-between;padding:12px 0 4px;font-weight:800;font-size:20px"><span>Total droits</span><span>1 320 €</span></div>
    <div style="margin-top:12px;display:inline-block;background:#e5f5ea;color:#17803d;font-weight:700;padding:6px 12px;border-radius:999px;font-size:15px">✓ Conforme art. L131-3</div>
  </div>
</div>`);
await page.screenshot({ path: join(ROOT, 'src/assets/img/og.png') });
await browser.close();
console.log('✓ Icônes et image de partage générées dans src/assets/img/');
