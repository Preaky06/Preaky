import { sectorById } from './sectors';

/** Libellé lisible des paramètres d'une recherche. */
export function describeSearch(p: Record<string, unknown>) {
  const parts = [
    p.sector ? sectorById(String(p.sector))?.label : null,
    p.q ? `« ${p.q} »` : null,
    p.city || p.postalCode || (p.department ? `dép. ${p.department}` : null) || (p.region ? `région ${p.region}` : null),
    p.radiusKm ? `${p.radiusKm} km` : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Toutes entreprises';
}
