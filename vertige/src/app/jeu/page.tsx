import type { Metadata } from "next";
import { HigherLower } from "@/components/game/HigherLower";
import { toCardItem } from "@/lib/card-item";
import { getAllItems } from "@/lib/data/items";

export const metadata: Metadata = {
  title: "Plus ou moins cher ?",
  description: "Deux objets, un seul est le plus cher. Série, défi du jour et score à partager.",
};

export default async function JeuPage() {
  const items = await getAllItems();
  return (
    <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-8 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-title-2 font-extrabold tracking-tight">Plus ou moins cher ?</h1>
        <p className="text-lg text-muted">Choisis l&apos;objet le plus cher. Le vrai prix se révèle ensuite.</p>
      </header>
      <HigherLower items={items.map(toCardItem)} />
    </div>
  );
}
