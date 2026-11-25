import type { CardDef } from "@/lib/cards-meta";

/** Résultat d'une carte ouverte, stocké avec le paquet. */
export type PackCard = {
  cardId: string;
  gold: boolean;
  /** "new" : carte jamais obtenue. "new-gold" : première version or. "dup" : doublon converti. */
  status: "new" | "new-gold" | "dup";
  shards: number;
};

/** Carte ouverte avec sa définition complète, pour l'affichage dans le navigateur. */
export type PackCardView = PackCard & { card: CardDef };

export type SetSlot = {
  card: CardDef;
  owned: boolean;
  /** Obtenue pour la première fois dans ce paquet. */
  isNew: boolean;
  /** Nombre de doublons de cette carte dans ce paquet. */
  dup: number;
  /** Une version or est sortie dans ce paquet. */
  gold: boolean;
};

/** Une série : toutes les cartes d'une même œuvre. */
export type PackSet = {
  workId: string;
  title: string;
  year: number;
  slots: SetSlot[];
  owned: number;
  total: number;
  complete: boolean;
  /** Bonus de la série, versé une seule fois à la complétion. */
  bonus: number;
  /** La série vient d'être complétée par ce paquet (et le bonus versé). */
  justCompleted: boolean;
};
