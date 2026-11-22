import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjetFiche } from "@/components/objet/ObjetFiche";
import { toCardItem } from "@/lib/card-item";
import { getAllSlugs, getCatalogStats, getItemBySlug, getNeighbours } from "@/lib/data/items";
import { formatPrice } from "@/lib/format";

/** Fiche objet. Phase 3 : compteur animé, image de partage, schema.org. */
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
    description: item.short_desc_fr ?? `${item.name_fr} : ${formatPrice(item.price_eur)} sur l'échelle de VERTIGE.`,
    // Données de démonstration : jamais indexées.
    robots: item.status === "published" ? undefined : { index: false },
  };
}

export default async function ObjetPage({ params }: PageProps<"/objet/[slug]">) {
  const { slug } = await params;
  const item = await getItemBySlug(slug);
  if (!item) notFound();
  const [{ below, above }, stats] = await Promise.all([getNeighbours(slug, 2), getCatalogStats()]);
  return <ObjetFiche item={item} below={below.map(toCardItem)} above={above.map(toCardItem)} count={stats.count} />;
}
