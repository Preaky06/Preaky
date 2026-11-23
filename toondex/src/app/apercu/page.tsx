import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackOpener } from "@/components/PackOpener";
import { CARDS_BY_RARITY, RARITY_ORDER } from "@/lib/catalogue";
import type { PackCard } from "@/lib/collection";
import { Wobble } from "@/components/Wobble";
import { POP } from "@/lib/palette";

export const metadata: Metadata = { title: "Aperçu des animations", robots: { index: false } };

/** Paquet fixe avec une carte de chaque rareté, pour voir les animations. Désactivé en production sauf TOONDEX_DEMO=1. */
const DEMO: PackCard[] = RARITY_ORDER.flatMap((r, i) => {
  const card = CARDS_BY_RARITY[r][0];
  return card ? [{ cardId: card.id, gold: false, status: i === 1 ? "dup" : "new", shards: i === 1 ? 10 : 0 } as PackCard] : [];
});

const GOLD: PackCard[] = DEMO.map((c, i) => (i === 2 ? { ...c, gold: true, status: "new-gold" } : c));

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ or?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.TOONDEX_DEMO !== "1") notFound();
  const withGold = (await searchParams).or === "1";
  return (
    <section className="panel panel--dark today">
      <div className="today__head">
        <span className="tag tag--dark">Aperçu</span>
        <h1 className="giant">
          <Wobble text="Une carte par rareté" colors={POP} />
        </h1>
        <p className="today__status">Commune, rare, épique, légendaire, mythique{withGold ? ", et une version or" : ""}.</p>
      </div>
      <PackOpener initialCards={null} demoCards={withGold ? GOLD : DEMO} />
    </section>
  );
}
