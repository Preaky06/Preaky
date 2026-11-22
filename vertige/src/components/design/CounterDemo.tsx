"use client";

import { useState } from "react";
import { RollingCounter } from "@/components/ui/RollingCounter";
import { TierPill } from "@/components/ui/TierPill";
import { formatSci, priceParts } from "@/lib/format";
import { altitudeOf, logAtAltitude } from "@/lib/scale";
import { tierOf, TIERS } from "@/lib/tiers";

/** Démo interactive : compteur à rouleaux + mini-altimètre pilotés par un curseur log. */
export function CounterDemo() {
  const [alt, setAlt] = useState(0.35);
  const log = logAtAltitude(alt);
  const eur = 10 ** log;
  const { number, suffix } = priceParts(eur);
  const tier = tierOf(eur);

  return (
    <div data-tier={tier} className="panel flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RollingCounter value={number} suffix={suffix} className="text-[clamp(2.25rem,7vw,4.5rem)] text-(--tier)" />
        <TierPill tier={tier} showIndex />
      </div>
      <p className="num text-small text-muted">{formatSci(eur)}</p>
      <div className="relative h-2 rounded-full" aria-hidden="true">
        {TIERS.map((t) => (
          <span
            key={t.id}
            className="absolute inset-y-0"
            style={{
              left: `${altitudeOf(t.logMin) * 100}%`,
              width: `${(altitudeOf(t.logMax) - altitudeOf(t.logMin)) * 100}%`,
              background: t.color,
              opacity: t.logMin < log ? 1 : 0.25,
            }}
          />
        ))}
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--tier) shadow-[0_0_0_3px_#fff,0_0_14px_var(--tier-glow)]"
          style={{ left: `${alt * 100}%` }}
        />
      </div>
      <label className="flex flex-col gap-2 text-small text-muted">
        Altitude (échelle logarithmique, 10⁻⁵ → 10¹⁴ €)
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={alt}
          onChange={(e) => setAlt(Number(e.target.value))}
          className="w-full accent-(--tier)"
        />
      </label>
    </div>
  );
}
