import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import type { CardDef } from "@/lib/cards-meta";

/* eslint-disable @next/next/no-img-element */

type Props = {
  /** Trois cartes en éventail derrière le mot (gauche, centre, droite). */
  cards: { card: CardDef; gold?: boolean }[];
  /** Pastilles du haut (compteurs, date, minuteur). */
  chips: ReactNode[];
  /** Bas du bandeau : texte et bouton. */
  children: ReactNode;
  compact?: boolean;
};

const TICKER = ["Séries", "Anime", "Disney", "Pixar", "Cartoon Network", "Nickelodeon", "Adult Swim", "Disney Channel", "Films d’animation", "Super-héros", "Netflix", "Ghibli"];

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
        <img className="brand-hero__float brand-hero__float--popcorn" src="/3d/popcorn.webp" alt="" aria-hidden="true" />
        <img className="brand-hero__float brand-hero__float--clap" src="/3d/clap.webp" alt="" aria-hidden="true" />
        <img className="brand-hero__float brand-hero__float--star" src="/3d/etoile.webp" alt="" aria-hidden="true" />
        <img className="brand-hero__float brand-hero__float--gem" src="/3d/gemme.webp" alt="" aria-hidden="true" />
      </div>
      <div className="brand-hero__bottom">{children}</div>
      <div className="brand-hero__ticker" aria-hidden="true">
        <div className="brand-hero__track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i}>
              {t}
              <img src="/3d/etoile.webp" alt="" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
