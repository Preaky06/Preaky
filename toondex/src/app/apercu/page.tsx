import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackOpener } from "@/components/PackOpener";
import type { PackCard } from "@/lib/collection";

export const metadata: Metadata = { title: "Aperçu des animations", robots: { index: false } };

/** Paquet fixe avec une carte de chaque rareté, pour voir les animations. Désactivé en production sauf TOONDEX_DEMO=1. */
const DEMO: PackCard[] = [
  { workId: "clarence", gold: false, status: "new", shards: 0 },
  { workId: "prison-break", gold: false, status: "dup", shards: 10 },
  { workId: "dr-stone", gold: false, status: "new", shards: 0 },
  { workId: "inception", gold: false, status: "new", shards: 0 },
  { workId: "le-voyage-de-chihiro", gold: false, status: "new", shards: 0 },
];

const GOLD: PackCard[] = DEMO.map((c, i) => (i === 2 ? { ...c, gold: true, status: "new-gold" } : c));

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ or?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.TOONDEX_DEMO !== "1") notFound();
  const withGold = (await searchParams).or === "1";
  return (
    <section className="today">
      <div className="today__head">
        <span className="kicker">APERÇU</span>
        <h1 className="today__title">Une carte de chaque rareté</h1>
        <p className="muted">Commune, rare, épique, légendaire, mythique{withGold ? ", et une version or" : ""}.</p>
      </div>
      <PackOpener initialCards={null} demoCards={withGold ? GOLD : DEMO} />
    </section>
  );
}
