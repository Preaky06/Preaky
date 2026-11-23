import Link from "next/link";
import { RARITIES, RARITY_ORDER, TYPES, TYPE_ORDER, type Rarity, type WorkType } from "@/lib/catalogue";

export type FilterValues = { type?: WorkType; rarete?: Rarity; vue?: string; q?: string };

export function parseFilters(sp: Record<string, string | string[] | undefined>): FilterValues {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = one(sp.type);
  const rarete = one(sp.rarete);
  return {
    type: type && type in TYPES ? (type as WorkType) : undefined,
    rarete: rarete && rarete in RARITIES ? (rarete as Rarity) : undefined,
    vue: one(sp.vue),
    q: one(sp.q)?.slice(0, 60),
  };
}

function href(base: string, values: FilterValues, patch: Partial<FilterValues>): string {
  const merged = { ...values, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

type Props = {
  base: string;
  values: FilterValues;
  views?: { value: string | undefined; label: string }[];
};

export function Filters({ base, values, views }: Props) {
  return (
    <div className="filters">
      {views && (
        <div className="filters__row" role="group" aria-label="Affichage">
          {views.map((v) => (
            <Link
              key={v.label}
              href={href(base, values, { vue: v.value })}
              className="pill"
              aria-current={values.vue === v.value ? "true" : undefined}
            >
              {v.label}
            </Link>
          ))}
        </div>
      )}
      <div className="filters__row" role="group" aria-label="Type">
        <Link href={href(base, values, { type: undefined })} className="pill" aria-current={!values.type ? "true" : undefined}>
          Tous les types
        </Link>
        {TYPE_ORDER.map((t) => (
          <Link
            key={t}
            href={href(base, values, { type: t })}
            className="pill"
            aria-current={values.type === t ? "true" : undefined}
          >
            <span className="chip__dot" style={{ background: TYPES[t].color }} aria-hidden="true" />
            {TYPES[t].short}
          </Link>
        ))}
      </div>
      <div className="filters__row" role="group" aria-label="Rareté">
        <Link
          href={href(base, values, { rarete: undefined })}
          className="pill"
          aria-current={!values.rarete ? "true" : undefined}
        >
          Toutes les raretés
        </Link>
        {RARITY_ORDER.map((r) => (
          <Link
            key={r}
            href={href(base, values, { rarete: r })}
            className={`pill pill--${r}`}
            aria-current={values.rarete === r ? "true" : undefined}
          >
            {RARITIES[r].label}
          </Link>
        ))}
      </div>
    </div>
  );
}
