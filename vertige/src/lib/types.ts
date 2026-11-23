/**
 * Types alignés sur le modèle Postgres (section 7 du cahier des charges).
 * Phase 1 : les données viennent d'un fichier de démo ; Phase 2 : de Supabase,
 * avec exactement ces formes.
 */
import type { TierId } from "./tiers";

export type ItemStatus = "demo" | "fake" | "draft" | "published" | "flagged";

export const PRICE_TYPES = [
  "retail_new",
  "retail_used",
  "auction_record",
  "estimate",
  "production_cost",
  "project_budget",
  "market_cap",
  "commodity_spot",
  "rental",
  "service_fee",
  "insured_value",
] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const PRICE_UNITS = ["piece", "kg", "l", "m2", "hour", "month", "year", "project"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export type Confidence = "A" | "B" | "C";

export interface Price {
  id: string;
  item_id: string;
  value: number;
  /** ISO 4217 */
  currency: string;
  value_eur: number;
  fx_rate: number;
  fx_date: string | null;
  price_type: PriceType;
  unit: PriceUnit;
  quantity: number;
  /** ISO 3166-1 alpha-2 */
  country: string | null;
  /** Date du relevé, ISO yyyy-mm-dd */
  observed_at: string;
  source_id: string | null;
  source_url: string | null;
  confidence: Confidence;
  notes: string | null;
}

export type ImageKind = "illustration" | "cutout" | "photo" | "emblem";

export interface Item {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  short_desc_fr: string | null;
  long_desc_fr: string | null;
  category_id: string;
  subcategory_id: string;
  tags: string[];
  price_eur: number;
  log_price: number;
  tier: TierId;
  price_rank: number | null;
  percentile: number | null;
  primary_price_id: string;
  is_hero: boolean;
  hero_order: number | null;
  image_url: string | null;
  /** illustration : visuel 3D générique · cutout : photo détourée · photo : photo encadrée · emblem : logo ou drapeau, entier sur fond blanc */
  image_kind: ImageKind | null;
  /** Grande version (fiche) quand elle existe */
  image_url_large: string | null;
  /** Illustration 3D affichée si la photo ne charge pas */
  image_fallback_url: string | null;
  image_license: string | null;
  image_author: string | null;
  /** Page de la source (ex. fichier Wikimedia Commons) */
  image_source_url: string | null;
  popularity: number;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

/** Objet + son prix principal, forme utilisée par l'interface. */
export interface ItemWithPrice extends Item {
  price: Price;
}
