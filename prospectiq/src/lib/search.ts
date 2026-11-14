// Recherche de prospects : SIRENE + signaux BODACC + score préliminaire + état dans le portefeuille.
import 'server-only';
import { z } from 'zod';
import { q, json } from './db';
import { searchCompanies } from './connectors/sirene';
import { bodaccSignals } from './connectors/bodacc';
import { scoreCompany, type ScoreResult } from './scoring';
import { orgSettings } from './analysis';
import type { Company, PlaceInfo, SearchParams, Signal, WebsiteAudit } from './connectors/types';

export const SearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  sector: z.string().max(40).optional(),
  region: z.string().max(3).optional(),
  department: z.string().max(3).optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal à 5 chiffres.').optional().or(z.literal('')),
  city: z.string().max(80).optional(),
  cityCode: z.string().max(5).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(0).max(50).optional(),
  sizes: z.array(z.string().max(20)).max(5).optional(),
  excludeLarge: z.boolean().optional(),
  page: z.number().int().min(1).max(400).optional(),
  // Filtres appliqués après réception (données disponibles sans analyse)
  minEstablishments: z.number().int().min(0).max(1000).optional(),
  signals: z.array(z.enum(['recent_creation', 'recent_change', 'no_risk'])).max(3).optional(),
  hideInPortfolio: z.boolean().optional(),
});
export type SearchInput = z.infer<typeof SearchSchema>;

export interface RowFacts {
  websiteStatus: string | null;
  websiteUrl: string | null;
  findings: string[];
  socials: string[];
  rating: number | null;
  reviews: number | null;
}

export interface ResultRow {
  company: Company;
  score: ScoreResult;
  analyzed: boolean;
  signals: Signal[];
  facts: RowFacts | null;
  prospect: { id: string; status: string; favorite: boolean } | null;
}

export async function runSearch(orgId: string, userId: string | null, input: SearchInput, { record = true } = {}) {
  const params: SearchParams = { ...input, postalCode: input.postalCode || undefined };
  const res = await searchCompanies(params, orgId);
  const sirens = res.companies.map((c) => c.siren);
  let signals: Record<string, Signal[]> | null = null;
  try {
    signals = await bodaccSignals(sirens, orgId);
  } catch {
    signals = null; // BODACC indisponible : le critère « signaux » sera marqué non évalué
  }
  const { offer, weights } = await orgSettings(orgId);
  const stored = sirens.length
    ? await q<{ siren: string; breakdown: ScoreResult }>('select siren, breakdown from analyses where org_id = $1 and siren = any($2::text[])', [orgId, sirens])
    : [];
  const prospects = sirens.length
    ? await q<{ id: string; siren: string; status: string; favorite: boolean }>('select id, siren, status, favorite from prospects where org_id = $1 and siren = any($2::text[])', [orgId, sirens])
    : [];
  const enrich = stored.length
    ? await q<{ siren: string; website: WebsiteAudit | null; places: PlaceInfo | null }>('select siren, website, places from company_enrichments where siren = any($1::text[])', [stored.map((s) => s.siren)])
    : [];
  const factsBy = new Map(
    enrich.map((e) => [
      e.siren,
      {
        websiteStatus: e.website?.status || null,
        websiteUrl: e.website?.url || null,
        findings: (e.website?.findings || []).map((f) => f.id),
        socials: Object.keys(e.website?.socials || {}),
        rating: e.places?.matched ? (e.places.rating ?? null) : null,
        reviews: e.places?.matched ? (e.places.reviews ?? null) : null,
      } satisfies RowFacts,
    ]),
  );
  const storedBy = new Map(stored.map((s) => [s.siren, s.breakdown]));
  const prospectBy = new Map(prospects.map((p) => [p.siren, p]));
  const now = Date.now();
  let rows: ResultRow[] = res.companies.map((company) => {
    const sig = signals ? signals[company.siren] || [] : null;
    const saved = storedBy.get(company.siren);
    return {
      company,
      signals: sig || [],
      analyzed: !!saved,
      facts: factsBy.get(company.siren) || null,
      score: saved || scoreCompany({ company, signals: sig, offer, weights }),
      prospect: prospectBy.get(company.siren) ? { id: prospectBy.get(company.siren)!.id, status: prospectBy.get(company.siren)!.status, favorite: prospectBy.get(company.siren)!.favorite } : null,
    };
  });
  const f = input.signals || [];
  rows = rows.filter((r) => {
    if (input.minEstablishments && (r.company.establishments || 0) < input.minEstablishments) return false;
    if (input.hideInPortfolio && r.prospect) return false;
    if (f.includes('recent_creation') && !(r.company.createdOn && now - new Date(r.company.createdOn).getTime() < 365 * 86400000)) return false;
    if (f.includes('recent_change') && !r.signals.some((s) => s.kind === 'opportunity')) return false;
    if (f.includes('no_risk') && r.signals.some((s) => s.kind === 'risk')) return false;
    return true;
  });
  rows.sort((a, b) => b.score.total - a.score.total);
  let searchId: string | null = null;
  if (record) {
    const saved = await q<{ id: string }>('insert into searches (org_id, user_id, params, sirens, total) values ($1, $2, $3::jsonb, $4::jsonb, $5) returning id', [orgId, userId, json(input), json(rows.map((r) => r.company.siren)), res.total]);
    searchId = saved[0]?.id || null;
  }
  return { rows, total: res.total, page: res.page, totalPages: res.totalPages, excluded: res.excluded, source: res.source, signalsAvailable: !!signals, searchId };
}
