"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { prefersReducedMotion } from "@/lib/motion-prefs";
import { getTier, TIER_COUNT, type TierId } from "@/lib/tiers";
import { altitudeStore } from "./altitude-store";

const DURATION = 900;

/**
 * Passage de palier : nom en plein écran pendant 900 ms (Instrument Serif, 20vw),
 * révélé ligne par ligne par masque. Décoratif (aria-hidden) ; l'annonce passe par une
 * région live. En mouvement réduit : annonce seule, pas d'incrustation.
 */
export function TierFlash() {
  const [flash, setFlash] = useState<{ tier: TierId; key: number } | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    let prev: TierId | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reached = new Set<TierId>();

    const unsubscribe = altitudeStore.subscribe(() => {
      const { tier, active } = altitudeStore.get();
      if (!active) {
        prev = null;
        return;
      }
      if (prev === null || prev === tier) {
        prev = tier;
        return;
      }
      prev = tier;
      const t = getTier(tier);
      setAnnounce(`Palier ${tier} sur ${TIER_COUNT} : ${t.name}, ${t.range}`);
      if (!reached.has(tier)) {
        reached.add(tier);
        track({ name: "tier_reached", tier });
      }
      if (prefersReducedMotion()) return;
      clearTimeout(timer);
      setFlash({ tier, key: performance.now() });
      timer = setTimeout(() => setFlash(null), DURATION);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const t = flash ? getTier(flash.tier) : null;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {flash && t && (
        <div
          key={flash.key}
          aria-hidden="true"
          data-tier={flash.tier}
          className="tier-flash pointer-events-none fixed inset-0 z-40 grid place-items-center bg-bg/85"
        >
          <div className="flex flex-col items-center text-center">
            <span className="line overflow-hidden">
              <span className="num text-small uppercase tracking-[0.3em] text-muted">
                Palier {flash.tier}/{TIER_COUNT}
              </span>
            </span>
            <span className="line overflow-hidden px-[0.05em] pb-[0.06em] font-serif text-[20vw] leading-[1.05]">
              <span
                className={
                  flash.tier === 7
                    ? "text-iridescent"
                    : "text-(--tier)"
                }
              >
                {t.name}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
