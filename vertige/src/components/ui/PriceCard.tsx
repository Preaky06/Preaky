import Image from "next/image";
import type { CardItem } from "@/lib/card-item";
import { formatObservedAt, formatPrice } from "@/lib/format";
import { CONFIDENCE_LABEL, PRICE_TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const SIZES = {
  md: { width: 200, card: 216, image: 140, overlap: 62, name: "text-[16px]", price: "text-[24px]" },
  lg: { width: 320, card: 300, image: 210, overlap: 96, name: "text-[20px]", price: "text-[34px]" },
} as const;

/**
 * Carte d'objet (référence « Supercell ») : l'objet 3D dépasse du haut d'une carte pleine
 * à la couleur du palier. Trois informations visibles seulement : image, nom, prix.
 * Le type de prix, la date et la fiabilité restent lisibles par les lecteurs d'écran,
 * au survol (pastille) et sur la fiche.
 */
export function PriceCard({
  item,
  size = "md",
  className,
  priority = false,
}: {
  item: CardItem;
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}) {
  const s = SIZES[size];
  const details = `${PRICE_TYPE_LABEL[item.priceType]} · relevé ${formatObservedAt(item.observedAt)} · fiabilité ${item.confidence} (${CONFIDENCE_LABEL[item.confidence].toLowerCase()})${item.status === "demo" ? " · donnée de démonstration" : ""}`;

  return (
    <a
      href={`/objet/${item.slug}`}
      data-tier={item.tier}
      className={cn("group relative block shrink-0 rounded-[28px] focus-visible:outline-offset-4", className)}
      style={{ width: s.width, paddingTop: s.overlap }}
    >
      <div className="price-card tilt flex flex-col justify-end p-5" style={{ height: s.card }}>
        {item.image && (
          <Image
            src={item.image}
            alt=""
            width={256}
            height={256}
            unoptimized
            priority={priority}
            className="card-object"
            style={{ top: -s.overlap, width: s.image, height: s.image }}
          />
        )}
        <span
          className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-white/20 text-[11px] font-semibold text-white ring-1 ring-white/30"
          title={details}
          aria-hidden="true"
        >
          {item.status === "demo" ? "≈" : item.confidence}
        </span>
        <p className={cn("relative line-clamp-2 font-semibold leading-tight", s.name)}>{item.name}</p>
        <p className={cn("card-price price relative mt-1 font-extrabold leading-none", s.price)}>{formatPrice(item.priceEur)}</p>
        <span className="sr-only">{details}</span>
      </div>
    </a>
  );
}
