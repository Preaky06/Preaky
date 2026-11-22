import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Vignette encadrée (listes, recherche, équivalences) : l'image entière tient dans un carré
 * arrondi teinté de la couleur du palier, sans dépasser ni être rognée.
 */
export function Thumb({
  src,
  tier,
  kind = null,
  size = 48,
  className,
}: {
  src: string | null;
  tier: number;
  /** « photo » : l'image remplit la vignette (recadrée) ; sinon elle y tient entière */
  kind?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span data-tier={tier} data-kind={kind ?? undefined} aria-hidden="true" className={cn("thumb", className)} style={{ width: size, height: size }}>
      {src && <Image src={src} alt="" width={128} height={128} unoptimized loading="lazy" />}
    </span>
  );
}
