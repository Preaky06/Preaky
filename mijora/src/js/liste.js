// Listes de courses : plusieurs listes, articles regroupés par rayon, quantités modifiables, articles cochés.
import { chargerIndex, esc, annoncer, copier } from "./outils.js";
import { listes } from "./favoris-store.js";
import { mesure } from "./quantites.js";

const choix = document.querySelector("[data-liste-choix]");
const contenu = document.querySelector("[data-courses-contenu]");
const vide = document.querySelector("[data-courses-vide]");
const confirmation = document.querySelector("[data-confirmation]");
const formAjout = document.querySelector("[data-courses-ajout]");
let etat = listes.etat();
let index;
let demande;
const id = () => Math.random().toString(36).slice(2, 10);

function sauver() {
  if (!listes.enregistrer(etat)) annoncer("Impossible d'enregistrer : le stockage du navigateur est bloqué.");
}

function texteQuantite(a) {
  if (a.texteQte != null) return a.texteQte;
  const parts = a.mesures.map((m) => mesure(m.q, m.u));
  if (a.sansQuantite) parts.push("selon la recette");
  return parts.join(" + ");
}

function rendre() {
  const l = listes.active(etat);
  choix.innerHTML = etat.listes.map((x) => `<option value="${x.id}"${x.id === l.id ? " selected" : ""}>${esc(x.nom)} (${x.articles.length})</option>`).join("");
  document.querySelector("[data-liste-supprimer]").disabled = etat.listes.length < 2;
  vide.hidden = l.articles.length > 0;
  const rayons = index.familles.map((f) => ({ ...f, articles: l.articles.filter((a) => (a.f || "autres") === f.slug) })).filter((r) => r.articles.length);
  contenu.innerHTML = rayons.map((r) => `<section class="rayon" aria-labelledby="r-${r.slug}">
    <h2 id="r-${r.slug}">${esc(r.nom)}</h2>
    ${r.articles.map((a) => `<div class="article-courses${a.coche ? " coche" : ""}" data-article="${a.id}">
      <input type="checkbox" id="c-${a.id}" ${a.coche ? "checked" : ""} aria-label="Acheté : ${esc(a.n)}">
      <label class="article-nom" for="c-${a.id}">${esc(a.n.charAt(0).toUpperCase() + a.n.slice(1))}${a.recettes?.length ? `<small>${esc(a.recettes.join(", "))}</small>` : ""}</label>
      <input class="article-qte" value="${esc(texteQuantite(a))}" aria-label="Quantité : ${esc(a.n)}" data-qte>
      <button type="button" class="outil" data-retirer-article aria-label="Retirer ${esc(a.n)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    </div>`).join("")}
  </section>`).join("");
}

function trouver(el) {
  const l = listes.active(etat);
  const a = l.articles.find((x) => x.id === el.closest("[data-article]").dataset.article);
  return { l, a };
}

contenu.addEventListener("change", (e) => {
  if (e.target.matches("input[type=checkbox]")) {
    const { a } = trouver(e.target);
    a.coche = e.target.checked;
    e.target.closest("[data-article]").classList.toggle("coche", a.coche);
    sauver();
  } else if (e.target.matches("[data-qte]")) {
    const { a } = trouver(e.target);
    a.texteQte = e.target.value.trim();
    sauver();
  }
});
contenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-retirer-article]");
  if (!b) return;
  const { l, a } = trouver(b);
  l.articles = l.articles.filter((x) => x !== a);
  sauver();
  rendre();
  annoncer(`« ${a.n} » retiré de la liste`);
});

choix.addEventListener("change", () => { etat.active = choix.value; sauver(); rendre(); });

formAjout.addEventListener("submit", (e) => {
  e.preventDefault();
  const nom = formAjout.nom.value.trim();
  if (!nom) return formAjout.nom.focus();
  const l = listes.active(etat);
  l.articles.push({ id: id(), s: null, n: nom, f: formAjout.famille.value, mesures: [], sansQuantite: false, texteQte: formAjout.quantite.value.trim(), recettes: [], coche: false });
  sauver();
  rendre();
  formAjout.reset();
  formAjout.nom.focus();
});

// Confirmation intégrée à la page (les boîtes de dialogue natives ne sont pas toujours disponibles)
function demander(texte, action) {
  demande = action;
  confirmation.querySelector("[data-confirmation-texte]").textContent = texte;
  confirmation.hidden = false;
  confirmation.querySelector("[data-confirmation-oui]").focus();
}
confirmation.querySelector("[data-confirmation-oui]").addEventListener("click", () => { confirmation.hidden = true; demande?.(); demande = null; });
confirmation.querySelector("[data-confirmation-non]").addEventListener("click", () => { confirmation.hidden = true; demande = null; });

// Champ de saisie intégré pour nommer une liste
function nommer(defaut, fin) {
  const zone = document.createElement("form");
  zone.className = "confirmation";
  zone.innerHTML = `<label class="champ" style="flex:1"><span>Nom de la liste</span><input name="nom" required value="${esc(defaut)}"></label><div><button class="bouton bouton-plein">Valider</button><button type="button" class="bouton" data-annuler>Annuler</button></div>`;
  document.querySelector(".courses-listes").after(zone);
  zone.nom.select();
  zone.addEventListener("submit", (e) => { e.preventDefault(); const v = zone.nom.value.trim(); if (v) fin(v); zone.remove(); });
  zone.querySelector("[data-annuler]").addEventListener("click", () => zone.remove());
}

document.querySelector("[data-liste-nouvelle]").addEventListener("click", () => nommer(`Liste ${etat.listes.length + 1}`, (nom) => { listes.nouvelle(etat, nom); sauver(); rendre(); annoncer(`Liste « ${nom} » créée`); }));
document.querySelector("[data-liste-renommer]").addEventListener("click", () => { const l = listes.active(etat); nommer(l.nom, (nom) => { l.nom = nom; sauver(); rendre(); }); });
document.querySelector("[data-liste-supprimer]").addEventListener("click", () => {
  const l = listes.active(etat);
  demander(`Supprimer la liste « ${l.nom} » et ses ${l.articles.length} articles ?`, () => {
    etat.listes = etat.listes.filter((x) => x !== l);
    etat.active = etat.listes[0].id;
    sauver();
    rendre();
    annoncer("Liste supprimée");
  });
});
document.querySelector("[data-courses-coches]").addEventListener("click", () => {
  const l = listes.active(etat);
  const n = l.articles.filter((a) => a.coche).length;
  if (!n) return annoncer("Aucun article coché");
  demander(`Retirer les ${n} articles cochés ?`, () => { l.articles = l.articles.filter((a) => !a.coche); sauver(); rendre(); });
});
document.querySelector("[data-courses-copier]").addEventListener("click", async () => {
  const l = listes.active(etat);
  const texte = `${l.nom}\n` + index.familles.map((f) => {
    const as = l.articles.filter((a) => (a.f || "autres") === f.slug);
    return as.length ? `\n${f.nom}\n` + as.map((a) => `- ${a.n}${texteQuantite(a) ? ` : ${texteQuantite(a)}` : ""}${a.coche ? " (acheté)" : ""}`).join("\n") : "";
  }).join("");
  annoncer((await copier(texte)) ? "Liste copiée" : "La copie a échoué : sélectionnez le texte manuellement.");
});

chargerIndex().then((i) => { index = i; rendre(); }).catch(() => {
  contenu.innerHTML = "<p>La liste n'a pas pu être chargée. Rechargez la page.</p>";
});
