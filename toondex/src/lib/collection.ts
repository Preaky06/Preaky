import "server-only";
import { getDb, type Queryable } from "@/lib/db";
import { getWork } from "@/lib/catalogue";
import { drawPack, parisDay } from "@/lib/game";
import { CRAFT_COST, GOLD_SHARD_MULTIPLIER, SHARDS_PER_DUPLICATE } from "@/lib/rules";

export type Owned = { copies: number; gold: number };
export type OwnedMap = Record<string, Owned>;

/** Résultat d'une carte ouverte, stocké avec le paquet. */
export type PackCard = {
  workId: string;
  gold: boolean;
  /** "new" : carte jamais obtenue. "new-gold" : première version or. "dup" : doublon converti. */
  status: "new" | "new-gold" | "dup";
  shards: number;
};

export type Pack = { day: string; cards: PackCard[] };

export async function getOwned(userId: string): Promise<OwnedMap> {
  const db = await getDb();
  const rows = await db.query<{ work_id: string; copies: number; gold: number }>(
    "select work_id, copies, gold from collection where user_id = $1",
    [userId],
  );
  return Object.fromEntries(rows.map((r) => [r.work_id, { copies: Number(r.copies), gold: Number(r.gold) }]));
}

export async function getTodayPack(userId: string): Promise<Pack | null> {
  const db = await getDb();
  const day = parisDay();
  const rows = await db.query<{ cards: PackCard[] | string }>("select cards from packs where user_id = $1 and day = $2", [
    userId,
    day,
  ]);
  if (!rows[0]) return null;
  const cards = typeof rows[0].cards === "string" ? (JSON.parse(rows[0].cards) as PackCard[]) : rows[0].cards;
  return { day, cards };
}

export class AlreadyOpenedError extends Error {}

/** Ouvre le paquet du jour. Une seule fois par jour et par compte, garanti par la clé primaire. */
export async function openTodayPack(userId: string): Promise<{ pack: Pack; shards: number }> {
  const db = await getDb();
  const day = parisDay();
  const drawn = drawPack();

  return db.transaction(async (tx: Queryable) => {
    const claimed = await tx.query(
      "insert into packs (user_id, day, cards) values ($1, $2, '[]'::jsonb) on conflict do nothing returning day",
      [userId, day],
    );
    if (claimed.length === 0) throw new AlreadyOpenedError();

    const ids = drawn.map((d) => d.workId);
    const rows = await tx.query<{ work_id: string; copies: number; gold: number }>(
      "select work_id, copies, gold from collection where user_id = $1 and work_id = any($2::text[])",
      [userId, ids],
    );
    const owned: OwnedMap = Object.fromEntries(
      rows.map((r) => [r.work_id, { copies: Number(r.copies), gold: Number(r.gold) }]),
    );

    let gained = 0;
    const cards: PackCard[] = drawn.map(({ workId, gold }) => {
      const work = getWork(workId)!;
      const current = owned[workId] ?? { copies: 0, gold: 0 };
      const hadCard = current.copies + current.gold > 0;
      let status: PackCard["status"];
      let shards = 0;
      if (gold) {
        status = current.gold === 0 ? "new-gold" : "dup";
        if (status === "dup") shards = SHARDS_PER_DUPLICATE[work.rarity] * GOLD_SHARD_MULTIPLIER;
        current.gold += 1;
      } else {
        status = hadCard ? "dup" : "new";
        if (status === "dup") shards = SHARDS_PER_DUPLICATE[work.rarity];
        current.copies += 1;
      }
      owned[workId] = current;
      gained += shards;
      return { workId, gold, status, shards };
    });

    for (const id of new Set(ids)) {
      await tx.query(
        `insert into collection (user_id, work_id, copies, gold) values ($1, $2, $3, $4)
         on conflict (user_id, work_id) do update set copies = excluded.copies, gold = excluded.gold`,
        [userId, id, owned[id].copies, owned[id].gold],
      );
    }
    await tx.query("update packs set cards = $3::jsonb where user_id = $1 and day = $2", [
      userId,
      day,
      JSON.stringify(cards),
    ]);
    const updated = await tx.query<{ shards: number }>(
      "update users set shards = shards + $2 where id = $1 returning shards",
      [userId, gained],
    );
    return { pack: { day, cards }, shards: Number(updated[0].shards) };
  });
}

export type CraftResult = { ok: true; shards: number } | { ok: false; error: string };

/** Fabrique une carte manquante avec des éclats. */
export async function craftCard(userId: string, workId: string): Promise<CraftResult> {
  const work = getWork(workId);
  if (!work) return { ok: false, error: "Carte inconnue." };
  const cost = CRAFT_COST[work.rarity];
  const db = await getDb();
  return db.transaction(async (tx) => {
    const existing = await tx.query("select 1 from collection where user_id = $1 and work_id = $2", [userId, workId]);
    if (existing.length > 0) return { ok: false, error: "Tu as déjà cette carte." } as const;
    const paid = await tx.query<{ shards: number }>(
      "update users set shards = shards - $2 where id = $1 and shards >= $2 returning shards",
      [userId, cost],
    );
    if (paid.length === 0) return { ok: false, error: `Il te faut ${cost} éclats.` } as const;
    await tx.query("insert into collection (user_id, work_id, copies, gold) values ($1, $2, 1, 0)", [userId, workId]);
    return { ok: true, shards: Number(paid[0].shards) } as const;
  });
}
