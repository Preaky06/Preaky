// Gabarit commun, liens et composants HTML partagés par toutes les pages.
import path from "node:path/posix";
import { libelle } from "../../src/js/quantites.js";

export const SITE = {
  nom: "MIJORA",
  signature: "Le monde se découvre aussi dans l'assiette.",
  url: (process.env.SITE_URL || "https://www.mijora.example").replace(/\/$/, ""),
};

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Route (« /pays/japon ») → fichier (« pays/japon.html »)
export function fichier(route) {
  if (route === "/") return "index.html";
  const r = route.replace(/^\//, "");
  return path.extname(r) ? r : r + ".html";
}

// Liens : absolus et sans extension en production, relatifs vers les fichiers .html en aperçu
export function lieur(mode, routePage) {
  const dossier = path.dirname(fichier(routePage));
  return (cible) => {
    const m = cible.match(/^([^?#]*)(.*)$/);
    const [route, suite] = [m[1] || routePage, m[2]];
    if (/^https?:/.test(cible) || cible.startsWith("mailto:")) return cible;
    if (mode === "prod") return route + suite;
    let rel = path.relative(dossier, fichier(route));
    if (!rel) rel = path.basename(fichier(route));
    return rel + suite;
  };
}
export function racine(mode, routePage) {
  if (mode === "prod") return "/";
  const d = path.dirname(fichier(routePage));
  return d === "." ? "" : d.split("/").map(() => "..").join("/") + "/";
}

// ---------------------------------------------------------------- icônes (traits, 24 × 24)
const I = {
  recherche: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  coeur: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"/>',
  compte: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fermer: '<path d="m6 6 12 12M18 6 6 18"/>',
  horloge: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  portions: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  niveau: '<path d="M5 19v-4M10 19v-8M15 19v-11M20 19V5"/>',
  budget: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2a3 3 0 1 0 0 5.6M8 11h5M8 13h5"/>',
  partager: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>',
  imprimer: '<path d="M7 9V4h10v5M7 17H5v-7h14v7h-2M8 14h8v6H8z"/>',
  liste: '<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  moins: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  filtre: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
  carte: '<path d="m9 5-5 2v12l5-2 6 2 5-2V5l-5 2-6-2ZM9 5v12M15 7v12"/>',
};
export const icone = (n, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[n]}</svg>`;

// ---------------------------------------------------------------- mise en forme
export const minutes = (m) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
};
export const drapeau = (p) => `<span class="drapeau" role="img" aria-label="Drapeau : ${esc(p.name_fr)}">${p.flag}</span>`;
export function courte(texte, n = 158) {
  if (texte.length <= n) return texte;
  return texte.slice(0, n).replace(/[\s,;:]+\S*$/, "") + "…";
}
export const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

const STATUTS_REGIME = {
  compatible: "Compatible",
  adaptable: "Adaptable",
  "selon-produits": "Selon les produits",
  incompatible: "Non compatible",
  "non-evalue": "Non évalué",
};
export const libelleStatut = (s) => STATUTS_REGIME[s];

// Badges de régime d'une carte : au plus trois, les plus utiles d'abord
const ORDRE_BADGES = ["vegetalien", "vegetarien", "pescetarien", "sans-gluten", "sans-lactose"];
export function badgesRegimes(r, regimes, max = 3) {
  const noms = Object.fromEntries(regimes.map((d) => [d.slug, d.nom]));
  const res = [];
  for (const s of ORDRE_BADGES) {
    const st = r.regimes[s].statut;
    if (s === "vegetarien" && r.regimes.vegetalien.statut === "compatible") continue;
    if (s === "pescetarien" && ["compatible", "adaptable", "selon-produits"].includes(r.regimes.vegetarien.statut)) continue;
    if (st === "compatible") res.push(`<li class="badge">${noms[s]}</li>`);
    else if (st === "adaptable") res.push(`<li class="badge badge-adapt" title="Avec une adaptation">${noms[s]}<span class="sr"> (avec une adaptation)</span>*</li>`);
  }
  return res.length ? `<ul class="badges" aria-label="Alimentation">${res.slice(0, max).join("")}</ul>` : "";
}

export function carteRecette(r, ctx, { titre = "h3", charge = "lazy" } = {}) {
  const L = ctx.L;
  const cat = ctx.taxo.CATEGORIES.find((c) => c.slug === r.categorie).nom;
  return `<article class="carte-recette">
  <div class="carte-image"><img src="${L(r.image)}" alt="" width="800" height="600" loading="${charge}" decoding="async"></div>
  <div class="carte-corps">
    <p class="carte-pays">${drapeau(r.paysObj)} ${esc(r.paysObj.name_fr)}${r.region ? ` · ${esc(r.region)}` : ""}</p>
    <${titre} class="carte-titre"><a href="${L(r.url)}" class="lien-etendu">${esc(r.titre)}</a></${titre}>
    <p class="carte-meta"><span>${cat}</span><span>${icone("horloge")}${minutes(r.total)}</span></p>
    ${badgesRegimes(r, ctx.regimes)}
  </div>
  <span class="etiquette-demo" title="Recette de démonstration, en attente de vérification">À vérifier</span>
  <button type="button" class="fav" data-fav="${r.slug}" aria-pressed="false" aria-label="Ajouter « ${esc(r.titre)} » aux favoris">${icone("coeur")}</button>
</article>`;
}

export function filAriane(etapes, L) {
  const items = etapes.map(([nom, route], i) => i === etapes.length - 1
    ? `<li><span aria-current="page">${esc(nom)}</span></li>`
    : `<li><a href="${L(route)}">${esc(nom)}</a></li>`).join("");
  return `<nav class="ariane" aria-label="Fil d'Ariane"><ol>${items}</ol></nav>`;
}

export function jsonLdAriane(etapes) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map(([nom, route], i) => ({ "@type": "ListItem", position: i + 1, name: nom, item: SITE.url + (route === "/" ? "/" : route) })),
  };
}

const iso = (m) => `PT${Math.floor(m / 60) ? Math.floor(m / 60) + "H" : ""}${m % 60 ? (m % 60) + "M" : ""}` || "PT0M";
export function jsonLdRecette(r, ctx) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.titre,
    description: r.introduction,
    image: [SITE.url + r.image_publiee],
    recipeCuisine: r.paysObj.name_fr,
    recipeCategory: ctx.taxo.CATEGORIES.find((c) => c.slug === r.categorie).nom,
    prepTime: iso(r.preparation),
    cookTime: iso(r.cuisson),
    totalTime: iso(r.total),
    recipeYield: `${r.portions} portions`,
    recipeIngredient: r.lignes.map((l) => libelle(l.ing, l.quantite, l.unite) + (l.note ? ` (${l.note})` : "")),
    recipeInstructions: r.etapes.map(([t]) => ({ "@type": "HowToStep", text: t })),
    datePublished: r.verification,
    publisher: { "@type": "Organization", name: SITE.nom },
  };
}

// ---------------------------------------------------------------- gabarit
const NAV = [
  ["Accueil", "/"],
  ["Explorer", "/explorer"],
  ["Pays", "/pays"],
  ["Traditions", "/traditions"],
  ["Alimentation", "/regimes"],
];

export function page(ctx, { route, titre, description, corps, section, indexable = false, jsonld = [], scripts = [], classe = "", ogType = "website" }) {
  const L = ctx.L;
  const titreComplet = route === "/" ? `${SITE.nom} · Encyclopédie gastronomique du monde` : `${titre} · ${SITE.nom}`;
  const canon = SITE.url + (route === "/" ? "/" : route);
  const nav = NAV.map(([n, r]) => `<li><a href="${L(r)}"${section === r ? ' aria-current="page"' : ""}>${n}</a></li>`).join("");
  const ld = jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n");
  return `<!doctype html>
<html lang="fr" data-mode="${ctx.mode}" data-racine="${racine(ctx.mode, route)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>${esc(titreComplet)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canon}">
${indexable ? "" : '<meta name="robots" content="noindex, follow">\n'}<meta name="theme-color" content="#263B32">
<meta property="og:site_name" content="${SITE.nom}">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${SITE.url}/img/partage.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${L("/img/favicon.svg")}" type="image/svg+xml">
<link rel="preload" href="${L("/fonts/playfair-display-latin-wght-normal.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${L("/fonts/dm-sans-latin-wght-normal.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${L("/css/mijora.css")}">
${ld}
</head>
<body class="${classe}">
<a class="evitement" href="#contenu">Aller au contenu</a>
<header class="entete">
  <div class="entete-in">
    <a class="logo" href="${L("/")}" aria-label="MIJORA, accueil">MIJORA</a>
    <nav class="nav" id="nav" aria-label="Navigation principale"><ul>${nav}</ul></nav>
    <div class="outils">
      <button type="button" class="outil" data-ouvrir-recherche aria-label="Rechercher" aria-haspopup="dialog">${icone("recherche")}</button>
      <a class="outil" href="${L("/favoris")}" aria-label="Favoris">${icone("coeur")}<span class="compteur" data-compteur-favoris hidden></span></a>
      <a class="outil" href="${L("/compte")}" aria-label="Compte">${icone("compte")}</a>
      <button type="button" class="outil outil-menu" aria-expanded="false" aria-controls="nav" aria-label="Ouvrir le menu">${icone("menu")}</button>
    </div>
  </div>
</header>
<main id="contenu" class="${classe ? classe + "-main" : ""}">
${corps}
</main>
<footer class="pied">
  <div class="pied-in">
    <div class="pied-marque">
      <p class="logo logo-pied">MIJORA</p>
      <p class="pied-signature">${SITE.signature}</p>
    </div>
    <nav class="pied-nav" aria-label="Plan du site">
      <ul>
        <li><a href="${L("/explorer")}">Explorer les recettes</a></li>
        <li><a href="${L("/pays")}">Atlas des 195 pays</a></li>
        <li><a href="${L("/traditions")}">Traditions</a></li>
        <li><a href="${L("/regimes")}">Alimentation et allergènes</a></li>
      </ul>
      <ul>
        <li><a href="${L("/articles")}">Magazine</a></li>
        <li><a href="${L("/favoris")}">Favoris</a></li>
        <li><a href="${L("/liste-de-courses")}">Liste de courses</a></li>
        <li><a href="${L("/charte-editoriale")}">Charte éditoriale et sources</a></li>
      </ul>
    </nav>
    <p class="pied-note">Les recettes et textes actuels sont des données de démonstration, en attente de vérification éditoriale. Les régimes et allergènes sont calculés à partir des ingrédients : vérifiez toujours l'étiquette des produits que vous utilisez.</p>
  </div>
</footer>
<dialog class="recherche-dialog" aria-label="Rechercher">
  <form class="recherche-form" action="${L("/explorer")}" method="get" role="search">
    <label class="sr" for="recherche-globale">Rechercher une recette, un pays, un ingrédient</label>
    ${icone("recherche")}
    <input id="recherche-globale" name="q" type="search" autocomplete="off" placeholder="Une recette, un pays, un ingrédient…" role="combobox" aria-expanded="false" aria-controls="recherche-globale-liste" aria-autocomplete="list">
    <button type="button" class="outil" data-fermer-recherche aria-label="Fermer la recherche">${icone("fermer")}</button>
  </form>
  <ul class="suggestions" id="recherche-globale-liste" role="listbox" aria-label="Suggestions"></ul>
  <p class="recherche-aide">Exemple : « Une recette japonaise végétarienne en moins de 30 minutes ».</p>
</dialog>
<div class="toast" role="status" aria-live="polite" hidden></div>
<script type="module" src="${L("/js/commun.js")}"></script>
${scripts.map((s) => `<script type="module" src="${L(s)}"></script>`).join("\n")}
</body>
</html>
`;
}
