import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vignette encadrée (listes, recherche, équivalences) : l'image entière tient dans un carré
 * arrondi teinté de la couleur du palier, sans dépasser ni être rognée.
 */
export function Thumb({ src, tier, size = 48, className }: { src: string | null; tier: number; size?: number; className?: string }) {
  return (
    <span data-tier={tier} aria-hidden="true" className={cn("thumb", className)} style={{ width: size, height: size }}>
      {src && <Image src={src} alt="" width={128} height={128} unoptimized loading="lazy" />}
    </span>
  );
}
