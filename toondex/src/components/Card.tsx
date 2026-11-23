import type { CSSProperties } from "react";
import {
  RARITIES,
  TYPES,
  cardArt,
  cardNumber,
  countryNames,
  type Work,
  type WorkType,
} from "@/lib/catalogue";

/** Motif graphique original propre à chaque type d'œuvre. */
function Motif({ type }: { type: WorkType }) {
  switch (type) {
    case "serie":
      return (
        <>
          <rect x="8" y="18" width="62" height="44" rx="7" />
          <rect x="20" y="30" width="62" height="44" rx="7" />
          <path d="M40 84h26" />
        </>
      );
    case "serie-animee":
      return (
        <>
          <circle cx="36" cy="42" r="24" />
          <circle cx="66" cy="62" r="16" />
          <circle cx="72" cy="26" r="7" />
        </>
      );
    case "anime":
      return (
        <>
          <circle cx="64" cy="40" r="20" />
          <path d="M4 30h40M10 44h30M2 58h44M16 72h52M30 86h40" />
        </>
      );
    case "film":
      return (
        <>
          <rect x="22" y="4" width="46" height="92" rx="4" />
          <path d="M30 12v6M30 30v6M30 48v6M30 66v6M30 84v6M60 12v6M60 30v6M60 48v6M60 66v6M60 84v6" />
        </>
      );
    case "film-animation":
      return (
        <>
          <path d="M40 10l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" />
          <path d="M74 52l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" />
          <circle cx="22" cy="76" r="5" />
        </>
      );
  }
}

type CardProps = {
  work: Work;
  gold?: boolean;
  /** Largeur fixe (ex. "220px"). Par défaut, la carte prend la largeur de sa cellule. */
  width?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
};

export function Card({ work, gold = false, width, className = "", headingLevel = "h3" }: CardProps) {
  const art = cardArt(work);
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
        <div className="card__art" style={{ background: art.background }} aria-hidden="true">
          <svg
            className="card__motif"
            viewBox="0 0 100 100"
            style={{ transform: `translate(${art.motifX}%, ${art.motifY}%) rotate(${art.motifRotate}deg)` }}
          >
            <Motif type={work.type} />
          </svg>
          <span className="card__initials">{art.initials}</span>
          <span className="card__sheen" />
          <span className="card__type">{type.label}</span>
          {gold && <span className="card__gold-badge">Or</span>}
        </div>
        <div className="card__body">
          <Title className="card__title">{work.title}</Title>
          <p className="card__meta">
            {work.year} · {countryNames(work.countries)}
          </p>
          <p className="card__meta card__genres">{work.genres}</p>
          <div className="card__foot">
            <span className="card__num">#{cardNumber(work.num)}</span>
            <span className={`rarity rarity--${work.rarity}`}>{RARITIES[work.rarity].label}</span>
          </div>
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
        <span className="logo-mark logo-mark--lg">
          <span />
          <span />
          <span />
        </span>
        <span className="card__back-name">ToonDex</span>
      </div>
    </div>
  );
}

/** Emplacement d'une carte pas encore obtenue. */
export function MissingCard({ work }: { work: Work }) {
  const type = TYPES[work.type];
  return (
    <div className="card card--missing" style={{ "--type": type.color } as CSSProperties}>
      <div className="card__face">
        <div className="card__missing-art" aria-hidden="true">
          ?
        </div>
        <div className="card__body">
          <p className="card__title">{work.title}</p>
          <p className="card__meta">{type.label}</p>
          <div className="card__foot">
            <span className="card__num">#{cardNumber(work.num)}</span>
            <span className={`rarity rarity--${work.rarity}`}>{RARITIES[work.rarity].label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
