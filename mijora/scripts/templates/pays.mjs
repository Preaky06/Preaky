import { page, esc, carteRecette, drapeau, icone, filAriane, jsonLdAriane, pluriel, courte } from "../lib/html.mjs";
import { carteMonde, silhouette } from "../lib/cartes.mjs";

const collator = new Intl.Collator("fr");

export function atlas(ctx) {
  const L = ctx.L;
  const { pays, continents, recettes } = ctx;
  const { svg, absents } = carteMonde(pays, L);
  const avecRecettes = pays.filter((p) => p.recettes.length).length;

  const liste = [...continents.values()].map((c) => {
    const items = [...c.pays].sort((a, b) => collator.compare(a.name_fr, b.name_fr)).map((p) => `<li data-nom="${esc(p.name_fr.toLowerCase())}" data-etat="${p.recettes.length ? "recettes" : p.editorial ? "editorial" : "vide"}">
        <a href="${L(p.url)}">${drapeau(p)}<span class="atlas-nom">${esc(p.name_fr)}</span>${p.recettes.length ? `<span class="atlas-nb">${pluriel(p.recettes.length, "recette", "recettes")}</span>` : ""}</a></li>`).join("");
    return `<section class="atlas-continent" id="${c.slug}" data-continent="${c.slug}" aria-labelledby="t-${c.slug}">
    <h2 id="t-${c.slug}" class="atlas-continent-titre">${esc(c.nom)} <span>${pluriel(c.pays.length, "pays", "pays")}</span></h2>
    <ul class="atlas-liste">${items}</ul>
  </section>`;
  }).join("");

  const filtres = [["tous", "Tous"], ...[...continents.values()].map((c) => [c.slug, c.nom])]
    .map(([s, n], i) => `<button type="button" class="puce" data-filtre-continent="${s}" aria-pressed="${i === 0}">${esc(n)}</button>`).join("");

  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Pays", "/pays"]], L)}
  <h1 class="page-titre">Atlas gastronomique</h1>
  <p class="page-chapo">Les 195 pays de référence (193 États membres de l'ONU, le Vatican et la Palestine), chacun avec sa page. ${avecRecettes} pays ont déjà au moins une recette ; les autres pages s'enrichiront au fil des vérifications.</p>
</div>
<section class="atlas-carte-bloc" aria-label="Carte du monde">
  <div class="atlas-carte" data-atlas-carte>
    ${svg}
    <p class="atlas-bulle" data-atlas-bulle hidden></p>
  </div>
  <ul class="legende" aria-label="Légende">
    <li><span class="pastille" data-etat="recettes"></span>Recettes disponibles</li>
    ${pays.some((p) => !p.recettes.length && p.editorial) ? '<li><span class="pastille" data-etat="editorial"></span>Présentation rédigée</li>' : ""}
    <li><span class="pastille" data-etat="vide"></span>Contenu en préparation</li>
  </ul>
  <p class="note">${absents.length} pays trop petits pour apparaître à cette échelle (${absents.map((p) => esc(p.name_fr)).join(", ")}) restent accessibles par la liste.</p>
</section>
<section class="atlas-index" aria-label="Liste des pays">
  <div class="atlas-outils">
    <div class="champ-recherche">
      ${icone("recherche")}
      <label class="sr" for="atlas-q">Rechercher un pays</label>
      <input id="atlas-q" type="search" placeholder="Rechercher un pays" autocomplete="off" data-atlas-recherche>
    </div>
    <div class="puces" role="group" aria-label="Filtrer par continent">${filtres}</div>
    <label class="interrupteur"><input type="checkbox" data-atlas-recettes> Seulement les pays avec recettes</label>
  </div>
  <p class="atlas-compte" data-atlas-compte aria-live="polite">195 pays</p>
  ${liste}
  <p class="atlas-vide" data-atlas-vide hidden>Aucun pays ne correspond à cette recherche.</p>
</section>`;

  return page(ctx, {
    route: "/pays",
    titre: "Atlas gastronomique des 195 pays",
    description: "Carte interactive et liste des 195 pays : découvrez la cuisine de chaque pays, ses ingrédients, ses traditions et ses recettes.",
    corps,
    section: "/pays",
    indexable: true,
    scripts: ["/js/atlas.js"],
    classe: "page-atlas",
    jsonld: [jsonLdAriane([["Accueil", "/"], ["Pays", "/pays"]])],
  });
}

function liste(items) {
  return `<ul class="liste-puces">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

export function pagePays(ctx, p) {
  const L = ctx.L;
  const { continents, traditions } = ctx;
  const cont = continents.get(p.continent);
  const ariane = [["Accueil", "/"], ["Pays", "/pays"], [cont.nom, `/pays#${cont.slug}`], [p.name_fr, p.url]];
  const s = silhouette(p);
  const e = p.editorial;
  const trads = traditions.filter((t) => t.pays.includes(p.iso2));
  const memeRegion = cont.pays.filter((x) => x.region === p.region && x !== p).sort((a, b) => collator.compare(a.name_fr, b.name_fr));
  const regionales = [
    ...(e ? e.plats.filter((x) => /\(.+\)$/.test(x)) : []),
    ...p.recettes.filter((r) => r.region).map((r) => `${r.titre} (${r.region})`),
  ];

  const sections = e ? `
  <div class="pays-sections">
    <section aria-labelledby="t-pres" class="pays-section pays-section-large"><h2 id="t-pres" class="titre-bloc">Présentation gastronomique</h2><p class="lettrine">${esc(e.presentation)}</p></section>
    ${e.influences ? `<section aria-labelledby="t-hist" class="pays-section"><h2 id="t-hist" class="titre-bloc">Histoire et influences</h2><p>${esc(e.influences)}</p></section>` : ""}
    <section aria-labelledby="t-ing" class="pays-section"><h2 id="t-ing" class="titre-bloc">Ingrédients caractéristiques</h2>${liste(e.ingredients)}</section>
    <section aria-labelledby="t-tech" class="pays-section"><h2 id="t-tech" class="titre-bloc">Techniques de cuisson</h2>${liste(e.techniques)}</section>
    <section aria-labelledby="t-plats" class="pays-section"><h2 id="t-plats" class="titre-bloc">Plats emblématiques</h2>${liste(e.plats)}</section>
    <section aria-labelledby="t-reg" class="pays-section"><h2 id="t-reg" class="titre-bloc">Spécialités régionales</h2>${regionales.length ? liste([...new Set(regionales)]) : "<p>Pas encore documentées.</p>"}</section>
    <section aria-labelledby="t-des" class="pays-section"><h2 id="t-des" class="titre-bloc">Desserts et boissons</h2>${liste(e.desserts)}</section>
  </div>
  <p class="note note-verif">${icone("info")}Texte rédigé à partir de connaissances générales, en attente de relecture et de sources. Les plats suivis d'une région ne sont pas communs à tout le pays.</p>` : `
  <div class="pays-attente">
    <h2 class="titre-bloc">Contenu éditorial en préparation</h2>
    <p>La présentation gastronomique, l'histoire, les ingrédients, les techniques, les plats emblématiques et les spécialités régionales de ce pays seront publiés après rédaction et vérification. Nous préférons une page incomplète à des informations inventées.</p>
  </div>`;

  const corps = `
<div class="pays-tete">
  <div class="pays-tete-texte">
    ${filAriane(ariane, L)}
    <p class="pays-drapeau-grand">${drapeau(p)}</p>
    <h1 class="page-titre">${esc(p.name_fr)}</h1>
    ${p.name_official_fr && p.name_official_fr !== p.name_fr ? `<p class="pays-officiel">${esc(p.name_official_fr)}</p>` : ""}
    ${p.noms_locaux.length ? `<p class="pays-locaux">Nom local : ${p.noms_locaux.map((n) => `<span>${esc(n)}</span>`).join(" · ")}</p>` : ""}
    <dl class="pays-faits">
      <div><dt>Continent</dt><dd><a href="${L(`/pays#${cont.slug}`)}">${esc(cont.nom)}</a></dd></div>
      <div><dt>Région</dt><dd>${esc(p.region)}</dd></div>
      <div><dt>Recettes</dt><dd>${p.recettes.length || "Aucune pour l'instant"}</dd></div>
    </dl>
  </div>
  <figure class="pays-visuel">
    ${s ? `<svg viewBox="0 0 ${s.W} ${s.H}" role="img" aria-label="Silhouette : ${esc(p.name_fr)}"><path d="${s.d}"/></svg>` : `<p class="pays-visuel-drapeau">${p.flag}</p>`}
    <figcaption>${s ? "Contour du territoire principal (Natural Earth). " : ""}Les photographies seront ajoutées avec leurs droits.</figcaption>
  </figure>
</div>
<div class="contenu">
${sections}
<section class="section-pays-recettes" aria-labelledby="t-recettes">
  <h2 id="t-recettes" class="titre-bloc">Recettes ${p.recettes.length ? `(${p.recettes.length})` : ""}</h2>
  ${p.recettes.length ? `<div class="grille-recettes grille-3">${p.recettes.map((r) => carteRecette(r, ctx)).join("")}</div>` : `<p>Aucune recette n'est encore disponible pour ce pays. <a href="${L("/explorer")}">Explorer les recettes d'autres pays</a></p>`}
</section>
<div class="pays-bas">
  <section aria-labelledby="t-fetes"><h2 id="t-fetes" class="titre-bloc">Traditions et fêtes</h2>${trads.length ? `<ul class="liste-liens">${trads.map((t) => `<li><a href="${L(t.url)}">${esc(t.nom)}</a></li>`).join("")}</ul>` : "<p>Pas encore documentées.</p>"}</section>
  ${p.voisins.length ? `<section aria-labelledby="t-voisins"><h2 id="t-voisins" class="titre-bloc">Pays frontaliers</h2><ul class="liste-pays">${p.voisins.map((v) => `<li><a href="${L(v.url)}">${drapeau(v)} ${esc(v.name_fr)}</a></li>`).join("")}</ul></section>` : ""}
  ${memeRegion.length ? `<section aria-labelledby="t-region"><h2 id="t-region" class="titre-bloc">${esc(p.region)}</h2><ul class="liste-pays">${memeRegion.map((v) => `<li><a href="${L(v.url)}">${drapeau(v)} ${esc(v.name_fr)}</a></li>`).join("")}</ul></section>` : ""}
</div>
</div>`;

  const description = e
    ? `${p.name_fr} : ${e.presentation}`
    : `${p.name_fr} : page de l'atlas gastronomique MIJORA (${cont.nom}, ${p.region}). Contenu éditorial en préparation.`;

  return page(ctx, {
    route: p.url,
    titre: `Cuisine et recettes : ${p.name_fr}`,
    description: courte(description),
    corps,
    section: "/pays",
    indexable: false,
    jsonld: [jsonLdAriane(ariane)],
    classe: "page-pays",
  });
}
