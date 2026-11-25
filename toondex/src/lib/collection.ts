import "server-only";
import { getDb, type Queryable } from "@/lib/db";
import { getCard } from "@/lib/catalogue";
import type { PackCard, PackCardView, PackSet } from "@/lib/pack-types";
import { buildSets, cardsOfWork } from "@/lib/sets";
import { drawPack, parisDay } from "@/lib/game";
import { CRAFT_COST, GOLD_SHARD_MULTIPLIER, SHARDS_PER_DUPLICATE, setBonus } from "@/lib/rules";

export type Owned = { copies: number; gold: number };
export type OwnedMap = Record<string, Owned>;

export type { PackCard, PackCardView, PackSet };

export type Pack = { day: string; cards: PackCard[] };

/** Ajoute à chaque carte ouverte sa définition (nom, image, œuvre…) pour l'affichage. */
export function withDefs(cards: PackCard[]): PackCardView[] {
  return cards.flatMap((c) => {
    const card = getCard(c.cardId);
    return card ? [{ ...c, card }] : [];
  });
}

export async function getOwned(userId: string): Promise<OwnedMap> {
  const db = await getDb();
  const rows = await db.query<{ card_id: string; copies: number; gold: number }>(
    "select card_id, copies, gold from owned_cards where user_id = $1",
    [userId],
  );
  return Object.fromEntries(rows.map((r) => [r.card_id, { copies: Number(r.copies), gold: Number(r.gold) }]));
}

export async function getTodayPack(userId: string): Promise<Pack | null> {
  const db = await getDb();
  const day = parisDay();
  const rows = await db.query<{ cards: PackCard[] | string }>("select cards from daily_packs where user_id = $1 and day = $2", [
    userId,
    day,
  ]);
  if (!rows[0]) return null;
  const cards = typeof rows[0].cards === "string" ? (JSON.parse(rows[0].cards) as PackCard[]) : rows[0].cards;
  return { day, cards };
}

/**
 * Verse le bonus des séries que l'on vient de compléter parmi `workIds`.
 * La clé primaire de completed_sets garantit qu'un bonus n'est versé qu'une fois.
 */
async function awardCompletedSets(tx: Queryable, userId: string, workIds: string[]): Promise<{ done: Set<string>; bonus: number }> {
  const done = new Set<string>();
  let bonus = 0;
  for (const workId of new Set(workIds)) {
    const ids = cardsOfWork(workId).map((c) => c.id);
    const amount = setBonus(ids.length);
    if (amount === 0) continue;
    const have = await tx.query<{ n: number }>(
      "select count(*)::int as n from owned_cards where user_id = $1 and card_id = any($2::text[]) and copies + gold > 0",
      [userId, ids],
    );
    if (Number(have[0].n) < ids.length) continue;
    const inserted = await tx.query(
      "insert into completed_sets (user_id, work_id, bonus) values ($1, $2, $3) on conflict do nothing returning work_id",
      [userId, workId, amount],
    );
    if (inserted.length === 0) continue;
    done.add(workId);
    bonus += amount;
  }
  if (bonus > 0) await tx.query("update users set shards = shards + $2 where id = $1", [userId, bonus]);
  return { done, bonus };
}

/** Séries du paquet du jour, d'après la collection actuelle (paquet déjà ouvert). */
export async function getPackSets(userId: string, pack: Pack): Promise<PackSet[]> {
  const owned = await getOwned(userId);
  return buildSets(pack.cards, new Set(Object.keys(owned)));
}

export class AlreadyOpenedError extends Error {}

/** Ouvre le paquet du jour. Une seule fois par jour et par compte, garanti par la clé primaire. */
export async function openTodayPack(userId: string): Promise<{ pack: Pack; shards: number; sets: PackSet[]; setBonus: number }> {
  const db = await getDb();
  const day = parisDay();
  const drawn = drawPack();

  return db.transaction(async (tx: Queryable) => {
    const claimed = await tx.query(
      "insert into daily_packs (user_id, day, cards) values ($1, $2, '[]'::jsonb) on conflict do nothing returning day",
      [userId, day],
    );
    if (claimed.length === 0) throw new AlreadyOpenedError();

    const ids = drawn.map((d) => d.cardId);
    const rows = await tx.query<{ card_id: string; copies: number; gold: number }>(
      "select card_id, copies, gold from owned_cards where user_id = $1 and card_id = any($2::text[])",
      [userId, ids],
    );
    const owned: OwnedMap = Object.fromEntries(
      rows.map((r) => [r.card_id, { copies: Number(r.copies), gold: Number(r.gold) }]),
    );

    let gained = 0;
    const cards: PackCard[] = drawn.map(({ cardId, gold }) => {
      const card = getCard(cardId)!;
      const current = owned[cardId] ?? { copies: 0, gold: 0 };
      const hadCard = current.copies + current.gold > 0;
      let status: PackCard["status"];
      let shards = 0;
      if (gold) {
        status = current.gold === 0 ? "new-gold" : "dup";
        if (status === "dup") shards = SHARDS_PER_DUPLICATE[card.rarity] * GOLD_SHARD_MULTIPLIER;
        current.gold += 1;
      } else {
        status = hadCard ? "dup" : "new";
        if (status === "dup") shards = SHARDS_PER_DUPLICATE[card.rarity];
        current.copies += 1;
      }
      owned[cardId] = current;
      gained += shards;
      return { cardId, gold, status, shards };
    });

    for (const id of new Set(ids)) {
      await tx.query(
        `insert into owned_cards (user_id, card_id, copies, gold) values ($1, $2, $3, $4)
         on conflict (user_id, card_id) do update set copies = excluded.copies, gold = excluded.gold`,
        [userId, id, owned[id].copies, owned[id].gold],
      );
    }
    await tx.query("update daily_packs set cards = $3::jsonb where user_id = $1 and day = $2", [
      userId,
      day,
      JSON.stringify(cards),
    ]);
    await tx.query("update users set shards = shards + $2 where id = $1", [userId, gained]);

    const workIds = ids.map((id) => getCard(id)!.work.id);
    const { done, bonus } = await awardCompletedSets(tx, userId, workIds);
    const workCards = [...new Set(workIds)].flatMap((w) => cardsOfWork(w).map((c) => c.id));
    const ownedRows = await tx.query<{ card_id: string }>(
      "select card_id from owned_cards where user_id = $1 and card_id = any($2::text[]) and copies + gold > 0",
      [userId, workCards],
    );
    const sets = buildSets(cards, new Set(ownedRows.map((r) => r.card_id)), done);
    const updated = await tx.query<{ shards: number }>("select shards from users where id = $1", [userId]);
    return { pack: { day, cards }, shards: Number(updated[0].shards), sets, setBonus: bonus };
  });
}

export type CraftResult = { ok: true; shards: number; setBonus: number } | { ok: false; error: string };

/** Fabrique une carte manquante avec des éclats. */
export async function craftCard(userId: string, cardId: string): Promise<CraftResult> {
  const card = getCard(cardId);
  if (!card) return { ok: false, error: "Carte inconnue." };
  const cost = CRAFT_COST[card.rarity];
  const db = await getDb();
  return db.transaction(async (tx) => {
    const existing = await tx.query("select 1 from owned_cards where user_id = $1 and card_id = $2", [userId, cardId]);
    if (existing.length > 0) return { ok: false, error: "Tu as déjà cette carte." } as const;
    const paid = await tx.query<{ shards: number }>(
      "update users set shards = shards - $2 where id = $1 and shards >= $2 returning shards",
      [userId, cost],
    );
    if (paid.length === 0) return { ok: false, error: `Il te faut ${cost} éclats.` } as const;
    await tx.query("insert into owned_cards (user_id, card_id, copies, gold) values ($1, $2, 1, 0)", [userId, cardId]);
    const { bonus } = await awardCompletedSets(tx, userId, [card.work.id]);
    return { ok: true, shards: Number(paid[0].shards) + bonus, setBonus: bonus } as const;
  });
}
