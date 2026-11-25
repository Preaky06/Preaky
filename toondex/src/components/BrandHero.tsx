import type { ReactNode } from "react";
import { BrandFloats, BrandTicker } from "@/components/BrandTicker";
import { Card } from "@/components/Card";
import type { CardDef } from "@/lib/cards-meta";

type Props = {
  /** Trois cartes en éventail derrière le mot (gauche, centre, droite). */
  cards: { card: CardDef; gold?: boolean }[];
  /** Pastilles du haut (compteurs, date, minuteur). */
  chips: ReactNode[];
  /** Bas du bandeau : texte et bouton. */
  children: ReactNode;
  compact?: boolean;
};


/**
 * Bandeau de marque : TOONDEX en très grand, trois vraies cartes en éventail qui sortent de
 * derrière le mot, fond rayonnant, et un ruban qui fait défiler les univers du catalogue.
 */
export function BrandHero({ cards, chips, children, compact = false }: Props) {
  return (
    <section className={`brand-hero${compact ? " brand-hero--compact" : ""}`} aria-labelledby="brand-word">
      <span className="brand-hero__rays" aria-hidden="true" />
      <div className="brand-hero__chips">
        {chips.map((chip, i) => (
          <span key={i} className="brand-hero__chip">
            {chip}
          </span>
        ))}
      </div>
      <div className="brand-hero__stage">
        <div className="brand-hero__fan" aria-hidden="true">
          {cards.slice(0, 3).map(({ card, gold }, i) => (
            <div key={card.id} className={`brand-hero__card brand-hero__card--${i}`}>
              <Card card={card} gold={gold} />
            </div>
          ))}
        </div>
        <h1 id="brand-word" className="brand-hero__word">
          ToonDex
        </h1>
        <BrandFloats />
      </div>
      <div className="brand-hero__bottom">{children}</div>
      <BrandTicker />
    </section>
  );
}
