import { PriceCard } from "@/components/ui/PriceCard";
import { toCardItem } from "@/lib/card-item";
import type { ItemWithPrice } from "@/lib/types";

/**
 * Un étage de l'Ascension : une carte (image, nom, prix) centrée.
 * L'espacement vertical grandit avec l'écart de prix avec l'étage précédent
 * (≤ 1,5 décade prise en compte) ; le palier Vertige est plus haut (sensation d'altitude).
 */
export function Floor({ item, index, previous }: { item: ItemWithPrice; index: number; previous?: ItemWithPrice }) {
  const gap = previous ? Math.min(item.log_price - previous.log_price, 1.5) : 0;
  const height = `calc(${item.tier === 7 ? 70 : 56}svh + ${(gap * 14).toFixed(1)}svh)`;

  return (
    <section
      id={`etage-${index + 1}`}
      aria-label={`Étage ${index + 1} : ${item.name_fr}`}
      data-tier={item.tier}
      data-anchor
      data-log={item.log_price}
      data-floor={index}
      className="floor relative flex items-center justify-center px-4 lg:pl-[216px]"
      style={{ minHeight: height, containIntrinsicSize: `auto ${height}` }}
    >
      <div className="reveal relative flex flex-col items-center gap-3">
        <div aria-hidden="true" className="halo-soft -inset-x-24 -inset-y-16" />
        <p className="relative text-[12px] font-semibold uppercase tracking-[0.2em] text-muted" aria-hidden="true">
          Étage {String(index + 1).padStart(3, "0")}
        </p>
        <PriceCard item={toCardItem(item)} size="lg" />
      </div>
    </section>
  );
}
