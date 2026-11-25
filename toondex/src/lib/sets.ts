import { CARDS, getCard, type CardDef } from "@/lib/catalogue";
import type { PackCard, PackSet } from "@/lib/pack-types";
import { setBonus } from "@/lib/rules";

/**
 * Séries à compléter : une série regroupe toutes les cartes d'une même œuvre.
 * Après l'ouverture d'un paquet, chaque œuvre touchée affiche sa progression.
 */

const BY_WORK = new Map<string, CardDef[]>();
for (const c of CARDS) {
  const list = BY_WORK.get(c.work.id) ?? [];
  list.push(c);
  BY_WORK.set(c.work.id, list);
}

export function cardsOfWork(workId: string): CardDef[] {
  return BY_WORK.get(workId) ?? [];
}


type PackLike = Pick<PackCard, "cardId" | "gold" | "status">[];

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
        card: c,
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
