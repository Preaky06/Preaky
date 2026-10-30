// Génère data/countries.json : les 195 pays de référence (193 États membres de l'ONU,
// plus le Saint-Siège et la Palestine, États observateurs).
// Source : world-countries (mledoze/countries), licence ODbL 1.0, à créditer sur le site.
import { writeFileSync } from "node:fs";
import { slugify } from "./lib/slug.mjs";
import { createRequire } from "node:module";
const countries = createRequire(import.meta.url)("world-countries");

const SOUS_REGIONS = {
  Caribbean: "Caraïbes",
  "Southern Asia": "Asie du Sud",
  "Middle Africa": "Afrique centrale",
  "Northern Europe": "Europe du Nord",
  "Southeast Europe": "Europe du Sud-Est",
  "Southern Europe": "Europe du Sud",
  "Western Asia": "Asie de l'Ouest",
  "South America": "Amérique du Sud",
  Polynesia: "Polynésie",
  "Australia and New Zealand": "Australie et Nouvelle-Zélande",
  "Central Europe": "Europe centrale",
  "Eastern Africa": "Afrique de l'Est",
  "Western Europe": "Europe de l'Ouest",
  "Western Africa": "Afrique de l'Ouest",
  "Eastern Europe": "Europe de l'Est",
  "Central America": "Amérique centrale",
  "North America": "Amérique du Nord",
  "South-Eastern Asia": "Asie du Sud-Est",
  "Southern Africa": "Afrique australe",
  "Eastern Asia": "Asie de l'Est",
  "Northern Africa": "Afrique du Nord",
  Melanesia: "Mélanésie",
  Micronesia: "Micronésie",
  "Central Asia": "Asie centrale",
};

function continent(c) {
  if (c.region === "Americas") return c.subregion === "South America" ? "amerique-du-sud" : "amerique-du-nord";
  return { Europe: "europe", Asia: "asie", Africa: "afrique", Oceania: "oceanie" }[c.region];
}

export { slugify };

// Drapeau : symboles indicateurs régionaux Unicode, sans image à licencier
const flag = (iso2) => [...iso2.toUpperCase()].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join("");

// Noms français abrégés dans la source, remplacés par leur forme usuelle complète
const NOMS = { CD: "République démocratique du Congo", VA: "Vatican" };

const list = countries
  .filter((c) => c.unMember || ["VA", "PS"].includes(c.cca2))
  .map((c) => {
    const nom = NOMS[c.cca2] || c.translations.fra?.common || c.name.common;
    return {
      iso2: c.cca2,
      iso3: c.cca3,
      ccn3: c.ccn3,
      name_fr: nom,
      name_official_fr: c.translations.fra?.official || null,
      slug: slugify(nom),
      continent: continent(c),
      region: SOUS_REGIONS[c.subregion] || null,
      flag: flag(c.cca2),
      demonym_m: c.demonyms?.fra?.m || null,
      demonym_f: c.demonyms?.fra?.f || null,
    };
  })
  .sort((a, b) => a.name_fr.localeCompare(b.name_fr, "fr"));

const slugs = new Set(list.map((c) => c.slug));
if (list.length !== 195 || slugs.size !== 195) throw new Error(`Attendu 195 pays aux slugs uniques, obtenu ${list.length} (${slugs.size} slugs)`);
for (const c of list) if (!c.continent || !c.region) throw new Error(`Continent ou région manquant : ${c.iso2}`);
writeFileSync(new URL("../data/countries.json", import.meta.url), `${JSON.stringify(list, null, 1)}\n`);
console.log(`${list.length} pays écrits dans data/countries.json`);
