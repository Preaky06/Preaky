// Fiche recette : recalcul des portions, liste de courses, partage, impression.
import { ajuster, libelle } from "./quantites.js";
import { annoncer, copier } from "./outils.js";
import { ajouterRecette } from "./favoris-store.js";

const donnees = JSON.parse(document.getElementById("donnees-recette").textContent);
const valeur = document.querySelector("[data-portions-val]");
const mot = document.querySelector("[data-portions-mot]");
const boutons = document.querySelectorAll("[data-portions]");
const items = document.querySelectorAll("[data-ligne]");
const MIN = 1, MAX = 24;
let portions = donnees.portions;

function lignesAjustees() {
  const f = portions / donnees.portions;
  return donnees.lignes.map((l) => {
    const a = ajuster(l.q, l.u, f);
    return { ...l, q: a.quantite, u: a.unite };
  });
}

function rendre() {
  valeur.textContent = String(portions);
  mot.textContent = portions > 1 ? "portions" : "portion";
  boutons.forEach((b) => (b.disabled = (b.dataset.portions === "-1" && portions <= MIN) || (b.dataset.portions === "1" && portions >= MAX)));
  const lignes = lignesAjustees();
  items.forEach((li) => {
    const l = lignes[Number(li.dataset.ligne)];
    li.querySelector(".ingredient-texte").textContent = libelle(l, l.q, l.u);
  });
}

boutons.forEach((b) => b.addEventListener("click", () => {
  portions = Math.min(MAX, Math.max(MIN, portions + Number(b.dataset.portions)));
  rendre();
}));
rendre();

// Liste de courses : ingrédients obligatoires, pour le nombre de portions affiché (l'eau du robinet est ignorée)
document.querySelector("[data-liste-courses]")?.addEventListener("click", () => {
  const lignes = lignesAjustees().filter((l) => !l.opt && l.s !== "eau");
  const { n, liste, ok } = ajouterRecette(`${donnees.titre} (${portions} p.)`, lignes);
  if (!ok) return annoncer("Impossible d'enregistrer la liste : le stockage du navigateur est bloqué.");
  annoncer(`${n} ingrédients ajoutés à « ${liste} »`);
});

// Partage : feuille de partage du système si elle existe, sinon copie du lien
document.querySelector("[data-partager]")?.addEventListener("click", async () => {
  const url = location.href.split("#")[0];
  if (navigator.share) {
    try {
      await navigator.share({ title: donnees.titre, url });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  annoncer((await copier(url)) ? "Lien de la recette copié" : `Copiez ce lien : ${url}`);
});

document.querySelector("[data-imprimer]")?.addEventListener("click", () => window.print());

