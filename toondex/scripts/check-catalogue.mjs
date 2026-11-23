// Vérifie la cohérence du catalogue : œuvres (works.json) et cartes de personnages (cards.json).
import { readFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), "utf8"));
const works = read("works.json");
const cards = read("cards.json");
const TYPES = new Set(["serie", "serie-animee", "anime", "film", "film-animation"]);
const RARITIES = new Set(["commune", "rare", "epique", "legendaire", "mythique"]);
const COUNTRIES = new Set(["US", "GB", "FR", "JP", "KR", "ES", "DE", "AU", "NZ", "CA"]);
const errors = [];
const thisYear = new Date().getFullYear();

const workIds = new Set();
works.forEach((row, i) => {
  const [id, title, type, year, countries, genres] = row;
  const at = `œuvre ${i + 1} (${id})`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${at} : identifiant invalide`);
  if (workIds.has(id)) errors.push(`${at} : identifiant en double`);
  workIds.add(id);
  if (!title?.trim()) errors.push(`${at} : titre vide`);
  if (!TYPES.has(type)) errors.push(`${at} : type inconnu ${type}`);
  if (!Number.isInteger(year) || year < 1900 || year > thisYear) errors.push(`${at} : année invalide ${year}`);
  for (const c of String(countries).split(",")) if (!COUNTRIES.has(c)) errors.push(`${at} : pays inconnu ${c}`);
  if (!genres?.trim()) errors.push(`${at} : genres vides`);
});

const cardIds = new Set();
cards.forEach((c, i) => {
  const at = `carte ${i + 1} (${c.id})`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) errors.push(`${at} : identifiant invalide`);
  if (cardIds.has(c.id)) errors.push(`${at} : identifiant en double`);
  cardIds.add(c.id);
  if (!c.name?.trim()) errors.push(`${at} : nom vide`);
  if (!workIds.has(c.work)) errors.push(`${at} : œuvre inconnue ${c.work}`);
  if (!RARITIES.has(c.rarity)) errors.push(`${at} : rareté inconnue ${c.rarity}`);
  if (!/^https:\/\/(upload\.wikimedia\.org|s4\.anilist\.co)\//.test(c.image)) errors.push(`${at} : image hors Wikipédia ou AniList`);
  if (!/^https:\/\//.test(c.source)) errors.push(`${at} : source manquante`);
});
for (const r of RARITIES) if (!cards.some((c) => c.rarity === r)) errors.push(`aucune carte ${r}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const count = (list, key) => list.reduce((acc, x) => ((acc[x[key]] = (acc[x[key]] ?? 0) + 1), acc), {});
console.log(`${cards.length} cartes OK, ${new Set(cards.map((c) => c.work)).size} œuvres représentées`, count(cards, "rarity"));
