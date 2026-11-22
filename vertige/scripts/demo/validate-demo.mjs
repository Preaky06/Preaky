#!/usr/bin/env node
/**
 * Vérifie le fichier de démo contre les règles du cahier des charges.
 * Usage : npm run demo:check   (code de sortie ≠ 0 en cas d'erreur)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = resolve(ROOT, "data/demo/ascension.demo.json");
const TODAY = new Date().toISOString().slice(0, 10);
const PRICE_TYPES = new Set(["retail_new", "retail_used", "auction_record", "estimate", "production_cost", "project_budget", "market_cap", "commodity_spot", "rental", "service_fee", "insured_value"]);
const UNITS = new Set(["piece", "kg", "l", "m2", "hour", "month", "year", "project"]);
const ISO_CURRENCY = /^[A-Z]{3}$/;

if (!existsSync(FILE)) {
  console.log("Aucune donnée de démo (fichier absent) — rien à vérifier.");
  process.exit(0);
}

const { items } = JSON.parse(readFileSync(FILE, "utf8"));
const errors = [];
const err = (slug, msg) => errors.push(`${slug}: ${msg}`);

for (const it of items) {
  const p = it.price;
  if (it.status !== "demo") err(it.slug, `status = ${it.status}, attendu "demo"`);
  if (p.confidence !== "C") err(it.slug, `confidence = ${p.confidence}, attendu "C"`);
  if (!(p.value > 0) || !(p.value_eur > 0)) err(it.slug, "prix ≤ 0");
  if (!ISO_CURRENCY.test(p.currency)) err(it.slug, `devise invalide ${p.currency}`);
  if (!PRICE_TYPES.has(p.price_type)) err(it.slug, `type de prix inconnu ${p.price_type}`);
  if (!UNITS.has(p.unit)) err(it.slug, `unité inconnue ${p.unit}`);
  if (!p.observed_at || p.observed_at > TODAY) err(it.slug, `date de relevé invalide ${p.observed_at}`);
  // Phrase de contexte obligatoire pour les vedettes de l'Ascension seulement.
  if (it.is_hero && !it.short_desc_fr) err(it.slug, "phrase de contexte manquante");
  if (!it.image_url) err(it.slug, "image manquante");
  if (Math.abs(Math.log10(it.price_eur) - it.log_price) > 1e-9) err(it.slug, "log_price incohérent");
}

const perTier = [1, 2, 3, 4, 5, 6, 7].map((t) => items.filter((i) => i.tier === t).length);
perTier.forEach((c, i) => c < 15 && errors.push(`palier ${i + 1} : ${c} objets (minimum 15)`));
const slugs = new Set(items.map((i) => i.slug));
if (slugs.size !== items.length) errors.push("slugs en double");

if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) :\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${items.length} objets de démo valides · ${perTier.map((c, i) => `P${i + 1}=${c}`).join(" · ")}`);
