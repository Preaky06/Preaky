// Atlas : bulle sur la carte, recherche de pays, filtres par continent et par présence de recettes.
import { normaliser } from "./outils.js";

const bloc = document.querySelector("[data-atlas-carte]");
const bulle = document.querySelector("[data-atlas-bulle]");
const svg = bloc.querySelector("svg");

function montrer(a, x, y) {
  const nb = document.querySelector(`.atlas-liste a[href="${a.getAttribute("href")}"] .atlas-nb`);
  bulle.textContent = a.getAttribute("aria-label") + (nb ? ` · ${nb.textContent}` : "");
  bulle.hidden = false;
  const r = bloc.getBoundingClientRect();
  const gauche = Math.min(Math.max(x - r.left, 70), r.width - 70);
  bulle.style.left = `${gauche}px`;
  bulle.style.top = `${y - r.top}px`;
}
svg.addEventListener("pointermove", (e) => {
  const a = e.target.closest(".carte-pays");
  if (!a) { bulle.hidden = true; return; }
  montrer(a, e.clientX, e.clientY);
});
svg.addEventListener("pointerleave", () => (bulle.hidden = true));
svg.addEventListener("focusin", (e) => {
  const a = e.target.closest(".carte-pays");
  if (!a) return;
  const b = a.getBoundingClientRect();
  montrer(a, b.left + b.width / 2, b.top + Math.min(b.height / 2, 30));
});
svg.addEventListener("focusout", () => (bulle.hidden = true));

// Liste
const recherche = document.querySelector("[data-atlas-recherche]");
const avecRecettes = document.querySelector("[data-atlas-recettes]");
const compte = document.querySelector("[data-atlas-compte]");
const videMsg = document.querySelector("[data-atlas-vide]");
const puces = document.querySelectorAll("[data-filtre-continent]");
let continent = "tous";

function filtrer() {
  const q = normaliser(recherche.value);
  let total = 0;
  document.querySelectorAll(".atlas-continent").forEach((sec) => {
    let n = 0;
    const visibleContinent = continent === "tous" || sec.dataset.continent === continent;
    sec.querySelectorAll("li").forEach((li) => {
      const ok = visibleContinent && (!q || normaliser(li.dataset.nom).includes(q)) && (!avecRecettes.checked || li.dataset.etat === "recettes");
      li.hidden = !ok;
      if (ok) n++;
    });
    sec.hidden = n === 0;
    total += n;
  });
  compte.textContent = `${total} pays`;
  videMsg.hidden = total > 0;
  svg.querySelectorAll(".carte-pays").forEach((a) => {
    const hors = (continent !== "tous" && a.dataset.continent !== continent) || (avecRecettes.checked && a.dataset.etat !== "recettes");
    a.style.opacity = hors ? "0.35" : "";
  });
}
recherche.addEventListener("input", filtrer);
avecRecettes.addEventListener("change", filtrer);
puces.forEach((b) => b.addEventListener("click", () => {
  continent = b.dataset.filtreContinent;
  puces.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  filtrer();
}));

// Arrivée depuis l'accueil avec un continent (#europe…) : on filtre sur ce continent
function depuisAncre() {
  const h = location.hash.slice(1);
  const b = [...puces].find((x) => x.dataset.filtreContinent === h);
  if (b) b.click();
}
window.addEventListener("hashchange", depuisAncre);
depuisAncre();
