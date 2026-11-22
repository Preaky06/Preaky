import { ArrowLeft, Swords, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PriceCard } from "@/components/ui/PriceCard";
import { Thumb } from "@/components/ui/Thumb";
import { TierPill } from "@/components/ui/TierPill";
import type { CardItem } from "@/lib/card-item";
import { REFERENCE_UNITS } from "@/lib/data/reference-units";
import { formatCountWords, formatObservedAt, formatOriginal, formatPrice, formatSci, formatWorkTime } from "@/lib/format";
import { CONFIDENCE_LABEL, PRICE_TYPE_LABEL, regionName } from "@/lib/labels";
import { altitudeOf } from "@/lib/scale";
import { categoryName } from "@/lib/taxonomy";
import { getTier, TIERS } from "@/lib/tiers";
import type { ItemWithPrice, PriceUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Champs dont la fiche a besoin (sous-ensemble d'ItemWithPrice, pour l'aperçu statique). */
export type FicheItem = Pick<
  ItemWithPrice,
  | "slug"
  | "name_fr"
  | "short_desc_fr"
  | "category_id"
  | "price_eur"
  | "log_price"
  | "tier"
  | "percentile"
  | "is_hero"
  | "hero_order"
  | "image_url"
  | "image_kind"
  | "image_license"
  | "image_author"
  | "image_source_url"
  | "status"
> & {
  price: Pick<
    ItemWithPrice["price"],
    "value" | "currency" | "fx_rate" | "price_type" | "unit" | "country" | "observed_at" | "source_url" | "confidence" | "notes"
  >;
};

export const toFicheItem = (i: ItemWithPrice): FicheItem => ({
  slug: i.slug,
  name_fr: i.name_fr,
  short_desc_fr: i.short_desc_fr,
  category_id: i.category_id,
  price_eur: i.price_eur,
  log_price: i.log_price,
  tier: i.tier,
  percentile: i.percentile,
  is_hero: i.is_hero,
  hero_order: i.hero_order,
  image_url: i.image_url,
  image_kind: i.image_kind,
  image_license: i.image_license,
  image_author: i.image_author,
  image_source_url: i.image_source_url,
  status: i.status,
  price: {
    value: i.price.value,
    currency: i.price.currency,
    fx_rate: i.price.fx_rate,
    price_type: i.price.price_type,
    unit: i.price.unit,
    country: i.price.country,
    observed_at: i.price.observed_at,
    source_url: i.price.source_url,
    confidence: i.price.confidence,
    notes: i.price.notes,
  },
});

const UNIT: Record<PriceUnit, string> = {
  piece: "À l'unité",
  kg: "Au kilo",
  l: "Au litre",
  m2: "Au mètre carré",
  hour: "À l'heure",
  month: "Par mois",
  year: "Par an",
  project: "Pour l'ensemble du projet",
};

export interface FicheProps {
  item: FicheItem;
  /** Voisins sur l'échelle, du plus proche au plus lointain */
  below: CardItem[];
  above: CardItem[];
  /** Nombre total d'objets (pour le percentile) */
  count: number;
}

const ref = (id: string) => REFERENCE_UNITS.find((u) => u.id === id)!;

/** Trois repères concrets : baguettes, temps de travail au SMIC, Big Mac ou iPhone. */
function equivalences(p: number) {
  const tiles: { key: string; image: string; big: string; label: string; note: string }[] = [];
  const versus = (id: string, singular: string, plural: string) => {
    const u = ref(id);
    if (p >= u.value_eur) {
      const n = p / u.value_eur;
      return { key: id, image: u.image, big: formatCountWords(n), label: n < 2 ? singular : plural, note: `à ${formatPrice(u.value_eur)} pièce` };
    }
    return {
      key: id,
      image: u.image,
      big: formatCountWords(u.value_eur / p),
      label: `pour le prix d'${singular.startsWith("une ") ? "une" : "un"} ${singular.replace(/^une? /, "")}`,
      note: `${singular.replace(/^une? /, "").replace(/^./, (c) => c.toUpperCase())} à ${formatPrice(u.value_eur)}`,
    };
  };
  tiles.push(versus("baguette", "une baguette", "baguettes"));
  const smic = ref("smic-horaire-brut");
  tiles.push({
    key: "smic",
    image: smic.image,
    big: formatWorkTime(p / smic.value_eur),
    label: "de travail au SMIC",
    note: `à ${formatPrice(smic.value_eur)} brut de l'heure`,
  });
  tiles.push(p >= ref("iphone").value_eur ? versus("iphone", "un iPhone 17 Pro", "iPhone 17 Pro") : versus("big-mac", "un Big Mac", "Big Mac"));
  return tiles;
}

/**
 * Fiche objet, purement présentationnelle : utilisée par /objet/[slug] (rendu serveur) et par
 * l'aperçu statique. Prix en grand, repères concrets, place sur l'échelle, voisins, détails.
 */
export function ObjetFiche({ item, below, above, count }: FicheProps) {
  const { price } = item;
  const tier = getTier(item.tier);
  const alt = altitudeOf(item.log_price);
  const back = item.is_hero && item.hero_order ? { href: `/#etage-${item.hero_order}`, label: "Retour à l'Ascension" } : { href: "/explorer", label: "Retour à l'Explorer" };
  const otherForDuel = item.slug === "baguette" ? "big-mac" : "baguette";
  const credit = item.image_author
    ? `${item.image_kind === "illustration" ? "Illustration générique" : item.image_kind === "cutout" ? "Photo détourée" : "Photo"} : ${item.image_author}, ${item.image_license}${item.image_kind === "illustration" ? "" : ", via Wikimedia Commons"}.`
    : null;
  // La mention « démo » figure déjà dans la ligne Source.
  const notes = price.notes?.replace("Donnée de démonstration non sourcée.", "").trim();

  const details: [string, string][] = [
    ["Type de prix", PRICE_TYPE_LABEL[price.price_type]],
    ["Unité", UNIT[price.unit]],
    ["Date du prix", formatObservedAt(price.observed_at)],
    ...(price.country ? ([["Pays", regionName(price.country)]] as [string, string][]) : []),
    ...(price.currency !== "EUR"
      ? ([["Prix d'origine", `${formatOriginal(price.value, price.currency)} (taux de démo ${price.fx_rate})`]] as [string, string][])
      : []),
    ["Fiabilité", `${price.confidence} · ${CONFIDENCE_LABEL[price.confidence]}`],
    ["Ordre de grandeur", formatSci(item.price_eur)],
    ["Source", item.status === "demo" ? "Aucune : donnée de démonstration à remplacer par un prix sourcé" : (price.source_url ?? "—")],
  ];

  return (
    <article data-tier={item.tier} className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-12 px-4 pb-24 pt-28 sm:px-5">
      <div className="flex flex-col gap-4">
        <Link href={back.href} className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden="true" strokeWidth={2} className="size-4" />
          {back.label}
        </Link>

        {/* Bloc principal : image cadrée + nom + prix */}
        <div className="panel grid gap-8 p-5 sm:p-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-10">
          <figure className="mx-auto flex w-full max-w-[420px] flex-col gap-2">
            <div className="price-card grid aspect-square w-full place-items-center overflow-hidden">
              {item.image_url &&
                (item.image_kind === "photo" ? (
                  <Image src={item.image_url} alt="" width={512} height={512} unoptimized priority className="size-full object-cover" />
                ) : (
                  <Image
                    src={item.image_url}
                    alt=""
                    width={512}
                    height={512}
                    unoptimized
                    priority
                    className={cn(
                      "object-contain drop-shadow-[0_24px_20px_rgb(11_18_32/0.3)]",
                      item.image_kind === "cutout" ? "size-[82%]" : "size-[70%]",
                    )}
                  />
                ))}
            </div>
            {credit && <figcaption className="text-[12px] leading-snug text-muted">{credit}</figcaption>}
          </figure>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <TierPill tier={item.tier} />
              <Link
                href={`/categorie/${item.category_id}`}
                className="inline-flex min-h-8 items-center rounded-full bg-elevated px-3 text-small font-medium text-muted ring-1 ring-line hover:text-ink"
              >
                {categoryName(item.category_id)}
              </Link>
            </div>
            <h1 className="text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-tight">{item.name_fr}</h1>
            <p className="price text-[clamp(3.2rem,9vw,6.5rem)] font-extrabold leading-none text-(--tier)">{formatPrice(item.price_eur)}</p>
            {item.status === "demo" && (
              <p className="text-small text-muted">
                <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-elevated font-semibold text-ink ring-1 ring-line" aria-hidden="true">
                  ≈
                </span>
                Prix de démonstration, non vérifié.
              </p>
            )}
            {item.short_desc_fr && <p className="text-lg">{item.short_desc_fr}</p>}
            <div className="mt-1 flex flex-wrap gap-2">
              <Link
                href={`/duel?a=${item.slug}&b=${otherForDuel}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-white"
              >
                <Swords aria-hidden="true" strokeWidth={2} className="size-4" />
                Comparer dans un duel
              </Link>
              <Link href="/budget" className="inline-flex h-12 items-center gap-2 rounded-full bg-surface px-5 font-semibold ring-1 ring-line">
                <Wallet aria-hidden="true" strokeWidth={2} className="size-4" />
                Mon budget
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Repères concrets */}
      <section aria-labelledby="reperes" className="flex flex-col gap-4">
        <h2 id="reperes" className="text-[26px] font-extrabold tracking-tight">
          Pour se représenter ce prix
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {equivalences(item.price_eur).map((t) => (
            <li key={t.key} className="panel flex items-center gap-4 p-4">
              <Thumb src={t.image} tier={3} size={64} />
              <span className="flex min-w-0 flex-col">
                <span className="price text-[22px] font-extrabold leading-tight text-brand-deep">{t.big}</span>
                <span className="font-medium leading-snug">{t.label}</span>
                <span className="text-[12px] text-muted">{t.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Place sur l'échelle */}
      <section aria-labelledby="position" className="flex flex-col gap-4">
        <h2 id="position" className="text-[26px] font-extrabold tracking-tight">
          Sa place sur l&apos;échelle
        </h2>
        <p className="text-lg">
          Plus cher que <strong className="price text-(--tier)">{item.percentile?.toLocaleString("fr-FR")} %</strong> des {count.toLocaleString("fr-FR")}{" "}
          objets de VERTIGE. Palier <strong className="text-(--tier)">{tier.name}</strong> ({tier.short}).
        </p>
        <div className="flex flex-col gap-2">
          <div className="relative h-4" role="img" aria-label={`Position sur l'échelle des prix : ${Math.round(alt * 100)} % de la hauteur`}>
            <div className="absolute inset-0 overflow-hidden rounded-full bg-line">
              {TIERS.map((t) => (
                <span
                  key={t.id}
                  className="absolute inset-y-0"
                  style={{
                    left: `${altitudeOf(t.logMin) * 100}%`,
                    width: `${(altitudeOf(t.logMax) - altitudeOf(t.logMin)) * 100}%`,
                    background: t.color,
                    opacity: t.id === item.tier ? 1 : 0.22,
                  }}
                />
              ))}
            </div>
            <span
              className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-ink shadow-[0_2px_8px_rgb(11_18_32/0.35)]"
              style={{ left: `${alt * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[12px] text-muted" aria-hidden="true">
            <span>0,00001 €</span>
            <span>1 €</span>
            <span>1 M€</span>
            <span>100 000 Md€</span>
          </div>
        </div>
      </section>

      {/* Voisins */}
      {(below.length > 0 || above.length > 0) && (
        <nav aria-labelledby="voisins" className="flex flex-col gap-4">
          <h2 id="voisins" className="text-[26px] font-extrabold tracking-tight">
            Au même prix, ou presque
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {(
              [
                ["Un peu moins cher", below],
                ["Un peu plus cher", above],
              ] as const
            ).map(([label, list]) =>
              list.length ? (
                <div key={label} className="flex flex-col gap-2">
                  <p className="font-semibold text-muted">{label}</p>
                  <ul className="flex flex-wrap gap-3 sm:gap-5">
                    {list.map((n) => (
                      <li key={n.slug}>
                        <PriceCard item={n} size="auto" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </nav>
      )}

      {/* Détails */}
      <section aria-labelledby="details" className="panel flex flex-col gap-4 p-5 sm:p-8">
        <h2 id="details" className="text-[22px] font-extrabold tracking-tight">
          D&apos;où vient ce prix
        </h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {details.map(([k, v]) => (
            <div key={k} className="flex flex-col border-b border-line pb-3">
              <dt className="text-small text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {notes && <p className="text-small text-muted">{notes}</p>}
        {credit && (
          <p className="text-small text-muted">
            {credit}
            {item.image_source_url && (
              <>
                {" "}
                <a href={item.image_source_url} className="underline underline-offset-2 hover:text-ink" rel="noopener noreferrer" target="_blank">
                  Voir la source
                </a>
              </>
            )}
          </p>
        )}
      </section>
    </article>
  );
}
