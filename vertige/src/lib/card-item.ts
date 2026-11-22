import type { TierId } from "./tiers";
import type { Confidence, ImageKind, ItemStatus, ItemWithPrice, PriceType } from "./types";

/** Forme minimale d'un objet pour les cartes (envoyée au client : ~120 octets par objet). */
export interface CardItem {
  slug: string;
  name: string;
  priceEur: number;
  log: number;
  tier: TierId;
  image: string | null;
  imageKind: ImageKind | null;
  confidence: Confidence;
  status: ItemStatus;
  priceType: PriceType;
  observedAt: string;
  category: string;
  country: string | null;
}

/** Champs lus par toCardItem (une fiche réduite de l'aperçu suffit). */
type CardSource = Pick<ItemWithPrice, "slug" | "name_fr" | "price_eur" | "log_price" | "tier" | "image_url" | "image_kind" | "status" | "category_id"> & {
  price: Pick<ItemWithPrice["price"], "confidence" | "price_type" | "observed_at" | "country">;
};

export const toCardItem = (i: CardSource): CardItem => ({
  slug: i.slug,
  name: i.name_fr,
  priceEur: i.price_eur,
  log: i.log_price,
  tier: i.tier,
  image: i.image_url,
  imageKind: i.image_kind,
  confidence: i.price.confidence,
  status: i.status,
  priceType: i.price.price_type,
  observedAt: i.price.observed_at,
  category: i.category_id,
  country: i.price.country,
});

/** Recherche tolérante aux accents et à la casse. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
