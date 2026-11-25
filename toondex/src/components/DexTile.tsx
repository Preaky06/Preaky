import Link from "next/link";
import type { CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { RARITIES, cardNumber, type CardDef } from "@/lib/cards-meta";
import { ENERGIES, combatProfile } from "@/lib/combat";

/** Case de la collection façon Pokédex : couleur de la classe, portrait, numéro, nom, rareté et PV. */
export function DexTile({ card, copies, gold }: { card: CardDef; copies: number; gold: number }) {
  const p = combatProfile(card);
  const energy = ENERGIES[p.energy];
  return (
    <Link
      href={`/carte/${card.id}`}
      className={`dex-tile dex-tile--${card.rarity}${gold > 0 ? " dex-tile--gold" : ""}`}
      style={{ "--energy": energy.color } as CSSProperties}
    >
      <span className="dex-tile__frame">
        <CardImage name={card.name} image={card.image} />
      </span>
      <span className="dex-tile__num">N°{cardNumber(card.num, card.total)}</span>
      {gold > 0 && <span className="dex-tile__gold">Or ×{gold}</span>}
      <span className="dex-tile__name">{card.name}</span>
      <span className="dex-tile__meta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={energy.icon} alt="" />
        <span>{energy.label}</span>
        <span aria-hidden="true">·</span>
        <span>{p.hp} PV</span>
      </span>
      <span className="dex-tile__foot">
        <span className={`rarity rarity--${card.rarity}`}>{RARITIES[card.rarity].label}</span>
        {copies > 1 && <span className="dex-tile__copies">×{copies}</span>}
      </span>
    </Link>
  );
}
