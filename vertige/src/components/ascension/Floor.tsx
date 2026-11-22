import { Picto } from "@/components/ui/Picto";
import { PriceStamp } from "@/components/ui/PriceStamp";
import { TierPill } from "@/components/ui/TierPill";
import { TiltCard } from "@/components/ui/TiltCard";
import { formatOriginal, formatPrice, formatRatio } from "@/lib/format";
import { categoryName } from "@/lib/taxonomy";
import { TIER_COUNT } from "@/lib/tiers";
import type { ItemWithPrice } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Un étage de l'Ascension. L'espacement vertical grandit avec l'écart de prix
 * avec l'étage précédent (≤ 1,5 décade prise en compte) ; le palier Vertige est plus haut
 * pour donner la sensation d'altitude.
 */
export function Floor({ item, index, previous }: { item: ItemWithPrice; index: number; previous?: ItemWithPrice }) {
  const { price } = item;
  const gap = previous ? Math.min(item.log_price - previous.log_price, 1.5) : 0;
  const ratio = previous ? item.price_eur / previous.price_eur : null;
  const vertige = item.tier === 7;
  const headingId = `etage-${index + 1}-titre`;
  const height = `calc(${vertige ? 96 : 76}svh + ${(gap * 16).toFixed(1)}svh)`;

  return (
    <section
      id={`etage-${index + 1}`}
      aria-labelledby={headingId}
      data-tier={item.tier}
      data-anchor
      data-log={item.log_price}
      data-floor={index}
      className="floor relative flex items-center justify-center overflow-x-clip px-4 lg:pl-[216px]"
      style={{ minHeight: height, containIntrinsicSize: `auto ${height}` }}
    >
      <div className="reveal relative w-full max-w-[640px]">
        <div aria-hidden="true" className="halo-soft -inset-x-6 -inset-y-24 sm:-inset-x-16" />
        <TiltCard tier={item.tier} className={cn("p-5 sm:p-8", vertige && "iridescent")}>
          <article className="flex flex-col gap-5">
            <header className="flex items-start justify-between gap-3">
              <p className="num text-small text-muted">
                Étage {String(index + 1).padStart(3, "0")}
                <span className="sr-only">
                  , palier {item.tier} sur {TIER_COUNT}
                </span>
              </p>
              <TierPill tier={item.tier} />
            </header>

            <div className="flex items-center gap-4">
              <Picto subcategory={item.subcategory_id} category={item.category_id} tier={item.tier} size={64} />
              <div className="min-w-0">
                <p className="text-small text-muted">{categoryName(item.category_id)}</p>
                <h3 id={headingId} className="font-serif text-[clamp(1.6rem,4.4vw,2.5rem)] leading-[1.05] text-ink">
                  {item.name_fr}
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p
                className={cn(
                  "num text-[clamp(2.5rem,9vw,4.75rem)] leading-none tracking-tight",
                  vertige ? "text-iridescent" : "text-(--tier)",
                )}
              >
                {formatPrice(item.price_eur)}
              </p>
              {price.currency !== "EUR" && (
                <p className="text-small text-muted">
                  Prix d&apos;origine : <span className="num text-ink">{formatOriginal(price.value, price.currency)}</span>{" "}
                  (taux de démo)
                </p>
              )}
              <PriceStamp price={price} status={item.status} compact />
            </div>

            {item.short_desc_fr && <p className="text-[17px] leading-relaxed text-ink/90">{item.short_desc_fr}</p>}

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-small">
              <span className="num text-muted">
                {ratio ? (
                  <>
                    <span className="text-ink">{formatRatio(ratio)}</span> par rapport à l&apos;étage précédent
                  </>
                ) : (
                  "Point de départ"
                )}
              </span>
              {/* <a> simple : pas d'hydratation ni de préchargement de 150 routes */}
              <a
                href={`/objet/${item.slug}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-ink underline-offset-4 hover:underline"
              >
                Voir la fiche
                <span className="sr-only"> : {item.name_fr}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </footer>
          </article>
        </TiltCard>
      </div>
    </section>
  );
}
