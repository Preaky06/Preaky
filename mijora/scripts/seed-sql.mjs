// Génère supabase/seed.sql à partir des fichiers de données : une seule source de vérité pour le site et la base.
// Les identifiants sont explicites pour que les liens entre tables soient lisibles et reproductibles.
import fs from "node:fs";
import { charger } from "./lib/donnees.mjs";
import { UNITES } from "../data/taxonomies.mjs";
import { NATURES } from "../data/regimes.mjs";
import { slugify } from "./lib/slug.mjs";

const d = charger();
const q = (v) => (v == null ? "null" : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const lignes = [];
const inserer = (table, cols, rows) => {
  if (!rows.length) return;
  lignes.push(`insert into public.${table} (${cols.join(", ")}) values\n${rows.map((r) => `  (${r.map(q).join(", ")})`).join(",\n")};\n`);
};
const enumer = (s) => s.replace(/-/g, "_");

const LANGUES = { fr: "Français", it: "Italien", es: "Espagnol", el: "Grec", pt: "Portugais", hu: "Hongrois", ja: "Japonais", hi: "Hindi", th: "Thaï", vi: "Vietnamien", ko: "Coréen", zh: "Chinois", ar: "Arabe", tr: "Turc", am: "Amharique", sw: "Swahili", en: "Anglais", wo: "Wolof", fj: "Fidjien" };
const DIMENSIONS = { masse: "masse", volume: "volume", "cuillere-soupe": "cuillere_soupe", "cuillere-cafe": "cuillere_cafe", compte: "piece", gousse: "gousse", pincee: "pincee", feuille: "feuille", brin: "brin", botte: "botte", tranche: "tranche", longueur: "longueur" };

lignes.push("-- Généré par scripts/seed-sql.mjs : ne pas modifier à la main.\n-- Contenus de démonstration (statut « a_verifier », is_demo = true) en attente de vérification éditoriale.\n");
inserer("locales", ["code", "name"], Object.entries(LANGUES));
inserer("continents", ["slug", "name_fr"], d.taxo.CONTINENTS.map((c) => [c.slug, c.nom]));

// Pays
const idPays = new Map(d.pays.map((p, i) => [p.iso2, i + 1]));
inserer("countries", ["id", "name_fr", "name_official_fr", "name_original", "slug", "continent", "region", "iso_code", "iso3", "ccn3", "flag", "demonym_m", "demonym_f", "description", "culinary_history", "status", "is_demo"],
  d.pays.map((p) => [idPays.get(p.iso2), p.name_fr, p.name_official_fr, p.noms_locaux[0] ?? null, p.slug, p.continent, p.region, p.iso2, p.iso3, p.ccn3, p.flag, p.demonym_m, p.demonym_f,
    p.editorial?.presentation ?? null, p.editorial?.influences ?? null, p.editorial ? "a_verifier" : "brouillon", Boolean(p.editorial)]));
const frontieres = [];
for (const p of d.pays) for (const v of p.voisins) frontieres.push([idPays.get(p.iso2), idPays.get(v.iso2)]);
inserer("country_borders", ["country_id", "neighbor_id"], frontieres);

// Régions citées par les recettes
const regions = [];
const idRegion = new Map();
for (const r of d.recettes) {
  if (!r.region) continue;
  const cle = `${r.pays}/${r.region}`;
  if (idRegion.has(cle)) continue;
  idRegion.set(cle, regions.length + 1);
  regions.push([regions.length + 1, idPays.get(r.pays), r.region, slugify(r.region)]);
}
inserer("regions", ["id", "country_id", "name", "slug"], regions);

const points = [];
for (const p of d.pays) {
  if (!p.editorial) continue;
  const e = p.editorial;
  for (const [kind, liste] of [["ingredient", e.ingredients], ["technique", e.techniques], ["plat", e.plats], ["dessert_boisson", e.desserts]]) {
    liste.forEach((label, i) => points.push([idPays.get(p.iso2), kind, label, i]));
  }
}
inserer("country_highlights", ["country_id", "kind", "label", "position"], points);

// Référentiels
inserer("categories", ["slug", "name_fr", "position"], d.taxo.CATEGORIES.map((c, i) => [c.slug, c.nom, i]));
inserer("ingredient_families", ["slug", "name_fr", "position"], d.taxo.FAMILLES.map((f, i) => [f.slug, f.nom, i]));
inserer("units", ["code", "name_fr", "name_plural_fr", "dimension", "factor_to_base"], Object.entries(UNITES).map(([code, u]) => [code, u.nom || "pièce", u.pluriel ?? null, DIMENSIONS[u.dim], u.base]));
const idAllergene = new Map(d.taxo.ALLERGENES.map((a, i) => [a.slug, i + 1]));
inserer("allergens", ["id", "name", "slug", "detail"], d.taxo.ALLERGENES.map((a) => [idAllergene.get(a.slug), a.nom, a.slug, a.detail ?? null]));

const ings = [...d.ingredients.values()];
const idIng = new Map(ings.map((x, i) => [x.s, i + 1]));
inserer("ingredients", ["id", "name_fr", "name_plural_fr", "plural_after_measure", "slug", "category", "origin", "animal_rennet_possible", "color"],
  ings.map((x) => [idIng.get(x.s), x.n, x.p ?? x.n + "s", x.m === "p", x.s, x.f, x.o, Boolean(x.pr), x.c]));
inserer("ingredient_allergens", ["ingredient_id", "allergen_id", "certainty"],
  ings.flatMap((x) => x.a.map((a) => [idIng.get(x.s), idAllergene.get(a.replace("?", "")), a.endsWith("?") ? "selon_produit" : "contient"])));

// Régimes
const idRegime = new Map(d.regimes.map((x, i) => [x.slug, i + 1]));
inserer("diet_types", ["id", "name", "slug", "nature", "tagline", "description", "auto_evaluable", "status", "is_demo"],
  d.regimes.map((x) => [idRegime.get(x.slug), x.nom, x.slug, x.nature, x.accroche, x.definition, Boolean(x.regle), "a_verifier", true]));
inserer("diet_type_points", ["diet_type_id", "kind", "text", "position"], d.regimes.flatMap((x) => [
  ...x.principes.map((t, i) => [idRegime.get(x.slug), "principe", t, i]),
  ...x.compatibles.map((t, i) => [idRegime.get(x.slug), "compatible", t, i]),
  ...x.exclusions.map((t, i) => [idRegime.get(x.slug), "exclusion", t, i]),
  ...x.precautions.map((t, i) => [idRegime.get(x.slug), "precaution", t, i]),
]));

// Recettes
const idRec = new Map(d.recettes.map((r, i) => [r.slug, i + 1]));
inserer("recipes", ["id", "title_fr", "original_title", "original_language", "slug", "introduction", "origin_history", "country_id", "region_id", "category", "preparation_time", "cooking_time", "rest_time", "difficulty", "estimated_budget", "servings", "storage", "reheating", "precautions", "main_image", "status", "is_demo", "editorial_notes"],
  d.recettes.map((r) => [idRec.get(r.slug), r.titre, r.original, r.langue, r.slug, r.introduction, r.origine ?? null, idPays.get(r.pays), r.region ? idRegion.get(`${r.pays}/${r.region}`) : null, r.categorie,
    r.preparation, r.cuisson, r.repos, r.difficulte, r.budget, r.portions, r.conservation ?? null, r.rechauffage ?? null, r.precautions ?? null, r.image,
    "a_verifier", true, "Recette de démonstration : à relire, sourcer et illustrer par une photographie autorisée avant publication."]));
inserer("recipe_steps", ["recipe_id", "position", "instruction", "duration_minutes"], d.recettes.flatMap((r) => r.etapes.map(([t, m], i) => [idRec.get(r.slug), i + 1, t, m])));
inserer("recipe_ingredients", ["recipe_id", "ingredient_id", "quantity", "unit", "is_optional", "preparation_note", "position"],
  d.recettes.flatMap((r) => r.lignes.map((l, i) => [idRec.get(r.slug), idIng.get(l.ing.s), l.quantite, l.unite, l.facultatif, l.note, i])));
inserer("recipe_substitutions", ["recipe_id", "ingredient_id", "substitute_ingredient_id", "note"],
  d.recettes.flatMap((r) => r.substitutions.map((s) => [idRec.get(r.slug), idIng.get(s.de.s), s.par ? idIng.get(s.par.s) : null, s.note])));
inserer("recipe_notes", ["recipe_id", "kind", "text", "position"], d.recettes.flatMap((r) => [
  ...r.conseils.map((t, i) => [idRec.get(r.slug), "conseil", t, i]),
  ...r.erreurs.map((t, i) => [idRec.get(r.slug), "erreur", t, i]),
  ...r.variantes.map((t, i) => [idRec.get(r.slug), "variante", t, i]),
]));
inserer("recipe_diets", ["recipe_id", "diet_type_id", "compatibility_status", "verification_status", "adaptation_note"],
  d.recettes.flatMap((r) => Object.entries(r.regimes).map(([slug, c]) => [idRec.get(r.slug), idRegime.get(slug), enumer(c.statut), "calcule", c.notes.join(" ") || null])));
inserer("recipe_allergens", ["recipe_id", "allergen_id", "presence_status", "cross_contamination_note"],
  d.recettes.flatMap((r) => Object.entries(r.allergenes).map(([slug, a]) => [idRec.get(r.slug), idAllergene.get(slug), enumer(a.niveau), `Source : ${a.sources.join(", ")}`])));

// Traditions
const idTrad = new Map(d.traditions.map((t, i) => [t.slug, i + 1]));
inserer("traditions", ["id", "name", "slug", "kind", "season", "description", "historical_context", "significance", "period", "places", "status", "is_demo"],
  d.traditions.map((t) => [idTrad.get(t.slug), t.nom, t.slug, enumer(t.type), enumer(t.saison), t.histoire, t.histoire, t.signification, t.periode, t.lieux, "a_verifier", true]));
inserer("tradition_countries", ["tradition_id", "country_id"], d.traditions.flatMap((t) => t.pays.map((iso) => [idTrad.get(t.slug), idPays.get(iso)])));
inserer("tradition_dishes", ["tradition_id", "label", "position"], d.traditions.flatMap((t) => t.plats.map((p, i) => [idTrad.get(t.slug), p, i])));
inserer("recipe_traditions", ["recipe_id", "tradition_id"], d.recettes.flatMap((r) => r.traditions.map((t) => [idRec.get(r.slug), idTrad.get(t)])));

// Articles
const idArt = new Map(d.articles.map((a, i) => [a.slug, i + 1]));
inserer("articles", ["id", "slug", "title", "rubric", "standfirst", "status", "is_demo"], d.articles.map((a) => [idArt.get(a.slug), a.slug, a.titre, a.rubrique, a.chapo, "a_verifier", true]));
inserer("article_blocks", ["article_id", "position", "kind", "text"], d.articles.flatMap((a) => a.corps.map(([k, t], i) => [idArt.get(a.slug), i + 1, k === "h" ? "intertitre" : "paragraphe", t])));
inserer("article_countries", ["article_id", "country_id"], d.articles.flatMap((a) => a.pays.map((iso) => [idArt.get(a.slug), idPays.get(iso)])));
inserer("article_recipes", ["article_id", "recipe_id"], d.articles.flatMap((a) => a.recettes.map((s) => [idArt.get(a.slug), idRec.get(s)])));

// Les séquences reprennent après les identifiants explicites
for (const t of ["countries", "regions", "country_highlights", "allergens", "ingredients", "diet_types", "diet_type_points", "recipes", "recipe_steps", "recipe_ingredients", "recipe_substitutions", "recipe_notes", "traditions", "tradition_dishes", "articles", "article_blocks"]) {
  lignes.push(`select setval(pg_get_serial_sequence('public.${t}', 'id'), coalesce((select max(id) from public.${t}), 1));`);
}

fs.writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lignes.join("\n") + "\n");
console.log(`seed.sql : ${d.pays.length} pays, ${ings.length} ingrédients, ${d.recettes.length} recettes, ${d.regimes.length} régimes, ${d.traditions.length} traditions, ${d.articles.length} articles (${Object.keys(NATURES).length} natures de régime).`);
