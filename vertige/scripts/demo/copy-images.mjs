#!/usr/bin/env node
/**
 * Copie les visuels 3D utilisés par la démo depuis @lobehub/fluent-emoji-3d (devDependency)
 * vers public/objets/<points-de-code>.webp. Usage : npm run demo:images
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { codepoints, DEMO_IMAGES } from "./images.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const PKG = dirname(require.resolve("@lobehub/fluent-emoji-3d/package.json"));
const OUT = resolve(ROOT, "public/objets");
mkdirSync(OUT, { recursive: true });

const missing = [];
const done = new Set();
for (const [slug, emoji] of Object.entries(DEMO_IMAGES)) {
  const candidates = [codepoints(emoji, true), codepoints(emoji, false)];
  const src = candidates.map((c) => resolve(PKG, "assets", `${c}.webp`)).find(existsSync);
  if (!src) {
    missing.push(`${slug} ${emoji} (${candidates.join(" | ")})`);
    continue;
  }
  const name = codepoints(emoji, false);
  if (!done.has(name)) copyFileSync(src, resolve(OUT, `${name}.webp`));
  done.add(name);
}
console.log(`✓ ${done.size} visuels copiés dans public/objets/`);
if (missing.length) {
  console.error(`✗ ${missing.length} introuvable(s) :\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
