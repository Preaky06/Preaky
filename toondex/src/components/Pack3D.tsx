import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import type { CardDef } from "@/lib/cards-meta";

type Pack3DProps = {
  /** Bouton cliquable (ouverture) ou simple illustration. */
  interactive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

/** Paquet de cartes en 3D (CSS) : face avant métallisée avec la mascotte, tranches, bords sertis. */
export function Pack3D({ interactive = false, onClick, disabled, className = "" }: Pack3DProps) {
  const body = (
    <span className="pack3d__body">
      <span className="pack3d__face pack3d__face--front">
        <span className="pack3d__foil" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pack3d__mascot" src="/3d/popcorn.webp" alt="" />
        <span className="pack3d__name">ToonDex</span>
        <span className="pack3d__label">Paquet du jour</span>
        <span className="pack3d__count">5 cartes</span>
      </span>
      <span className="pack3d__face pack3d__face--back" />
      <span className="pack3d__side pack3d__side--l" />
      <span className="pack3d__side pack3d__side--r" />
      <span className="pack3d__cap pack3d__cap--t" />
      <span className="pack3d__cap pack3d__cap--b" />
    </span>
  );
  if (!interactive) {
    return (
      <span className={`pack3d ${className}`} aria-hidden="true">
        {body}
      </span>
    );
  }
  return (
    <button type="button" className={`pack3d ${className}`} onClick={onClick} disabled={disabled} aria-label="Ouvrir le paquet du jour">
      {body}
    </button>
  );
}

/** Scène du paquet : le paquet au centre, deux cartes en éventail derrière. */
export function PackScene({ cards, pack }: { cards: CardDef[]; pack: ReactNode }) {
  const [left, right] = cards;
  return (
    <div className="scene">
      <span className="scene__glow" aria-hidden="true" />
      {left && (
        <div className="scene__card scene__card--left" aria-hidden="true">
          <Card card={left} />
        </div>
      )}
      {right && (
        <div className="scene__card scene__card--right" aria-hidden="true">
          <Card card={right} />
        </div>
      )}
      {pack}
    </div>
  );
}
