// Quantités : lecture, recalcul selon les portions, mise en forme en français.
// Module partagé entre le générateur (Node) et le navigateur : aucune dépendance.
// Les conversions se font uniquement à l'intérieur d'une même dimension (g ↔ kg, ml ↔ l) :
// passer d'un volume à une masse exigerait la densité de chaque ingrédient.

export const UNITES = {
  g: { dim: "masse", base: 1 },
  kg: { dim: "masse", base: 1000 },
  ml: { dim: "volume", base: 1 },
  cl: { dim: "volume", base: 10 },
  l: { dim: "volume", base: 1000 },
  cas: { dim: "cas", base: 1, nom: "c. à soupe", fractions: true, pas: 0.25 },
  cac: { dim: "cac", base: 1, nom: "c. à café", fractions: true, pas: 0.25 },
  piece: { dim: "piece", base: 1, fractions: true },
  gousse: { dim: "gousse", base: 1, nom: "gousse", pluriel: "gousses", fractions: true },
  pincee: { dim: "pincee", base: 1, nom: "pincée", pluriel: "pincées", entier: true },
  feuille: { dim: "feuille", base: 1, nom: "feuille", pluriel: "feuilles", entier: true },
  brin: { dim: "brin", base: 1, nom: "brin", pluriel: "brins", entier: true },
  botte: { dim: "botte", base: 1, nom: "botte", pluriel: "bottes", fractions: true },
  tranche: { dim: "tranche", base: 1, nom: "tranche", pluriel: "tranches", entier: true },
  cm: { dim: "cm", base: 1, nom: "cm", fractions: true },
};

const FRACTIONS = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

// « 400 g spaghetti (note) », « ?½ botte persil-plat », « sel », « poivre-noir (selon le goût) »
export function lireLigne(ligne) {
  let reste = ligne.trim();
  const facultatif = reste.startsWith("?");
  if (facultatif) reste = reste.slice(1).trim();
  let note = null;
  const n = reste.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (n) { reste = n[1]; note = n[2]; }
  const m = reste.match(/^([\d.]+|[¼½¾⅓⅔]|\d+[¼½¾⅓⅔])\s+(\S+)\s+(\S+)$/);
  if (!m) return { facultatif, quantite: null, unite: null, ingredient: reste, note };
  const brut = m[1];
  let quantite;
  if (FRACTIONS[brut] != null) quantite = FRACTIONS[brut];
  else if (/\d+[¼½¾⅓⅔]/.test(brut)) quantite = parseInt(brut, 10) + FRACTIONS[brut.slice(-1)];
  else quantite = Number(brut);
  if (!UNITES[m[2]]) throw new Error(`Unité inconnue « ${m[2]} » dans « ${ligne} »`);
  if (!(quantite > 0)) throw new Error(`Quantité invalide dans « ${ligne} »`);
  return { facultatif, quantite, unite: m[2], ingredient: m[3], note };
}

// Arrondi lisible après recalcul. Jamais zéro : on garde au moins le plus petit pas.
export function arrondir(valeur, unite) {
  const u = UNITES[unite];
  if (u.dim === "masse" || u.dim === "volume") {
    const base = valeur * u.base;
    const pas = base < 10 ? 0.5 : base < 50 ? 1 : base < 250 ? 5 : base < 1000 ? 10 : 50;
    return Math.max(pas, Math.round(base / pas) * pas);
  }
  if (u.entier) return Math.max(1, Math.round(valeur));
  if (u.fractions) {
    const pas = u.pas && valeur < 3 ? u.pas : 0.5;
    return Math.max(pas, Math.round(valeur / pas) * pas);
  }
  return valeur;
}

// Quantité recalculée, exprimée dans l'unité la plus lisible de sa dimension
export function ajuster(quantite, unite, facteur) {
  const u = UNITES[unite];
  if (quantite == null) return { quantite: null, unite };
  const v = arrondir(quantite * facteur, unite);
  if (u.dim === "masse") return v >= 1000 ? { quantite: v / 1000, unite: "kg" } : { quantite: v, unite: "g" };
  if (u.dim === "volume") return v >= 1000 ? { quantite: v / 1000, unite: "l" } : { quantite: v, unite: "ml" };
  return { quantite: v, unite };
}

function nombre(v) {
  return String(Math.round(v * 100) / 100).replace(".", ",");
}

export function formaterQuantite(v, unite) {
  const u = UNITES[unite];
  if (u && u.fractions) {
    const entier = Math.floor(v + 1e-9);
    const reste = v - entier;
    const f = Object.entries(FRACTIONS).find(([, x]) => Math.abs(x - reste) < 0.01);
    if (reste < 0.01) return String(entier);
    if (f) return entier ? `${entier} ${f[0]}` : f[0];
  }
  return nombre(v);
}

// « de » devient « d' » devant une voyelle ou un h muet
const H_MUET = /^(huile|herbe|hui)/i;
export function de(mot) {
  return /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(mot) || H_MUET.test(mot) ? `d'${mot}` : `de ${mot}`;
}

// Mesure seule : « 400 g », « 2 gousses », « 1 ¼ c. à soupe », « 3 » (pour les pièces)
export function mesure(quantite, unite) {
  const u = UNITES[unite];
  const q = formaterQuantite(quantite, unite);
  if (unite === "piece") return q;
  const nom = u.nom && u.pluriel ? (quantite >= 2 ? u.pluriel : u.nom) : u.nom ?? unite;
  return `${q} ${nom}`;
}

// ing : { n, p, m } ; renvoie le texte affiché, sans la note
export function libelle(ing, quantite, unite) {
  const pluriel = ing.p ?? ing.n + "s";
  if (quantite == null) return ing.n.charAt(0).toUpperCase() + ing.n.slice(1);
  if (unite === "piece") return `${mesure(quantite, unite)} ${quantite >= 2 ? pluriel : ing.n}`;
  return `${mesure(quantite, unite)} ${de(ing.m === "p" ? pluriel : ing.n)}`;
}

// Additionne des quantités d'un même ingrédient (liste de courses) : seulement dans une même dimension
export function additionner(lignes) {
  const parDim = new Map();
  const sans = [];
  for (const l of lignes) {
    if (l.quantite == null) { sans.push(l); continue; }
    const u = UNITES[l.unite];
    const cle = u.dim;
    const total = parDim.get(cle) ?? { quantite: 0, unite: u.dim === "masse" ? "g" : u.dim === "volume" ? "ml" : l.unite };
    total.quantite += l.quantite * u.base;
    parDim.set(cle, total);
  }
  const res = [...parDim.values()].map((t) => ajuster(t.quantite, t.unite, 1));
  return { mesures: res, sansQuantite: sans.length > 0 };
}
