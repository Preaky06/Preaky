import workRows from "@/data/works.json";
import cardRows from "@/data/cards.json";

export type WorkType = "serie" | "serie-animee" | "anime" | "film" | "film-animation";
export type Rarity = "commune" | "rare" | "epique" | "legendaire" | "mythique";

/** Une œuvre : série, série animée, anime ou film. Sert de contexte aux cartes. */
export type Work = {
  id: string;
  title: string;
  type: WorkType;
  year: number;
  countries: string[];
  genres: string;
};

/** Une carte : un personnage d'une œuvre, avec son image réelle. */
export type CardDef = {
  id: string;
  num: number;
  name: string;
  rarity: Rarity;
  image: string;
  /** Page d'où vient l'image (Wikipédia ou AniList). */
  source: string;
  credit: "Wikipédia" | "AniList";
  work: Work;
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
};

export function countryNames(codes: string[]): string {
  return codes.map((c) => COUNTRIES[c] ?? c).join(", ");
}

type WorkRow = [string, string, WorkType, number, string, string, Rarity];

const WORKS_BY_ID = new Map(
  (workRows as WorkRow[]).map(([id, title, type, year, countries, genres]) => [
    id,
    { id, title, type, year, countries: countries.split(","), genres } satisfies Work,
  ]),
);

type CardRow = { id: string; name: string; work: string; rarity: Rarity; image: string; source: string; credit: CardDef["credit"] };

/** Toutes les cartes, rangées par type d'œuvre puis dans l'ordre du fichier. Le numéro suit cet ordre. */
export const CARDS: CardDef[] = (cardRows as CardRow[])
  .filter((c) => WORKS_BY_ID.has(c.work))
  .map((c) => ({ ...c, work: WORKS_BY_ID.get(c.work)! }))
  .sort((a, b) => TYPE_ORDER.indexOf(a.work.type) - TYPE_ORDER.indexOf(b.work.type))
  .map((c, i) => ({ ...c, num: i + 1 }));

const CARDS_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDef | undefined {
  return CARDS_BY_ID.get(id);
}

export const CARDS_BY_RARITY: Record<Rarity, CardDef[]> = Object.fromEntries(
  RARITY_ORDER.map((r) => [r, CARDS.filter((c) => c.rarity === r)]),
) as Record<Rarity, CardDef[]>;

/** Nombre d'œuvres représentées par au moins une carte. */
export const WORK_COUNT = new Set(CARDS.map((c) => c.work.id)).size;

export function cardNumber(num: number): string {
  return String(num).padStart(3, "0");
}
