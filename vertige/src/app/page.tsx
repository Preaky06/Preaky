import { AscensionController } from "@/components/ascension/AscensionController";
import { AscensionEnd } from "@/components/ascension/AscensionEnd";
import { Floor } from "@/components/ascension/Floor";
import { TierGate } from "@/components/ascension/TierGate";
import { PriceRangeExplorer } from "@/components/explorer/PriceRangeExplorer";
import { StairsScene, type StairStep } from "@/components/stairs/StairsScene";
import { toCardItem } from "@/lib/card-item";
import { getHeroItems } from "@/lib/data/items";
import { TIERS } from "@/lib/tiers";

/** Exemples de l'escalier d'accueil : un objet parlant par palier. */
const STAIR_EXAMPLES: { slug: string; label: string }[] = [
  { slug: "grain-de-riz", label: "Un grain de riz" },
  { slug: "banane", label: "Une banane" },
  { slug: "big-mac", label: "Un Big Mac" },
  { slug: "iphone-17-pro", label: "Un iPhone 17 Pro" },
  { slug: "porsche-911-carrera", label: "Une Porsche 911" },
  { slug: "airbus-a380-au-prix-catalogue", label: "Un Airbus A380" },
  { slug: "pib-mondial-sur-un-an", label: "Le PIB mondial" },
];

export default async function HomePage() {
  const items = await getHeroItems();

  if (!items.length) {
    return (
      <section className="relative z-10 mx-auto flex min-h-[80svh] max-w-xl flex-col items-center justify-center px-5 pt-28 text-center">
        <h1 className="text-title-2 font-extrabold tracking-tight">L&apos;échelle est vide.</h1>
        <p className="mt-4 text-muted">
          Aucun objet n&apos;est encore publié. Pour recharger les données de démonstration :{" "}
          <code className="num text-ink">npm run demo:build</code>
        </p>
      </section>
    );
  }

  const bySlug = new Map(items.map((i) => [i.slug, i]));
  const steps: StairStep[] = STAIR_EXAMPLES.flatMap(({ slug, label }) => {
    const item = bySlug.get(slug);
    return item ? [{ item: toCardItem(item), label }] : [];
  });
  const groups = TIERS.map((tier) => ({ tier, items: items.filter((i) => i.tier === tier.id) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <>
      {steps.length === STAIR_EXAMPLES.length && <StairsScene steps={steps} count={items.length} />}

      <section id="prix" aria-labelledby="prix-titre" className="relative z-10 px-3 py-16 sm:py-24">
        <div className="mx-auto max-w-[1120px]">
          <PriceRangeExplorer items={items.map(toCardItem)} />
        </div>
      </section>

      <AscensionController floors={items.map((i) => ({ name: i.name_fr, log: i.log_price }))}>
        <header className="relative mx-auto flex max-w-2xl flex-col items-center px-5 pb-4 pt-16 text-center lg:pl-[216px]">
          <h2 className="text-title-2 font-extrabold tracking-tight">L&apos;Ascension</h2>
          <p className="mt-3 text-lg text-muted">
            Les {items.length} objets, un par étage, du moins cher au plus cher. L&apos;altimètre suit ton prix.
          </p>
        </header>
        {groups.map(({ tier, items: tierItems }) => (
          <div key={tier.id} data-tier={tier.id}>
            <TierGate tier={tier} count={tierItems.length} />
            {tierItems.map((item) => {
              const index = items.indexOf(item);
              return <Floor key={item.id} item={item} index={index} previous={items[index - 1]} />;
            })}
          </div>
        ))}
        <AscensionEnd first={items[0]} last={items[items.length - 1]} />
      </AscensionController>
    </>
  );
}
