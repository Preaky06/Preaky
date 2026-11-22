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
      className="floor relative flex min-h-[80svh] items-center justify-center px-5 [contain-intrinsic-size:auto_80svh] lg:pl-[216px]"
    >
      <div className="reveal flex max-w-2xl flex-col items-center text-center">
        <p className="rounded-full bg-(--tier) px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white">
          Palier {tier.id}/{TIER_COUNT}
        </p>
        <h2
          id={`palier-${tier.slug}-titre`}
          className={
            tier.id === 7
              ? "text-iridescent mt-4 font-display text-[clamp(6rem,22vw,15rem)] uppercase leading-[0.85]"
              : "mt-4 font-display text-[clamp(6rem,22vw,15rem)] uppercase leading-[0.85] text-(--tier)"
          }
        >
          {tier.name}
        </h2>
        <p className="mt-4 text-[clamp(1.25rem,2.6vw,1.75rem)] font-bold tracking-tight">{tier.range}</p>
        <p className="mt-2 text-lg text-muted">{tier.tagline}</p>
        <p className="mt-5 text-small font-semibold text-muted">{count} objets dans ce palier</p>
      </div>
    </section>
  );
}
