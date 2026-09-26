// Génère les icônes PNG et l'image de partage (og-image.png) à partir de HTML.
// Usage : npm run assets   (nécessite Playwright : npm i -D playwright && npx playwright install chromium)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const fonts = pathToFileURL(path.join(pub, "fonts")).href;

let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright")); }
catch { console.error("Playwright introuvable : npm i -D playwright"); process.exit(1); }

const fontFaces = `
@font-face { font-family: F; src: url(${fonts}/fraunces-latin-full-normal.woff2); font-weight: 100 900; }
@font-face { font-family: F; src: url(${fonts}/fraunces-latin-full-italic.woff2); font-weight: 100 900; font-style: italic; }
@font-face { font-family: B; src: url(${fonts}/bricolage-grotesque-latin-opsz-normal.woff2); font-weight: 200 800; }
@font-face { font-family: M; src: url(${fonts}/jetbrains-mono-latin-600-normal.woff2); }`;

const lens = (size, pad) => {
  const s = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="#15130f"/>
    <g transform="translate(${(pad / size) * 64} ${(pad / size) * 64}) scale(${s / size})">
      <circle cx="28" cy="28" r="14" fill="none" stroke="#f2eee4" stroke-width="4.5"/>
      <path d="M38 38l12 12" stroke="#f2eee4" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M20.5 28.5h15" stroke="#e4ff3d" stroke-width="7" stroke-linecap="round"/>
    </g></svg>`;
};

const og = `<!doctype html><html><head><style>${fontFaces}
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #f2eee4; color: #15130f; font-family: B; position: relative; overflow: hidden; padding: 64px 72px; }
h1 { font-family: F; font-weight: 800; font-size: 112px; line-height: .95; letter-spacing: -.02em; word-spacing: .06em; }
em { font-weight: 300; color: #8a8474; }
mark { background: #e4ff3d; color: #15130f; padding: 0 .08em; border-radius: .08em .2em .1em .25em; }
.brand { position: absolute; left: 72px; bottom: 56px; display: flex; align-items: center; gap: 16px; font-family: F; font-weight: 700; font-size: 44px; }
.brand svg { width: 56px; height: 56px; }
.tag { position: absolute; right: 72px; bottom: 66px; font-family: M; font-size: 22px; letter-spacing: .04em; text-transform: uppercase; color: #4a463d; }
.orb { position: absolute; right: -140px; top: -160px; width: 560px; height: 560px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #e4ff3d, transparent 62%), radial-gradient(circle at 70% 70%, #2c3cff, transparent 58%); filter: blur(50px); opacity: .5; }
</style></head><body>
<div class="orb"></div>
<h1>Votre courrier<br/>parle <em>charabia.</em><br/>On <mark>traduit.</mark></h1>
<div class="brand"><svg viewBox="0 0 40 40"><circle cx="17" cy="17" r="11" fill="none" stroke="#15130f" stroke-width="3.2"/><path d="M25 25l9 9" stroke="#15130f" stroke-width="3.6" stroke-linecap="round"/><path d="M11.5 17.5h11" stroke="#e4ff3d" stroke-width="5" stroke-linecap="round"/></svg>Limpide</div>
<div class="tag">Impôts · CAF · Bail · Factures · Amendes</div>
</body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const shots = [
  ["icons/icon-512.png", 512, lens(512, 56)],
  ["icons/icon-192.png", 192, lens(192, 21)],
  ["icons/icon-maskable-512.png", 512, lens(512, 120)],
  ["icons/apple-touch-icon.png", 180, lens(180, 24)],
];
for (const [file, size, svg] of shots) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: path.join(pub, file) });
  console.log("✓", file);
}
await page.setViewportSize({ width: 1200, height: 630 });
// Chargé depuis un fichier pour que les polices locales (file://) soient accessibles.
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "limpide-")), "og.html");
fs.writeFileSync(tmp, og);
await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(pub, "og-image.png") });
console.log("✓ og-image.png");
await browser.close();
