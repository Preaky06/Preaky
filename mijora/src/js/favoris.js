// Page des favoris : recettes enregistrées sur cet appareil.
import { chargerIndex } from "./outils.js";
import { favoris } from "./favoris-store.js";
import { carte } from "./recherche.js";

const grille = document.querySelector("[data-favoris]");
const vide = document.querySelector("[data-favoris-vide]");

chargerIndex().then((index) => {
  const rendre = () => {
    const parSlug = new Map(index.recettes.map((r) => [r.s, r]));
    const liste = favoris.tous().map((s) => parSlug.get(s)).filter(Boolean);
    grille.innerHTML = liste.map((r) => carte(r, index)).join("");
    vide.hidden = liste.length > 0;
    document.dispatchEvent(new CustomEvent("mijora:cartes"));
  };
  rendre();
  // Retirer un favori depuis cette page le fait disparaître de la liste
  document.addEventListener("mijora:favoris", rendre);
}).catch(() => {
  vide.hidden = false;
  vide.querySelector("p").textContent = "Vos favoris n'ont pas pu être chargés. Rechargez la page.";
});
