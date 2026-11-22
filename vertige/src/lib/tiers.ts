/**
 * Les 7 paliers. La couleur d'accent pilote le fond, les halos, les barres et les badges.
 * Bornes en euros : min inclus, max exclus.
 */
export type TierId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Tier {
  id: TierId;
  slug: string;
  name: string;
  /** Couleur d'accent (hex). Contraste ≥ 4,5:1 sur #07070A, vérifié par scripts/check-contrast.mjs */
  color: string;
  colorName: string;
  minEur: number | null;
  maxEur: number | null;
  /** Bornes log10, utilisées par l'altimètre. */
  logMin: number;
  logMax: number;
  range: string;
  tagline: string;
}

export const TIERS: readonly Tier[] = [
  {
    id: 1,
    slug: "poussiere",
    name: "Poussière",
    color: "#8A8F98",
    colorName: "cendre",
    minEur: null,
    maxEur: 0.01,
    logMin: -5,
    logMax: -2,
    range: "moins d'un centime",
    tagline: "Ce qui coûte moins qu'un centime. L'infiniment petit du portefeuille.",
  },
  {
    id: 2,
    slug: "monnaie",
    name: "Monnaie",
    color: "#C07A45",
    colorName: "cuivre",
    minEur: 0.01,
    maxEur: 1,
    logMin: -2,
    logMax: 0,
    range: "de 0,01 € à 1 €",
    tagline: "La petite monnaie. Ce qu'on paie sans y penser.",
  },
  {
    id: 3,
    slug: "quotidien",
    name: "Quotidien",
    color: "#5FD4A6",
    colorName: "menthe",
    minEur: 1,
    maxEur: 100,
    logMin: 0,
    logMax: 2,
    range: "de 1 € à 100 €",
    tagline: "Les achats de tous les jours, ceux qu'on oublie dès le lendemain.",
  },
  {
    id: 4,
    slug: "confort",
    name: "Confort",
    color: "#4F7CFF",
    colorName: "bleu électrique",
    minEur: 100,
    maxEur: 10_000,
    logMin: 2,
    logMax: 4,
    range: "de 100 € à 10 000 €",
    tagline: "Ce pour quoi on économise. Ce qu'on compare avant d'acheter.",
  },
  {
    id: 5,
    slug: "luxe",
    name: "Luxe",
    color: "#9B6BFF",
    colorName: "améthyste",
    minEur: 10_000,
    maxEur: 1_000_000,
    logMin: 4,
    logMax: 6,
    range: "de 10 000 € à 1 M€",
    tagline: "Le territoire des montres, des voitures et des mètres carrés.",
  },
  {
    id: 6,
    slug: "demesure",
    name: "Démesure",
    color: "#FF3D6E",
    colorName: "rubis",
    minEur: 1_000_000,
    maxEur: 1_000_000_000,
    logMin: 6,
    logMax: 9,
    range: "de 1 M€ à 1 Md€",
    tagline: "Records d'enchères, avions, transferts. L'argent devient abstrait.",
  },
  {
    id: 7,
    slug: "vertige",
    name: "Vertige",
    color: "#F5C542",
    colorName: "or",
    minEur: 1_000_000_000,
    maxEur: null,
    logMin: 9,
    logMax: 14,
    range: "plus d'un milliard",
    tagline: "Au-delà du milliard : des États, des empires industriels, des programmes spatiaux.",
  },
] as const;

export const TIER_COUNT = TIERS.length;

export function tierOf(priceEur: number): TierId {
  if (priceEur < 0.01) return 1;
  if (priceEur < 1) return 2;
  if (priceEur < 100) return 3;
  if (priceEur < 10_000) return 4;
  if (priceEur < 1_000_000) return 5;
  if (priceEur < 1_000_000_000) return 6;
  return 7;
}

export const getTier = (id: TierId): Tier => TIERS[id - 1];
