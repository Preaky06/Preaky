import { normalize } from "./card-item";

/**
 * Recherche tolérante aux fautes de frappe, côté client (Phase 1, quelques centaines d'objets).
 * Un mot de la requête correspond si un mot du nom le contient, ou s'il lui ressemble
 * (coefficient de Dice sur les bigrammes ≥ 0,55). Phase 2 : pg_trgm côté Postgres.
 */
const bigrams = (w: string) => {
  const s = new Set<string>();
  for (let i = 0; i < w.length - 1; i++) s.add(w.slice(i, i + 2));
  return s;
};

const dice = (a: string, b: string) => {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
};

const words = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);

/** Score > 0 si le nom correspond à la requête (plus haut = plus pertinent). */
export function matchScore(name: string, query: string): number {
  const q = words(query);
  if (!q.length) return 1;
  const n = words(name);
  let score = 0;
  for (const qw of q) {
    let best = 0;
    for (const nw of n) {
      if (nw.startsWith(qw)) best = Math.max(best, 3);
      else if (nw.includes(qw)) best = Math.max(best, 2);
      else if (qw.length >= 4) {
        const d = dice(qw, nw);
        if (d >= 0.55) best = Math.max(best, d);
      }
    }
    if (best === 0) return 0;
    score += best;
  }
  return score;
}
