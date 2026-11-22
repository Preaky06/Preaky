import type { Metadata } from "next";
import { DuelArena } from "@/components/duel/DuelArena";
import { toCardItem } from "@/lib/card-item";
import { getAllItems } from "@/lib/data/items";

export const metadata: Metadata = {
  title: "Duel",
  description: "Deux objets face à face : combien de baguettes vaut un Airbus A380 ?",
};

export default async function DuelPage() {
  const items = await getAllItems();
  const has = (s: string) => items.some((i) => i.slug === s);
  const a = has("airbus-a380-au-prix-catalogue") ? "airbus-a380-au-prix-catalogue" : items[items.length - 1]?.slug;
  const b = has("baguette") ? "baguette" : items[0]?.slug;
  return (
    <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-title-2 font-extrabold tracking-tight">Duel</h1>
        <p className="text-lg text-muted">Choisis deux objets. VERTIGE calcule combien de l&apos;un tient dans l&apos;autre.</p>
      </header>
      {a && b && <DuelArena items={items.map(toCardItem)} initialA={a} initialB={b} />}
    </div>
  );
}
