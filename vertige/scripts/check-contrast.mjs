#!/usr/bin/env node
/**
 * Vérifie le contraste WCAG AA (≥ 4,5:1) de toutes les paires texte/fond du design system (thème clair).
 * Usage : npm run check:contrast  (code de sortie ≠ 0 si une paire échoue)
 */
const BG = "#EEF3FA";
const WHITE = "#FFFFFF";
const ELEVATED = "#F6F9FD";
const INK = "#0B1220";
const MUTED = "#566079";
const BRAND = "#0B6BCB";
const BRAND_DEEP = "#0752A0";
const NIGHT = "#111827"; // carte du palier Vertige
const GOLD = "#F5C542";
const TIERS = {
  "1 Poussière": "#5B6472",
  "2 Monnaie": "#A4552A",
  "3 Quotidien": "#16784F",
  "4 Confort": "#2B59E6",
  "5 Luxe": "#7339DB",
  "6 Démesure": "#CC1D4B",
  "7 Vertige": "#8A6100",
};

const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const mix = (top, bottom, a) =>
  "#" + rgb(top).map((v, i) => Math.round(v * a + rgb(bottom)[i] * (1 - a)).toString(16).padStart(2, "0")).join("");

const pairs = [
  ["ink / fond", INK, BG],
  ["muted / fond", MUTED, BG],
  ["muted / surface", MUTED, WHITE],
  ["muted / champ de recherche", MUTED, ELEVATED],
  ["blanc / bleu VERTIGE (accueil)", WHITE, BRAND],
  ["blanc / bleu profond (bas de l'accueil)", WHITE, BRAND_DEEP],
  ["ink / bouton blanc", INK, WHITE],
  ["blanc / bouton noir", WHITE, INK],
  ["or / carte Vertige", GOLD, NIGHT],
  ["blanc / carte Vertige", WHITE, NIGHT],
];
for (const [name, c] of Object.entries(TIERS)) {
  pairs.push(
    [`blanc / carte ${name} (teinte de base)`, WHITE, c],
    // Le texte est en bas de la carte : le dégradé y va de la teinte de base vers 15 % de noir.
    [`blanc / carte ${name} (zone de texte, bas)`, WHITE, mix("#000000", c, 0.15)],
    [`palier ${name} / fond`, c, BG],
    [`palier ${name} / surface`, c, WHITE],
    [`palier ${name} / pastille (12 %)`, c, mix(c, WHITE, 0.12)],
  );
}

let fails = 0;
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${r.toFixed(2).padStart(5)}:1  ${name}`);
}
console.log(fails ? `\n✗ ${fails} paire(s) sous 4,5:1` : `\n✓ ${pairs.length} paires ≥ 4,5:1`);
process.exit(fails ? 1 : 0);
