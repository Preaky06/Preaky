import { CARDS, RARITIES, getCard, type CardDef } from "@/lib/catalogue";
import { setBonus } from "@/lib/rules";

/**
 * Séries à compléter : une série regroupe toutes les cartes d'une même œuvre.
 * Après l'ouverture d'un paquet, chaque œuvre touchée affiche sa progression.
 */

export type SetSlot = {
  cardId: string;
  owned: boolean;
  /** Obtenue pour la première fois dans ce paquet. */
  isNew: boolean;
  /** Nombre de doublons de cette carte dans ce paquet. */
  dup: number;
  /** Une version or est sortie dans ce paquet. */
  gold: boolean;
};

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

const BY_WORK = new Map<string, CardDef[]>();
for (const c of CARDS) {
  const list = BY_WORK.get(c.work.id) ?? [];
  list.push(c);
  BY_WORK.set(c.work.id, list);
}

export function cardsOfWork(workId: string): CardDef[] {
  return BY_WORK.get(workId) ?? [];
}

export function starsOf(card: CardDef): number {
  return RARITIES[card.rarity].rank + 1;
}

type PackLike = { cardId: string; gold: boolean; status: "new" | "new-gold" | "dup" }[];

/** Séries touchées par un paquet (œuvres d'au moins 2 cartes), dans l'ordre d'apparition des cartes. */
export function buildSets(pack: PackLike, ownedIds: ReadonlySet<string>, justCompleted: ReadonlySet<string> = new Set()): PackSet[] {
  const order: string[] = [];
  for (const p of pack) {
    const card = getCard(p.cardId);
    if (card && !order.includes(card.work.id) && cardsOfWork(card.work.id).length >= 2) order.push(card.work.id);
  }
  return order.map((workId) => {
    const cards = cardsOfWork(workId);
    const slots = cards.map((c) => {
      const hits = pack.filter((p) => p.cardId === c.id);
      return {
        cardId: c.id,
        owned: ownedIds.has(c.id),
        isNew: hits.some((p) => p.status !== "dup"),
        dup: hits.filter((p) => p.status === "dup").length,
        gold: hits.some((p) => p.gold),
      };
    });
    const owned = slots.filter((s) => s.owned).length;
    return {
      workId,
      title: cards[0].work.title,
      year: cards[0].work.year,
      slots,
      owned,
      total: cards.length,
      complete: owned === cards.length,
      bonus: setBonus(cards.length),
      justCompleted: justCompleted.has(workId),
    };
  });
}
