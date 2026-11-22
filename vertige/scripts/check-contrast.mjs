#!/usr/bin/env node
/**
 * Vérifie le contraste WCAG AA (≥ 4,5:1) de toutes les paires texte/fond du design system.
 * Usage : npm run check:contrast  (code de sortie ≠ 0 si une paire échoue)
 */
const BG = "#07070A";
const SURFACE = "#0F0F14";
const ELEVATED = "#16161D";
const INK = "#F4F1EA";
const MUTED = "#9A9AA6";
const TIERS = {
  "1 Poussière": "#8A8F98",
  "2 Monnaie": "#C07A45",
  "3 Quotidien": "#5FD4A6",
  "4 Confort": "#4F7CFF",
  "5 Luxe": "#9B6BFF",
  "6 Démesure": "#FF3D6E",
  "7 Vertige": "#F5C542",
};
const CONF = { A: "#5FD4A6", B: "#8FB0FF", C: "#E8A15A" };

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
  ["ink / surface surélevée", INK, ELEVATED],
  ["muted / fond", MUTED, BG],
  ["muted / surface surélevée", MUTED, ELEVATED],
];
for (const [name, c] of Object.entries(TIERS)) {
  // Fond teinté le plus clair rencontré : calque de palier (22 %) sur le fond.
  const tinted = mix(c, BG, 0.22);
  pairs.push(
    [`palier ${name} / fond`, c, BG],
    [`palier ${name} / surface surélevée`, c, ELEVATED],
    [`palier ${name} / pastille (12 %)`, c, mix(c, SURFACE, 0.12)],
    [`fond sombre / palier ${name} (pastille pleine, bouton)`, BG, c],
    [`ink / fond teinté ${name}`, INK, tinted],
    [`muted / fond teinté ${name}`, MUTED, tinted],
  );
}
for (const [lvl, c] of Object.entries(CONF)) pairs.push([`badge fiabilité ${lvl} / surface`, c, ELEVATED]);

let fails = 0;
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${r.toFixed(2).padStart(5)}:1  ${name}`);
}
console.log(fails ? `\n✗ ${fails} paire(s) sous 4,5:1` : `\n✓ ${pairs.length} paires ≥ 4,5:1`);
process.exit(fails ? 1 : 0);
