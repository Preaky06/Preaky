import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceCard } from "@/components/ui/PriceCard";
import { PriceStamp } from "@/components/ui/PriceStamp";
import { TierPill } from "@/components/ui/TierPill";
import { toCardItem } from "@/lib/card-item";
import { getAllSlugs, getCatalogStats, getItemBySlug, getNeighbours } from "@/lib/data/items";
import { formatOriginal, formatPrice, formatSci } from "@/lib/format";
import { altitudeOf } from "@/lib/scale";
import { categoryName } from "@/lib/taxonomy";
import { TIERS } from "@/lib/tiers";

/**
 * Fiche objet — version minimale (pas de lien mort depuis l'accueil).
 * Phase 3 : compteur animé, équivalences, carrousel de voisins, image de partage, schema.org.
 */
export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  // Cache Components exige au moins un paramètre ; « vide » renvoie la page 404 si la démo est purgée.
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
    <article data-tier={item.tier} className="relative z-10 mx-auto max-w-[1120px] px-5 pb-24 pt-28">
      <Link
        href={item.is_hero && item.hero_order ? `/#etage-${item.hero_order}` : "/explorer"}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" strokeWidth={2} className="size-4" />
        {item.is_hero ? "Retour à l'Ascension" : "Retour à l'Explorer"}
      </Link>

      <div className="panel mt-4 grid gap-10 p-6 sm:p-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center">
        <div className="price-card relative grid aspect-square place-items-center overflow-visible">
          {item.image_url && (
            <Image
              src={item.image_url}
              alt=""
              width={256}
              height={256}
              unoptimized
              priority
              className="w-[72%] drop-shadow-[0_24px_20px_rgb(11_18_32/0.3)]"
            />
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <TierPill tier={item.tier} showIndex />
            <Link href={`/categorie/${item.category_id}`} className="text-small font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
              {categoryName(item.category_id)}
            </Link>
          </div>
          <h1 className="text-title-3 font-extrabold tracking-tight">{item.name_fr}</h1>
          <p className="price text-[clamp(56px,10vw,120px)] font-extrabold leading-none text-(--tier)">{formatPrice(item.price_eur)}</p>
          {price.currency !== "EUR" && (
            <p className="text-muted">
              Prix d&apos;origine : <span className="price font-semibold text-ink">{formatOriginal(price.value, price.currency)}</span> · taux
              de démo {price.fx_rate}
            </p>
          )}
          <PriceStamp price={price} status={item.status} />
          {item.short_desc_fr && <p className="text-lg">{item.short_desc_fr}</p>}
          <p className="num text-small text-muted">{formatSci(item.price_eur)}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/duel?a=${item.slug}&b=${item.slug === "baguette" ? "big-mac" : "baguette"}`} className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-semibold text-white">
              Ajouter au duel
            </Link>
            <Link href={`/budget`} className="inline-flex h-11 items-center rounded-full bg-surface px-5 font-semibold ring-1 ring-line">
              Comparer à mon budget
            </Link>
          </div>
        </div>
      </div>

      <section aria-labelledby="position" className="mt-12 flex flex-col gap-4">
        <h2 id="position" className="text-[28px] font-extrabold tracking-tight">
          Position
        </h2>
        <p className="text-lg">
          Plus cher que <span className="price font-bold text-(--tier)">{item.percentile?.toLocaleString("fr-FR")} %</span> des objets
          de VERTIGE <span className="text-muted">(sur {stats.count} objets de démo)</span>.
        </p>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-line" role="img" aria-label={`Position sur l'échelle : ${Math.round(alt * 100)} %`}>
          {TIERS.map((t) => (
            <span
              key={t.id}
              className="absolute inset-y-0 opacity-30"
              style={{ left: `${altitudeOf(t.logMin) * 100}%`, width: `${(altitudeOf(t.logMax) - altitudeOf(t.logMin)) * 100}%`, background: t.color }}
            />
          ))}
          <span className="absolute inset-y-0 w-1.5 rounded-full bg-ink" style={{ left: `calc(${alt * 100}% - 3px)` }} />
        </div>
      </section>

      {(below[0] || above[0]) && (
        <nav aria-labelledby="voisins" className="mt-12">
          <h2 id="voisins" className="text-[28px] font-extrabold tracking-tight">
            Juste en dessous, juste au-dessus
          </h2>
          <ul className="mt-4 flex flex-wrap gap-6">
            {[below[0], above[0]].filter((n) => n !== undefined).map((n) => (
              <li key={n.slug}>
                <PriceCard item={toCardItem(n)} />
              </li>
            ))}
          </ul>
        </nav>
      )}

      <section aria-labelledby="source" className="mt-12 flex flex-col gap-2 rounded-[24px] border border-dashed border-line-strong bg-surface p-5">
        <h2 id="source" className="text-small font-semibold uppercase tracking-[0.18em] text-muted">
          Source
        </h2>
        <p>Aucune source : donnée de démonstration (fiabilité C), à remplacer par un relevé sourcé.</p>
        {price.notes && <p className="text-small text-muted">{price.notes}</p>}
        {item.image_author && (
          <p className="text-small text-muted">
            Illustration : {item.image_author}, licence {item.image_license}.
          </p>
        )}
      </section>
    </article>
  );
}
