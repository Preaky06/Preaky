import { page, esc, carteRecette, drapeau, icone, minutes, filAriane, jsonLdAriane, libelleStatut, courte, jsonLdRecette } from "../lib/html.mjs";
import { libelle } from "../../src/js/quantites.js";
import { NATURES } from "../../data/regimes.mjs";

const NIVEAUX_ALLERGENE = {
  contient: "Contient",
  "selon-produit": "Selon le produit utilisé",
  facultatif: "Dans un ingrédient facultatif",
};

export function recette(ctx, r) {
  const L = ctx.L;
  const { taxo, regimes, traditions } = ctx;
  const cat = taxo.CATEGORIES.find((c) => c.slug === r.categorie).nom;
  const diff = taxo.DIFFICULTES.find((d) => d.slug === r.difficulte).nom;
  const budget = taxo.BUDGETS.find((b) => b.slug === r.budget).nom;
  const ariane = [["Accueil", "/"], ["Pays", "/pays"], [r.paysObj.name_fr, r.paysObj.url], [r.titre, r.url]];

  // Données des ingrédients pour le recalcul côté client
  const donnees = {
    slug: r.slug,
    titre: r.titre,
    url: r.url,
    portions: r.portions,
    lignes: r.lignes.map((l) => ({ s: l.ing.s, n: l.ing.n, p: l.ing.p, m: l.ing.m, f: l.ing.f, q: l.quantite, u: l.unite, note: l.note, opt: l.facultatif })),
  };

  const ingredients = r.lignes.map((l, i) => `<li class="ingredient${l.facultatif ? " facultatif" : ""}" data-ligne="${i}">
      <span class="ingredient-texte">${esc(libelle(l.ing, l.quantite, l.unite))}</span>${l.note ? ` <span class="ingredient-note">(${esc(l.note)})</span>` : ""}${l.facultatif ? ' <span class="ingredient-opt">facultatif</span>' : ""}
    </li>`).join("\n    ");

  const subs = r.substitutions.length ? `<div class="bloc-encadre">
    <h3 class="petit-titre">Substitutions</h3>
    <ul class="liste-simple">${r.substitutions.map((s) => `<li><strong>${esc(s.de.n)}</strong> → ${s.par ? esc(s.par.n) : "à omettre"}. ${esc(s.note)}</li>`).join("")}</ul>
  </div>` : "";

  const allerg = Object.entries(r.allergenes);
  const allergenes = `<div class="bloc-encadre" id="allergenes">
    <h3 class="petit-titre">Allergènes</h3>
    ${allerg.length ? `<ul class="liste-allergenes">${allerg.map(([slug, a]) => `<li data-niveau="${a.niveau}"><strong>${esc(taxo.ALLERGENES.find((x) => x.slug === slug).nom)}</strong> <span class="niveau">${NIVEAUX_ALLERGENE[a.niveau]}</span> <span class="source">${esc(a.sources.join(", "))}</span></li>`).join("")}</ul>` : "<p>Aucun des 14 allergènes réglementaires n'a été identifié dans les ingrédients.</p>"}
    <p class="note">Liste établie à partir des ingrédients de la recette, selon les 14 allergènes du règlement (UE) n° 1169/2011. Elle ne tient pas compte des contaminations croisées : vérifiez les étiquettes.</p>
  </div>`;

  const etapes = r.etapes.map(([t, m], i) => `<li class="etape"><span class="etape-num" aria-hidden="true">${i + 1}</span><div><p>${esc(t)}</p><p class="etape-duree">${icone("horloge")}environ ${minutes(m)}</p></div></li>`).join("\n");

  const regimesAffiches = regimes.map((d) => {
    const c = r.regimes[d.slug];
    return `<tr data-statut="${c.statut}"><th scope="row"><a href="${L(d.url)}">${esc(d.nom)}</a><span class="regime-nature-mini">${NATURES[d.nature].nom}</span></th><td><span class="statut statut-${c.statut}">${libelleStatut(c.statut)}</span>${c.notes.length ? `<ul class="statut-notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</td></tr>`;
  }).join("");

  const tradLiees = r.traditions.map((s) => traditions.find((t) => t.slug === s));
  const precaution = r.precautions ? `<div class="alerte" role="note">${icone("info")}<p><strong>Précautions.</strong> ${esc(r.precautions)}</p></div>` : "";

  const actions = `<div class="actions-recette">
    <button type="button" class="bouton" data-fav="${r.slug}" aria-pressed="false" aria-label="Ajouter aux favoris">${icone("coeur")}<span data-fav-texte>Ajouter aux favoris</span></button>
    <button type="button" class="bouton" data-partager>${icone("partager")}<span>Partager</span></button>
    ${ctx.mode === "prod" ? `<button type="button" class="bouton" data-imprimer>${icone("imprimer")}<span>Imprimer</span></button>` : ""}
  </div>`;

  const corps = `
<article class="recette" data-recette>
  <div class="bandeau-demo" role="note">${icone("info")}<p><strong>Recette de démonstration.</strong> Elle n'a pas encore été relue ni sourcée par la rédaction. <a href="${L("/charte-editoriale")}">Comment nous vérifions les recettes</a></p></div>
  <header class="recette-tete">
    <div class="recette-intro">
      ${filAriane(ariane, L)}
      <p class="recette-origine">${drapeau(r.paysObj)} <a href="${L(r.paysObj.url)}">${esc(r.paysObj.name_fr)}</a>${r.region ? ` · ${esc(r.region)}` : ""} · ${cat}</p>
      <h1 class="recette-titre">${esc(r.titre)}</h1>
      ${r.original && r.original !== r.titre ? `<p class="recette-original" lang="${r.langue}">${esc(r.original)}</p>` : ""}
      <p class="recette-chapo">${esc(r.introduction)}</p>
      ${actions}
    </div>
    <figure class="recette-visuel">
      <img src="${L(r.image)}" alt="Illustration du plat : ${esc(r.titre)}" width="800" height="600" fetchpriority="high">
      <figcaption>Illustration provisoire, générée à partir des ingrédients.</figcaption>
    </figure>
  </header>

  <dl class="faits">
    <div><dt>Préparation</dt><dd>${minutes(r.preparation)}</dd></div>
    <div><dt>Cuisson</dt><dd>${r.cuisson ? minutes(r.cuisson) : "Sans cuisson"}</dd></div>
    ${r.repos ? `<div><dt>Repos</dt><dd>${minutes(r.repos)}</dd></div>` : ""}
    <div class="fait-total"><dt>Temps total</dt><dd>${minutes(r.total)}</dd></div>
    <div><dt>Difficulté</dt><dd>${diff}</dd></div>
    <div><dt>Budget</dt><dd>${budget}</dd></div>
  </dl>

  <div class="recette-corps">
    <aside class="ingredients" aria-labelledby="t-ingredients">
      <div class="ingredients-tete">
        <h2 id="t-ingredients" class="titre-bloc">Ingrédients</h2>
        <div class="portions" role="group" aria-label="Nombre de portions">
          <button type="button" class="portions-btn" data-portions="-1" aria-label="Une portion de moins">${icone("moins")}</button>
          <output class="portions-val" aria-live="polite"><span data-portions-val>${r.portions}</span> <span data-portions-mot>${r.portions > 1 ? "portions" : "portion"}</span></output>
          <button type="button" class="portions-btn" data-portions="1" aria-label="Une portion de plus">${icone("plus")}</button>
        </div>
      </div>
      <ul class="liste-ingredients" data-ingredients>
    ${ingredients}
      </ul>
      <p class="note">Quantités recalculées et arrondies selon les portions, sans conversion entre volumes et masses.</p>
      <button type="button" class="bouton bouton-plein bouton-large" data-liste-courses>${icone("liste")}<span>Ajouter à la liste de courses</span></button>
      ${subs}
      ${allergenes}
    </aside>

    <div class="recette-texte">
      ${r.origine ? `<section aria-labelledby="t-origine"><h2 id="t-origine" class="titre-bloc">Origine et histoire</h2><p>${esc(r.origine)}</p></section>` : ""}
      ${precaution}
      <section aria-labelledby="t-prepa">
        <h2 id="t-prepa" class="titre-bloc">Préparation</h2>
        <ol class="etapes">${etapes}</ol>
      </section>
      ${r.conseils.length ? `<section aria-labelledby="t-conseils"><h2 id="t-conseils" class="titre-bloc">Conseils</h2><ul class="liste-simple">${r.conseils.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}
      ${r.erreurs.length ? `<section aria-labelledby="t-erreurs"><h2 id="t-erreurs" class="titre-bloc">Erreurs à éviter</h2><ul class="liste-simple">${r.erreurs.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}
      <section class="pratique" aria-label="Conservation et réchauffage">
        <div><h2 class="petit-titre">Conservation</h2><p>${esc(r.conservation ?? "Non précisée.")}</p></div>
        ${r.rechauffage ? `<div><h2 class="petit-titre">Réchauffage</h2><p>${esc(r.rechauffage)}</p></div>` : ""}
      </section>
      ${r.variantes.length ? `<section><h2 class="titre-bloc">Variantes régionales</h2><ul class="liste-simple">${r.variantes.map((v) => `<li>${esc(v)}</li>`).join("")}</ul></section>` : ""}
    </div>
  </div>

  <section class="recette-annexes">
    <div class="annexe annexe-large" aria-labelledby="t-regimes">
      <h2 id="t-regimes" class="titre-bloc">Régimes et restrictions</h2>
      <p class="note">Compatibilités calculées à partir des ingrédients et de leur origine, non encore vérifiées par la rédaction. « Selon les produits » : un ingrédient change de composition selon la marque.</p>
      <div class="tableau-defilant"><table class="tableau-regimes"><tbody>${regimesAffiches}</tbody></table></div>
    </div>
    <div class="annexe" aria-labelledby="t-nutrition">
      <h2 id="t-nutrition" class="titre-bloc">Nutrition</h2>
      <p>Valeurs nutritionnelles non calculées.</p>
      <p class="note">Elles seront établies à partir d'une table de composition de référence (par exemple la table Ciqual de l'Anses) une fois les quantités vérifiées. Nous préférons ne rien afficher plutôt qu'une estimation non vérifiée.</p>
    </div>
    <div class="annexe" aria-labelledby="t-sources">
      <h2 id="t-sources" class="titre-bloc">Sources éditoriales</h2>
      <p>Aucune source n'est encore rattachée à cette recette.</p>
      <p class="note">Statut : à vérifier. Une recette n'est publiée qu'avec une source ou une provenance éditoriale, une date de vérification et une image dont les droits sont acquis.</p>
    </div>
    ${tradLiees.length ? `<div class="annexe" aria-labelledby="t-trad"><h2 id="t-trad" class="titre-bloc">Traditions</h2><ul class="liste-liens">${tradLiees.map((t) => `<li><a href="${L(t.url)}">${esc(t.nom)}</a></li>`).join("")}</ul></div>` : ""}
  </section>

  <section class="section-similaires" aria-labelledby="t-similaires">
    <h2 id="t-similaires" class="titre-bloc">Recettes similaires</h2>
    <div class="grille-recettes grille-3">${r.similaires.map((x) => carteRecette(x, ctx)).join("")}</div>
  </section>
  <script type="application/json" id="donnees-recette">${JSON.stringify(donnees).replace(/</g, "\\u003c")}</script>
</article>`;

  return page(ctx, {
    route: r.url,
    titre: `${r.titre} (${r.paysObj.name_fr})`,
    description: courte(`${r.titre} : ${r.introduction}`),
    corps,
    section: "/explorer",
    indexable: r.statut === "publie",
    ogType: "article",
    // Données structurées Recipe seulement pour une recette publiée, avec une image dont les droits sont acquis
    jsonld: [jsonLdAriane(ariane), ...(r.statut === "publie" && r.image_licence ? [jsonLdRecette(r, ctx)] : [])],
    scripts: ["/js/recette.js"],
    classe: "page-recette",
  });
}
