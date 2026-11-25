import type { CSSProperties, ReactNode } from "react";
import { CardImage } from "@/components/CardImage";
import { LogoMark } from "@/components/Icons";
import { RARITIES, cardNumber, type CardDef, type Rarity } from "@/lib/cards-meta";
import {
  ENERGIES,
  GRID_LABELS,
  RARITY_SYMBOL,
  charisma,
  combatProfile,
  groupDigits,
  powerGrid,
  type CombatProfile,
  type EnergyClass,
} from "@/lib/combat";

/* eslint-disable @next/next/no-img-element */

/**
 * Une mise en page par rareté, pour qu'on reconnaisse la rareté d'un coup d'œil :
 * commune « carte de sport », rare « carte de base » argentée, épique « grimoire » à plaques,
 * légendaire « super-héros » avec grille de puissance, mythique « cadre orné » à lettres verticales,
 * matière noire « superstar » avec blocs de stats, secrète « commande » en or avec hexagones.
 */
type Layout = "classic" | "basic" | "arcane" | "heroes" | "duel" | "superstar" | "command";

const LAYOUT: Record<Rarity, Layout> = {
  commune: "classic",
  rare: "basic",
  epique: "arcane",
  legendaire: "heroes",
  mythique: "duel",
  "matiere-noire": "superstar",
};

type Heading = "h2" | "h3";

type Parts = {
  card: CardDef;
  p: CombatProfile;
  Title: Heading;
  gold: boolean;
};

function Energy({ kind, className }: { kind: EnergyClass; className?: string }) {
  return <img className={className} src={ENERGIES[kind].icon} alt="" aria-hidden="true" />;
}

/** Classe de taille selon la longueur du texte : "is-sm" puis "is-xs". */
function fit(text: string, sm: number, xs: number): string {
  if (text.length > xs) return "is-xs";
  if (text.length > sm) return "is-sm";
  return "";
}

function Photo({ card }: { card: CardDef }) {
  return <CardImage name={card.name} image={card.image} />;
}

function Foot({ card, gold }: { card: CardDef; gold: boolean }) {
  return (
    <div className="card__foot">
      <span>
        <b className="card__rank">{gold ? "Secrète" : RARITIES[card.rarity].label}</b> · Illus. {card.credit}
      </span>
      <span>
        {cardNumber(card.num, card.total)}/{card.total} <b className="card__symbol">{RARITY_SYMBOL[card.rarity]}</b>
      </span>
    </div>
  );
}

/** Commune : carte de sport. Bandeau au nom de l'œuvre, photo sur rayures, plaque au nom du personnage. */
function Classic({ card, p, Title, gold }: Parts) {
  return (
    <>
      <div className="cl__team">
        <span className={`cl__team-name ${fit(card.work.title, 11, 18)}`}>{card.work.title}</span>
      </div>
      <div className="cl__photo">
        <div className="cl__frame">
          <Photo card={card} />
        </div>
      </div>
      <div className="cl__plate">
        <span className="cl__badge">
          <b>{cardNumber(card.num, card.total)}</b>
          <small>{card.work.year}</small>
        </span>
        <span className="cl__id">
          <Title className={`cl__name ${fit(card.name, 13, 18)}`}>{card.name}</Title>
          <span className="cl__pos">
            {ENERGIES[p.energy].label} · {p.hp} PV
          </span>
        </span>
      </div>
      <Foot card={card} gold={gold} />
    </>
  );
}

/** Rare : carte de base argentée. Barre de nom, ruban de l'œuvre, attaques, faiblesse et retraite. */
function Basic({ card, p, Title, gold }: Parts) {
  return (
    <>
      <div className="bs__head">
        <span className="bs__tag">Rare</span>
        <Title className={`bs__name ${fit(card.name, 13, 18)}`}>{card.name}</Title>
        <span className="bs__hp">
          <small>PV</small>
          {p.hp}
        </span>
        <Energy kind={p.energy} className="bs__icon" />
      </div>
      <div className="bs__ribbon">
        <span>{card.work.title}</span>
      </div>
      <div className="bs__art">
        <Photo card={card} />
        <span className="card__holo" aria-hidden="true" />
      </div>
      <ul className="bs__attacks">
        {p.attacks.map((a) => (
          <li key={a.name}>
            <span className="bs__cost">
              {Array.from({ length: a.cost }, (_, i) => (
                <Energy key={i} kind={p.energy} />
              ))}
            </span>
            <span className="bs__atk">{a.name}</span>
            <span className="bs__dmg">{a.damage}</span>
          </li>
        ))}
      </ul>
      <div className="bs__bar">
        <span>
          <small>faiblesse</small>
          <Energy kind={p.weakness} />
          ×2
        </span>
        <span>
          <small>résistance</small>—
        </span>
        <span>
          <small>retraite</small>
          {"✦".repeat(p.retreat)}
        </span>
      </div>
      <Foot card={card} gold={gold} />
    </>
  );
}

/** Épique : grimoire. Plaque de nom, illustration biseautée, ligne de type, texte de règles, force/endurance. */
function Arcane({ card, p, Title, gold }: Parts) {
  return (
    <>
      <div className="ar__plate ar__plate--name">
        <Title className={`ar__name ${fit(card.name, 15, 20)}`}>{card.name}</Title>
        <span className="ar__cost">
          <Energy kind={p.energy} />
          <Energy kind={p.energy} />
        </span>
      </div>
      <div className="ar__art">
        <Photo card={card} />
        <span className="card__holo" aria-hidden="true" />
      </div>
      <div className="ar__plate ar__plate--type">
        <span>Créature épique — {ENERGIES[p.energy].label}</span>
        <b className="card__symbol">{RARITY_SYMBOL[card.rarity]}</b>
      </div>
      <div className="ar__text">
        {p.attacks.map((a) => (
          <p key={a.name}>
            <b>{a.name}</b> — inflige {a.damage} dégâts.
          </p>
        ))}
        <p className="ar__flavor">
          Vu dans {card.work.title}, {card.work.year}.
        </p>
      </div>
      <span className="ar__pt">
        {Math.max(1, Math.round(p.attack / 20))}/{Math.max(1, Math.round(p.defense / 20))}
      </span>
      <Foot card={card} gold={gold} />
    </>
  );
}

/** Légendaire : super-héros. Bandeau de l'œuvre, texte vertical, bannière jaune, grille de puissance. */
function Heroes({ card, p, Title, gold }: Parts) {
  const grid = powerGrid(card);
  return (
    <>
      <div className="hr__band">
        <span>{card.work.title}</span>
      </div>
      <div className="hr__art">
        <span className="hr__side">
          ToonDex · Légendaire · {card.work.year}
        </span>
        <div className="hr__photo">
          <Photo card={card} />
        </div>
      </div>
      <div className="hr__banner">
        <Title className={`hr__name ${fit(card.name, 14, 19)}`}>{card.name}</Title>
        <Energy kind={p.energy} className="hr__icon" />
      </div>
      <div className="hr__grid">
        <div className="hr__grid-head">
          <span>Puissance</span>
          <span className="hr__scale">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <i key={n}>{n}</i>
            ))}
          </span>
        </div>
        {GRID_LABELS.map((label, i) => (
          <div className="hr__row" key={label}>
            <span>{label}</span>
            <span className="hr__track">
              <i style={{ width: `${(grid[i] / 7) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
      <Foot card={card} gold={gold} />
    </>
  );
}

/** Mythique : cadre orné. Nom et œuvre en lettres verticales, médaillon PV, attaques sur l'image. */
function Duel({ card, p, Title, gold }: Parts) {
  return (
    <>
      <div className="du__side">
        <Title className={`du__vname ${fit(card.name, 18, 24)}`}>{card.name}</Title>
      </div>
      <div className="du__art">
        <Photo card={card} />
        <span className="du__medal">
          <small>PV</small>
          <b>{p.hp}</b>
          <Energy kind={p.energy} />
        </span>
        <div className="du__moves">
          {p.attacks.map((a) => (
            <p key={a.name}>
              <span>{a.name}</span>
              <b>{a.damage}</b>
            </p>
          ))}
        </div>
      </div>
      <div className="du__side">
        <span className={`du__vname du__vname--work ${fit(card.work.title, 18, 24)}`}>{card.work.title}</span>
      </div>
      <Foot card={card} gold={gold} />
    </>
  );
}

/** Matière noire : superstar. Blocs de stats en biais, gros chiffre de puissance, plaque de nom inclinée. */
function Superstar({ card, p, Title, gold }: Parts) {
  const stats: [string, number][] = [
    ["ATQ", p.attack * 40],
    ["DÉF", p.defense * 40],
    ["VIT", p.speed * 40],
    ["CHA", charisma(card) * 40],
  ];
  return (
    <>
      <div className="ss__bg">
        <Photo card={card} />
      </div>
      <div className="ss__top">
        <span className="ss__hp">
          <small>PV</small>
          {p.hp}
        </span>
        <Energy kind={p.energy} />
      </div>
      <div className="ss__stats">
        <span className="ss__tab">Stats</span>
        <ul>
          {stats.map(([label, v]) => (
            <li key={label}>
              <small>{label}</small>
              <b>{groupDigits(v)}</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="ss__bottom">
        <span className="ss__power">{groupDigits(p.hp * 100)}</span>
        <div className="ss__plate">
          <span className="ss__lvl">
            <small>NIV.</small>5
          </span>
          <span className="ss__id">
            <small>Matière noire</small>
            <Title className={`ss__name ${fit(card.name, 13, 18)}`}>{card.name}</Title>
          </span>
        </div>
        <p className="ss__special">
          Spécial · {p.attacks[1].name} <b>+1 000</b> ATQ et DÉF
        </p>
      </div>
      <Foot card={card} gold={gold} />
    </>
  );
}

/** Secrète en or : panneau de commande. Emblème, stats en hexagones, grande fenêtre d'image dorée. */
function Command({ card, p, Title, gold }: Parts) {
  const stats: [string, number][] = [
    ["PV", p.hp],
    ["Défense", p.defense],
    ["Attaque", p.attack],
    ["Dégâts", p.attacks[1].damage],
  ];
  return (
    <>
      <span className="cm__emblem">
        <LogoMark className="cm__logo" />
      </span>
      <div className="cm__banner">
        <Title className={`cm__name ${fit(card.name, 13, 18)}`}>{card.name}</Title>
        <span className="cm__secret">Secrète en or</span>
      </div>
      <ul className="cm__stats">
        {stats.map(([label, v]) => (
          <li key={label}>
            <span className="cm__label">{label}</span>
            <span className="cm__hex">{v}</span>
          </li>
        ))}
      </ul>
      <div className="cm__art">
        <Photo card={card} />
      </div>
      <div className="cm__work">
        <Energy kind={p.energy} />
        <span>
          {card.work.title} · {card.work.year}
        </span>
        <i className="cm__stripes" aria-hidden="true" />
      </div>
      <Foot card={card} gold={gold} />
    </>
  );
}

const RENDER: Record<Layout, (parts: Parts) => ReactNode> = {
  classic: Classic,
  basic: Basic,
  arcane: Arcane,
  heroes: Heroes,
  duel: Duel,
  superstar: Superstar,
  command: Command,
};

type CardProps = {
  card: CardDef;
  gold?: boolean;
  /** Largeur fixe (ex. "220px"). Par défaut, la carte prend la largeur de sa cellule. */
  width?: string;
  className?: string;
  headingLevel?: Heading;
  /** Carte pas encore obtenue : floue, comme un mystère. */
  mystery?: boolean;
};

export function Card({ card, gold = false, width, className = "", headingLevel = "h3", mystery = false }: CardProps) {
  const p = combatProfile(card);
  const layout: Layout = gold ? "command" : LAYOUT[card.rarity];
  const fx = gold || card.rarity !== "commune";
  const style = { "--energy": ENERGIES[p.energy].color, ...(width ? { "--card-w": width } : {}) } as CSSProperties;
  const Render = RENDER[layout];
  return (
    <article
      className={`card card--${card.rarity} card--${layout}${gold ? " card--gold" : ""}${fx ? " card--fx" : ""}${mystery ? " card--mystery" : ""} ${className}`}
      style={style}
      aria-label={
        mystery
          ? `Carte mystère n°${cardNumber(card.num, card.total)}, ${RARITIES[card.rarity].label.toLowerCase()}`
          : `${card.name}, ${card.work.title}, ${RARITIES[card.rarity].label.toLowerCase()}${gold ? ", carte secrète en or" : ""}, ${p.hp} PV`
      }
    >
      <div className="card__face">
        <div className="card__inner" aria-hidden={mystery || undefined}>
          <Render card={card} p={p} Title={headingLevel} gold={gold} />
        </div>
        <span className="card__texture" aria-hidden="true" />
        <span className="card__glitter" aria-hidden="true" />
        <span className="card__shine" aria-hidden="true" />
        {card.rarity === "matiere-noire" && !gold && <span className="card__void" aria-hidden="true" />}
        {mystery && (
          <span className="card__mystery" aria-hidden="true">
            <span className="card__mystery-mark">?</span>
            <span className="card__mystery-label">Mystère</span>
          </span>
        )}
        {(gold || card.rarity === "mythique" || card.rarity === "matiere-noire") && (
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
