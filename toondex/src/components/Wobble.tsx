import type { CSSProperties, ElementType } from "react";

/**
 * Titre en Sigmar, lettres droites. `colors` colore les lettres une à une, en boucle
 * (grands titres multicolores des panneaux sombres).
 */

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** Couleurs appliquées lettre par lettre, en boucle. */
  colors?: string[];
};

export function Wobble({ text, as: Tag = "span", className = "", colors }: Props) {
  if (!colors) return <Tag className={`wobble ${className}`}>{text}</Tag>;
  let index = 0;
  return (
    <Tag className={`wobble ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {[...text].map((ch, i) => {
          if (ch === " ") return " ";
          const color = colors[index % colors.length];
          index += 1;
          return (
            <span key={i} style={{ color } as CSSProperties}>
              {ch}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
