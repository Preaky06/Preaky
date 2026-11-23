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

export const TYPES: Record<WorkType, { label: string; short: string; color: string }> = {
  serie: { label: "Série", short: "Séries", color: "#5B8CFF" },
  "serie-animee": { label: "Série animée", short: "Séries animées", color: "#4ADE80" },
  anime: { label: "Anime", short: "Anime", color: "#FF5DA2" },
  film: { label: "Film", short: "Films", color: "#FFC247" },
  "film-animation": { label: "Film d’animation", short: "Films d’animation", color: "#FF8A4C" },
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

/* ---------- Visuel original de la carte, calculé à partir de l'identifiant ---------- */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SECOND_COLORS = ["#5B8CFF", "#FF5DA2", "#FFC247", "#4ADE80", "#A78BFA", "#FF8A4C", "#5EEAD4"];
const SMALL_WORDS = new Set(["le", "la", "les", "l", "the", "un", "une", "de", "du", "des", "d", "et", "a", "à", "x"]);

export function initials(title: string): string {
  const words = title
    .replace(/[’']/g, " ")
    .split(/[\s:,.;!-]+/)
    .filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return title.slice(0, 1).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export type CardArt = {
  background: string;
  motifX: number;
  motifY: number;
  motifRotate: number;
  initials: string;
};

export function cardArt(work: Work): CardArt {
  const h = hash(work.id);
  const c1 = TYPES[work.type].color;
  const c2 = SECOND_COLORS[h % SECOND_COLORS.length] === c1 ? SECOND_COLORS[(h + 1) % SECOND_COLORS.length] : SECOND_COLORS[h % SECOND_COLORS.length];
  const x1 = 10 + (h % 50);
  const y1 = 10 + ((h >> 6) % 45);
  const x2 = 45 + ((h >> 12) % 50);
  const y2 = 45 + ((h >> 18) % 50);
  return {
    background: `radial-gradient(70% 65% at ${x1}% ${y1}%, ${c1}d9, transparent 72%), radial-gradient(75% 70% at ${x2}% ${y2}%, ${c2}a6, transparent 72%), linear-gradient(160deg, #1D1D28, #101016)`,
    motifX: (h >> 4) % 40,
    motifY: (h >> 9) % 30,
    motifRotate: ((h >> 14) % 40) - 20,
    initials: initials(work.title),
  };
}
