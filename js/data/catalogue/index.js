// Catalogue : chaque domaine croise les modèles de ses familles, plus ses prompts spécifiques.
import { MODELES_PRO } from "./modeles-pro.js";
import { MODELES_VIE } from "./modeles-vie.js";
import { MODELES_SAVOIR } from "./modeles-savoir.js";
import { UNIVERS } from "./univers.js";
import d1 from "./domaines-1.js";
import d2 from "./domaines-2.js";
import d3 from "./domaines-3.js";
import d4 from "./domaines-4.js";
import d5 from "./domaines-5.js";
import d6 from "./domaines-6.js";

export { UNIVERS };
export { CHAMPS } from "./champs.js";

export const CATEGORIES = [
  { id: "redaction", nom: "Rédaction" },
  { id: "strategie", nom: "Stratégie" },
  { id: "analyse", nom: "Analyse" },
  { id: "creation", nom: "Création" },
  { id: "organisation", nom: "Organisation" },
  { id: "communication", nom: "Communication" },
  { id: "relation", nom: "Relation client" },
  { id: "apprentissage", nom: "Apprentissage" },
];

// Familles de modèles accessibles à chaque type de domaine
const FAMILLES = {
  b2c: ["pro", "biz", "b2c"],
  b2b: ["pro", "biz", "b2b"],
  employe: ["pro", "employe"],
  sante: ["pro", "sante"],
  perso: ["perso"],
  relation: ["relation"],
  etude: ["etude"],
  creatif: ["creatif"],
  carriere: ["carriere"],
};

export const MODELES = [...MODELES_PRO, ...MODELES_VIE, ...MODELES_SAVOIR];
export const DOMAINES = [...d1, ...d2, ...d3, ...d4, ...d5, ...d6];
export const DOMAINE_BY_ID = Object.fromEntries(DOMAINES.map((d) => [d.id, d]));
export const UNIVERS_BY_ID = Object.fromEntries(UNIVERS.map((u) => [u.id, u]));

// Entrée de catalogue : { id, d (domaine), m (modèle) ou s (prompt spécifique), t, r, cat }
export const CATALOGUE = [];
for (const d of DOMAINES) {
  d.sp.forEach((s, i) => CATALOGUE.push({ id: `${d.id}.s${i + 1}`, d, s, t: s.t, r: s.m, cat: s.cat }));
  const tags = new Set(d.kinds.flatMap((k) => FAMILLES[k] || []));
  for (const m of MODELES) {
    if (m.k.some((k) => tags.has(k)) && !(d.sans || []).includes(m.id)) {
      CATALOGUE.push({ id: `${d.id}.${m.id}`, d, m, t: m.t, r: m.r, cat: m.cat });
    }
  }
}

export const ENTRY_BY_ID = new Map(CATALOGUE.map((e) => [e.id, e]));
