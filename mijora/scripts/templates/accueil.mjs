import { page, esc, carteRecette, drapeau, icone, pluriel } from "../lib/html.mjs";
import { silhouette } from "../lib/cartes.mjs";
import { REGIMES_ACCUEIL, NATURES } from "../../data/regimes.mjs";
import { TYPES_TRADITION, SAISONS } from "../../data/traditions.mjs";

const PAYS_UNE = ["JP", "MX", "IT", "IN", "MA", "PE", "ET", "VN"];
const RECETTES_UNE = ["bibimbap", "ceviche", "dal-tadka", "poulet-yassa", "ratatouille", "goi-cuon", "pao-de-queijo", "koshari"];
const COULEURS_PAYS = ["#263B32", "#C47D4D", "#5d6040", "#3b4650"];

export function accueil(ctx) {
  const L = ctx.L;
  const { recettes, continents, regimes, traditions, articles, parIso } = ctx;
  const nbPaysRecettes = new Set(recettes.map((r) => r.pays)).size;

  const hero = `
<section class="hero">
  <div class="hero-texte">
    <p class="surtitre">Encyclopédie gastronomique</p>
    <h1 class="hero-titre">Explorez le monde à travers <em>sa cuisine.</em></h1>
    <p class="hero-sous">Des recettes authentiques, des traditions et des saveurs venues des quatre coins du monde.</p>
    <form class="hero-recherche" action="${L("/explorer")}" method="get" role="search">
      <label class="sr" for="hero-q">Rechercher une recette</label>
      <input id="hero-q" name="q" type="search" autocomplete="off" placeholder="Une recette japonaise végétarienne en moins de 30 minutes" role="combobox" aria-expanded="false" aria-controls="hero-q-liste" aria-autocomplete="list" data-suggestions>
      <button type="submit" class="bouton bouton-plein">${icone("recherche")}<span>Rechercher</span></button>
      <ul class="suggestions" id="hero-q-liste" role="listbox" aria-label="Suggestions"></ul>
    </form>
    <div class="hero-acces">
      <a class="acces" href="${L("/pays")}">${icone("carte")}<span><strong>Par pays</strong>Atlas des 195 pays</span></a>
      <a class="acces" href="${L("/regimes")}">${icone("coeur")}<span><strong>Par alimentation</strong>Régimes, restrictions, allergènes</span></a>
    </div>
    <p class="hero-chiffres"><span>195 pays</span><span>${pluriel(recettes.length, "recette", "recettes")} dans ${nbPaysRecettes} pays</span><span>${pluriel(regimes.length, "mode d'alimentation", "modes d'alimentation")}</span></p>
  </div>
  <figure class="hero-visuel">
    <img src="${L("/img/table.svg")}" alt="Illustration : plusieurs plats du catalogue sur une table, dont un bibimbap, une ratatouille et une salade grecque" width="1200" height="1000" fetchpriority="high">
    <figcaption>Illustration provisoire. Les photographies seront ajoutées avec leurs droits d'utilisation.</figcaption>
  </figure>
</section>`;

  const conts = [...continents.values()].map((c) => {
    const nbR = recettes.filter((r) => r.continent === c.slug).length;
    return `<article class="continent">
  <img class="continent-carte" src="${L(`/img/continents/${c.slug}.svg`)}" alt="" width="600" height="420" loading="lazy" decoding="async">
  <div class="continent-texte">
    <h3><a class="lien-etendu" href="${L(`/pays#${c.slug}`)}">${esc(c.nom)}</a></h3>
    <p>${pluriel(c.pays.length, "pays", "pays")} · ${nbR ? pluriel(nbR, "recette", "recettes") : "recettes à venir"}</p>
  </div>
</article>`;
  }).join("");

  const paysUne = PAYS_UNE.map((iso, i) => {
    const p = parIso.get(iso);
    const s = silhouette(p, { W: 400, H: 300, marge: 34 });
    const premiere = p.editorial.presentation.split(/(?<=\.)\s/)[0];
    return `<article class="carte-pays">
  <div class="carte-pays-visuel" style="--fond:${COULEURS_PAYS[i % COULEURS_PAYS.length]}">
    ${s ? `<svg viewBox="0 0 ${s.W} ${s.H}" aria-hidden="true"><path d="${s.d}"/></svg>` : ""}
    <span class="carte-pays-drapeau">${drapeau(p)}</span>
  </div>
  <h3><a class="lien-etendu" href="${L(p.url)}">${esc(p.name_fr)}</a></h3>
  <p>${esc(premiere)}</p>
  <p class="carte-pays-nb">${pluriel(p.recettes.length, "recette", "recettes")}</p>
</article>`;
  }).join("");

  const recUne = RECETTES_UNE.map((s) => carteRecette(recettes.find((r) => r.slug === s), ctx)).join("");

  const alim = REGIMES_ACCUEIL.map((slug) => {
    const d = regimes.find((x) => x.slug === slug);
    const nb = !d.regle ? "Compatibilité non évaluée" : d.recettes.length ? pluriel(d.recettes.length, "recette", "recettes") : "Aucune recette du catalogue";
    return `<article class="regime-tuile" data-nature="${d.nature}">
  <p class="regime-nature">${NATURES[d.nature].nom}</p>
  <h3><a class="lien-etendu" href="${L(d.url)}">${esc(d.nom)}</a></h3>
  <p>${esc(d.accroche)}</p>
  <p class="regime-nb">${nb}</p>
</article>`;
  }).join("");

  const trad = traditions.map((t) => `<article class="tradition-tuile">
  <p class="tradition-type">${TYPES_TRADITION[t.type]} · ${SAISONS[t.saison]}</p>
  <h3><a class="lien-etendu" href="${L(t.url)}">${esc(t.nom)}</a></h3>
  ${t.paysObj.length ? `<p class="tradition-pays">${t.paysObj.map((p) => drapeau(p)).join(" ")}</p>` : '<p class="tradition-lieux">Partout dans le monde</p>'}
  <p class="tradition-nb">${t.recettes.length ? pluriel(t.recettes.length, "recette", "recettes") : "Recettes à venir"}</p>
</article>`).join("");

  const art = articles.map((a, i) => `<article class="article-carte${i === 0 ? " article-une" : ""}">
  ${i === 0 && a.recettesObj[0] ? `<img class="article-une-image" src="${L(a.recettesObj[0].image)}" alt="" width="800" height="600" loading="lazy" decoding="async">` : ""}
  <p class="surtitre">${esc(a.rubrique)}</p>
  <h3><a class="lien-etendu" href="${L(a.url)}">${esc(a.titre)}</a></h3>
  <p>${esc(a.chapo)}</p>
  <p class="article-pays">${a.paysObj.map((p) => `${drapeau(p)} ${esc(p.name_fr)}`).join(" · ")}</p>
</article>`).join("");

  const corps = `${hero}

<section class="section" aria-labelledby="t-monde">
  <div class="section-tete">
    <h2 id="t-monde" class="section-titre">Explorer le monde</h2>
    <a class="lien-suite" href="${L("/pays")}">Ouvrir l'atlas ${icone("fleche")}</a>
  </div>
  <div class="grille-continents">${conts}</div>
</section>

<section class="section section-sable" aria-labelledby="t-pays">
  <div class="section-in">
    <div class="section-tete">
      <h2 id="t-pays" class="section-titre">Pays à découvrir</h2>
      <a class="lien-suite" href="${L("/pays")}">Les 195 pays ${icone("fleche")}</a>
    </div>
    <div class="grille-pays">${paysUne}</div>
  </div>
</section>

<section class="section" aria-labelledby="t-recettes">
  <div class="section-tete">
    <h2 id="t-recettes" class="section-titre">Recettes à découvrir</h2>
    <a class="lien-suite" href="${L("/explorer")}">Toutes les recettes ${icone("fleche")}</a>
  </div>
  <p class="section-note">Ces recettes sont des données de démonstration : elles seront relues et sourcées avant publication. Un astérisque signale une adaptation nécessaire (un ingrédient à remplacer ou à omettre).</p>
  <div class="grille-recettes">${recUne}</div>
</section>

<section class="section section-foret" aria-labelledby="t-alim">
  <div class="section-in">
    <div class="section-tete">
      <h2 id="t-alim" class="section-titre">Explorer selon son alimentation</h2>
      <a class="lien-suite" href="${L("/regimes")}">Régimes et allergènes ${icone("fleche")}</a>
    </div>
    <p class="section-note">Régimes, restrictions médicales et objectifs nutritionnels ne se valent pas : chaque fiche précise sa nature et la façon dont la compatibilité des recettes est établie.</p>
    <div class="grille-regimes">${alim}</div>
  </div>
</section>

<section class="section" aria-labelledby="t-trad">
  <div class="section-tete">
    <h2 id="t-trad" class="section-titre">Traditions culinaires</h2>
    <a class="lien-suite" href="${L("/traditions")}">Toutes les traditions ${icone("fleche")}</a>
  </div>
  <div class="grille-traditions">${trad}</div>
</section>

<section class="section section-sable" aria-labelledby="t-mag">
  <div class="section-in">
    <div class="section-tete">
      <h2 id="t-mag" class="section-titre">Découverte éditoriale</h2>
      <a class="lien-suite" href="${L("/articles")}">Le magazine ${icone("fleche")}</a>
    </div>
    <div class="grille-articles">${art}</div>
  </div>
</section>

<section class="section newsletter" aria-labelledby="t-news">
  <div class="newsletter-in">
    <h2 id="t-news" class="section-titre">Une découverte culinaire par mois</h2>
    <p>Un pays, une tradition, une technique, et les recettes vérifiées qui les accompagnent.</p>
    <form class="newsletter-form" data-newsletter novalidate>
      <label for="news-email">Adresse e-mail</label>
      <div class="newsletter-champ">
        <input id="news-email" name="email" type="email" autocomplete="email" required placeholder="vous@exemple.fr">
        <button type="submit" class="bouton bouton-plein" disabled>S'inscrire</button>
      </div>
      <p class="newsletter-etat" data-newsletter-etat>Les inscriptions ouvriront avec la mise en ligne du site : le bouton est désactivé tant que la base de données n'est pas connectée.</p>
    </form>
  </div>
</section>`;

  return page(ctx, {
    route: "/",
    titre: "MIJORA, encyclopédie gastronomique du monde",
    description: "Recettes, pays, traditions et modes d'alimentation : une encyclopédie gastronomique internationale pour découvrir le monde par sa cuisine.",
    corps,
    section: "/",
    indexable: true,
    classe: "accueil",
    jsonld: [{ "@context": "https://schema.org", "@type": "WebSite", name: "MIJORA", url: ctx.SITE.url + "/", potentialAction: { "@type": "SearchAction", target: ctx.SITE.url + "/explorer?q={q}", "query-input": "required name=q" } }],
  });
}
