// Section « Pourquoi Pro Spectre » : le nom expliqué par le produit (cinq faisceaux de signaux → un score).
import { Wordmark } from '../logo';
import { CRITERIA_LABELS, DEFAULT_WEIGHTS, type Weights } from '@/lib/scoring';
import { criterionColor } from '@/lib/brand';

const SOURCES: Record<keyof Weights, string> = {
  need: 'Constats sur le site, annonces légales',
  relevance: 'Vos services, secteurs et tailles cibles',
  digital: 'Audit du site public',
  signals: 'BODACC : créations, cessions, changements',
  data: 'Fraîcheur et rattachement des données',
};

export function BrandStory() {
  const keys = Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[];
  return (
    <section id="nom" className="relative isolate overflow-hidden py-24">
      <div className="pointer-events-none absolute top-10 left-1/2 -z-10 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.10),transparent)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="reveal mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center pb-2">
            <Wordmark className="text-[2.6rem] sm:text-[4rem]" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">Un clin d’œil à « prospecter », et un œil ouvert sur les registres officiels.</p>
          <p className="font-display mt-8 text-xl leading-[1.45] font-light tracking-[-0.01em] text-balance text-night-800 sm:text-[1.55rem]">
            Chaque jour, Pro Spectre observe les registres officiels, décompose chaque entreprise en <span className="text-spectrum-deep font-medium">cinq faisceaux de signaux</span>, puis les fait converger en un score que vous pouvez expliquer.
          </p>
        </div>

        <div className="reveal mt-14">
          {/* Barre spectrale : largeur de chaque bande = pondération par défaut du critère */}
          <div className="shimmer hidden h-4 gap-[3px] overflow-hidden rounded-full md:flex" role="img" aria-label="Pondérations par défaut du score : 30, 25, 20, 15 et 10 %">
            {keys.map((k) => (
              <span key={k} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${DEFAULT_WEIGHTS[k]}%`, background: criterionColor(k) }} />
            ))}
          </div>
          <ol className="mt-6 grid gap-3 md:grid-cols-5 md:gap-6">
            {keys.map((k) => (
              <li key={k} className="flex min-w-0 items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card md:block md:rounded-none md:border-0 md:border-t-2 md:bg-transparent md:p-0 md:pt-4 md:shadow-none" style={{ borderTopColor: criterionColor(k) }}>
                <span className="mt-1 size-3 shrink-0 rounded-full md:hidden" style={{ background: criterionColor(k) }} />
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold tracking-[-0.03em]" style={{ color: criterionColor(k) }}>
                    {DEFAULT_WEIGHTS[k]} %
                  </p>
                  <p className="mt-1 text-sm leading-snug font-semibold text-night-900">{CRITERIA_LABELS[k]}</p>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{SOURCES[k]}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
