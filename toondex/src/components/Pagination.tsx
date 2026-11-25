import Link from "next/link";

type Props = {
  base: string;
  page: number;
  pages: number;
  /** Paramètres à garder dans les liens (recherche, rareté). */
  keep: Record<string, string | undefined>;
};

function href(base: string, page: number, keep: Props["keep"]): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(keep)) if (v) params.set(k, v);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Numéros affichés : première, dernière, et deux pages autour de la page courante. */
function visible(page: number, pages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}

export function Pagination({ base, page, pages, keep }: Props) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages du catalogue">
      {page > 1 ? (
        <Link href={href(base, page - 1, keep)} className="btn btn--ghost btn--sm" rel="prev">
          ← Précédente
        </Link>
      ) : (
        <span />
      )}
      <ol className="pager__list">
        {visible(page, pages).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="pager__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <Link href={href(base, p, keep)} className="pager__link" aria-current={p === page ? "page" : undefined}>
                {p}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link href={href(base, page + 1, keep)} className="btn btn--ghost btn--sm" rel="next">
          Suivante →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
