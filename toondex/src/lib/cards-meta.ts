/**
 * Définitions partagées par le serveur et le navigateur : types, raretés, formats.
 * Aucune donnée de cartes ici, pour que les composants du navigateur restent légers.
 */

export type WorkType = "serie" | "serie-animee" | "anime" | "film" | "film-animation";
export type Rarity = "commune" | "rare" | "epique" | "legendaire" | "mythique" | "matiere-noire";

/** Une œuvre : série, série animée, anime ou film. Sert de contexte aux cartes. */
export type Work = {
  id: string;
  title: string;
  type: WorkType;
  year: number;
  countries: string[];
  genres: string;
  /** Chaîne ou studio (Cartoon Network, Nickelodeon, Disney…), si connu. */
  network: string;
};

/** Une carte : un personnage d'une œuvre, avec son image réelle. */
export type CardDef = {
  id: string;
  num: number;
  name: string;
  rarity: Rarity;
  /** Image réelle du personnage, hébergée par sa source. */
  image: string;
  /** Page d'où vient l'image. */
  source: string;
  credit: "TVMaze" | "Disney API" | "Wikipédia" | "AniList";
  work: Work;
  /** Nombre total de cartes du catalogue (affiché en bas de la carte : 012/1500). */
  total: number;
};

/** Couleur de fond des cartes par type. Toutes gardent un contraste d'au moins 4,5:1 avec l'encre. */
export const TYPES: Record<WorkType, { label: string; short: string; color: string }> = {
  serie: { label: "Série", short: "Séries", color: "#4A90F0" },
  "serie-animee": { label: "Série animée", short: "Séries animées", color: "#F9C80E" },
  anime: { label: "Anime", short: "Anime", color: "#F56BAE" },
  film: { label: "Film", short: "Films", color: "#F0573F" },
  "film-animation": { label: "Film d’animation", short: "Films d’animation", color: "#9B7DF8" },
};

export const TYPE_ORDER = Object.keys(TYPES) as WorkType[];

export const RARITIES: Record<Rarity, { label: string; rank: number }> = {
  commune: { label: "Commune", rank: 0 },
  rare: { label: "Rare", rank: 1 },
  epique: { label: "Épique", rank: 2 },
  legendaire: { label: "Légendaire", rank: 3 },
  mythique: { label: "Mythique", rank: 4 },
  /** Cinq cartes seulement dans tout le catalogue (src/data/black-matter.json). */
  "matiere-noire": { label: "Matière noire", rank: 5 },
};

export const RARITY_ORDER = Object.keys(RARITIES) as Rarity[];

const COUNTRIES: Record<string, string> = {
  US: "États-Unis",
  GB: "Royaume-Uni",
  FR: "France",
  JP: "Japon",
  KR: "Corée du Sud",
  ES: "Espagne",
  DE: "Allemagne",
  AU: "Australie",
  NZ: "Nouvelle-Zélande",
  CA: "Canada",
  CN: "Chine",
  IT: "Italie",
  BE: "Belgique",
  IE: "Irlande",
  SE: "Suède",
  DK: "Danemark",
  NO: "Norvège",
  MX: "Mexique",
  BR: "Brésil",
  IN: "Inde",
  IL: "Israël",
  TR: "Turquie",
  PL: "Pologne",
  NL: "Pays-Bas",
  AR: "Argentine",
  CO: "Colombie",
  PH: "Philippines",
  TW: "Taïwan",
  FI: "Finlande",
  IS: "Islande",
  AT: "Autriche",
  CH: "Suisse",
  RU: "Russie",
  ZA: "Afrique du Sud",
  TH: "Thaïlande",
};

export function countryNames(codes: string[]): string {
  return codes.map((c) => COUNTRIES[c] ?? c).join(", ");
}

/** Numéro de carte sur 3 chiffres, ou 4 au-delà de 999 cartes. */
export function cardNumber(num: number, total = 999): string {
  return String(num).padStart(Math.max(3, String(total).length), "0");
}
