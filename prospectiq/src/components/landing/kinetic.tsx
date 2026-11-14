// Fin du titre de l'accueil : les événements des registres défilent, lettre par lettre.
// Chaque lettre bascule en 3D à son tour (vague de gauche à droite), le trait de radar se dessine
// sous le mot puis se rétracte. Tout est en CSS (classes .word-cycle, .kin-word, .kin-letter).
import type { CSSProperties } from 'react';

const FROM = [124, 58, 237]; // violet de la marque
const TO = [37, 99, 235]; // bleu
const tint = (t: number) => `rgb(${FROM.map((c, k) => Math.round(c + (TO[k] - c) * t)).join(' ')})`;

/** Durée d'affichage de chaque événement (s) et début du premier, après l'arrivée du titre. */
export const CYCLE_STEP = 2.5;
const START = 0.9;

export function KineticSignals({ items, className }: { items: string[]; className?: string }) {
  return (
    <span className={`word-cycle ${className || ''}`} aria-hidden="true" style={{ '--cycle': `${items.length * CYCLE_STEP}s` } as CSSProperties}>
      {items.map((phrase, k) => {
        const count = phrase.replace(/\s/g, '').length;
        let i = 0;
        return (
          <span key={phrase} className="kin-word signal-word" style={{ '--d': `${START + k * CYCLE_STEP}s` } as CSSProperties}>
            {phrase.split(' ').map((word, w) => (
              <span key={w}>
                {w > 0 && ' '}
                <span className="whitespace-nowrap">
                  {[...word].map((ch) => {
                    const n = i++;
                    return (
                      <span key={n} className="kin-letter" style={{ '--i': n, color: tint(count > 1 ? n / (count - 1) : 0) } as CSSProperties}>
                        {ch}
                      </span>
                    );
                  })}
                </span>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
