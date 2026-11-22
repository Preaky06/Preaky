import type { Metadata } from "next";
import { Thumb } from "@/components/ui/Thumb";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceCard } from "@/components/ui/PriceCard";
import { toCardItem } from "@/lib/card-item";
import { getCategoryCounts, getItemsByCategory } from "@/lib/data/items";
import { formatPrice, formatRatio } from "@/lib/format";
import { altitudeOf } from "@/lib/scale";
import { categoryName, isCategory } from "@/lib/taxonomy";
import { getTier, TIERS } from "@/lib/tiers";

export async function generateStaticParams() {
  const cats = await getCategoryCounts();
  return cats.length ? cats.map((c) => ({ slug: c.slug })) : [{ slug: "insolite" }];
}

export async function generateMetadata({ params }: PageProps<"/categorie/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return isCategory(slug) ? { title: categoryName(slug), description: `Tous les prix de la catégorie ${categoryName(slug)}, du moins cher au plus cher.` } : {};
}

export default async function CategoriePage({ params }: PageProps<"/categorie/[slug]">) {
  const { slug } = await params;
  if (!isCategory(slug)) notFound();
  const [items, cats] = await Promise.all([getItemsByCategory(slug), getCategoryCounts()]);
  if (!items.length) notFound();
  const min = items[0];
  const max = items[items.length - 1];
  const median = items[Math.floor((items.length - 1) / 2)];
  const top = [...items].reverse().slice(0, 10);

  return (
    <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-10 px-4 pb-24 pt-28 sm:px-5">
      <header className="flex flex-col gap-2">
        <Link href="/explorer" className="text-small font-semibold text-muted hover:text-ink">
          ← Toutes les catégories dans l&apos;Explorer
        </Link>
        <h1 className="text-title-2 font-extrabold tracking-tight">{categoryName(slug)}</h1>
        <p className="text-lg text-muted">
          {items.length} objet{items.length > 1 ? "s" : ""}, de {formatPrice(min.price_eur)} à {formatPrice(max.price_eur)} : un écart de{" "}
          {formatRatio(max.price_eur / min.price_eur)}.
        </p>
      </header>

      <section aria-label="Statistiques" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Le moins cher", item: min },
          { label: "Prix médian", item: median },
          { label: "Le plus cher", item: max },
        ].map(({ label, item }) => (
          <div key={label} data-tier={item.tier} className="panel flex flex-col gap-1 p-5">
            <p className="text-small font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="price text-[32px] font-extrabold leading-none text-(--tier)">{formatPrice(item.price_eur)}</p>
            <a href={`/objet/${item.slug}`} className="truncate text-[15px] font-medium hover:underline">
              {item.name_fr}
            </a>
          </div>
        ))}
      </section>

      <section aria-labelledby="mini-ascension" className="panel flex flex-col gap-4 p-5 sm:p-8">
        <h2 id="mini-ascension" className="text-[24px] font-extrabold tracking-tight">
          Mini-ascension
        </h2>
        <p className="text-muted">Du moins cher au plus cher. La barre situe chaque prix sur l&apos;échelle complète de VERTIGE.</p>
        <ol className="flex flex-col">
          {items.map((item, i) => (
            <li key={item.slug} data-tier={item.tier} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2.5 sm:grid-cols-[3rem_minmax(0,1fr)_12rem_auto]">
              <Thumb src={item.image_url} kind={item.image_kind} tier={item.tier} size={48} />
              <a href={`/objet/${item.slug}`} className="min-w-0 truncate text-[15px] font-semibold hover:underline">
                <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                {item.name_fr}
              </a>
              <span className="relative hidden h-2 overflow-hidden rounded-full bg-line sm:block" aria-hidden="true">
                <span className="absolute inset-y-0 left-0 rounded-full bg-(--tier)" style={{ width: `${(altitudeOf(item.log_price) * 100).toFixed(1)}%` }} />
              </span>
              <span className="price text-right text-[15px] font-bold text-(--tier)">
                {formatPrice(item.price_eur)}
                <span className="sr-only">, palier {getTier(item.tier).name}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="flex flex-wrap gap-3 text-[12px] text-muted" aria-hidden="true">
          {TIERS.map((t) => (
            <span key={t.id} className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: t.color }} />
              {t.name}
            </span>
          ))}
        </p>
      </section>

      <section aria-labelledby="top" className="flex flex-col gap-4">
        <h2 id="top" className="text-[24px] font-extrabold tracking-tight">
          Les {top.length} plus chers
        </h2>
        <ul className="no-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto scroll-px-4 px-4 pb-4">
          {top.map((item) => (
            <li key={item.slug} className="snap-start">
              <PriceCard item={toCardItem(item)} />
            </li>
          ))}
        </ul>
      </section>

      <nav aria-labelledby="autres" className="flex flex-col gap-3">
        <h2 id="autres" className="text-[18px] font-bold">
          Autres catégories
        </h2>
        <ul className="flex flex-wrap gap-2">
          {cats
            .filter((c) => c.slug !== slug)
            .map((c) => (
              <li key={c.slug}>
                <Link href={`/categorie/${c.slug}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-[14px] font-medium ring-1 ring-line hover:ring-line-strong">
                  {categoryName(c.slug)} <span className="tabular-nums text-muted">{c.count}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}
