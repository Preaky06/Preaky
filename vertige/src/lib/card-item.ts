import type { TierId } from "./tiers";
import type { Confidence, ItemStatus, ItemWithPrice, PriceType } from "./types";

/** Forme minimale d'un objet pour les cartes (envoyée au client : ~120 octets par objet). */
export interface CardItem {
  slug: string;
  name: string;
  priceEur: number;
  log: number;
  tier: TierId;
  image: string | null;
  confidence: Confidence;
  status: ItemStatus;
  priceType: PriceType;
  observedAt: string;
}

export const toCardItem = (i: ItemWithPrice): CardItem => ({
  slug: i.slug,
  name: i.name_fr,
  priceEur: i.price_eur,
  log: i.log_price,
  tier: i.tier,
  image: i.image_url,
  confidence: i.price.confidence,
  status: i.status,
  priceType: i.price.price_type,
  observedAt: i.price.observed_at,
});

/** Recherche tolérante aux accents et à la casse. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
