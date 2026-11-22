import Link from "next/link";
import { formatOriginal, formatPrice } from "@/lib/format";
import { categoryName } from "@/lib/taxonomy";
import type { ItemWithPrice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Picto } from "./Picto";
import { PriceStamp } from "./PriceStamp";
import { TierPill } from "./TierPill";
import { TiltCard } from "./TiltCard";

/** Carte compacte (grilles : Explorer, voisins, catégories). */
export function ItemCard({ item, className }: { item: ItemWithPrice; className?: string }) {
  const { price } = item;
  return (
    <TiltCard tier={item.tier} className={cn("group flex flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <Picto subcategory={item.subcategory_id} category={item.category_id} tier={item.tier} size={56} />
        <TierPill tier={item.tier} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-small text-muted">{categoryName(item.category_id)}</p>
        <h3 className="font-serif text-2xl leading-tight text-ink">
          <Link href={`/objet/${item.slug}`} className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none">
            {item.name_fr}
          </Link>
        </h3>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <p className="num text-3xl text-(--tier)">{formatPrice(item.price_eur)}</p>
        {price.currency !== "EUR" && (
          <p className="text-small text-muted">Prix d&apos;origine : {formatOriginal(price.value, price.currency)}</p>
        )}
        <PriceStamp price={price} status={item.status} compact />
      </div>
    </TiltCard>
  );
}
