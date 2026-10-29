// Vérifie la cohérence des données avant publication : node scripts/check-data.mjs
import { METIERS, CATEGORIES, PARCOURS } from "../js/data/metiers.js";
import { VARIABLES } from "../js/data/variables.js";
import { PROMPTS } from "../js/data/prompts/index.js";

const errors = [];
const metierIds = new Set(METIERS.map((m) => m.id));
const categorieIds = new Set(CATEGORIES.map((c) => c.id));
const promptIds = new Set();
const usedKeys = new Set();
const required = ["id", "metier", "categorie", "niveau", "titre", "resume", "prompt", "resultat", "verifier", "relance"];

for (const p of PROMPTS) {
  for (const field of required) if (!p[field]) errors.push(`${p.id || "?"} : champ « ${field} » manquant`);
  if (promptIds.has(p.id)) errors.push(`${p.id} : identifiant en double`);
  promptIds.add(p.id);
  if (!metierIds.has(p.metier)) errors.push(`${p.id} : métier inconnu « ${p.metier} »`);
  if (!categorieIds.has(p.categorie)) errors.push(`${p.id} : catégorie inconnue « ${p.categorie} »`);
  if (!["Essentiel", "Avancé"].includes(p.niveau)) errors.push(`${p.id} : niveau inconnu « ${p.niveau} »`);
  for (const [, key] of p.prompt.matchAll(/\{\{(\w+)\}\}/g)) {
    usedKeys.add(key);
    if (!VARIABLES[key]) errors.push(`${p.id} : champ {{${key}}} absent de variables.js`);
  }
  if (/\{\{(?!\w+\}\})/.test(p.prompt)) errors.push(`${p.id} : accolades mal formées`);
}

for (const parcours of PARCOURS) {
  if (!metierIds.has(parcours.metier)) errors.push(`Parcours « ${parcours.titre} » : métier inconnu`);
  for (const etape of parcours.etapes) {
    if (!promptIds.has(etape.id)) errors.push(`Parcours « ${parcours.titre} » : prompt « ${etape.id} » introuvable`);
  }
}

for (const m of METIERS) {
  if (!PROMPTS.some((p) => p.metier === m.id)) errors.push(`Métier « ${m.id} » sans aucun prompt`);
}

const unused = Object.keys(VARIABLES).filter((k) => !usedKeys.has(k));
if (unused.length) console.warn(`Champs déclarés mais jamais utilisés : ${unused.join(", ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK : ${PROMPTS.length} prompts, ${METIERS.length} métiers, ${PARCOURS.length} parcours, ${usedKeys.size} champs.`);
