/**
 * Unités de référence (table `reference_units` du modèle, section 7).
 * Phase 1 : valeurs de démonstration non sourcées (fiabilité C). Elles servent aux préréglages du
 * Budget et, en Phase 3, aux équivalences des fiches. Aucune de ces valeurs n'est écrite ailleurs.
 */
export interface ReferenceUnit {
  id: string;
  label_fr: string;
  /** Forme plurielle courte pour « N × … » */
  plural_fr: string;
  value_eur: number;
  unit: "piece" | "month" | "hour" | "year";
  /** Illustration (Fluent Emoji 3D, MIT) */
  image: string;
  source_url: string | null;
  updated_at: string;
  status: "demo";
}

export const REFERENCE_UNITS: readonly ReferenceUnit[] = [
  { id: "smic-mensuel-net", image: "/objets/1f4b6.webp", label_fr: "SMIC mensuel net", plural_fr: "mois de SMIC", value_eur: 1443, unit: "month", source_url: null, updated_at: "2026-11-22", status: "demo" },
  { id: "smic-horaire-brut", image: "/objets/23f1.webp", label_fr: "Heure de SMIC (brut)", plural_fr: "heures de SMIC", value_eur: 11.88, unit: "hour", source_url: null, updated_at: "2026-11-22", status: "demo" },
  { id: "baguette", image: "/objets/1f956.webp", label_fr: "Baguette", plural_fr: "baguettes", value_eur: 1.05, unit: "piece", source_url: null, updated_at: "2026-11-22", status: "demo" },
  { id: "big-mac", image: "/objets/1f354.webp", label_fr: "Big Mac", plural_fr: "Big Mac", value_eur: 5.8, unit: "piece", source_url: null, updated_at: "2026-11-22", status: "demo" },
  { id: "netflix-an", image: "/objets/1f4fa.webp", label_fr: "Année de Netflix avec pub", plural_fr: "années de Netflix", value_eur: 95.88, unit: "year", source_url: null, updated_at: "2026-11-22", status: "demo" },
  { id: "iphone", image: "/objets/1f4f1.webp", label_fr: "iPhone 17 Pro", plural_fr: "iPhone 17 Pro", value_eur: 1329, unit: "piece", source_url: null, updated_at: "2026-11-22", status: "demo" },
] as const;

export const referenceUnit = (id: string) => REFERENCE_UNITS.find((u) => u.id === id);
