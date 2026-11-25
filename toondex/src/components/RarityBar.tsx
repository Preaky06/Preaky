import Link from "next/link";
import { RARITIES, RARITY_ORDER, type Rarity } from "@/lib/catalogue";

type Props = {
  /** Page de base, ex. "/collection". */
  base: string;
  /** Rareté sélectionnée, ou aucune. */
  active?: Rarity;
  /** Texte du compteur par rareté (ex. "3/46"). */
  counts: Record<Rarity, string>;
  /** Texte du compteur « Toutes ». */
  total: string;
  /** Paramètres à garder dans les liens (ex. la recherche). */
  keep?: Record<string, string | undefined>;
};

function href(base: string, rarete: string | undefined, keep: Props["keep"]): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(keep ?? {})) if (v) params.set(k, v);
  if (rarete) params.set("rarete", rarete);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Compteurs par rareté, qui servent aussi de filtres. */
export function RarityBar({ base, active, counts, total, keep }: Props) {
  return (
    <ul className="rarity-bar" aria-label="Filtrer par rareté">
      <li>
        <Link href={href(base, undefined, keep)} className="rarity-chip" aria-current={!active ? "true" : undefined}>
          <span className="rarity rarity--commune" style={{ visibility: "hidden", width: 0, padding: 0 }} />
          Toutes
          <span className="rarity-chip__count">{total}</span>
        </Link>
      </li>
      {RARITY_ORDER.map((r) => (
        <li key={r}>
          <Link href={href(base, r, keep)} className="rarity-chip" aria-current={active === r ? "true" : undefined}>
            <span className={`rarity rarity--${r}`}>{RARITIES[r].label}</span>
            <span className="rarity-chip__count">{counts[r]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function parseRarity(value: string | string[] | undefined): Rarity | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v in RARITIES ? (v as Rarity) : undefined;
}
