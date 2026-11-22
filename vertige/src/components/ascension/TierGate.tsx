import { LOG_MIN } from "@/lib/scale";
import { TIER_COUNT, type Tier } from "@/lib/tiers";

/**
 * Porte de palier : ancre de l'altimètre placée exactement à la borne du palier
 * (log = borne basse), pour que le changement de couleur tombe au bon prix.
 */
export function TierGate({ tier, count }: { tier: Tier; count: number }) {
  const gateLog = tier.id === 1 ? LOG_MIN : tier.logMin;
  return (
    <section
      id={`palier-${tier.slug}`}
      aria-labelledby={`palier-${tier.slug}-titre`}
      data-tier={tier.id}
      data-anchor
      data-log={gateLog}
      data-gate={tier.id}
      className="floor relative flex min-h-[90svh] items-center justify-center px-5 [contain-intrinsic-size:auto_90svh] lg:pl-[216px]"
    >
      <div className="reveal flex max-w-2xl flex-col items-center text-center">
        <p className="num text-small uppercase tracking-[0.3em] text-muted">
          Palier {tier.id}/{TIER_COUNT}
        </p>
        <h2
          id={`palier-${tier.slug}-titre`}
          className={
            tier.id === 7
              ? "text-iridescent mt-3 font-serif text-title-1"
              : "mt-3 font-serif text-title-1 text-(--tier)"
          }
        >
          {tier.name}
        </h2>
        <p className="mt-4 text-lg text-ink">{tier.tagline}</p>
        <p className="mt-6 flex items-center gap-3 text-small text-muted">
          <span className="h-px w-8 bg-(--tier)" aria-hidden="true" />
          {tier.range} · {count} objets
          <span className="h-px w-8 bg-(--tier)" aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}
