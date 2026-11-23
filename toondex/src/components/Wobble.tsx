import type { CSSProperties, ElementType } from "react";

/**
 * Texte en lettres « découpées » : chaque lettre a sa propre hauteur, son angle et son décalage,
 * comme un titrage collé à la main. Les valeurs sont fixes pour un rendu identique à chaque affichage.
 */
const JITTER: [rotate: number, shiftY: number, scaleY: number][] = [
  [-3, 0.02, 1.04],
  [2, 0.05, 0.98],
  [-2, 0, 1.08],
  [3, 0.04, 1],
  [-2, -0.01, 1.1],
  [2, 0.03, 1.02],
  [-3, 0, 1.06],
  [1.5, 0.05, 0.97],
  [-1.5, 0.01, 1.08],
];

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** Couleurs appliquées lettre par lettre, en boucle. */
  colors?: string[];
  /** Décale la séquence d'irrégularités pour varier deux titres voisins. */
  seed?: number;
};

export function Wobble({ text, as: Tag = "span", className = "", colors, seed = 0 }: Props) {
  let index = seed;
  const words = text.split(" ");
  return (
    <Tag className={`wobble ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <span key={w}>
            <span className="wobble__word">
              {[...word].map((ch, i) => {
                const [r, y, s] = JITTER[index % JITTER.length];
                const color = colors ? colors[index % colors.length] : undefined;
                index += 1;
                return (
                  <span
                    key={i}
                    className="wobble__l"
                    style={{ "--r": `${r}deg`, "--y": `${y}em`, "--s": s, color } as CSSProperties}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
