import type { Rarity } from "@/lib/catalogue";

/** Règles du jeu, partagées par le serveur et l'affichage. */

export const PACK_SIZE = 5;

/** Cartes 1 à 4 : poids en pour mille. */
export const SLOT_ODDS: Record<Rarity, number> = {
  commune: 620,
  rare: 250,
  epique: 90,
  legendaire: 32,
  mythique: 8,
};

/** Carte 5 : au moins rare. */
export const LAST_SLOT_ODDS: Record<Rarity, number> = {
  commune: 0,
  rare: 700,
  epique: 210,
  legendaire: 70,
  mythique: 20,
};

/** Chaque carte a 1 chance sur GOLD_ODDS d'être en version or. */
export const GOLD_ODDS = 250;

/** Éclats rendus par un doublon. Un doublon or rapporte GOLD_SHARD_MULTIPLIER fois plus. */
export const SHARDS_PER_DUPLICATE: Record<Rarity, number> = {
  commune: 5,
  rare: 10,
  epique: 25,
  legendaire: 60,
  mythique: 150,
};

export const GOLD_SHARD_MULTIPLIER = 5;

/** Prix en éclats pour fabriquer une carte manquante. */
export const CRAFT_COST: Record<Rarity, number> = {
  commune: 40,
  rare: 100,
  epique: 250,
  legendaire: 600,
  mythique: 1500,
};

export function percent(perMille: number): string {
  return `${(perMille / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}
