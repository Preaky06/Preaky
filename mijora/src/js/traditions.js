// Catalogue des traditions : filtres par type et par saison.
const cartes = document.querySelectorAll("[data-traditions] > article");
const vide = document.querySelector("[data-traditions-vide]");
const choix = { type: "", saison: "" };

function appliquer() {
  let n = 0;
  cartes.forEach((c) => {
    const ok = (!choix.type || c.dataset.type === choix.type) && (!choix.saison || c.dataset.saison === choix.saison);
    c.hidden = !ok;
    if (ok) n++;
  });
  vide.hidden = n > 0;
}

for (const cle of ["type", "saison"]) {
  const boutons = document.querySelectorAll(`[data-filtre-${cle}]`);
  boutons.forEach((b) => b.addEventListener("click", () => {
    choix[cle] = b.getAttribute(`data-filtre-${cle}`);
    boutons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    appliquer();
  }));
}
