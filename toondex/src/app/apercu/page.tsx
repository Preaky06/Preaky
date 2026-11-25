import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackOpener } from "@/components/PackOpener";
import { CARDS_BY_RARITY, RARITY_ORDER, getCard, type CardDef } from "@/lib/catalogue";
import { withDefs, type PackCard } from "@/lib/collection";
import { buildSets } from "@/lib/sets";

export const metadata: Metadata = { title: "Aperçu des animations", robots: { index: false } };

/** Paquet fixe avec une carte de chaque rareté, pour voir les animations. Désactivé en production sauf TOONDEX_DEMO=1. */
const DEMO: PackCard[] = RARITY_ORDER.flatMap((r, i) => {
  const card = CARDS_BY_RARITY[r].find((c) => c.image) ?? CARDS_BY_RARITY[r][0];
  return card ? [{ cardId: card.id, gold: false, status: i === 1 ? "dup" : "new", shards: i === 1 ? 10 : 0 } as PackCard] : [];
});

const GOLD: PackCard[] = DEMO.map((c, i) => (i === 2 ? { ...c, gold: true, status: "new-gold" } : c));

const SHOWCASE = ["walter-white", "satoru-gojo"].map((id) => getCard(id)).filter((c): c is CardDef => !!c);

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ or?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.TOONDEX_DEMO !== "1") notFound();
  const withGold = (await searchParams).or === "1";
  return (
    <PackOpener
      initialCards={null}
      demoCards={withDefs(withGold ? GOLD : DEMO)}
      demoSets={buildSets(DEMO, new Set(DEMO.map((c) => c.cardId)))}
      showcase={SHOWCASE}
      chips={[<>Aperçu</>, <>Une carte par rareté{withGold ? ", dont une secrète en or" : ""}</>]}
    />
  );
}
