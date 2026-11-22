import { AscensionController } from "@/components/ascension/AscensionController";
import { AscensionEnd } from "@/components/ascension/AscensionEnd";
import { Floor } from "@/components/ascension/Floor";
import { Hero } from "@/components/ascension/Hero";
import { TierGate } from "@/components/ascension/TierGate";
import { getCatalogStats, getHeroItems } from "@/lib/data/items";
import { TIERS } from "@/lib/tiers";

export default async function AscensionPage() {
  const [items, stats] = await Promise.all([getHeroItems(), getCatalogStats()]);

  if (!items.length) {
    return (
      <>
        <Hero count={0} />
        <section className="relative z-10 mx-auto max-w-xl px-5 pb-32 text-center">
          <h2 className="font-serif text-title-3">L&apos;échelle est vide.</h2>
          <p className="mt-4 text-muted">
            Aucun objet n&apos;est encore publié. Pour recharger les données de démonstration :{" "}
            <code className="num text-ink">npm run demo:build</code>
          </p>
        </section>
      </>
    );
  }

  const groups = TIERS.map((tier) => ({ tier, items: items.filter((i) => i.tier === tier.id) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <>
      <Hero count={stats.count} />
      <AscensionController floors={items.map((i) => ({ name: i.name_fr, log: i.log_price }))}>
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
