#!/usr/bin/env node
/**
 * Génère data/demo/ascension.demo.json à partir de scripts/demo/source.mjs.
 * Usage : npm run demo:build
 *
 * Tous les objets sortent avec status = "demo" et confidence = "C".
 * Les taux de change ci-dessous sont des moyennes annuelles APPROXIMATIVES,
 * propres à la démo. En Phase 2, la conversion passe par les taux BCE (Frankfurter)
 * à la date exacte du relevé.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { codepoints, DEMO_IMAGES, IMAGE_AUTHOR, IMAGE_LICENSE } from "./images.mjs";
import { DEMO_ROWS } from "./source.mjs";
import { DEMO_ROWS_EXTRA } from "./source-extra.mjs";
import { DEMO_CATALOG } from "./source-catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "data/demo/ascension.demo.json");
const DEMO_DATE = "2026-11-22";

/**
 * Photos réelles (Wikimedia Commons, licences libres) : scripts/demo/photos.json, produit par
 * scripts/demo/photos/ (recherche Wikidata, détourage). Une entrée par objet illustré ;
 * les autres gardent l'illustration 3D générique.
 */
const PHOTOS_FILE = resolve(ROOT, "scripts/demo/photos.json");
const PHOTOS = existsSync(PHOTOS_FILE) ? JSON.parse(readFileSync(PHOTOS_FILE, "utf8")) : {};

/** 1 unité de devise = x EUR. Approximations de démo, à remplacer par la BCE. */
const DEMO_FX = {
  USD: { 2006: 0.797, 2008: 0.683, 2009: 0.72, 2010: 0.755, 2011: 0.719, 2012: 0.778, 2013: 0.753, 2014: 0.754, 2015: 0.902, 2016: 0.904, 2017: 0.887, 2018: 0.847, 2019: 0.893, 2020: 0.877, 2021: 0.846, 2022: 0.951, 2023: 0.925, 2024: 0.924, 2025: 0.885, 2026: 0.86 },
  CHF: { 2019: 0.899 },
  GBP: { 2019: 1.14, 2021: 1.16, 2022: 1.17, 2023: 1.15, 2024: 1.18 },
};

const uuidFrom = (seed) => {
  const h = createHash("sha1").update(`vertige-demo:${seed}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/₂/g, "2")
    .toLowerCase()
    .replace(/^(un|une|des|le|la|les)\s+/, "")
    .replace(/^l'/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const tierOf = (eur) =>
  eur < 0.01 ? 1 : eur < 1 ? 2 : eur < 100 ? 3 : eur < 1e4 ? 4 : eur < 1e6 ? 5 : eur < 1e9 ? 6 : 7;

function fxRate(currency, year) {
  if (currency === "EUR") return 1;
  const table = DEMO_FX[currency];
  if (!table) throw new Error(`Devise sans taux de démo : ${currency}`);
  const rate = table[year];
  if (!rate) throw new Error(`Pas de taux de démo ${currency} pour ${year}`);
  return rate;
}

// Lignes « vedettes » (Ascension), lignes supplémentaires (emoji en 10e colonne), puis catalogue compact (sans phrase).
const rows = [
  ...DEMO_ROWS.map((r) => ({ r, hero: true, emoji: null })),
  ...DEMO_ROWS_EXTRA.map((r) => ({ r: [...r.slice(0, 9), ...r.slice(10)], hero: false, emoji: r[9] })),
  ...DEMO_CATALOG.map((c) => ({
    r: [c.name, c.cat, c.sub, c.value, c.cur, c.type, c.unit, c.date, c.country, null, c.notes],
    hero: false,
    emoji: c.emoji,
  })),
];

const seen = new Set();
const items = rows.map(({ r: row, hero, emoji: rowEmoji }) => {
  const [name, category, subcategory, value, currency, priceType, unit, month, country, blurb, notes = null] = row;
  const slug = slugify(name);
  const emoji = rowEmoji ?? DEMO_IMAGES[slug] ?? null;
  if (seen.has(slug)) throw new Error(`Slug en double : ${slug}`);
  seen.add(slug);
  const observedAt = `${month}-01`;
  const year = Number(month.slice(0, 4));
  const rate = fxRate(currency, year);
  const valueEur = Number((value * rate).toPrecision(6));
  const id = uuidFrom(slug);
  const priceId = uuidFrom(`${slug}:price`);
  return {
    id,
    slug,
    name_fr: name,
    name_en: null,
    short_desc_fr: blurb,
    long_desc_fr: null,
    category_id: category,
    subcategory_id: subcategory,
    tags: ["demo"],
    price_eur: valueEur,
    log_price: Math.log10(valueEur),
    tier: tierOf(valueEur),
    price_rank: null,
    percentile: null,
    primary_price_id: priceId,
    is_hero: hero,
    hero_order: null,
    ...(PHOTOS[slug] && existsSync(resolve(ROOT, `public/objets/photos/${slug}.webp`))
      ? {
          image_url: `/objets/photos/${slug}.webp`,
          image_kind: PHOTOS[slug].kind,
          image_license: PHOTOS[slug].license,
          image_author: PHOTOS[slug].author,
          image_source_url: PHOTOS[slug].source_url,
        }
      : {
          image_url: emoji ? `/objets/${codepoints(emoji, false)}.webp` : null,
          image_kind: emoji ? "illustration" : null,
          image_license: emoji ? IMAGE_LICENSE : null,
          image_author: emoji ? IMAGE_AUTHOR : null,
          image_source_url: null,
        }),
    popularity: 0,
    status: "demo",
    created_at: `${DEMO_DATE}T00:00:00Z`,
    updated_at: `${DEMO_DATE}T00:00:00Z`,
    price: {
      id: priceId,
      item_id: id,
      value,
      currency,
      value_eur: valueEur,
      fx_rate: rate,
      fx_date: currency === "EUR" ? null : `${year}-01-01`,
      price_type: priceType,
      unit,
      quantity: 1,
      country,
      observed_at: observedAt,
      source_id: null,
      source_url: null,
      confidence: "C",
      notes: ["Donnée de démonstration non sourcée.", notes, currency !== "EUR" ? "Conversion avec un taux de démo approximatif." : null]
        .filter(Boolean)
        .join(" "),
    },
  };
});

items.sort((a, b) => a.price_eur - b.price_eur || a.slug.localeCompare(b.slug));
const n = items.length;
let heroOrder = 0;
items.forEach((item, i) => {
  item.hero_order = item.is_hero ? ++heroOrder : null;
  item.price_rank = i + 1;
  item.percentile = n > 1 ? Number(((i / (n - 1)) * 100).toFixed(1)) : 100;
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ generated_at: DEMO_DATE, status: "demo", count: n, items }, null, 1) + "\n",
);

const perTier = [1, 2, 3, 4, 5, 6, 7].map((t) => items.filter((i) => i.tier === t).length);
console.log(`✓ ${n} objets de démo (${heroOrder} vedettes de l'Ascension) → ${OUT.replace(ROOT + "/", "")}`);
console.log(`  par palier : ${perTier.map((c, i) => `P${i + 1}=${c}`).join(" · ")}`);
const kinds = items.reduce((m, i) => ((m[i.image_kind] = (m[i.image_kind] ?? 0) + 1), m), {});
console.log(`  images : ${Object.entries(kinds).map(([k, c]) => `${k}=${c}`).join(" · ")}`);
