// Générateur du site MIJORA.
//   node scripts/build.mjs            → dist/    (production : URL propres /pays/japon, à servir avec cleanUrls)
//   node scripts/build.mjs --preview  → apercu/  (liens relatifs vers les fichiers .html, lisible sans serveur dédié)
// Variables d'environnement facultatives : SITE_URL, SUPABASE_URL, SUPABASE_ANON_KEY (clé publique uniquement).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { charger } from "./lib/donnees.mjs";
import { lieur, fichier, SITE } from "./lib/html.mjs";
import { illustration, scene } from "./lib/illustrations.mjs";
import { vignetteContinent } from "./lib/cartes.mjs";
import { accueil } from "./templates/accueil.mjs";
import { explorer } from "./templates/explorer.mjs";
import { atlas, pagePays } from "./templates/pays.mjs";
import { recette } from "./templates/recette.mjs";
import { regimesIndex, pageRegime, traditionsIndex, pageTradition, articlesIndex, pageArticle, favoris, listeCourses, compte, charte, introuvable } from "./templates/divers.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv.includes("--preview") ? "apercu" : "prod";
const SORTIE = path.join(RACINE, mode === "prod" ? "dist" : "apercu");

const d = charger();
fs.rmSync(SORTIE, { recursive: true, force: true });

function ecrire(rel, contenu) {
  const f = path.join(SORTIE, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, contenu);
}
function copier(de, vers) {
  const f = path.join(SORTIE, vers);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.copyFileSync(path.join(RACINE, de), f);
}

// ---------------------------------------------------------------- pages
const pages = [];
const base = { ...d, mode, SITE };
function generer(route, fn, ...args) {
  const ctx = { ...base, L: lieur(mode, route) };
  const html = fn(ctx, ...args);
  ecrire(fichier(route), html);
  pages.push({ route, indexable: !html.includes('name="robots" content="noindex') });
}

generer("/", accueil);
generer("/explorer", explorer);
generer("/pays", atlas);
for (const p of d.pays) generer(p.url, pagePays, p);
for (const r of d.recettes) generer(r.url, recette, r);
generer("/regimes", regimesIndex);
for (const x of d.regimes) generer(x.url, pageRegime, x);
generer("/traditions", traditionsIndex);
for (const t of d.traditions) generer(t.url, pageTradition, t);
generer("/articles", articlesIndex);
for (const a of d.articles) generer(a.url, pageArticle, a);
generer("/favoris", favoris);
generer("/liste-de-courses", listeCourses);
generer("/compte", compte);
generer("/charte-editoriale", charte);
generer("/404", introuvable);

// ---------------------------------------------------------------- images
for (const r of d.recettes) ecrire(r.image.slice(1), illustration(r));
ecrire("img/table.svg", scene(["bibimbap", "ratatouille", "salade-grecque", "guacamole", "pao-de-queijo", "dal-tadka"].map((s) => d.recettes.find((r) => r.slug === s))));
for (const c of d.continents.values()) {
  const v = vignetteContinent(c.slug, c.pays);
  ecrire(`img/continents/${c.slug}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${v.W} ${v.H}" preserveAspectRatio="xMidYMid slice"><rect width="${v.W}" height="${v.H}" fill="#263B32"/><path d="${v.fond}" fill="#33503f"/><path d="${v.dedans}" fill="#F3EBDD"/></svg>`);
}
ecrire("img/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#263B32"/><path d="M14 46V20l18 16 18-16v26" fill="none" stroke="#F3EBDD" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="50" r="4" fill="#C47D4D"/></svg>`);
if (fs.existsSync(path.join(RACINE, "public/img/partage.png"))) copier("public/img/partage.png", "img/partage.png");

// ---------------------------------------------------------------- ressources statiques
for (const f of ["playfair-display-latin-wght-normal.woff2", "playfair-display-latin-wght-italic.woff2", "playfair-display-latin-ext-wght-normal.woff2", "playfair-display-vietnamese-wght-normal.woff2"]) copier(`node_modules/@fontsource-variable/playfair-display/files/${f}`, `fonts/${f}`);
for (const f of ["dm-sans-latin-wght-normal.woff2", "dm-sans-latin-ext-wght-normal.woff2"]) copier(`node_modules/@fontsource-variable/dm-sans/files/${f}`, `fonts/${f}`);
copier("node_modules/country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2", "fonts/TwemojiCountryFlags.woff2");
copier("src/css/mijora.css", "css/mijora.css");
for (const f of fs.readdirSync(path.join(RACINE, "src/js"))) copier(`src/js/${f}`, `js/${f}`);

// Configuration publique du client : adresse du projet Supabase et clé « anon » (publique par conception,
// protégée par les politiques RLS). La clé « service_role » ne doit jamais apparaître ici.
const config = { supabaseUrl: process.env.SUPABASE_URL || "", supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "" };
if (/service_role/.test(Buffer.from((config.supabaseAnonKey.split(".")[1] || ""), "base64").toString())) throw new Error("SUPABASE_ANON_KEY contient une clé service_role : refus de la publier.");
ecrire("js/config.js", `// Généré par scripts/build.mjs\nexport const CONFIG = ${JSON.stringify(config)};\n`);

// ---------------------------------------------------------------- index de recherche
const index = {
  recettes: d.recettes.map((r) => ({
    s: r.slug, u: r.url, t: r.titre, o: r.original, img: r.image,
    p: r.pays, pn: r.paysObj.name_fr, ps: r.paysObj.slug, dr: r.paysObj.flag, c: r.continent, r: r.region,
    k: r.categorie, tt: r.total, tr: r.tranche, d: r.difficulte, b: r.budget,
    rg: Object.fromEntries(Object.entries(r.regimes).map(([k, v]) => [k, v.statut])),
    al: Object.fromEntries(Object.entries(r.allergenes).map(([k, v]) => [k, v.niveau])),
    f: r.familles, i: r.lignes.map((l) => l.ing.n), is: r.lignes.map((l) => l.ing.s),
    demo: r.demo,
  })),
  pays: d.pays.map((p) => ({ n: p.name_fr, s: p.slug, u: p.url, iso: p.iso2, dr: p.flag, dm: p.demonym_m, df: p.demonym_f, c: p.continent, nb: p.recettes.length })),
  regimes: d.regimes.map((x) => ({ s: x.slug, n: x.nom, u: x.url, ev: !!x.regle })),
  categories: d.taxo.CATEGORIES,
  continents: [...d.continents.values()].map((c) => ({ s: c.slug, n: c.nom })),
  difficultes: d.taxo.DIFFICULTES,
  budgets: d.taxo.BUDGETS,
  temps: d.taxo.TEMPS.map((t) => ({ ...t, max: t.max === Infinity ? null : t.max })),
  familles: d.taxo.FAMILLES,
  allergenes: d.taxo.ALLERGENES.map(({ slug, nom }) => ({ slug, nom })),
  ingredients: [...d.ingredients.values()].map((i) => ({ s: i.s, n: i.n, p: i.p ?? i.n + "s", m: i.m, f: i.f })),
};
ecrire("donnees/recherche.json", JSON.stringify(index));

// ---------------------------------------------------------------- SEO et hébergement
const indexables = pages.filter((p) => p.indexable && p.route !== "/404");
ecrire("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexables.map((p) => `  <url><loc>${SITE.url}${p.route === "/" ? "/" : p.route}</loc></url>`).join("\n")}\n</urlset>\n`);
ecrire("robots.txt", `User-agent: *\nAllow: /\nDisallow: /compte\nDisallow: /favoris\nDisallow: /liste-de-courses\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
if (mode === "prod") {
  ecrire("vercel.json", JSON.stringify({
    cleanUrls: true,
    trailingSlash: false,
    headers: [
      { source: "/(fonts|img|css|js)/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      { source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
    ],
  }, null, 2));
}

console.log(`${mode} : ${pages.length} pages (${indexables.length} indexables), ${d.recettes.length} recettes, ${d.pays.length} pays → ${path.relative(RACINE, SORTIE)}/`);
