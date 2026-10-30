import { page, esc, carteRecette, drapeau, icone, filAriane, jsonLdAriane, pluriel, courte, libelleStatut } from "../lib/html.mjs";
import { NATURES } from "../../data/regimes.mjs";
import { TYPES_TRADITION, SAISONS } from "../../data/traditions.mjs";

const puces = (items) => `<ul class="liste-puces">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

// ---------------------------------------------------------------- régimes
export function regimesIndex(ctx) {
  const L = ctx.L;
  const groupes = Object.entries(NATURES).map(([n, info]) => {
    const ds = ctx.regimes.filter((d) => d.nature === n);
    return `<section class="groupe-regimes" aria-labelledby="t-${n}">
    <div class="groupe-tete"><h2 id="t-${n}" class="titre-bloc">${info.nom}</h2><p>${info.detail}</p></div>
    <div class="grille-regimes grille-regimes-clair">${ds.map((d) => `<article class="regime-tuile" data-nature="${d.nature}">
      <h3><a class="lien-etendu" href="${L(d.url)}">${esc(d.nom)}</a></h3>
      <p>${esc(d.accroche)}</p>
      <p class="regime-nb">${!d.regle ? "Compatibilité non évaluée" : d.recettes.length ? pluriel(d.recettes.length, "recette", "recettes") : "Aucune recette du catalogue"}</p>
    </article>`).join("")}</div>
  </section>`;
  }).join("");

  const allergenes = ctx.taxo.ALLERGENES.map((a) => `<li><a href="${L(`/explorer?sans=${a.slug}`)}">${esc(a.nom)}</a>${a.detail ? `<span>${esc(a.detail)}</span>` : ""}</li>`).join("");

  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Alimentation", "/regimes"]], L)}
  <h1 class="page-titre">Alimentation</h1>
  <p class="page-chapo">Un régime végétarien, une maladie cœliaque et le jeûne du ramadan n'obéissent pas aux mêmes règles. Chaque fiche précise sa nature, ses principes, ses exclusions et ses précautions, puis les recettes compatibles.</p>
</div>
<div class="alerte alerte-large" role="note">${icone("info")}<p><strong>Comment nous établissons la compatibilité.</strong> Chaque ingrédient est décrit par son origine (végétale, viande, poisson, lait, œuf…) et ses allergènes. La compatibilité d'une recette en est déduite, en tenant compte des ingrédients facultatifs et des substitutions proposées. Elle reste marquée « calculée » tant qu'un éditeur ne l'a pas vérifiée. Les régimes religieux et les objectifs nutritionnels ne sont pas évalués automatiquement.</p></div>
${groupes}
<section class="groupe-regimes" aria-labelledby="t-allergenes">
  <div class="groupe-tete"><h2 id="t-allergenes" class="titre-bloc">Allergènes</h2><p>Une allergie n'est pas un régime : la moindre trace peut suffire à déclencher une réaction. Les 14 allergènes à déclaration obligatoire en Europe (règlement UE n° 1169/2011) peuvent être exclus dans l'explorateur.</p></div>
  <ul class="liste-allergenes-index">${allergenes}</ul>
</section>`;

  return page(ctx, {
    route: "/regimes",
    titre: "Régimes, restrictions et allergènes",
    description: "Végétarien, végétalien, sans gluten, sans lactose, halal, casher, keto… Définitions, principes, exclusions, précautions et recettes compatibles.",
    corps, section: "/regimes", indexable: true, classe: "page-regimes",
    jsonld: [jsonLdAriane([["Accueil", "/"], ["Alimentation", "/regimes"]])],
  });
}

export function pageRegime(ctx, d) {
  const L = ctx.L;
  const ariane = [["Accueil", "/"], ["Alimentation", "/regimes"], [d.nom, d.url]];
  const parStatut = (s) => d.recettes.filter((r) => r.regimes[d.slug].statut === s);
  const blocRecettes = (s, titre, texte) => {
    const rs = parStatut(s);
    if (!rs.length) return "";
    return `<section class="regime-recettes" aria-labelledby="t-${s}">
    <h3 id="t-${s}" class="petit-titre">${titre} (${rs.length})</h3><p class="note">${texte}</p>
    <div class="grille-recettes grille-3">${rs.map((r) => carteRecette(r, ctx, { titre: "h4" })).join("")}</div>
  </section>`;
  };
  const recettes = d.regle
    ? (d.recettes.length
      ? blocRecettes("compatible", "Compatibles", "Aucun ingrédient exclu.") +
        blocRecettes("adaptable", "Adaptables", "Compatibles en omettant un ingrédient facultatif ou en suivant la substitution indiquée sur la fiche.") +
        blocRecettes("selon-produits", "Selon les produits", "Un ingrédient change de composition selon la marque : vérifiez l'étiquette.")
      : "<p>Aucune recette du catalogue actuel ne correspond à ce mode d'alimentation.</p>")
    : `<p>La compatibilité des recettes avec ce mode d'alimentation n'est pas évaluée automatiquement. ${d.nature === "religieux" ? "Elle dépend de la provenance et de la certification des produits, que la recette seule ne permet pas de connaître." : "Elle exige des valeurs nutritionnelles vérifiées, que MIJORA n'affiche pas encore."}</p>`;

  const corps = `
<div class="page-tete">
  ${filAriane(ariane, L)}
  <p class="surtitre">${NATURES[d.nature].nom}</p>
  <h1 class="page-titre">${esc(d.nom)}</h1>
  <p class="page-chapo">${esc(d.definition)}</p>
</div>
<div class="contenu">
<div class="regime-grille">
  <section aria-labelledby="t-principes"><h2 id="t-principes" class="titre-bloc">Principes</h2>${puces(d.principes)}</section>
  <section aria-labelledby="t-compat"><h2 id="t-compat" class="titre-bloc">Ingrédients compatibles</h2>${puces(d.compatibles)}</section>
  <section aria-labelledby="t-excl"><h2 id="t-excl" class="titre-bloc">Exclusions</h2>${puces(d.exclusions)}</section>
  ${d.precautions.length ? `<section class="regime-precautions" aria-labelledby="t-prec"><h2 id="t-prec" class="titre-bloc">Précautions</h2>${puces(d.precautions)}</section>` : ""}
</div>
<section class="section-regime-recettes" aria-labelledby="t-recettes">
  <h2 id="t-recettes" class="titre-bloc">Recettes correspondantes</h2>
  ${recettes}
  <p class="note">Ces informations sont générales et ne remplacent pas l'avis d'un professionnel de santé.</p>
</section>
</div>`;

  return page(ctx, {
    route: d.url,
    titre: `${d.nom} : définition, principes et recettes`,
    description: courte(`${d.nom}. ${d.definition}`),
    corps, section: "/regimes", indexable: false, classe: "page-regime",
    jsonld: [jsonLdAriane(ariane)],
  });
}

// ---------------------------------------------------------------- traditions
export function traditionsIndex(ctx) {
  const L = ctx.L;
  const types = Object.entries(TYPES_TRADITION);
  const saisons = [...new Set(ctx.traditions.map((t) => t.saison))];
  const cartes = ctx.traditions.map((t) => `<article class="tradition-tuile tradition-tuile-grande" data-type="${t.type}" data-saison="${t.saison}">
    <p class="tradition-type">${TYPES_TRADITION[t.type]} · ${SAISONS[t.saison]}</p>
    <h2 class="tradition-titre"><a class="lien-etendu" href="${L(t.url)}">${esc(t.nom)}</a></h2>
    <p>${esc(courte(t.histoire, 150))}</p>
    <p class="tradition-pays">${t.paysObj.length ? t.paysObj.map((p) => `${drapeau(p)} ${esc(p.name_fr)}`).join(" · ") : esc(t.lieux)}</p>
    <p class="tradition-nb">${t.recettes.length ? pluriel(t.recettes.length, "recette", "recettes") : "Recettes à venir"}</p>
  </article>`).join("");

  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Traditions", "/traditions"]], L)}
  <h1 class="page-titre">Traditions culinaires</h1>
  <p class="page-chapo">Fêtes religieuses et civiles, pratiques du quotidien : ce que l'on cuisine, quand, et où. Une pratique propre à une région est présentée comme telle, jamais comme celle de tout un pays.</p>
</div>
<div class="traditions-filtres" data-traditions-filtres>
  <div class="puces" role="group" aria-label="Type de tradition"><button type="button" class="puce" data-filtre-type="" aria-pressed="true">Tous les types</button>${types.map(([s, n]) => `<button type="button" class="puce" data-filtre-type="${s}" aria-pressed="false">${n}</button>`).join("")}</div>
  <div class="puces" role="group" aria-label="Saison"><button type="button" class="puce" data-filtre-saison="" aria-pressed="true">Toutes les saisons</button>${saisons.map((s) => `<button type="button" class="puce" data-filtre-saison="${s}" aria-pressed="false">${SAISONS[s]}</button>`).join("")}</div>
</div>
<div class="grille-traditions grille-traditions-page" data-traditions>${cartes}</div>
<p class="vide" data-traditions-vide hidden>Aucune tradition ne correspond à ces filtres.</p>`;

  return page(ctx, {
    route: "/traditions",
    titre: "Traditions culinaires du monde",
    description: "Noël, ramadan, Nouvel An chinois, Diwali, Thanksgiving, cuisine familiale, street food : les traditions culinaires, leurs périodes, leurs plats et leurs recettes.",
    corps, section: "/traditions", indexable: true, scripts: ["/js/traditions.js"], classe: "page-traditions",
    jsonld: [jsonLdAriane([["Accueil", "/"], ["Traditions", "/traditions"]])],
  });
}

export function pageTradition(ctx, t) {
  const L = ctx.L;
  const ariane = [["Accueil", "/"], ["Traditions", "/traditions"], [t.nom, t.url]];
  const corps = `
<div class="page-tete">
  ${filAriane(ariane, L)}
  <p class="surtitre">${TYPES_TRADITION[t.type]} · ${SAISONS[t.saison]}</p>
  <h1 class="page-titre">${esc(t.nom)}</h1>
  <p class="page-chapo">${esc(t.histoire)}</p>
</div>
<div class="contenu">
<div class="tradition-grille">
  <dl class="tradition-faits">
    <div><dt>Période</dt><dd>${esc(t.periode)}</dd></div>
    <div><dt>Pays et régions</dt><dd>${esc(t.lieux)}</dd></div>
  </dl>
  <section aria-labelledby="t-sens"><h2 id="t-sens" class="titre-bloc">Signification</h2><p>${esc(t.signification)}</p></section>
  ${t.plats.length ? `<section aria-labelledby="t-plats"><h2 id="t-plats" class="titre-bloc">Plats associés</h2>${puces(t.plats)}</section>` : ""}
  ${t.paysObj.length ? `<section aria-labelledby="t-pays"><h2 id="t-pays" class="titre-bloc">Pays cités</h2><ul class="liste-pays">${t.paysObj.map((p) => `<li><a href="${L(p.url)}">${drapeau(p)} ${esc(p.name_fr)}</a></li>`).join("")}</ul></section>` : ""}
</div>
<section class="section-regime-recettes" aria-labelledby="t-recettes">
  <h2 id="t-recettes" class="titre-bloc">Recettes disponibles</h2>
  ${t.recettes.length ? `<div class="grille-recettes grille-3">${t.recettes.map((r) => carteRecette(r, ctx)).join("")}</div>` : "<p>Aucune recette du catalogue n'est encore rattachée à cette tradition. Les plats associés ci-dessus seront ajoutés au fil des vérifications.</p>"}
  <p class="note note-verif">${icone("info")}Texte en attente de relecture et de sources. Les photographies seront ajoutées avec leurs droits.</p>
</section>
</div>`;
  return page(ctx, {
    route: t.url,
    titre: `${t.nom} : traditions culinaires et recettes`,
    description: courte(`${t.nom}. ${t.histoire}`),
    corps, section: "/traditions", indexable: false, classe: "page-tradition",
    jsonld: [jsonLdAriane(ariane)],
  });
}

// ---------------------------------------------------------------- magazine
export function articlesIndex(ctx) {
  const L = ctx.L;
  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Magazine", "/articles"]], L)}
  <h1 class="page-titre">Le magazine</h1>
  <p class="page-chapo">Histoire des plats, origine des ingrédients, techniques et différences régionales.</p>
</div>
<div class="grille-articles grille-articles-page">${ctx.articles.map((a) => `<article class="article-carte">
  <p class="surtitre">${esc(a.rubrique)}</p>
  <h2 class="article-carte-titre"><a class="lien-etendu" href="${L(a.url)}">${esc(a.titre)}</a></h2>
  <p>${esc(a.chapo)}</p>
</article>`).join("")}</div>`;
  return page(ctx, {
    route: "/articles", titre: "Le magazine", description: "Articles sur l'histoire des plats, l'origine des ingrédients et les techniques des cuisines du monde.",
    corps, section: "", indexable: true, classe: "page-articles",
    jsonld: [jsonLdAriane([["Accueil", "/"], ["Magazine", "/articles"]])],
  });
}

export function pageArticle(ctx, a) {
  const L = ctx.L;
  const ariane = [["Accueil", "/"], ["Magazine", "/articles"], [a.titre, a.url]];
  const corps = `
<article class="article">
  <header class="article-tete">
    ${filAriane(ariane, L)}
    <p class="surtitre">${esc(a.rubrique)}</p>
    <h1 class="page-titre">${esc(a.titre)}</h1>
    <p class="page-chapo">${esc(a.chapo)}</p>
  </header>
  <div class="article-corps">
    ${a.corps.map(([t, x]) => (t === "h" ? `<h2>${esc(x)}</h2>` : `<p>${esc(x)}</p>`)).join("\n    ")}
    <p class="note note-verif">${icone("info")}Article de démonstration, en attente de relecture et de sources.</p>
  </div>
  <aside class="article-liens">
    <h2 class="petit-titre">Pour aller plus loin</h2>
    <ul class="liste-liens">${a.paysObj.map((p) => `<li><a href="${L(p.url)}">${drapeau(p)} La cuisine : ${esc(p.name_fr)}</a></li>`).join("")}</ul>
    <div class="grille-recettes grille-2">${a.recettesObj.map((r) => carteRecette(r, ctx)).join("")}</div>
  </aside>
</article>`;
  return page(ctx, {
    route: a.url, titre: a.titre, description: courte(a.chapo),
    corps, section: "", indexable: false, ogType: "article", classe: "page-article",
    jsonld: [jsonLdAriane(ariane)],
  });
}

// ---------------------------------------------------------------- espaces personnels
export function favoris(ctx) {
  const L = ctx.L;
  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Favoris", "/favoris"]], L)}
  <h1 class="page-titre">Vos favoris</h1>
  <p class="page-chapo">Vos favoris sont enregistrés sur cet appareil, dans ce navigateur. Ils pourront être synchronisés avec votre compte quand la connexion sera ouverte.</p>
</div>
<div class="grille-recettes" data-favoris></div>
<div class="vide" data-favoris-vide hidden>
  <p>Vous n'avez encore aucun favori. Touchez le cœur d'une recette pour la retrouver ici.</p>
  <a class="bouton bouton-plein" href="${L("/explorer")}">Explorer les recettes</a>
</div>`;
  return page(ctx, { route: "/favoris", titre: "Vos favoris", description: "Les recettes que vous avez enregistrées.", corps, section: "", scripts: ["/js/favoris.js"], classe: "page-favoris" });
}

export function listeCourses(ctx) {
  const L = ctx.L;
  const familles = ctx.taxo.FAMILLES.map((f) => `<option value="${f.slug}">${esc(f.nom)}</option>`).join("");
  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Liste de courses", "/liste-de-courses"]], L)}
  <h1 class="page-titre">Liste de courses</h1>
  <p class="page-chapo">Ajoutez les ingrédients d'une recette depuis sa fiche : les ingrédients identiques sont regroupés, et additionnés quand leurs unités sont comparables (masses entre elles, volumes entre eux). Vos listes restent sur cet appareil.</p>
</div>
<div class="courses" data-courses>
  <div class="courses-listes">
    <label class="champ"><span>Liste</span><select data-liste-choix></select></label>
    <button type="button" class="bouton" data-liste-nouvelle>${icone("plus")}<span>Nouvelle liste</span></button>
    <button type="button" class="bouton" data-liste-renommer>Renommer</button>
    <button type="button" class="bouton bouton-discret" data-liste-supprimer>Supprimer la liste</button>
  </div>
  <form class="courses-ajout" data-courses-ajout>
    <label class="champ"><span>Article</span><input name="nom" required placeholder="Ex. : citrons" autocomplete="off"></label>
    <label class="champ champ-court"><span>Quantité</span><input name="quantite" placeholder="Ex. : 3" inputmode="decimal" autocomplete="off"></label>
    <label class="champ"><span>Rayon</span><select name="famille">${familles}</select></label>
    <button type="submit" class="bouton bouton-plein">Ajouter</button>
  </form>
  <div data-courses-contenu></div>
  <div class="vide" data-courses-vide hidden><p>Cette liste est vide. Ouvrez une recette et choisissez « Ajouter à la liste de courses ».</p><a class="bouton bouton-plein" href="${L("/explorer")}">Explorer les recettes</a></div>
  <div class="courses-pied">
    <button type="button" class="bouton" data-courses-coches>Retirer les articles cochés</button>
    <button type="button" class="bouton" data-courses-copier>${icone("liste")}<span>Copier la liste</span></button>
  </div>
  <div class="confirmation" data-confirmation hidden role="alertdialog" aria-labelledby="conf-texte">
    <p id="conf-texte" data-confirmation-texte></p>
    <div><button type="button" class="bouton bouton-plein" data-confirmation-oui>Confirmer</button><button type="button" class="bouton" data-confirmation-non>Annuler</button></div>
  </div>
</div>`;
  return page(ctx, { route: "/liste-de-courses", titre: "Liste de courses", description: "Vos listes de courses, constituées à partir des recettes.", corps, section: "", scripts: ["/js/liste.js"], classe: "page-courses" });
}

export function compte(ctx) {
  const L = ctx.L;
  const corps = `
<div class="page-tete">
  ${filAriane([["Accueil", "/"], ["Compte", "/compte"]], L)}
  <h1 class="page-titre">Votre compte</h1>
  <p class="page-chapo">Un compte n'est jamais nécessaire pour consulter le catalogue. Il servira à retrouver vos favoris, collections, listes et menus sur tous vos appareils.</p>
</div>
<div class="compte" data-compte>
  <div class="compte-indispo" data-compte-indispo>
    <h2 class="titre-bloc">Connexion pas encore ouverte</h2>
    <p>La connexion repose sur Supabase. Elle s'activera quand le site sera relié à sa base de données (adresse du projet et clé publique dans <code>config.js</code>). En attendant, vos favoris et vos listes de courses fonctionnent sur cet appareil.</p>
    <ul class="liste-liens"><li><a href="${L("/favoris")}">Vos favoris</a></li><li><a href="${L("/liste-de-courses")}">Vos listes de courses</a></li></ul>
  </div>
  <form class="compte-form" data-compte-form hidden>
    <h2 class="titre-bloc">Recevoir un lien de connexion</h2>
    <label class="champ"><span>Adresse e-mail</span><input type="email" name="email" required autocomplete="email"></label>
    <button type="submit" class="bouton bouton-plein">Recevoir le lien</button>
    <p class="note" data-compte-etat aria-live="polite"></p>
  </form>
  <div class="compte-connecte" data-compte-connecte hidden>
    <h2 class="titre-bloc">Connecté</h2>
    <p>Adresse : <strong data-compte-email></strong></p>
    <button type="button" class="bouton" data-compte-deconnexion>Se déconnecter</button>
  </div>
</div>`;
  return page(ctx, { route: "/compte", titre: "Votre compte", description: "Connexion à MIJORA.", corps, section: "", scripts: ["/js/compte.js"], classe: "page-compte" });
}

// ---------------------------------------------------------------- charte
export function charte(ctx) {
  const L = ctx.L;
  const corps = `
<article class="article">
  <header class="article-tete">
    ${filAriane([["Accueil", "/"], ["Charte éditoriale", "/charte-editoriale"]], L)}
    <h1 class="page-titre">Charte éditoriale et sources</h1>
    <p class="page-chapo">Ce que MIJORA publie, comment les informations sont vérifiées, et d'où viennent les données.</p>
  </header>
  <div class="article-corps">
    <h2>Statuts éditoriaux</h2>
    <dl class="statuts">
      <div><dt>Brouillon</dt><dd>En cours de rédaction, invisible du public.</dd></div>
      <div><dt>À vérifier</dt><dd>Rédigé, en attente de relecture et de sources. Les contenus actuels du site sont à ce stade et affichés comme données de démonstration.</dd></div>
      <div><dt>Vérifié</dt><dd>Relu, sourcé et daté par un éditeur, prêt à être publié.</dd></div>
      <div><dt>Publié</dt><dd>Visible et indexé par les moteurs de recherche.</dd></div>
      <div><dt>Archivé</dt><dd>Retiré de la publication, conservé pour l'historique.</dd></div>
    </dl>
    <h2>Conditions de publication d'une recette</h2>
    <p>Une recette n'est publiée qu'avec un nom, un pays d'origine justifié, une catégorie, une liste d'ingrédients, des instructions relues, une image dont les droits sont acquis, une source ou une provenance éditoriale, et une date de vérification. Les pages qui ne remplissent pas ces conditions ne sont pas proposées aux moteurs de recherche.</p>
    <h2>Ce que nous ne faisons pas</h2>
    <p>Nous n'inventons ni traditions, ni origines, ni spécialités, ni nombre de recettes. Nous n'affichons ni avis, ni notes, ni statistiques de popularité tant qu'ils ne reposent pas sur des données réelles. Une pratique régionale n'est jamais présentée comme celle de tout un pays.</p>
    <h2>Régimes, allergènes et nutrition</h2>
    <p>Les compatibilités sont déduites de la composition de chaque recette : origine des ingrédients, allergènes, ingrédients facultatifs et substitutions. Un ingrédient dont la composition varie selon la marque (sauce soja, miso, épices moulues…) est signalé « selon le produit ». Les régimes religieux et les objectifs nutritionnels ne sont pas évalués automatiquement. Les valeurs nutritionnelles ne sont pas encore calculées : nous n'affichons pas d'estimation non vérifiée.</p>
    <h2>Quantités et unités</h2>
    <p>Les quantités sont exprimées en unités métriques. Le recalcul des portions arrondit à des valeurs utilisables en cuisine et ne convertit jamais un volume en masse, ce qui exigerait la densité de chaque ingrédient.</p>
    <h2>Images</h2>
    <p>Les illustrations actuelles sont générées à partir des ingrédients de chaque recette. Elles seront remplacées par des photographies dont les droits d'utilisation sont acquis et crédités.</p>
    <h2>Données et licences</h2>
    <ul class="liste-simple">
      <li>Pays, codes ISO, noms et frontières : <a href="https://github.com/mledoze/countries">mledoze/countries</a>, base de données sous licence ODbL 1.0.</li>
      <li>Contours géographiques : <a href="https://www.naturalearthdata.com/">Natural Earth</a> (domaine public), via le paquet world-atlas.</li>
      <li>Drapeaux : police Twemoji Country Flags, dessins <a href="https://github.com/twitter/twemoji">Twemoji</a> sous licence CC BY 4.0.</li>
      <li>Polices : Playfair Display et DM Sans, sous licence SIL Open Font License 1.1.</li>
      <li>Allergènes : règlement (UE) n° 1169/2011, annexe II.</li>
    </ul>
    <h2>Signaler une erreur</h2>
    <p>Le formulaire de signalement ouvrira avec la mise en ligne du site.</p>
  </div>
</article>`;
  return page(ctx, {
    route: "/charte-editoriale", titre: "Charte éditoriale et sources",
    description: "Statuts éditoriaux, conditions de publication, calcul des régimes et allergènes, sources et licences des données de MIJORA.",
    corps, section: "", indexable: true, classe: "page-charte",
  });
}

export function introuvable(ctx) {
  const L = ctx.L;
  const corps = `
<div class="page-tete page-404">
  <p class="surtitre">Erreur 404</p>
  <h1 class="page-titre">Cette page n'existe pas.</h1>
  <p class="page-chapo">Le lien est peut-être ancien, ou la page n'a pas encore été publiée.</p>
  <p><a class="bouton bouton-plein" href="${L("/explorer")}">Explorer les recettes</a> <a class="bouton" href="${L("/pays")}">Ouvrir l'atlas</a></p>
</div>`;
  return page(ctx, { route: "/404", titre: "Page introuvable", description: "Cette page n'existe pas.", corps, section: "", classe: "page-404" });
}

export { libelleStatut };
