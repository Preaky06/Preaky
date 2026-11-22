import type { ReactNode } from "react";
import type { TierId } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/**
 * Carte de base : surface, bordure, rayon 20 px. Sur desktop, l'inclinaison 3D, le halo
 * qui suit le curseur et le soulèvement sont gérés par <TiltController /> (délégation),
 * ce composant reste donc 100 % serveur.
 */
export function TiltCard({
  tier,
  children,
  className,
}: {
  tier: TierId;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-tier={tier} className={cn("tilt card-surface", className)}>
      {children}
    </div>
  );
}
