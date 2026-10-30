// Chiffres du catalogue pour la page d'accueil, qui ne charge pas le catalogue entier.
// node scripts/stats.mjs : écrit js/data/stats.js. scripts/check.mjs vérifie qu'il est à jour.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATALOGUE, DOMAINES, MODELES, UNIVERS } from "../js/data/catalogue/index.js";

export const FILE = fileURLToPath(new URL("../js/data/stats.js", import.meta.url));

export function statsSource() {
  const stats = {
    prompts: CATALOGUE.length,
    domaines: DOMAINES.length,
    univers: UNIVERS.length,
    modeles: MODELES.length,
    specifiques: CATALOGUE.filter((e) => e.s).length,
    parUnivers: UNIVERS.map((u) => {
      const doms = DOMAINES.filter((d) => d.univers === u.id);
      return {
        ...u,
        prompts: CATALOGUE.filter((e) => e.d.univers === u.id).length,
        domaines: doms.map((d) => ({ id: d.id, nom: d.nom })),
      };
    }),
  };
  return `// Généré par scripts/stats.mjs à partir du catalogue : ne pas modifier à la main.\nexport const STATS = ${JSON.stringify(stats, null, 2)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(FILE, statsSource());
  console.log(`js/data/stats.js écrit.`);
}
