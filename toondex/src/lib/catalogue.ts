import rows from "@/data/works.json";

export type WorkType = "serie" | "serie-animee" | "anime" | "film" | "film-animation";
export type Rarity = "commune" | "rare" | "epique" | "legendaire" | "mythique";

export type Work = {
  id: string;
  num: number;
  title: string;
  type: WorkType;
  year: number;
  countries: string[];
  genres: string;
  rarity: Rarity;
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

type Row = [string, string, WorkType, number, string, string, Rarity];

export const WORKS: Work[] = (rows as Row[]).map(([id, title, type, year, countries, genres, rarity], i) => ({
  id,
  num: i + 1,
  title,
  type,
  year,
  countries: countries.split(","),
  genres,
  rarity,
}));

const BY_ID = new Map(WORKS.map((w) => [w.id, w]));

export function getWork(id: string): Work | undefined {
  return BY_ID.get(id);
}

export const WORKS_BY_RARITY: Record<Rarity, Work[]> = Object.fromEntries(
  RARITY_ORDER.map((r) => [r, WORKS.filter((w) => w.rarity === r)]),
) as Record<Rarity, Work[]>;

export function cardNumber(num: number): string {
  return String(num).padStart(3, "0");
}

/* ---------- Personnage original de la carte, choisi selon le genre ---------- */

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Archetype =
  | "astronaut"
  | "alien"
  | "robot"
  | "zombie"
  | "ghost"
  | "wizard"
  | "magical"
  | "hero"
  | "detective"
  | "spy"
  | "athlete"
  | "singer"
  | "romance"
  | "laurel"
  | "soldier"
  | "explorer"
  | "fighter"
  | "party"
  | "drama";

/** Genre (en minuscules) vers personnage. Le premier genre de l'œuvre décide. */
const GENRE_ARCHETYPES: [string, Archetype | Archetype[]][] = [
  ["mecha", "robot"],
  ["cyberpunk", "robot"],
  ["space opera", "astronaut"],
  ["science-fiction", ["astronaut", "alien", "robot"]],
  ["science", "astronaut"],
  ["horreur", "zombie"],
  ["post-apocalyptique", "zombie"],
  ["survie", "zombie"],
  ["surnaturel", "ghost"],
  ["mystère", "ghost"],
  ["psychologique", "ghost"],
  ["magical girl", "magical"],
  ["dark fantasy", "wizard"],
  ["fantasy", "wizard"],
  ["fantastique", ["wizard", "ghost", "magical"]],
  ["conte", "wizard"],
  ["mythologie", "laurel"],
  ["super-héros", "hero"],
  ["espionnage", "spy"],
  ["thriller", ["detective", "spy"]],
  ["policier", "detective"],
  ["crime", "detective"],
  ["néo-noir", "detective"],
  ["braquage", "spy"],
  ["sport", "athlete"],
  ["drame musical", "singer"],
  ["musical", "singer"],
  ["comédie romantique", "romance"],
  ["romance", "romance"],
  ["drame historique", "laurel"],
  ["historique", "laurel"],
  ["péplum", "laurel"],
  ["guerre", "soldier"],
  ["biographie", "drama"],
  ["aventure", "explorer"],
  ["action", "fighter"],
  ["comédie dramatique", "drama"],
  ["comédie", "party"],
  ["satire", "party"],
  ["famille", "party"],
  ["drame", "drama"],
];

export function archetypeFor(work: Work): Archetype {
  const genres = work.genres.toLowerCase().split(",").map((g) => g.trim());
  const h = hash(work.id);
  for (const genre of genres) {
    const match = GENRE_ARCHETYPES.find(([key]) => key === genre);
    if (match) {
      const value = match[1];
      return Array.isArray(value) ? value[h % value.length] : value;
    }
  }
  return "party";
}
