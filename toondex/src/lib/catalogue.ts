import cardRows from "@/data/cards.json";
import extraCardRows from "@/data/cards-extra.json";
import extraWorkRows from "@/data/works-extra.json";
import workRows from "@/data/works.json";
import { RARITY_ORDER, TYPE_ORDER, type CardDef, type Rarity, type Work, type WorkType } from "@/lib/cards-meta";

export * from "@/lib/cards-meta";

type WorkRow = [string, string, WorkType, number, string, string, Rarity, string?];

const WORKS_BY_ID = new Map(
  ([...workRows, ...extraWorkRows] as WorkRow[]).map(([id, title, type, year, countries, genres, , network]) => [
    id,
    { id, title, type, year, countries: countries.split(","), genres, network: network ?? "" } satisfies Work,
  ]),
);

type CardRow = {
  id: string;
  name: string;
  work: string;
  rarity: Rarity;
  image: string;
  source: string;
  credit: CardDef["credit"];
};

const ROWS = ([...cardRows, ...extraCardRows] as CardRow[]).filter((c) => WORKS_BY_ID.has(c.work));

/** Ordre d'apparition de chaque œuvre dans les fichiers : les œuvres restent groupées. */
const firstIndex = new Map<string, number>();
ROWS.forEach((c, i) => firstIndex.has(c.work) || firstIndex.set(c.work, i));

/**
 * Toutes les cartes : la sélection d'abord (cards.json), puis l'extension (cards-extra.json),
 * rangées par type d'œuvre puis par œuvre. Le numéro suit cet ordre.
 */
export const CARDS: CardDef[] = ROWS.map((c, i) => ({ row: c, i }))
  .sort((a, b) => {
    const wa = WORKS_BY_ID.get(a.row.work)!;
    const wb = WORKS_BY_ID.get(b.row.work)!;
    return TYPE_ORDER.indexOf(wa.type) - TYPE_ORDER.indexOf(wb.type) || firstIndex.get(wa.id)! - firstIndex.get(wb.id)! || a.i - b.i;
  })
  .map(({ row }, i) => ({ ...row, work: WORKS_BY_ID.get(row.work)!, num: i + 1, total: ROWS.length }));

const CARDS_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDef | undefined {
  return CARDS_BY_ID.get(id);
}

export const CARDS_BY_RARITY: Record<Rarity, CardDef[]> = Object.fromEntries(
  RARITY_ORDER.map((r) => [r, CARDS.filter((c) => c.rarity === r)]),
) as Record<Rarity, CardDef[]>;

/** Nombre d'œuvres représentées par au moins une carte. */
export const WORK_COUNT = new Set(CARDS.map((c) => c.work.id)).size;

