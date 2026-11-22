/**
 * Couche d'accès aux données.
 * Phase 1 : lit data/demo/ascension.demo.json (status = "demo").
 * Phase 2 : même signature, lecture Supabase (pagination par curseur price_eur + id).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import type { ItemWithPrice } from "../types";

const DEMO_FILE = path.join(process.cwd(), "data", "demo", "ascension.demo.json");

interface DemoFile {
  items: ItemWithPrice[];
}

async function loadDemo(): Promise<ItemWithPrice[]> {
  "use cache";
  cacheLife("max");
  try {
    const raw = await readFile(DEMO_FILE, "utf8");
    return (JSON.parse(raw) as DemoFile).items;
  } catch {
    // Données purgées (npm run demo:purge) : le site affiche un état vide.
    return [];
  }
}

/** Objets vedettes de l'Ascension, triés du moins cher au plus cher. */
export async function getHeroItems(): Promise<ItemWithPrice[]> {
  const items = await loadDemo();
  return items
    .filter((i) => i.is_hero)
    .sort((a, b) => (a.hero_order ?? 0) - (b.hero_order ?? 0));
}

export async function getItemBySlug(slug: string): Promise<ItemWithPrice | null> {
  const items = await loadDemo();
  return items.find((i) => i.slug === slug) ?? null;
}

export async function getAllSlugs(): Promise<string[]> {
  return (await loadDemo()).map((i) => i.slug);
}

export async function getCatalogStats(): Promise<{ count: number; categories: number }> {
  const items = await loadDemo();
  return { count: items.length, categories: new Set(items.map((i) => i.category_id)).size };
}

/** Voisins immédiats sur l'échelle (pour la fiche — étendu en Phase 3). */
export async function getNeighbours(slug: string, n = 1) {
  const items = await getHeroItems();
  const i = items.findIndex((it) => it.slug === slug);
  if (i < 0) return { below: [], above: [] };
  return { below: items.slice(Math.max(0, i - n), i).reverse(), above: items.slice(i + 1, i + 1 + n) };
}
