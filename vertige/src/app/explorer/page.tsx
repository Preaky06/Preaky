import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/explorer/CatalogExplorer";
import { toCardItem } from "@/lib/card-item";
import { getAllItems, getCatalogStats } from "@/lib/data/items";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Explorer",
  description: "Tous les prix de VERTIGE : recherche, filtres par palier, catégorie et type de prix, histogramme de la répartition.",
};

export default async function ExplorerPage() {
  const [items, stats] = await Promise.all([getAllItems(), getCatalogStats()]);
  return (
    <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-title-2 font-extrabold tracking-tight">Explorer</h1>
        <p className="text-lg text-muted">
          Les <span className="price font-bold text-ink">{formatInt(stats.count)}</span> objets de VERTIGE. Cherche un nom ou choisis une
          fourchette de prix.
        </p>
      </header>
      <CatalogExplorer items={items.map(toCardItem)} />
    </div>
  );
}
