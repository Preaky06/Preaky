// Favoris et listes de courses, enregistrés sur l'appareil.
// La synchronisation avec un compte Supabase (tables favorites, shopping_lists) viendra en phase 2.
import { lire, ecrire } from "./outils.js";
import { UNITES, ajuster } from "./quantites.js";

const CLE_FAVORIS = "mijora.favoris";
const CLE_LISTES = "mijora.listes";

export const favoris = {
  tous: () => lire(CLE_FAVORIS, []),
  a: (slug) => favoris.tous().includes(slug),
  basculer(slug) {
    const f = favoris.tous();
    const i = f.indexOf(slug);
    if (i >= 0) f.splice(i, 1);
    else f.unshift(slug);
    const ok = ecrire(CLE_FAVORIS, f);
    document.dispatchEvent(new CustomEvent("mijora:favoris"));
    return { actif: i < 0, ok };
  },
};

const id = () => Math.random().toString(36).slice(2, 10);

export const listes = {
  etat() {
    const e = lire(CLE_LISTES, null);
    if (e && Array.isArray(e.listes) && e.listes.length) return e;
    const premiere = { id: id(), nom: "Ma liste", articles: [] };
    return { active: premiere.id, listes: [premiere] };
  },
  enregistrer: (e) => ecrire(CLE_LISTES, e),
  active(e) {
    return e.listes.find((l) => l.id === e.active) ?? e.listes[0];
  },
  nouvelle(e, nom) {
    const l = { id: id(), nom, articles: [] };
    e.listes.push(l);
    e.active = l.id;
    return l;
  },
};

// Ajoute une mesure à un article : additionne dans la même dimension, sinon ajoute une mesure à part
export function ajouterMesure(article, q, u) {
  if (q == null) { article.sansQuantite = true; return; }
  const dim = UNITES[u].dim;
  const m = article.mesures.find((x) => UNITES[x.u].dim === dim);
  if (!m) {
    const a = ajuster(q, u, 1);
    article.mesures.push({ q: a.quantite, u: a.unite });
    return;
  }
  const total = m.q * UNITES[m.u].base + q * UNITES[u].base;
  const baseU = dim === "masse" ? "g" : dim === "volume" ? "ml" : m.u;
  const a = ajuster(total / UNITES[baseU].base, baseU, 1);
  m.q = a.quantite;
  m.u = a.unite;
}

// lignes : [{ s, n, f, q, u }] déjà recalculées pour les portions voulues
export function ajouterRecette(titre, lignes) {
  const e = listes.etat();
  const l = listes.active(e);
  let n = 0;
  for (const x of lignes) {
    let a = l.articles.find((y) => y.s && y.s === x.s && !y.texteQte);
    if (!a) {
      a = { id: id(), s: x.s, n: x.n, f: x.f, mesures: [], sansQuantite: false, recettes: [], coche: false };
      l.articles.push(a);
    }
    ajouterMesure(a, x.q, x.u);
    if (!a.recettes.includes(titre)) a.recettes.push(titre);
    a.coche = false;
    n++;
  }
  const ok = listes.enregistrer(e);
  return { n, liste: l.nom, ok };
}
