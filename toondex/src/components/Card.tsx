import type { CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { Wobble } from "@/components/Wobble";
import { RARITIES, TYPES, cardNumber, type CardDef } from "@/lib/catalogue";

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

function ClapIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="6.5" width="12" height="7.5" rx="1.2" fill="currentColor" />
      <path d="M2.4 5.6 13 3l.4 1.8L2.8 7.4z" fill="currentColor" />
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

function titleSize(text: string): string {
  if (text.length > 22) return "card__title--xs";
  if (text.length > 14) return "card__title--sm";
  return "";
}

/** Image réelle du personnage, hébergée par Wikipédia ou AniList. */
function Portrait({ card, hidden = false }: { card: CardDef; hidden?: boolean }) {
  return <CardImage name={card.name} image={card.image} wiki={card.wiki} hidden={hidden} />;
}

type CardProps = {
  card: CardDef;
  gold?: boolean;
  /** Largeur fixe (ex. "220px"). Par défaut, la carte prend la largeur de sa cellule. */
  width?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
};

/** Carte façon jeu de cartes : un personnage, son œuvre, sa rareté. */
export function Card({ card, gold = false, width, className = "", headingLevel = "h3" }: CardProps) {
  const type = TYPES[card.work.type];
  const Title = headingLevel;
  const style = { "--type": type.color, ...(width ? { "--card-w": width } : {}) } as CSSProperties;
  return (
    <article
      className={`card card--${card.rarity}${gold ? " card--gold" : ""}${gold || card.rarity !== "commune" ? " card--fx" : ""} ${className}`}
      style={style}
      aria-label={`${card.name}, ${card.work.title}, ${RARITIES[card.rarity].label.toLowerCase()}${gold ? ", carte secrète en or" : ""}`}
    >
      <div className="card__face">
        <div className="card__top">
          <Title className={`card__title ${titleSize(card.name)}`}>{card.name}</Title>
          <span className="card__year">{card.work.year}</span>
        </div>
        <div className="card__window">
          <span className="card__type">{type.label}</span>
          {gold && <span className="card__gold-badge">Secrète</span>}
          <Portrait card={card} />
          <span className="card__holo" aria-hidden="true" />
        </div>
        <ul className="card__moves">
          <li>
            <span className="card__icon">
              <ClapIcon />
            </span>
            <span className="card__move card__move--work">{card.work.title}</span>
          </li>
          <li>
            <span className="card__icon">
              <MasksIcon />
            </span>
            <span className="card__move">{card.work.genres}</span>
          </li>
        </ul>
        <div className="card__foot">
          <span className="card__rarity">
            {RARITIES[card.rarity].label}
            <Stars rank={RARITIES[card.rarity].rank} />
          </span>
          <span className="card__num">#{cardNumber(card.num)}</span>
        </div>
        <span className="card__glitter" aria-hidden="true" />
        <span className="card__shine" aria-hidden="true" />
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

/** Emplacement d'une carte pas encore obtenue : image floutée. */
export function MissingCard({ card }: { card: CardDef }) {
  const type = TYPES[card.work.type];
  return (
    <div className="card card--missing" style={{ "--type": type.color } as CSSProperties}>
      <div className="card__face">
        <div className="card__top">
          <p className={`card__title ${titleSize(card.name)}`}>{card.name}</p>
          <span className="card__year">?</span>
        </div>
        <div className="card__window">
          <span className="card__type">{type.label}</span>
          <Portrait card={card} hidden />
        </div>
        <ul className="card__moves">
          <li>
            <span className="card__icon">
              <ClapIcon />
            </span>
            <span className="card__move card__move--work">{card.work.title}</span>
          </li>
        </ul>
        <div className="card__foot">
          <span className="card__rarity">{RARITIES[card.rarity].label}</span>
          <span className="card__num">#{cardNumber(card.num)}</span>
        </div>
      </div>
    </div>
  );
}
