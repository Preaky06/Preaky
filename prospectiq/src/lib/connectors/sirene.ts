// Connecteur « API Recherche d'entreprises » (data.gouv.fr) : données SIRENE (INSEE) et RNE (INPI).
// Gratuit, sans clé, limité à 7 requêtes par seconde et par adresse IP.
import 'server-only';
import { env } from '../env';
import { fetchJson } from '../apilog';
import { cached } from '../cache';
import { q } from '../db';
import { EMPLOYEE_RANGES, NAF_LABELS, NAF_SECTIONS, SIZES, sectorById, sectorOfNaf } from '../sectors';
import type { Company, SearchParams, SearchResult } from './types';

const SOURCE = 'SIRENE / RNE (API Recherche d’entreprises)';

const LEGAL_FORMS: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '5499': 'SARL',
  '5498': 'EURL',
  '5710': 'SAS',
  '5720': 'SASU',
  '5599': 'SA à conseil d’administration',
  '5699': 'SA à directoire',
  '5202': 'Société en nom collectif',
  '6540': 'Société civile immobilière',
  '6599': 'Société civile',
  '5485': 'SELARL',
  '5785': 'SELAS',
  '9220': 'Association déclarée',
  '5308': 'Société en commandite',
};

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function titleName(nom: string, prenoms: string) {
  const first = String(prenoms || '').split(/\s+/)[0] || '';
  const clean = String(nom || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const cap = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
  return `${cap(first)} ${cap(clean)}`.trim();
}

export function normalizeCompany(r: Raw, fetchedAt = new Date().toISOString()): Company {
  const s: Raw = r.siege || {};
  const m: Raw | undefined = (r.matching_etablissements || []).find((e: Raw) => e.etat_administratif !== 'F') || (r.matching_etablissements || [])[0];
  const loc = m && m.siret && m.siret !== s.siret ? m : null;
  const naf = r.activite_principale || s.activite_principale || null;
  const section = r.section_activite_principale || null;
  const years = Object.keys(r.finances || {}).sort();
  const lastYear = years[years.length - 1];
  const fin = lastYear ? r.finances[lastYear] : null;
  const c: Raw = r.complements || {};
  const labels = [
    c.est_rge && 'RGE',
    c.est_qualiopi && 'Qualiopi',
    c.est_bio && 'Agriculture biologique',
    c.est_ess && 'ESS',
    c.est_patrimoine_vivant && 'Entreprise du patrimoine vivant',
    c.est_societe_mission && 'Société à mission',
    c.est_organisme_formation && 'Organisme de formation',
  ].filter(Boolean) as string[];
  const tradeNames = [...new Set([...(s.liste_enseignes || []), s.nom_commercial, ...(loc?.liste_enseignes || []), loc?.nom_commercial].filter(Boolean).map((x: string) => String(x).trim()))];
  const range = r.tranche_effectif_salarie || null;
  const sector = sectorOfNaf(naf, section);
  return {
    siren: String(r.siren),
    siret: (loc?.siret || s.siret || null) as string | null,
    name: String(r.nom_complet || r.nom_raison_sociale || 'Entreprise sans dénomination'),
    tradeNames,
    naf,
    nafLabel: (naf && NAF_LABELS[naf]) || (section ? NAF_SECTIONS[section] || null : null),
    section,
    sectorId: sector?.id || null,
    legalForm: LEGAL_FORMS[String(r.nature_juridique)] || (r.nature_juridique ? `Forme juridique ${r.nature_juridique}` : null),
    category: r.categorie_entreprise || null,
    employeesRange: range,
    employeesLabel: range ? EMPLOYEE_RANGES[range]?.label || null : null,
    employeesYear: r.annee_tranche_effectif_salarie || null,
    createdOn: r.date_creation || null,
    active: r.etat_administratif !== 'C',
    establishments: num(r.nombre_etablissements_ouverts),
    address: s.adresse || null,
    postalCode: (loc?.code_postal || s.code_postal || null) as string | null,
    city: (loc?.libelle_commune || s.libelle_commune || null) as string | null,
    department: (loc?.departement || s.departement || null) as string | null,
    region: (loc?.region || s.region || null) as string | null,
    lat: num(loc?.latitude ?? s.latitude),
    lon: num(loc?.longitude ?? s.longitude),
    localAddress: loc?.adresse || null,
    finances: fin ? { year: lastYear, revenue: num(fin.ca), netIncome: num(fin.resultat_net) } : null,
    // Minimisation : nom et qualité uniquement, jamais la date de naissance.
    directors: (r.dirigeants || []).slice(0, 4).map((d: Raw) =>
      d.type_dirigeant === 'personne morale' ? { name: String(d.denomination || 'Personne morale'), role: d.qualite || null } : { name: titleName(d.nom, d.prenoms), role: d.qualite || null },
    ),
    labels,
    optOut: r.opposition_diffusion_commerciale === true,
    isIndividual: c.est_entrepreneur_individuel === true,
    updatedAt: r.date_mise_a_jour || r.date_mise_a_jour_insee || null,
    source: { name: SOURCE, url: `https://annuaire-entreprises.data.gouv.fr/entreprise/${r.siren}`, fetchedAt },
  };
}

const INCLUDE = 'siege,complements,finances,dirigeants,matching_etablissements';

export function buildQuery(p: SearchParams): { path: string; query: URLSearchParams; postFilterSizes: string[] | null } {
  const query = new URLSearchParams();
  const sector = p.sector ? sectorById(p.sector) : null;
  const nafCodes = p.naf ? [p.naf] : sector?.naf || [];
  const ranges = (p.sizes || []).flatMap((id) => SIZES.find((s) => s.id === id)?.ranges || []);
  query.set('per_page', '25');
  query.set('page', String(Math.max(1, Math.min(p.page || 1, 400))));
  query.set('minimal', 'true');
  query.set('include', INCLUDE);
  query.set('limite_matching_etablissements', '1');
  if (nafCodes.length) query.set('activite_principale', nafCodes.join(','));
  else if (sector?.sections?.length) query.set('section_activite_principale', sector.sections.join(','));

  if (p.lat != null && p.lon != null && p.radiusKm) {
    query.set('lat', String(p.lat));
    query.set('long', String(p.lon));
    query.set('radius', String(Math.min(50, Math.max(0.5, p.radiusKm))));
    // /near_point ne filtre pas l'effectif : filtrage appliqué après réception
    return { path: '/near_point', query, postFilterSizes: ranges.length ? ranges : null };
  }
  if (p.q?.trim()) query.set('q', p.q.trim().slice(0, 120));
  if (p.cityCode) query.set('code_commune', p.cityCode);
  else if (p.postalCode) query.set('code_postal', p.postalCode.replace(/\s/g, ''));
  else if (p.department) query.set('departement', p.department);
  else if (p.region) query.set('region', p.region);
  if (ranges.length) query.set('tranche_effectif_salarie', ranges.join(','));
  if (p.excludeLarge) query.set('categorie_entreprise', 'PME');
  query.set('etat_administratif', 'A');
  return { path: '/search', query, postFilterSizes: null };
}

export async function searchCompanies(p: SearchParams, orgId?: string | null): Promise<SearchResult> {
  const { path, query, postFilterSizes } = buildQuery(p);
  const url = `${env.sireneApi}${path}?${query}`;
  // Le cache ne contient que les données normalisées et minimisées (jamais les dates de naissance).
  const data = await cached(`sirene:${path}?${query}`, 6 * 3600, async () => {
    const raw = await fetchJson<{ results: Raw[]; total_results: number; page: number; total_pages: number }>('sirene', path, url, { timeoutMs: 12000 }, orgId);
    const fetchedAt = new Date().toISOString();
    return { companies: (raw.results || []).map((r) => normalizeCompany(r, fetchedAt)), total_results: raw.total_results, page: raw.page, total_pages: raw.total_pages };
  });
  const all = data.companies;
  const suppressed = new Set((await q<{ siren: string }>('select siren from suppressions where siren is not null')).map((r) => r.siren));
  const excluded = { optOut: 0, suppressed: 0, inactive: 0 };
  const companies = all.filter((c) => {
    if (c.optOut) return excluded.optOut++, false;
    if (suppressed.has(c.siren)) return excluded.suppressed++, false;
    if (!c.active) return excluded.inactive++, false;
    if (postFilterSizes && !(c.employeesRange && postFilterSizes.includes(c.employeesRange))) return false;
    if (p.excludeLarge && (c.category === 'GE' || c.category === 'ETI')) return false;
    return true;
  });
  return { companies, total: data.total_results || 0, page: data.page || 1, totalPages: data.total_pages || 0, excluded, source: SOURCE };
}

/** Fiche complète d'une entreprise par SIREN (cache 7 jours). */
export async function getCompany(siren: string, orgId?: string | null): Promise<Company | null> {
  if (!/^\d{9}$/.test(siren)) return null;
  const query = new URLSearchParams({ q: siren, minimal: 'true', include: INCLUDE, per_page: '1' });
  return cached(`sirene:company:${siren}`, 7 * 86400, async () => {
    const data = await fetchJson<{ results: Raw[] }>('sirene', '/search (siren)', `${env.sireneApi}/search?${query}`, {}, orgId);
    const r = (data.results || []).find((x) => String(x.siren) === siren);
    return r ? normalizeCompany(r) : null;
  });
}
