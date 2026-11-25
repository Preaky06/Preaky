import type { CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { LogoMark } from "@/components/Icons";
import { RARITIES, cardNumber, type CardDef } from "@/lib/cards-meta";
import { ENERGIES, RARITY_SYMBOL, combatProfile, type EnergyClass } from "@/lib/combat";

function Energy({ kind, className = "card__energy" }: { kind: EnergyClass; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={ENERGIES[kind].icon} alt="" aria-hidden="true" />;
}

function nameSize(name: string): string {
  if (name.length > 17) return "card__name--xs";
  if (name.length > 13) return "card__name--sm";
  return "";
}

/** Les cartes les plus rares sont « full art » : l'image remplit toute la carte. */
export function isFullArt(card: CardDef, gold: boolean): boolean {
  return gold || card.rarity === "legendaire" || card.rarity === "mythique";
}

type CardProps = {
  card: CardDef;
  gold?: boolean;
  /** Largeur fixe (ex. "220px"). Par défaut, la carte prend la largeur de sa cellule. */
  width?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
};

/**
 * Carte façon jeu de cartes à collectionner : nom, PV et énergie en haut, illustration encadrée,
 * deux attaques, faiblesse et retraite, numéro et symbole de rareté en bas.
 * Commune : aucun effet. Rare : reflet sur l'illustration. Épique : carte texturée et pailletée.
 * Légendaire et mythique : full art en relief, reflets arc-en-ciel. Secrète : tout en or.
 */
export function Card({ card, gold = false, width, className = "", headingLevel = "h3" }: CardProps) {
  const Title = headingLevel;
  const p = combatProfile(card);
  const energy = ENERGIES[p.energy];
  const full = isFullArt(card, gold);
  const fx = gold || card.rarity !== "commune";
  const style = { "--energy": energy.color, ...(width ? { "--card-w": width } : {}) } as CSSProperties;
  return (
    <article
      className={`card card--${card.rarity}${full ? " card--full" : ""}${gold ? " card--gold" : ""}${fx ? " card--fx" : ""} ${className}`}
      style={style}
      aria-label={`${card.name}, ${card.work.title}, ${RARITIES[card.rarity].label.toLowerCase()}${gold ? ", carte secrète en or" : ""}, ${p.hp} PV`}
    >
      <div className="card__face">
        {full && (
          <div className="card__bg">
            <CardImage name={card.name} image={card.image} />
          </div>
        )}
        <div className="card__inner">
          <div className="card__top">
            <Title className={`card__name ${nameSize(card.name)}`}>{card.name}</Title>
            <span className="card__hp">
              <small>PV</small>
              {p.hp}
            </span>
            <Energy kind={p.energy} />
          </div>
          {!full && (
            <div className="card__art">
              <CardImage name={card.name} image={card.image} />
              <span className="card__holo" aria-hidden="true" />
            </div>
          )}
          <p className="card__meta">
            N°{cardNumber(card.num, card.total)} · {card.work.title} · {card.work.year}
          </p>
          <ul className="card__attacks">
            {p.attacks.map((a) => (
              <li key={a.name}>
                <span className="card__cost">
                  {Array.from({ length: a.cost }, (_, i) => (
                    <Energy key={i} kind={p.energy} className="card__cost-icon" />
                  ))}
                </span>
                <span className="card__atk">{a.name}</span>
                <span className="card__dmg">{a.damage}</span>
              </li>
            ))}
          </ul>
          <p className="card__flavor">
            {ENERGIES[p.energy].label} · {card.work.genres}. Vu dans {card.work.title}.
          </p>
          <div className="card__rules">
            <span>
              Faiblesse <Energy kind={p.weakness} className="card__rule-icon" />×2
            </span>
            <span>Retraite {"✦".repeat(p.retreat)}</span>
          </div>
          <div className="card__foot">
            <span>
              <span className="card__rank">{gold ? "Secrète" : RARITIES[card.rarity].label}</span> · Illus. {card.credit}
            </span>
            <span>
              {cardNumber(card.num, card.total)}/{card.total} <b className="card__symbol">{RARITY_SYMBOL[card.rarity]}</b>
            </span>
          </div>
        </div>
        <span className="card__texture" aria-hidden="true" />
        <span className="card__glitter" aria-hidden="true" />
        <span className="card__shine" aria-hidden="true" />
        {(gold || card.rarity === "mythique") && (
          <span className="card__sparkles" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </article>
  );
}

/** Dos de carte : emblème ToonDex, motif rayonnant, reflet métallisé. */
export function CardBack() {
  return (
    <div className="card card--back" aria-hidden="true">
      <div className="card__face card__back">
        <span className="card__back-rays" />
        <span className="card__back-emblem">
          <LogoMark className="logo-mark" />
        </span>
        <span className="card__back-name">TOONDEX</span>
        <span className="card__back-tag">Cartes à collectionner</span>
        <span className="card__back-foil" />
      </div>
    </div>
  );
}
