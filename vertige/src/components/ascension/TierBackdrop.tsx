"use client";

import { TIERS } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { useAltitude } from "./altitude-store";

/**
 * Fond qui glisse vers la couleur du palier : 7 calques fixes en fondu enchaîné (800 ms).
 * Seule l'opacité est animée (composition GPU, pas de repeinture).
 */
export function TierBackdrop() {
  const tier = useAltitude((s) => s.tier);
  const active = useAltitude((s) => s.active);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {TIERS.map((t) => (
        <div
          key={t.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-800 ease-(--ease-vertige)",
            active && t.id === tier ? "opacity-100" : "opacity-0",
          )}
          style={{
            background: `radial-gradient(110% 60% at 50% 0%, color-mix(in oklab, ${t.glow} 20%, transparent), transparent 70%),
              radial-gradient(80% 45% at 50% 105%, color-mix(in oklab, ${t.glow} 16%, transparent), transparent 70%)`,
          }}
        >
          {t.id === 7 && (
            <div className="absolute left-1/2 top-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]">
              <div className="size-full animate-[vg-spin_6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,#f5c542,#ffe9a8,#c9a0ff,#8fe3ff,#ffd36b,#f5c542)] motion-reduce:animate-none" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
