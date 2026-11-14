// Connecteur API Géo (geo.api.gouv.fr) : communes, codes postaux, coordonnées. Gratuit, sans clé.
import 'server-only';
import { env } from '../env';
import { fetchJson } from '../apilog';
import { cached } from '../cache';

export interface Commune {
  nom: string;
  code: string;
  codesPostaux: string[];
  codeDepartement: string;
  codeRegion: string;
  lat: number | null;
  lon: number | null;
}

export async function findCommunes(term: string): Promise<Commune[]> {
  const t = term.trim();
  if (t.length < 2) return [];
  const params = new URLSearchParams({ fields: 'nom,code,codesPostaux,centre,codeDepartement,codeRegion', limit: '8', boost: 'population' });
  if (/^\d{5}$/.test(t)) params.set('codePostal', t);
  else params.set('nom', t);
  const rows = await cached(`geo:${params}`, 30 * 86400, () =>
    fetchJson<Array<{ nom: string; code: string; codesPostaux: string[]; codeDepartement: string; codeRegion: string; centre?: { coordinates: [number, number] } }>>('geo', 'communes', `${env.geoApi}/communes?${params}`, { timeoutMs: 5000 }),
  );
  return rows.map((r) => ({ nom: r.nom, code: r.code, codesPostaux: r.codesPostaux || [], codeDepartement: r.codeDepartement, codeRegion: r.codeRegion, lon: r.centre?.coordinates?.[0] ?? null, lat: r.centre?.coordinates?.[1] ?? null }));
}
