import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Picto } from "@/components/ui/Picto";
import { PriceStamp } from "@/components/ui/PriceStamp";
import { TierPill } from "@/components/ui/TierPill";
import { getAllSlugs, getCatalogStats, getItemBySlug, getNeighbours } from "@/lib/data/items";
import { formatOriginal, formatPrice, formatSci } from "@/lib/format";
import { altitudeOf } from "@/lib/scale";
import { categoryName } from "@/lib/taxonomy";
import { TIERS } from "@/lib/tiers";

/**
 * Fiche objet — version minimale de la Phase 1 (pas de lien mort depuis l'Ascension).
 * Phase 3 : compteur animé, équivalences, carrousel de voisins, image de partage, schema.org.
 */
export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  // Cache Components exige au moins un paramètre ; « vide » renvoie un 404 si la démo est purgée.
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "vide" }];
}

export async function generateMetadata({ params }: PageProps<"/objet/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItemBySlug(slug);
  if (!item) return {};
  return {
    title: `${item.name_fr} — ${formatPrice(item.price_eur)}`,
    description: item.short_desc_fr ?? undefined,
    // Données de démonstration : jamais indexées.
    robots: item.status === "published" ? undefined : { index: false },
  };
}

export default async function ObjetPage({ params }: PageProps<"/objet/[slug]">) {
  const { slug } = await params;
  const item = await getItemBySlug(slug);
  if (!item) notFound();
  const [{ below, above }, stats] = await Promise.all([getNeighbours(slug, 1), getCatalogStats()]);
  const { price } = item;
  const alt = altitudeOf(item.log_price);

  return (
    <article data-tier={item.tier} className="relative z-10 mx-auto max-w-3xl px-5 pb-24 pt-24">
      <div aria-hidden="true" className="halo left-1/2 top-40 size-[60vmin] -translate-x-1/2" />
      <Link href={`/#etage-${item.hero_order}`} className="inline-flex min-h-11 items-center gap-2 text-small text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-4" />
        Retour à l&apos;Ascension
      </Link>

      <header className="relative mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Picto subcategory={item.subcategory_id} category={item.category_id} tier={item.tier} size={96} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TierPill tier={item.tier} showIndex />
            <span className="text-small text-muted">{categoryName(item.category_id)}</span>
          </div>
          <h1 className="font-serif text-title-2 text-ink">{item.name_fr}</h1>
        </div>
      </header>

      <section aria-label="Prix" className="relative mt-10 flex flex-col gap-3">
        <p className="num text-[clamp(56px,12vw,160px)] leading-none tracking-tight text-(--tier)">{formatPrice(item.price_eur)}</p>
        {price.currency !== "EUR" && (
          <p className="text-muted">
            Prix d&apos;origine : <span className="num text-ink">{formatOriginal(price.value, price.currency)}</span> · taux de
            démo {price.fx_rate}
          </p>
        )}
        <p className="num text-small text-muted">{formatSci(item.price_eur)}</p>
        <PriceStamp price={price} status={item.status} />
        {price.notes && <p className="text-small text-muted">{price.notes}</p>}
      </section>

      <section aria-labelledby="position" className="relative mt-12 flex flex-col gap-4">
        <h2 id="position" className="font-serif text-title-3">
          Position
        </h2>
        <p className="text-lg">
          Plus cher que <span className="num text-(--tier)">{item.percentile?.toLocaleString("fr-FR")} %</span> des objets de
          VERTIGE <span className="text-muted">(sur {stats.count} objets de démo)</span>.
        </p>
        <div className="relative h-2 w-full overflow-hidden rounded-full" role="img" aria-label={`Position sur l'échelle : ${Math.round(alt * 100)} %`}>
          {TIERS.map((t) => (
            <span
              key={t.id}
              className="absolute inset-y-0 opacity-40"
              style={{ left: `${altitudeOf(t.logMin) * 100}%`, width: `${(altitudeOf(t.logMax) - altitudeOf(t.logMin)) * 100}%`, background: t.color }}
            />
          ))}
          <span className="absolute inset-y-0 w-1 rounded-full bg-ink shadow-[0_0_10px_var(--tier)]" style={{ left: `calc(${alt * 100}% - 2px)` }} />
        </div>
      </section>

      <nav aria-label="Voisins sur l'échelle" className="relative mt-12 grid gap-3 sm:grid-cols-2">
        {below[0] && (
          <Link href={`/objet/${below[0].slug}`} className="card-surface flex flex-col gap-1 p-4 hover:border-line-strong">
            <span className="flex items-center gap-1 text-small text-muted">
              <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-4" /> Juste en dessous
            </span>
            <span className="font-serif text-xl">{below[0].name_fr}</span>
            <span className="num text-small text-muted">{formatPrice(below[0].price_eur)}</span>
          </Link>
        )}
        {above[0] && (
          <Link href={`/objet/${above[0].slug}`} className="card-surface flex flex-col gap-1 p-4 hover:border-line-strong sm:col-start-2">
            <span className="flex items-center gap-1 text-small text-muted">
              <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-4" /> Juste au-dessus
            </span>
            <span className="font-serif text-xl">{above[0].name_fr}</span>
            <span className="num text-small text-muted">{formatPrice(above[0].price_eur)}</span>
          </Link>
        )}
      </nav>

      <section aria-labelledby="source" className="relative mt-12 flex flex-col gap-2 rounded-[20px] border border-dashed border-line-strong p-5">
        <h2 id="source" className="text-small uppercase tracking-[0.2em] text-muted">
          Source
        </h2>
        <p>Aucune source : donnée de démonstration (fiabilité C), à remplacer par un relevé sourcé.</p>
        <p className="text-small text-muted">Fiche complète (équivalences, voisins, partage) : Phase 3.</p>
      </section>
    </article>
  );
}
