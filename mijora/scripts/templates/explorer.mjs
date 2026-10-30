import { page, esc, carteRecette, icone, filAriane, jsonLdAriane } from "../lib/html.mjs";

export const PAR_PAGE = 12;
const REGIMES_FILTRES = ["vegetarien", "vegetalien", "pescetarien", "carnivore", "omnivore", "keto", "sans-gluten", "sans-lactose", "halal", "casher"];
const FAMILLES_FILTRES = ["viandes", "poissons", "legumes", "fruits", "feculents", "legumineuses", "produits-laitiers", "epices"];
const collator = new Intl.Collator("fr");

function cases(nom, items, legende, aide = "") {
  return `<fieldset class="filtre">
  <legend>${legende}</legend>${aide ? `<p class="filtre-aide">${aide}</p>` : ""}
  ${items.map(([v, l, inactif, note]) => `<label class="case${inactif ? " case-inactive" : ""}"><input type="checkbox" name="${nom}" value="${v}"${inactif ? " disabled" : ""}><span>${esc(l)}${note ? ` <small>${esc(note)}</small>` : ""}</span></label>`).join("\n  ")}
</fieldset>`;
}

export function explorer(ctx) {
  const L = ctx.L;
  const { taxo, regimes, recettes, pays, continents } = ctx;
  const paysAvec = pays.filter((p) => p.recettes.length).sort((a, b) => collator.compare(a.name_fr, b.name_fr));
  const regions = [...new Set(recettes.filter((r) => r.region).map((r) => r.region))].sort(collator.compare);
  const tries = [...recettes].sort((a, b) => collator.compare(a.titre, b.titre));

  const filtres = `
<form class="filtres" id="filtres" aria-label="Filtres" data-filtres>
  <div class="filtres-tete">
    <h2 class="petit-titre">Filtres</h2>
    <button type="button" class="lien-bouton" data-effacer>Tout effacer</button>
    <button type="button" class="outil filtres-fermer" data-fermer-filtres aria-label="Fermer les filtres">${icone("fermer")}</button>
  </div>
  <fieldset class="filtre">
    <legend>Géographie</legend>
    <label class="champ"><span>Continent</span><select name="continent"><option value="">Tous les continents</option>${[...continents.values()].map((c) => `<option value="${c.slug}">${esc(c.nom)}</option>`).join("")}</select></label>
    <label class="champ"><span>Pays</span><select name="pays"><option value="">Tous les pays</option>${paysAvec.map((p) => `<option value="${p.slug}">${esc(p.name_fr)} (${p.recettes.length})</option>`).join("")}</select></label>
    <label class="champ"><span>Région</span><select name="region"><option value="">Toutes les régions</option>${regions.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}</select></label>
  </fieldset>
  ${cases("regime", REGIMES_FILTRES.map((s) => { const d = regimes.find((x) => x.slug === s); return [s, d.nom, !d.regle, d.regle ? "" : "non évalué"]; }), "Alimentation", "Compatibilités calculées à partir des ingrédients.")}
  <label class="interrupteur"><input type="checkbox" name="strict" value="1"> Sans adaptation uniquement</label>
  ${cases("categorie", taxo.CATEGORIES.map((c) => [c.slug, c.nom]), "Type de plat")}
  ${cases("temps", taxo.TEMPS.map((t) => [t.slug, t.nom]), "Temps total")}
  ${cases("difficulte", taxo.DIFFICULTES.map((d) => [d.slug, d.nom]), "Difficulté")}
  ${cases("budget", taxo.BUDGETS.map((b) => [b.slug, b.nom]), "Budget")}
  ${cases("famille", FAMILLES_FILTRES.map((s) => [s, taxo.FAMILLES.find((f) => f.slug === s).nom]), "Ingrédients", "Recettes qui en contiennent.")}
  ${cases("sans", taxo.ALLERGENES.map((a) => [a.slug, a.nom]), "Allergènes à exclure", "Exclut aussi les ingrédients dont la composition varie selon la marque.")}
  <div class="filtres-pied"><button type="button" class="bouton bouton-plein bouton-large" data-fermer-filtres>Voir les résultats</button></div>
</form>`;

  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Explorer", "/explorer"]], L)}
  <h1 class="page-titre">Explorer les recettes</h1>
  <form class="explorer-recherche" role="search" data-recherche-explorer>
    <label class="sr" for="q">Rechercher par plat, ingrédient ou pays</label>
    ${icone("recherche")}
    <input id="q" name="q" type="search" autocomplete="off" placeholder="Une recette japonaise végétarienne en moins de 30 minutes" role="combobox" aria-expanded="false" aria-controls="q-liste" aria-autocomplete="list" data-suggestions data-suggestions-local>
    <button type="submit" class="bouton bouton-plein">Rechercher</button>
    <ul class="suggestions" id="q-liste" role="listbox" aria-label="Suggestions"></ul>
  </form>
  <div class="compris" data-compris hidden></div>
</div>
<div class="explorer">
  ${filtres}
  <section class="resultats" aria-labelledby="t-resultats">
    <div class="resultats-tete">
      <h2 id="t-resultats" class="resultats-nombre" data-nombre aria-live="polite">${recettes.length} recettes</h2>
      <div class="resultats-outils">
        <button type="button" class="bouton filtres-ouvrir" data-ouvrir-filtres aria-controls="filtres" aria-expanded="false">${icone("filtre")}<span>Filtres</span><span class="pastille-nb" data-nb-filtres hidden></span></button>
        <label class="champ champ-ligne"><span>Trier par</span>
          <select name="tri" form="filtres" data-tri>
            <option value="pertinence">Pertinence</option>
            <option value="popularite" disabled title="Aucune statistique de consultation n'est encore disponible">Popularité (bientôt)</option>
            <option value="duree">Durée</option>
            <option value="difficulte">Difficulté</option>
            <option value="alpha" selected>Ordre alphabétique</option>
          </select>
        </label>
      </div>
    </div>
    <div class="actifs" data-actifs></div>
    <div class="grille-recettes" data-grille>${tries.slice(0, PAR_PAGE).map((r) => carteRecette(r, ctx)).join("")}</div>
    <div class="vide" data-vide hidden></div>
    <nav class="pagination" aria-label="Pagination" data-pagination></nav>
  </section>
</div>`;

  return page(ctx, {
    route: "/explorer",
    titre: "Explorer les recettes du monde",
    description: "Recherchez parmi les recettes par pays, continent, régime alimentaire, temps, difficulté, budget, ingrédients et allergènes. Les filtres se combinent et se partagent par lien.",
    corps,
    section: "/explorer",
    indexable: true,
    scripts: ["/js/explorer.js"],
    classe: "page-explorer",
    jsonld: [jsonLdAriane([["Accueil", "/"], ["Explorer", "/explorer"]])],
  });
}
