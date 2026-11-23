import type { CSSProperties } from "react";
import { Mascot } from "@/components/Mascot";
import { Wobble } from "@/components/Wobble";
import { RARITIES, TYPES, cardNumber, countryNames, type Work } from "@/lib/catalogue";

function Stars({ rank }: { rank: number }) {
  return (
    <span className="card__stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 10 10" className={i <= rank ? "is-on" : ""}>
          <path d="M5 0.6l1.3 2.9 3.1.3-2.4 2.1.7 3.1L5 7.4 2.3 9l.7-3.1L.6 3.8l3.1-.3z" />
        </svg>
      ))}
    </span>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function MasksIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 3h7v4.5C9 10 7.5 12 5.5 12S2 10 2 7.5z" fill="currentColor" />
      <path d="M7.5 6.5h6.5v3c0 2.5-1.5 4.5-3.5 4.5S7 12 7 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4.2" cy="6" r="0.9" fill="#fff" />
      <circle cx="6.8" cy="6" r="0.9" fill="#fff" />
    </svg>
  );
}

function titleSize(title: string): string {
  if (title.length > 40) return "card__title--xs";
  if (title.length > 24) return "card__title--sm";
  return "";
}

type CardProps = {
  work: Work;
  gold?: boolean;
  /** Largeur fixe (ex. "220px"). Par défaut, la carte prend la largeur de sa cellule. */
  width?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
};

/** Carte façon jeu de cartes : fond de couleur du type, personnage 2D, infos, rareté. */
export function Card({ work, gold = false, width, className = "", headingLevel = "h3" }: CardProps) {
  const type = TYPES[work.type];
  const Title = headingLevel;
  const style = { "--type": type.color, ...(width ? { "--card-w": width } : {}) } as CSSProperties;
  return (
    <article
      className={`card card--${work.rarity}${gold ? " card--gold" : ""} ${className}`}
      style={style}
      aria-label={`${work.title}, ${type.label.toLowerCase()}, ${RARITIES[work.rarity].label.toLowerCase()}${gold ? ", version or" : ""}`}
    >
      <div className="card__face">
        <div className="card__top">
          <Title className={`card__title ${titleSize(work.title)}`}>{work.title}</Title>
          <span className="card__year">{work.year}</span>
        </div>
        <div className="card__window">
          <span className="card__type">{type.label}</span>
          {gold && <span className="card__gold-badge">Or</span>}
          <Mascot work={work} gold={gold} className="card__mascot" />
          <span className="card__holo" aria-hidden="true" />
        </div>
        <ul className="card__moves">
          <li>
            <span className="card__icon">
              <GlobeIcon />
            </span>
            <span className="card__move">{countryNames(work.countries)}</span>
          </li>
          <li>
            <span className="card__icon">
              <MasksIcon />
            </span>
            <span className="card__move">{work.genres}</span>
          </li>
        </ul>
        <div className="card__foot">
          <span className="card__rarity">
            {RARITIES[work.rarity].label}
            <Stars rank={RARITIES[work.rarity].rank} />
          </span>
          <span className="card__num">#{cardNumber(work.num)}</span>
        </div>
      </div>
    </article>
  );
}

/** Dos de carte, utilisé avant la révélation. */
export function CardBack() {
  return (
    <div className="card card--back" aria-hidden="true">
      <div className="card__face card__back">
        <span className="card__back-logo">
          <Wobble text="ToonDex" />
          <span className="badge-star" />
        </span>
        <span className="card__back-label">Cartes à collectionner</span>
      </div>
    </div>
  );
}

/** Emplacement d'une carte pas encore obtenue : silhouette du personnage. */
export function MissingCard({ work }: { work: Work }) {
  const type = TYPES[work.type];
  return (
    <div className="card card--missing" style={{ "--type": type.color } as CSSProperties}>
      <div className="card__face">
        <div className="card__top">
          <p className={`card__title ${titleSize(work.title)}`}>{work.title}</p>
          <span className="card__year">?</span>
        </div>
        <div className="card__window">
          <span className="card__type">{type.label}</span>
          <Mascot work={work} className="card__mascot card__mascot--shadow" />
        </div>
        <div className="card__foot">
          <span className="card__rarity">{RARITIES[work.rarity].label}</span>
          <span className="card__num">#{cardNumber(work.num)}</span>
        </div>
      </div>
    </div>
  );
}
