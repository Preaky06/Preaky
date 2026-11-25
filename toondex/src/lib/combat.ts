import type { CardDef, Rarity } from "@/lib/cards-meta";

/**
 * Profil de combat d'une carte : classe d'énergie, points de vie, statistiques, attaques, faiblesse.
 * Ce sont des règles de jeu inventées pour ToonDex, calculées à partir de la rareté et de l'identifiant
 * de la carte : la même carte a toujours le même profil.
 */

export type EnergyClass = "combat" | "tech" | "ruse" | "magie" | "coeur" | "humour" | "peur";

export const ENERGIES: Record<EnergyClass, { label: string; color: string; icon: string }> = {
  combat: { label: "Combat", color: "#E8563A", icon: "/3d/feu.webp" },
  tech: { label: "Tech", color: "#1FA9D6", icon: "/3d/eclair.webp" },
  ruse: { label: "Ruse", color: "#7C5CE0", icon: "/3d/cristal.webp" },
  magie: { label: "Magie", color: "#22A699", icon: "/3d/etincelle.webp" },
  coeur: { label: "Cœur", color: "#3A7FE0", icon: "/3d/goutte.webp" },
  humour: { label: "Humour", color: "#F0A81C", icon: "/3d/etoile.webp" },
  peur: { label: "Peur", color: "#59606E", icon: "/3d/alien.webp" },
};

/** Genre de l'œuvre (en minuscules) vers classe d'énergie. Le premier genre reconnu décide. */
const GENRE_CLASS: Record<string, EnergyClass> = {
  action: "combat",
  aventure: "combat",
  "super-héros": "combat",
  sport: "combat",
  péplum: "combat",
  guerre: "combat",
  "science-fiction": "tech",
  mecha: "tech",
  cyberpunk: "tech",
  "space opera": "tech",
  science: "tech",
  thriller: "ruse",
  crime: "ruse",
  policier: "ruse",
  espionnage: "ruse",
  braquage: "ruse",
  "néo-noir": "ruse",
  mystère: "ruse",
  fantasy: "magie",
  fantastique: "magie",
  "dark fantasy": "magie",
  conte: "magie",
  "magical girl": "magie",
  mythologie: "magie",
  surnaturel: "magie",
  drame: "coeur",
  romance: "coeur",
  "comédie dramatique": "coeur",
  biographie: "coeur",
  famille: "coeur",
  "drame historique": "coeur",
  historique: "coeur",
  musical: "coeur",
  "drame musical": "coeur",
  psychologique: "coeur",
  anthologie: "coeur",
  comédie: "humour",
  satire: "humour",
  "comédie romantique": "humour",
  "comédie noire": "humour",
  horreur: "peur",
  "post-apocalyptique": "peur",
  survie: "peur",
};

/** Chaque classe craint une autre classe (dégâts ×2). */
const WEAKNESS: Record<EnergyClass, EnergyClass> = {
  combat: "magie",
  tech: "ruse",
  ruse: "humour",
  magie: "peur",
  coeur: "tech",
  humour: "combat",
  peur: "coeur",
};

const ATTACKS: Record<EnergyClass, [string[], string[]]> = {
  combat: [
    ["Coup de poing", "Riposte", "Esquive vive", "Croc-en-jambe"],
    ["Charge héroïque", "Frappe tournoyante", "Assaut final", "Poing de feu"],
  ],
  tech: [
    ["Court-circuit", "Piratage", "Scan rapide", "Bricolage"],
    ["Rayon laser", "Surcharge", "Invention géniale", "Propulsion"],
  ],
  ruse: [
    ["Bluff", "Fausse piste", "Double jeu", "Filature"],
    ["Coup monté", "Plan secret", "Manipulation", "Disparition"],
  ],
  magie: [
    ["Lueur", "Murmure ancien", "Sceau", "Éveil"],
    ["Sortilège", "Pacte mystique", "Vague d’esprit", "Malédiction"],
  ],
  coeur: [
    ["Souvenir", "Confidence", "Regard franc", "Promesse"],
    ["Lien indéfectible", "Élan du cœur", "Larme sincère", "Dernier mot"],
  ],
  humour: [
    ["Blague douteuse", "Grimace", "Gag visuel", "Pirouette"],
    ["Fou rire", "Réplique culte", "Tarte à la crème", "Chute absurde"],
  ],
  peur: [
    ["Frisson", "Ombre rampante", "Grincement", "Morsure"],
    ["Cri glaçant", "Terreur nocturne", "Hantise", "Fin du monde"],
  ],
};

const RANK: Record<Rarity, number> = { commune: 0, rare: 1, epique: 2, legendaire: 3, mythique: 4, "matiere-noire": 5 };

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Attack = { name: string; cost: number; damage: number };
export type CombatProfile = {
  energy: EnergyClass;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  attacks: [Attack, Attack];
  weakness: EnergyClass;
  retreat: number;
};

export function energyOf(card: CardDef): EnergyClass {
  for (const genre of card.work.genres.toLowerCase().split(",").map((g) => g.trim())) {
    if (GENRE_CLASS[genre]) return GENRE_CLASS[genre];
  }
  return "coeur";
}

/** Plage d'une statistique : base selon la rareté, variation selon la carte. */
function stat(seed: number, rank: number, base: number, perRank: number, spread: number): number {
  return base + rank * perRank + (seed % (spread + 1));
}

export function combatProfile(card: CardDef): CombatProfile {
  const h = hash(card.id);
  const rank = RANK[card.rarity];
  const energy = energyOf(card);
  const [small, big] = ATTACKS[energy];
  const hp = Math.round(stat(h, rank, 60, 40, 30) / 10) * 10;
  const attack = Math.min(200, stat(h >>> 5, rank, 40, 32, 30));
  const defense = Math.min(200, stat(h >>> 10, rank, 35, 30, 35));
  const speed = Math.min(200, stat(h >>> 15, rank, 30, 28, 45));
  const dmg1 = 10 * (1 + rank + ((h >>> 20) % 3));
  const dmg2 = 10 * Math.round((40 + rank * 35 + ((h >>> 23) % 4) * 10) / 10);
  return {
    energy,
    hp,
    attack,
    defense,
    speed,
    attacks: [
      { name: small[(h >>> 3) % small.length], cost: 1, damage: dmg1 },
      { name: big[(h >>> 7) % big.length], cost: rank >= 3 ? 3 : 2, damage: dmg2 },
    ],
    weakness: WEAKNESS[energy],
    retreat: 1 + ((h >>> 26) % 3),
  };
}

/** Symbole de rareté imprimé en bas de la carte, comme sur les cartes à collectionner. */
export const RARITY_SYMBOL: Record<Rarity, string> = {
  commune: "●",
  rare: "◆",
  epique: "★",
  legendaire: "★★",
  mythique: "★★★",
  "matiere-noire": "✦✦✦✦",
};

/** Grille de puissance (1 à 7), pour les cartes légendaires. */
export const GRID_LABELS = ["Force", "Vitesse", "Endurance", "Intelligence", "Puissance", "Charisme"] as const;

export function powerGrid(card: CardDef): number[] {
  const p = combatProfile(card);
  const h = hash(`${card.id}:grille`);
  const scale = (v: number, max: number) => Math.max(1, Math.min(7, Math.round((v / max) * 7)));
  return [scale(p.attack, 200), scale(p.speed, 200), scale(p.hp, 300), 2 + (h % 6), scale((p.attack + p.defense) / 2, 200), 2 + ((h >>> 4) % 6)];
}

/** Charisme (sur 200), pour les cartes matière noire. */
export function charisma(card: CardDef): number {
  return 120 + (hash(`${card.id}:cha`) % 81);
}

/** Nombre avec espace fine entre les milliers (identique côté serveur et navigateur). */
export function groupDigits(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}
