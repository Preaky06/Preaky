/**
 * Affichage des prix (section 11) — format fr-FR.
 *   0,00004 € · 1 299 € · 4,2 M€ · 1,9 Md€ · 110 000 Md€
 * Sous 0,01 € : 3 chiffres significatifs.
 */

export type PriceSuffix = "€" | "M€" | "Md€";
export interface PriceParts {
  number: string;
  suffix: PriceSuffix;
}

const NBSP = " ";
const formatters = new Map<string, Intl.NumberFormat>();

function nf(opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(opts);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("fr-FR", opts);
    formatters.set(key, f);
  }
  return f;
}

/** 3 chiffres significatifs, au moins 2 décimales (0,015 · 0,25 · 0,20). */
function smallNumber(eur: number): string {
  const s = nf({ maximumSignificantDigits: 3 }).format(eur);
  if (eur < 0.01) return s;
  const [int, frac = ""] = s.split(",");
  return `${int},${frac.padEnd(2, "0")}`;
}

function unitNumber(eur: number): string {
  const isInt = Math.abs(eur - Math.round(eur)) < 0.005;
  return isInt
    ? nf({ maximumFractionDigits: 0 }).format(eur)
    : nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(eur);
}

function scaled(v: number): string {
  return nf({ maximumFractionDigits: v < 100 ? 1 : 0 }).format(v);
}

/** Format abrégé : € / M€ / Md€. */
export function priceParts(eur: number): PriceParts {
  if (!(eur > 0) || !Number.isFinite(eur)) return { number: "0", suffix: "€" };
  if (eur < 1) return { number: smallNumber(eur), suffix: "€" };
  if (eur < 100) return { number: unitNumber(eur), suffix: "€" };
  if (eur < 1e6) return { number: nf({ maximumFractionDigits: 0 }).format(eur), suffix: "€" };
  if (eur < 1e9) return { number: scaled(eur / 1e6), suffix: "M€" };
  return { number: scaled(eur / 1e9), suffix: "Md€" };
}

export function formatPrice(eur: number): string {
  const { number, suffix } = priceParts(eur);
  return `${number}${NBSP}${suffix}`;
}

/** Format développé (compteur d'accueil) : 99 999 999 999 999 €. */
export function priceFullParts(eur: number): PriceParts {
  if (!(eur > 0) || !Number.isFinite(eur)) return { number: "0", suffix: "€" };
  if (eur < 1) return { number: smallNumber(eur), suffix: "€" };
  if (eur < 100) return { number: unitNumber(eur), suffix: "€" };
  return { number: nf({ maximumFractionDigits: 0 }).format(eur), suffix: "€" };
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export const superscript = (n: number) =>
  String(n)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");

/** 10ⁿ seul (graduations). */
export const powerOfTen = (exp: number) => `10${superscript(exp)}`;

/** Notation scientifique : 4,2 × 10⁶ €. */
export function formatSci(eur: number): string {
  if (!(eur > 0)) return "0 €";
  let exp = Math.floor(Math.log10(eur));
  let mantissa = eur / 10 ** exp;
  if (mantissa >= 9.95) {
    exp += 1;
    mantissa /= 10;
  }
  return `${nf({ maximumFractionDigits: 1 }).format(mantissa)}${NBSP}×${NBSP}10${superscript(exp)}${NBSP}€`;
}

function currencySymbol(currency: string): string {
  const part = nf({ style: "currency", currency, currencyDisplay: "symbol" })
    .formatToParts(1)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

/** Prix dans sa devise d'origine, abrégé : 450,3 M$US · 31 M CHF. */
export function formatOriginal(value: number, currency: string): string {
  if (currency === "EUR") return formatPrice(value);
  const symbol = currencySymbol(currency);
  const sep = /^[A-Za-z]+$/.test(symbol) ? NBSP : "";
  if (value >= 1e9) return `${scaled(value / 1e9)}${NBSP}Md${sep}${symbol}`;
  if (value >= 1e6) return `${scaled(value / 1e6)}${NBSP}M${sep}${symbol}`;
  const n = value < 1 ? smallNumber(value) : value < 100 ? unitNumber(value) : nf({ maximumFractionDigits: 0 }).format(value);
  return `${n}${NBSP}${symbol}`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });

/** Date de relevé : « nov. 2017 ». */
export function formatObservedAt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

/** Rapport entre deux prix : ×3,2 · ×120 · ×12 000 · ×4,1 × 10⁷. */
export function formatRatio(r: number): string {
  if (!(r > 0)) return "×0";
  if (r < 10) return `×${nf({ maximumFractionDigits: 1 }).format(r)}`;
  if (r < 1e6) return `×${nf({ maximumFractionDigits: 0 }).format(r)}`;
  const exp = Math.floor(Math.log10(r));
  return `×${nf({ maximumFractionDigits: 1 }).format(r / 10 ** exp)}${NBSP}×${NBSP}10${superscript(exp)}`;
}

export const formatInt = (n: number) => nf({ maximumFractionDigits: 0 }).format(n);
