// Vérifie la cohérence du catalogue : identifiants, types, raretés, années, pays.
import { readFileSync } from "node:fs";

const rows = JSON.parse(readFileSync(new URL("../src/data/works.json", import.meta.url), "utf8"));
const TYPES = new Set(["serie", "serie-animee", "anime", "film", "film-animation"]);
const RARITIES = new Set(["commune", "rare", "epique", "legendaire", "mythique"]);
const COUNTRIES = new Set(["US", "GB", "FR", "JP", "KR", "ES", "DE", "AU", "NZ", "CA"]);
const errors = [];
const ids = new Set();
const thisYear = new Date().getFullYear();

rows.forEach((row, i) => {
  const [id, title, type, year, countries, genres, rarity] = row;
  const at = `ligne ${i + 1} (${id})`;
  if (row.length !== 7) errors.push(`${at} : 7 champs attendus`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${at} : identifiant invalide`);
  if (ids.has(id)) errors.push(`${at} : identifiant en double`);
  ids.add(id);
  if (!title?.trim()) errors.push(`${at} : titre vide`);
  if (!TYPES.has(type)) errors.push(`${at} : type inconnu ${type}`);
  if (!Number.isInteger(year) || year < 1900 || year > thisYear) errors.push(`${at} : année invalide ${year}`);
  for (const c of String(countries).split(",")) if (!COUNTRIES.has(c)) errors.push(`${at} : pays inconnu ${c}`);
  if (!genres?.trim()) errors.push(`${at} : genres vides`);
  if (!RARITIES.has(rarity)) errors.push(`${at} : rareté inconnue ${rarity}`);
});

for (const r of RARITIES) if (!rows.some((row) => row[6] === r)) errors.push(`aucune carte ${r}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const count = (k) => Object.entries(rows.reduce((acc, row) => ((acc[row[k]] = (acc[row[k]] ?? 0) + 1), acc), {}));
console.log(`${rows.length} œuvres OK`, Object.fromEntries(count(6)), Object.fromEntries(count(2)));
