#!/usr/bin/env node
/**
 * Emblèmes locaux (drapeaux flag-icons, MIT ; logos simple-icons, CC0) -> public/objets/emblemes/<slug>.svg
 * et scripts/demo/emblems.json (licence, source). Usage : npm run demo:emblems
 * Les logos sont des marques de leurs propriétaires : usage d'identification seulement.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as icons from "simple-icons";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const FLAGS = resolve(dirname(require.resolve("flag-icons/package.json")), "flags/4x3");
const OUT = resolve(ROOT, "public/objets/emblemes");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const src = JSON.parse(readFileSync(resolve(ROOT, "scripts/demo/emblem-sources.json"), "utf8"));
const bySlug = Object.fromEntries(Object.values(icons).filter((i) => i && i.slug).map((i) => [i.slug, i]));
// Couleur de marque trop claire sur fond blanc : encre sombre à la place.
const ink = (hex) => {
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.75 ? "0B1220" : hex;
};

const out = {};
for (const [slug, spec] of Object.entries(src)) {
  if (slug.startsWith("_")) continue;
  const [type, code] = spec.split(":");
  if (type === "flag") {
    writeFileSync(resolve(OUT, `${slug}.svg`), readFileSync(resolve(FLAGS, `${code}.svg`)));
    out[slug] = { kind: "emblem", author: "flag-icons (Lipis)", license: "MIT", source_url: "https://github.com/lipis/flag-icons" };
  } else {
    const icon = bySlug[code];
    if (!icon) throw new Error(`Logo introuvable dans simple-icons : ${code}`);
    const svg = icon.svg.replace("<svg ", `<svg fill="#${ink(icon.hex)}" `);
    writeFileSync(resolve(OUT, `${slug}.svg`), svg);
    out[slug] = {
      kind: "emblem",
      author: `Simple Icons — ${icon.title} (marque de son propriétaire)`,
      license: "CC0",
      source_url: icon.source || "https://simpleicons.org",
    };
  }
}
writeFileSync(resolve(ROOT, "scripts/demo/emblems.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`✓ ${Object.keys(out).length} emblèmes locaux → public/objets/emblemes/`);
