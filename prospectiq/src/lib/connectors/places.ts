// Connecteur Google Places API (New) — facultatif, activé par GOOGLE_PLACES_API_KEY.
// Fournit site, téléphone, note et nombre d'avis d'un établissement. Facturé à l'appel par Google :
// seuls les champs nécessaires sont demandés (FieldMask) et les résultats sont mis en cache 30 jours.
import 'server-only';
import { env, features } from '../env';
import { fetchJson } from '../apilog';
import { cached } from '../cache';
import type { Company, PlaceInfo } from './types';

const FIELDS = ['places.displayName', 'places.formattedAddress', 'places.websiteUri', 'places.nationalPhoneNumber', 'places.rating', 'places.userRatingCount', 'places.businessStatus', 'places.googleMapsUri'].join(',');

const words = (s: string) =>
  new Set(
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );

export function matchConfidence(company: Pick<Company, 'name' | 'tradeNames' | 'postalCode'>, placeName: string, placeAddress: string): PlaceInfo['matchConfidence'] | null {
  const target = words(placeName);
  const best = Math.max(
    ...[company.name, ...company.tradeNames].map((n) => {
      const w = words(n);
      if (!w.size || !target.size) return 0;
      const inter = [...w].filter((x) => target.has(x)).length;
      return inter / Math.min(w.size, target.size);
    }),
  );
  const samePostal = !!company.postalCode && placeAddress.includes(company.postalCode);
  if (best >= 0.8 && samePostal) return 'élevée';
  if (best >= 0.5 && samePostal) return 'moyenne';
  if (best >= 0.8) return 'faible';
  return null;
}

export async function lookupPlace(company: Company, orgId?: string | null): Promise<PlaceInfo | null> {
  if (!features.places()) return null;
  const checkedAt = new Date().toISOString();
  const textQuery = `${company.tradeNames[0] || company.name} ${company.postalCode || ''} ${company.city || ''}`.trim();
  try {
    const data = await cached(`places:${company.siren}`, 30 * 86400, () =>
      fetchJson<{ places?: Array<Record<string, any>> }>( // eslint-disable-line @typescript-eslint/no-explicit-any
        'google_places',
        'searchText',
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.googlePlacesKey, 'X-Goog-FieldMask': FIELDS },
          body: JSON.stringify({ textQuery, languageCode: 'fr', regionCode: 'FR', pageSize: 3 }),
        },
        orgId,
      ),
    );
    for (const p of data.places || []) {
      const conf = matchConfidence(company, p.displayName?.text || '', p.formattedAddress || '');
      if (!conf) continue;
      return {
        matched: true,
        name: p.displayName?.text,
        address: p.formattedAddress,
        website: p.websiteUri || null,
        phone: p.nationalPhoneNumber || null,
        rating: typeof p.rating === 'number' ? p.rating : null,
        reviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
        status: p.businessStatus || null,
        mapsUrl: p.googleMapsUri || null,
        matchConfidence: conf,
        checkedAt,
      };
    }
    return { matched: false, checkedAt };
  } catch (e) {
    return { matched: false, checkedAt, error: (e as Error).message };
  }
}
