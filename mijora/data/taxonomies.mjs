// Référentiels fixes : continents, catégories de plats, difficultés, budgets, tranches de temps,
// familles d'ingrédients, unités. Les identifiants (slugs) servent aussi d'URL et de clés en base.

export const CONTINENTS = [
  { slug: "europe", nom: "Europe" },
  { slug: "asie", nom: "Asie" },
  { slug: "afrique", nom: "Afrique" },
  { slug: "amerique-du-nord", nom: "Amérique du Nord" },
  { slug: "amerique-du-sud", nom: "Amérique du Sud" },
  { slug: "oceanie", nom: "Océanie" },
];

export const CATEGORIES = [
  { slug: "entree", nom: "Entrée" },
  { slug: "plat-principal", nom: "Plat principal" },
  { slug: "accompagnement", nom: "Accompagnement" },
  { slug: "dessert", nom: "Dessert" },
  { slug: "petit-dejeuner", nom: "Petit-déjeuner" },
  { slug: "boisson", nom: "Boisson" },
  { slug: "snack", nom: "Snack" },
];

export const DIFFICULTES = [
  { slug: "facile", nom: "Facile", rang: 1 },
  { slug: "intermediaire", nom: "Intermédiaire", rang: 2 },
  { slug: "difficile", nom: "Difficile", rang: 3 },
];

export const BUDGETS = [
  { slug: "economique", nom: "Économique" },
  { slug: "moyen", nom: "Moyen" },
  { slug: "eleve", nom: "Élevé" },
];

// Tranches de temps total, en minutes : [min inclus, max exclu]
export const TEMPS = [
  { slug: "moins-15", nom: "Moins de 15 minutes", min: 0, max: 15 },
  { slug: "15-30", nom: "15 à 30 minutes", min: 15, max: 31 },
  { slug: "30-45", nom: "30 à 45 minutes", min: 31, max: 46 },
  { slug: "45-60", nom: "45 à 60 minutes", min: 46, max: 61 },
  { slug: "plus-60", nom: "Plus d'une heure", min: 61, max: Infinity },
];

export const FAMILLES = [
  { slug: "viandes", nom: "Viandes" },
  { slug: "poissons", nom: "Poissons et fruits de mer" },
  { slug: "legumes", nom: "Légumes" },
  { slug: "fruits", nom: "Fruits" },
  { slug: "feculents", nom: "Féculents" },
  { slug: "legumineuses", nom: "Légumineuses" },
  { slug: "produits-laitiers", nom: "Produits laitiers et œufs" },
  { slug: "epices", nom: "Épices et herbes" },
  { slug: "condiments", nom: "Condiments, sauces et matières grasses" },
  { slug: "sucres", nom: "Sucres et pâtisserie" },
  { slug: "autres", nom: "Autres" },
];

// Unités : dimension (masse, volume, compte), facteur vers l'unité de base de la dimension,
// pas d'arrondi après recalcul des portions. Aucune conversion volume ↔ masse n'est faite :
// elle exigerait la densité de chaque ingrédient.
export const UNITES = {
  g: { nom: "g", dim: "masse", base: 1, pas: 5 },
  kg: { nom: "kg", dim: "masse", base: 1000, pas: 0.05 },
  ml: { nom: "ml", dim: "volume", base: 1, pas: 5 },
  cl: { nom: "cl", dim: "volume", base: 10, pas: 1 },
  l: { nom: "l", dim: "volume", base: 1000, pas: 0.05 },
  cas: { nom: "c. à soupe", dim: "cuillere-soupe", base: 1, pas: 0.25 },
  cac: { nom: "c. à café", dim: "cuillere-cafe", base: 1, pas: 0.25 },
  piece: { nom: "", dim: "compte", base: 1, pas: 0.5 },
  gousse: { nom: "gousse", pluriel: "gousses", dim: "gousse", base: 1, pas: 0.5 },
  pincee: { nom: "pincée", pluriel: "pincées", dim: "pincee", base: 1, pas: 1 },
  feuille: { nom: "feuille", pluriel: "feuilles", dim: "feuille", base: 1, pas: 1 },
  brin: { nom: "brin", pluriel: "brins", dim: "brin", base: 1, pas: 1 },
  botte: { nom: "botte", pluriel: "bottes", dim: "botte", base: 1, pas: 0.5 },
  tranche: { nom: "tranche", pluriel: "tranches", dim: "tranche", base: 1, pas: 1 },
  cm: { nom: "cm", dim: "longueur", base: 1, pas: 0.5 },
};

// Les 14 allergènes à déclaration obligatoire (règlement UE n° 1169/2011, annexe II)
export const ALLERGENES = [
  { slug: "gluten", nom: "Gluten", detail: "Céréales contenant du gluten : blé, seigle, orge, avoine, épeautre, kamut" },
  { slug: "crustaces", nom: "Crustacés" },
  { slug: "oeufs", nom: "Œufs" },
  { slug: "poissons", nom: "Poissons" },
  { slug: "arachides", nom: "Arachides" },
  { slug: "soja", nom: "Soja" },
  { slug: "lait", nom: "Lait", detail: "Y compris le lactose" },
  { slug: "fruits-a-coque", nom: "Fruits à coque" },
  { slug: "celeri", nom: "Céleri" },
  { slug: "moutarde", nom: "Moutarde" },
  { slug: "sesame", nom: "Sésame" },
  { slug: "sulfites", nom: "Sulfites", detail: "Anhydride sulfureux et sulfites au-delà de 10 mg/kg ou 10 mg/l" },
  { slug: "lupin", nom: "Lupin" },
  { slug: "mollusques", nom: "Mollusques" },
];
