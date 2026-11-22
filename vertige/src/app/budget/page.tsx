import type { Metadata } from "next";
import { BudgetPlanner } from "@/components/budget/BudgetPlanner";
import { toCardItem } from "@/lib/card-item";
import { getAllItems, getItemBySlug } from "@/lib/data/items";
import { REFERENCE_UNITS, referenceUnit } from "@/lib/data/reference-units";

export const metadata: Metadata = {
  title: "Budget",
  description: "Qu'est-ce que tu peux t'offrir avec ton budget ? Du centime à la fortune la plus élevée du monde.",
};

export default async function BudgetPage() {
  const [items, richest] = await Promise.all([getAllItems(), getItemBySlug("fortune-de-la-personne-la-plus-riche-du-monde")]);
  const smic = referenceUnit("smic-mensuel-net");
  const presets = [
    { label: "1 €", value: 1 },
    { label: "10 €", value: 10 },
    ...(smic ? [{ label: "Un SMIC mensuel", value: smic.value_eur }] : []),
    { label: "1 M€", value: 1e6 },
    ...(richest ? [{ label: "La plus grande fortune", value: richest.price_eur }] : []),
  ];
  return (
    <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-8 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-title-2 font-extrabold tracking-tight">Budget</h1>
        <p className="text-lg text-muted">Entre un montant : VERTIGE te montre tout ce qu&apos;il permet de s&apos;offrir.</p>
      </header>
      <BudgetPlanner
        items={items.map(toCardItem)}
        presets={presets}
        references={REFERENCE_UNITS.filter((r) => ["baguette", "big-mac", "smic-horaire-brut", "netflix-an"].includes(r.id))}
      />
    </div>
  );
}
