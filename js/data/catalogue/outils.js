// Petits outils d'écriture partagés par les modèles et les fiches de domaine.

// ["a", "b", "c"] → « a, b et c »
export function liste(items = []) {
  const arr = items.filter(Boolean);
  if (arr.length <= 1) return arr[0] || "";
  return `${arr.slice(0, -1).join(", ")} et ${arr[arr.length - 1]}`;
}

// Premier élément, pour illustrer un champ (« Ex. : … »)
export const premier = (items = []) => items[0] || "";

// Majuscule initiale
export const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

// Fiche de domaine. kinds : « b2c », « b2b », « employe », « sante », « perso », « relation »,
// « etude », « creatif », « carriere », combinables avec « + ». sp : prompts propres au domaine,
// chacun [titre, mission, catégorie].
export function dom(id, nom, univers, kinds, profil, sp = []) {
  return { id, nom, univers, kinds: kinds.split("+"), ...profil, sp: sp.map(([t, m, cat]) => ({ t, m, cat })) };
}
