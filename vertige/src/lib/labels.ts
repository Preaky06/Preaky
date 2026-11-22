import type { Confidence, PriceType, PriceUnit } from "./types";

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  retail_new: "Prix neuf en magasin",
  retail_used: "Prix d'occasion",
  auction_record: "Record d'enchère",
  estimate: "Estimation",
  production_cost: "Coût de production",
  project_budget: "Budget de projet",
  market_cap: "Valeur en bourse",
  commodity_spot: "Cours au comptant",
  rental: "Location",
  service_fee: "Tarif de service",
  insured_value: "Valeur d'assurance",
};

export const UNIT_LABEL: Record<PriceUnit, string> = {
  piece: "l'unité",
  kg: "le kg",
  l: "le litre",
  m2: "le m²",
  hour: "l'heure",
  month: "par mois",
  year: "par an",
  project: "le projet",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  A: "Source primaire",
  B: "Source secondaire fiable",
  C: "Estimation à vérifier",
};

/** Nom de pays en français à partir du code ISO (EU = Union européenne). */
export const regionName = (() => {
  try {
    const dn = new Intl.DisplayNames(["fr"], { type: "region" });
    return (code: string) => (code === "EU" ? "Union européenne" : (dn.of(code) ?? code));
  } catch {
    return (code: string) => code;
  }
})();
