#!/usr/bin/env node
/**
 * Supprime TOUTES les données de démo, en une commande : npm run demo:purge
 *
 * Phase 1 : supprime data/demo/ascension.demo.json (le site affiche alors un état vide).
 * Phase 2 : exécutera aussi `DELETE FROM items WHERE status = 'demo'` sur Supabase.
 * Pour régénérer : npm run demo:build
 */
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = resolve(ROOT, "data/demo/ascension.demo.json");

if (existsSync(FILE)) {
  rmSync(FILE);
  console.log("✓ Données de démo supprimées (data/demo/ascension.demo.json).");
} else {
  console.log("Aucune donnée de démo à supprimer.");
}
