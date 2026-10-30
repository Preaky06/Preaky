// Chargement et enrichissement des données : relie recettes, pays, ingrédients, régimes et traditions,
// et déduit régimes et allergènes de la composition réelle de chaque recette.
import fs from "node:fs";
import { createRequire } from "node:module";
import { RECETTES } from "../../data/recettes.mjs";
import { INGREDIENTS } from "../../data/ingredients.mjs";
import { REGIMES } from "../../data/regimes.mjs";
import { TRADITIONS } from "../../data/traditions.mjs";
import { ARTICLES } from "../../data/articles.mjs";
import { EDITORIAL_PAYS } from "../../data/editorial-pays.mjs";
import { CONTINENTS, CATEGORIES, DIFFICULTES, BUDGETS, TEMPS, FAMILLES, ALLERGENES } from "../../data/taxonomies.mjs";
import { lireLigne, UNITES } from "../../src/js/quantites.js";

const require = createRequire(import.meta.url);
const RACINE = new URL("../../", import.meta.url);

// Langue du nom original, pour l'attribut lang (rendu des écritures, lecteurs d'écran)
const LANGUE_ORIGINALE = {
  IT: "it", FR: "fr", ES: "es", GR: "el", PT: "pt", HU: "hu", JP: "ja", IN: "hi", TH: "th", VN: "vi", KR: "ko",
  CN: "zh", LB: "ar", TR: "tr", MA: "ar", EG: "ar", ET: "am", KE: "sw", ZA: "en", SN: "wo", MX: "es", US: "en",
  CA: "fr", CU: "es", JM: "en", PE: "es", BR: "pt", AR: "es", CL: "es", CO: "es", VE: "es", FJ: "fj", AU: "en", NZ: "en",
};

const ORIGINES_ANIMALES = new Set(["viande", "volaille", "poisson", "crustace", "mollusque", "lait", "oeuf", "miel"]);
const NEUTRES = new Set(["sel", "eau"]);

export function charger() {
  const pays = JSON.parse(fs.readFileSync(new URL("data/countries.json", RACINE), "utf8"));
  const brut = new Map(require("world-countries").map((c) => [c.cca2, c]));
  const parIso = new Map(pays.map((p) => [p.iso2, p]));
  const parIso3 = new Map(pays.map((p) => [p.iso3, p]));
  const ingredients = new Map(INGREDIENTS.map((i) => [i.s, { ...i, o: i.o ?? "vegetal", a: i.a ?? [] }]));
  const continents = new Map(CONTINENTS.map((c) => [c.slug, { ...c, pays: [] }]));

  for (const p of pays) {
    const w = brut.get(p.iso2);
    const natifs = [...new Set(Object.values(w.name.native ?? {}).map((n) => n.common))].filter((n) => n && n !== p.name_fr);
    p.noms_locaux = natifs;
    p.voisins = (w.borders ?? []).map((c) => parIso3.get(c)).filter(Boolean);
    p.editorial = EDITORIAL_PAYS[p.iso2] ?? null;
    p.recettes = [];
    p.url = `/pays/${p.slug}`;
    continents.get(p.continent).pays.push(p);
  }

  const traditions = new Map(TRADITIONS.map((t) => [t.slug, { ...t, recettes: [], url: `/traditions/${t.slug}`, statut: "a_verifier" }]));

  const recettes = RECETTES.map((r) => enrichir(r, parIso, ingredients));
  for (const r of recettes) {
    r.paysObj.recettes.push(r);
    for (const t of r.traditions) {
      if (!traditions.has(t)) throw new Error(`${r.slug} : tradition inconnue « ${t} »`);
      traditions.get(t).recettes.push(r);
    }
  }
  for (const r of recettes) r.similaires = similaires(r, recettes);

  const regimes = REGIMES.map((d) => ({
    ...d,
    url: `/regimes/${d.slug}`,
    statut: "a_verifier",
    recettes: recettes.filter((r) => ["compatible", "adaptable", "selon-produits"].includes(r.regimes[d.slug].statut)),
  }));

  const articles = ARTICLES.map((a) => ({
    ...a,
    url: `/articles/${a.slug}`,
    statut: "a_verifier",
    paysObj: a.pays.map((i) => parIso.get(i)),
    recettesObj: a.recettes.map((s) => recettes.find((r) => r.slug === s) ?? fail(`article ${a.slug} : recette ${s}`)),
  }));

  for (const t of traditions.values()) t.paysObj = t.pays.map((i) => parIso.get(i) ?? fail(`tradition ${t.slug} : pays ${i}`));

  verifier(recettes, pays);
  return {
    pays, parIso, continents, ingredients, recettes, regimes, traditions: [...traditions.values()], articles,
    taxo: { CONTINENTS, CATEGORIES, DIFFICULTES, BUDGETS, TEMPS, FAMILLES, ALLERGENES },
  };
}

function fail(m) { throw new Error(m); }

function enrichir(r, parIso, ingredients) {
  const paysObj = parIso.get(r.pays) ?? fail(`${r.slug} : pays ${r.pays}`);
  const lignes = r.ingredients.map((l) => {
    const x = lireLigne(l);
    const ing = ingredients.get(x.ingredient) ?? fail(`${r.slug} : ingrédient inconnu ${x.ingredient}`);
    return { ...x, ing };
  });
  const substitutions = (r.substitutions ?? []).map(([de, par, note]) => ({
    de: ingredients.get(de) ?? fail(`${r.slug} : substitution ${de}`),
    par: par ? ingredients.get(par) ?? fail(`${r.slug} : substitution ${par}`) : null,
    note,
  }));
  const total = r.preparation + r.cuisson + (r.repos ?? 0);
  const out = {
    ...r,
    region: r.region ?? null,
    repos: r.repos ?? 0,
    traditions: r.traditions ?? [],
    conseils: r.conseils ?? [],
    erreurs: r.erreurs ?? [],
    variantes: r.variantes ?? [],
    langue: LANGUE_ORIGINALE[r.pays] ?? null,
    paysObj,
    continent: paysObj.continent,
    url: `/recettes/${paysObj.slug}/${r.slug}`,
    image: `/img/recettes/${r.slug}.svg`,
    total,
    lignes,
    substitutions,
    // Statut éditorial : « a_verifier » par défaut. Une recette « publie » doit fournir source, date de vérification
    // et photographie autorisée : { source: { auteur, url }, verification: "AAAA-MM-JJ", photo: { url, licence, credit } }
    statut: r.statut ?? "a_verifier",
    demo: (r.statut ?? "a_verifier") !== "publie",
    verification: r.verification ?? null,
    source: r.source ?? null,
    image_publiee: r.photo?.url ?? null,
    image_licence: r.photo?.licence ?? null,
  };
  if (out.statut === "publie" && !(out.verification && out.source && out.image_publiee && out.image_licence)) {
    fail(`${r.slug} : une recette publiée exige verification, source et photo (url, licence)`);
  }
  out.allergenes = allergenes(lignes);
  out.familles = [...new Set(lignes.filter((l) => !l.facultatif && !NEUTRES.has(l.ing.s)).map((l) => l.ing.f))];
  out.regimes = Object.fromEntries(REGIMES.map((d) => [d.slug, compatibilite(d, lignes, substitutions)]));
  out.tranche = TEMPS.find((t) => total >= t.min && total < t.max).slug;
  return out;
}

// Présence de chaque allergène : « contient », « selon-produit » (composition variable selon la marque)
// ou « facultatif » (seulement dans un ingrédient facultatif)
function allergenes(lignes) {
  const rang = { contient: 3, "selon-produit": 2, facultatif: 1 };
  const res = {};
  for (const l of lignes) {
    for (const a of l.ing.a) {
      const doute = a.endsWith("?");
      const slug = a.replace("?", "");
      const niveau = l.facultatif ? "facultatif" : doute ? "selon-produit" : "contient";
      const cur = res[slug];
      if (!cur || rang[niveau] > rang[cur.niveau]) res[slug] = { niveau, sources: cur ? cur.sources : [] };
      if (!res[slug].sources.includes(l.ing.n)) res[slug].sources.push(l.ing.n);
    }
  }
  return res;
}

// Conflit d'un ingrédient avec un régime : « non », « doute » (selon le produit) ou null
function conflit(regle, ing) {
  if (regle.exclut) {
    if (regle.exclut.includes(ing.o)) return "non";
    if (ing.pr && regle.exclut.includes("viande")) return "doute";
    return null;
  }
  if (regle.seulement) return regle.seulement.includes(ing.o) || NEUTRES.has(ing.s) ? null : "non";
  if (regle.allergene) {
    if (ing.a.includes(regle.allergene)) return "non";
    if (ing.a.includes(regle.allergene + "?")) return "doute";
  }
  return null;
}

function compatibilite(regime, lignes, substitutions) {
  if (!regime.regle) return { statut: "non-evalue", notes: [], verification: null };
  const notes = [];
  let incompatible = false, adaptable = false, doute = false;
  for (const l of lignes) {
    const c = conflit(regime.regle, l.ing);
    if (!c) continue;
    const sub = substitutions.find((s) => s.de.s === l.ing.s);
    if (c === "doute") {
      if (l.facultatif) { adaptable = true; notes.push(`Omettre l'ingrédient facultatif « ${l.ing.n} » ou vérifier son étiquette.`); }
      else { doute = true; notes.push(regime.regle.allergene ? `Vérifier l'étiquette : ${l.ing.n}.` : `Vérifier la présure : ${l.ing.n}.`); }
      continue;
    }
    if (l.facultatif) { adaptable = true; notes.push(`Omettre l'ingrédient facultatif « ${l.ing.n} ».`); continue; }
    if (sub && !sub.par) { adaptable = true; notes.push(`Omettre « ${l.ing.n} ».`); continue; }
    if (sub && sub.par) {
      const c2 = conflit(regime.regle, sub.par);
      if (c2 === "non") { incompatible = true; continue; }
      adaptable = true;
      notes.push(`Remplacer « ${l.ing.n} » par « ${sub.par.n} ».` + (c2 === "doute" ? " Vérifier son étiquette." : ""));
      continue;
    }
    incompatible = true;
  }
  const statut = incompatible ? "incompatible" : adaptable ? "adaptable" : doute ? "selon-produits" : "compatible";
  return { statut, notes: incompatible ? [] : notes, verification: "calcule" };
}

function similaires(r, toutes) {
  const base = new Set(r.lignes.filter((l) => !["epices", "condiments", "autres"].includes(l.ing.f)).map((l) => l.ing.s));
  return toutes
    .filter((x) => x !== r)
    .map((x) => {
      let s = 0;
      if (x.continent === r.continent) s += 2;
      if (x.categorie === r.categorie) s += 2;
      if (x.visuel === r.visuel) s += 1;
      for (const l of x.lignes) if (base.has(l.ing.s)) s += 1;
      return [s, x];
    })
    .sort((a, b) => b[0] - a[0] || a[1].titre.localeCompare(b[1].titre, "fr"))
    .slice(0, 3)
    .map(([, x]) => x);
}

function verifier(recettes, pays) {
  const urls = new Set();
  for (const r of recettes) {
    if (urls.has(r.url)) fail(`URL en double ${r.url}`);
    urls.add(r.url);
    for (const champ of ["titre", "introduction", "categorie", "difficulte", "budget", "visuel"]) if (!r[champ]) fail(`${r.slug} : champ ${champ} manquant`);
    if (!r.etapes.length || r.etapes.some((e) => !e[0] || !(e[1] > 0))) fail(`${r.slug} : étapes incomplètes`);
    for (const l of r.lignes) if (l.unite && !UNITES[l.unite]) fail(`${r.slug} : unité ${l.unite}`);
  }
  if (pays.length !== 195) fail("195 pays attendus");
}

// Poids approximatif d'une ligne, pour choisir les couleurs dominantes d'une illustration
export function poids(l) {
  if (l.quantite == null) return 0;
  const u = UNITES[l.unite];
  if (u.dim === "masse" || u.dim === "volume") return l.quantite * u.base;
  if (l.unite === "piece") return l.quantite * 120;
  if (l.unite === "botte") return l.quantite * 60;
  if (l.unite === "cas") return l.quantite * 12;
  return l.quantite * 4;
}

export { ORIGINES_ANIMALES };
