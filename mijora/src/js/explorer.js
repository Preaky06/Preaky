// Explorateur : filtres combinables, recherche en langage naturel, tri, pagination.
// L'état complet est conservé dans l'adresse de la page pour pouvoir partager une recherche.
import { chargerIndex, esc, lien, ICONES, annoncer } from "./outils.js";
import { comprendre, filtrer, carte, ETAT_VIDE, brancherSuggestions } from "./recherche.js";

const PAR_PAGE = 12;
const LISTES = ["regime", "categorie", "temps", "difficulte", "budget", "famille", "sans"];
const form = document.querySelector("[data-filtres]");
const champ = document.getElementById("q");
const formQ = document.querySelector("[data-recherche-explorer]");
const grille = document.querySelector("[data-grille]");
const nombre = document.querySelector("[data-nombre]");
const vide = document.querySelector("[data-vide]");
const pagination = document.querySelector("[data-pagination]");
const actifs = document.querySelector("[data-actifs]");
const compris = document.querySelector("[data-compris]");
const tri = document.querySelector("[data-tri]");
const nbFiltres = document.querySelector("[data-nb-filtres]");

let index;
let etat = ETAT_VIDE();
let nonEvalues = [];

// ---------------------------------------------------------------- adresse ↔ état
function lireAdresse() {
  const e = ETAT_VIDE();
  const p = new URLSearchParams(location.search || location.hash.slice(1));
  e.q = p.get("q") || "";
  for (const k of ["continent", "pays", "region"]) e[k] = p.get(k) || "";
  for (const k of LISTES) e[k] = (p.get(k) || "").split(",").filter(Boolean);
  e.strict = p.get("strict") === "1";
  e.max = Number(p.get("max")) || null;
  e.tri = p.get("tri") || (e.q ? "pertinence" : "alpha");
  e.page = Math.max(1, Number(p.get("page")) || 1);
  return e;
}
function ecrireAdresse() {
  const p = new URLSearchParams();
  if (etat.q) p.set("q", etat.q);
  for (const k of ["continent", "pays", "region"]) if (etat[k]) p.set(k, etat[k]);
  for (const k of LISTES) if (etat[k].length) p.set(k, etat[k].join(","));
  if (etat.strict) p.set("strict", "1");
  if (etat.max) p.set("max", String(etat.max));
  if (etat.tri !== (etat.q ? "pertinence" : "alpha")) p.set("tri", etat.tri);
  if (etat.page > 1) p.set("page", String(etat.page));
  const s = p.toString();
  try { history.replaceState(null, "", s ? `?${s}` : location.pathname); } catch { /* adresse non modifiable dans ce contexte */ }
}

// ---------------------------------------------------------------- formulaire ↔ état
function versFormulaire() {
  champ.value = etat.q;
  for (const k of ["continent", "pays", "region"]) form.elements[k].value = etat[k];
  for (const k of LISTES) form.querySelectorAll(`input[name="${k}"]`).forEach((c) => (c.checked = etat[k].includes(c.value)));
  form.elements.strict.checked = etat.strict;
  tri.value = etat.tri;
}
function depuisFormulaire() {
  for (const k of ["continent", "pays", "region"]) etat[k] = form.elements[k].value;
  for (const k of LISTES) etat[k] = [...form.querySelectorAll(`input[name="${k}"]:checked`)].map((c) => c.value);
  etat.strict = form.elements.strict.checked;
  etat.tri = tri.value;
  etat.page = 1;
}

// Requête en langage naturel : les éléments reconnus deviennent des filtres visibles
function appliquerRequete(q) {
  const { filtres, reste } = comprendre(q, index);
  const evalues = new Set(index.regimes.filter((d) => d.ev).map((d) => d.s));
  nonEvalues = filtres.regime.filter((s) => !evalues.has(s));
  for (const k of ["regime", "categorie", "sans", "difficulte", "budget"]) {
    const v = k === "regime" ? filtres[k].filter((s) => evalues.has(s)) : filtres[k];
    etat[k] = [...new Set([...etat[k], ...v])];
  }
  if (filtres.pays) { etat.pays = filtres.pays; etat.continent = ""; }
  else if (filtres.continent) etat.continent = filtres.continent;
  if (filtres.max) etat.max = filtres.max;
  etat.q = reste;
  etat.tri = reste ? "pertinence" : etat.tri === "pertinence" ? "alpha" : etat.tri;
  etat.page = 1;
  const reconnus = [];
  if (filtres.pays) reconnus.push(index.pays.find((p) => p.s === filtres.pays).n);
  else if (filtres.continent) reconnus.push(index.continents.find((c) => c.s === filtres.continent).n);
  for (const s of filtres.regime) reconnus.push(index.regimes.find((d) => d.s === s).n);
  for (const s of filtres.categorie) reconnus.push(index.categories.find((c) => c.slug === s).nom);
  for (const s of filtres.sans) reconnus.push("Sans " + index.allergenes.find((a) => a.slug === s).nom.toLowerCase());
  for (const s of filtres.difficulte) reconnus.push(index.difficultes.find((d) => d.slug === s).nom);
  for (const s of filtres.budget) reconnus.push("Budget " + index.budgets.find((b) => b.slug === s).nom.toLowerCase());
  if (filtres.max) reconnus.push(`${filtres.max} min maximum`);
  if (reste) reconnus.push(`« ${reste} »`);
  compris.hidden = !reconnus.length && !nonEvalues.length;
  compris.innerHTML = (reconnus.length ? `<strong>Recherche comprise :</strong> ${reconnus.map(esc).join(" · ")}` : "") +
    (nonEvalues.length ? ` <span class="note">${nonEvalues.map((s) => esc(index.regimes.find((d) => d.s === s).n)).join(", ")} : compatibilité non évaluée, filtre non appliqué.</span>` : "");
}

// ---------------------------------------------------------------- rendu
function libelleActif(k, v) {
  switch (k) {
    case "continent": return index.continents.find((c) => c.s === v)?.n;
    case "pays": return index.pays.find((p) => p.s === v)?.n;
    case "region": return v;
    case "regime": return index.regimes.find((d) => d.s === v)?.n;
    case "categorie": return index.categories.find((c) => c.slug === v)?.nom;
    case "temps": return index.temps.find((t) => t.slug === v)?.nom;
    case "difficulte": return index.difficultes.find((d) => d.slug === v)?.nom;
    case "budget": return "Budget " + index.budgets.find((b) => b.slug === v)?.nom.toLowerCase();
    case "famille": return "Avec : " + index.familles.find((f) => f.slug === v)?.nom.toLowerCase();
    case "sans": return "Sans " + index.allergenes.find((a) => a.slug === v)?.nom.toLowerCase();
    case "max": return `${v} min maximum`;
    case "strict": return "Sans adaptation";
    case "q": return `« ${v} »`;
  }
  return v;
}

function puceActive(k, v) {
  return `<button type="button" class="actif" data-retirer="${k}" data-valeur="${esc(v)}" aria-label="Retirer le filtre ${esc(libelleActif(k, v))}">${esc(libelleActif(k, v))}${ICONES.fermer}</button>`;
}

function rendre() {
  const res = filtrer(index, etat);
  const pages = Math.max(1, Math.ceil(res.length / PAR_PAGE));
  etat.page = Math.min(etat.page, pages);
  const tranche = res.slice((etat.page - 1) * PAR_PAGE, etat.page * PAR_PAGE);
  const notes = (r) => {
    const n = etat.regime.filter((s) => r.rg[s] === "adaptable").length ? "Avec une adaptation : voir la fiche" : etat.regime.some((s) => r.rg[s] === "selon-produits") ? "Selon les produits utilisés" : "";
    return n;
  };
  grille.innerHTML = tranche.map((r) => carte(r, index, notes(r))).join("");
  nombre.textContent = res.length ? `${res.length} recette${res.length > 1 ? "s" : ""}` : "Aucune recette";
  document.dispatchEvent(new CustomEvent("mijora:cartes"));

  vide.hidden = res.length > 0;
  if (!res.length) {
    vide.innerHTML = `<p>Aucune recette du catalogue ne réunit tous ces critères.</p>${compteFiltres() ? '<button type="button" class="bouton bouton-plein" data-effacer>Effacer les filtres</button>' : ""}`;
  }

  // Filtres actifs
  const p = [];
  if (etat.q) p.push(puceActive("q", etat.q));
  for (const k of ["continent", "pays", "region"]) if (etat[k]) p.push(puceActive(k, etat[k]));
  for (const k of LISTES) for (const v of etat[k]) p.push(puceActive(k, v));
  if (etat.max) p.push(puceActive("max", etat.max));
  if (etat.strict) p.push(puceActive("strict", "1"));
  actifs.innerHTML = p.join("");
  const n = compteFiltres();
  nbFiltres.hidden = !n;
  nbFiltres.textContent = String(n);

  // Pagination
  if (pages > 1) {
    const lienPage = (i) => {
      const e = new URLSearchParams(location.search);
      if (i > 1) e.set("page", String(i)); else e.delete("page");
      return `?${e.toString()}`;
    };
    let h = "";
    if (etat.page > 1) h += `<a href="${lienPage(etat.page - 1)}" data-page="${etat.page - 1}" rel="prev">Précédente</a>`;
    for (let i = 1; i <= pages; i++) h += i === etat.page ? `<span aria-current="page">${i}</span>` : `<a href="${lienPage(i)}" data-page="${i}">${i}</a>`;
    if (etat.page < pages) h += `<a href="${lienPage(etat.page + 1)}" data-page="${etat.page + 1}" rel="next">Suivante</a>`;
    pagination.innerHTML = h;
  } else pagination.innerHTML = "";
  ecrireAdresse();
}

const compteFiltres = () => ["continent", "pays", "region"].filter((k) => etat[k]).length + LISTES.reduce((s, k) => s + etat[k].length, 0) + (etat.max ? 1 : 0) + (etat.strict ? 1 : 0);

// ---------------------------------------------------------------- événements
function brancher() {
  form.addEventListener("change", () => { depuisFormulaire(); rendre(); });
  tri.addEventListener("change", () => { etat.tri = tri.value; etat.page = 1; rendre(); });
  formQ.addEventListener("submit", (e) => {
    e.preventDefault();
    appliquerRequete(champ.value);
    versFormulaire();
    rendre();
    nombre.focus?.();
  });
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-retirer]");
    if (r) {
      const k = r.dataset.retirer, v = r.dataset.valeur;
      if (LISTES.includes(k)) etat[k] = etat[k].filter((x) => x !== v);
      else if (k === "strict") etat.strict = false;
      else if (k === "max") etat.max = null;
      else if (k === "q") { etat.q = ""; if (etat.tri === "pertinence") etat.tri = "alpha"; }
      else etat[k] = "";
      etat.page = 1;
      versFormulaire();
      rendre();
      return;
    }
    if (e.target.closest("[data-effacer]")) {
      etat = { ...ETAT_VIDE(), tri: "alpha" };
      compris.hidden = true;
      versFormulaire();
      rendre();
      annoncer("Filtres effacés");
      return;
    }
    const pg = e.target.closest("[data-page]");
    if (pg) {
      e.preventDefault();
      etat.page = Number(pg.dataset.page);
      rendre();
      document.querySelector(".resultats").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  });

  // Tiroir des filtres sur petit écran
  const ouvrir = document.querySelector("[data-ouvrir-filtres]");
  ouvrir.addEventListener("click", () => {
    form.classList.add("ouvert");
    ouvrir.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    form.querySelector("select, input")?.focus();
  });
  const fermer = () => {
    if (!form.classList.contains("ouvert")) return;
    form.classList.remove("ouvert");
    ouvrir.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    ouvrir.focus();
  };
  form.querySelectorAll("[data-fermer-filtres]").forEach((b) => b.addEventListener("click", fermer));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermer(); });

  // Suggestions : choisir une recette ou un pays ouvre sa page ; un ingrédient lance la recherche
  brancherSuggestions(champ, document.getElementById("q-liste"), Promise.resolve(index), {
    surChoix: (s, a) => {
      if (s.url.startsWith("/explorer")) { champ.value = s.texte; formQ.requestSubmit(); }
      else location.href = a.href;
    },
  });
}

chargerIndex().then((i) => {
  index = i;
  etat = lireAdresse();
  if (etat.q) {
    const avant = etat.q;
    appliquerRequete(avant);
  }
  versFormulaire();
  brancher();
  rendre();
}).catch(() => {
  nombre.textContent = "Recherche indisponible";
  vide.hidden = false;
  vide.innerHTML = `<p>Le moteur de recherche n'a pas pu se charger. Les recettes restent accessibles depuis <a href="${lien("/pays")}">l'atlas</a>.</p>`;
});
