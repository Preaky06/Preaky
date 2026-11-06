// Orchestration : collecte → enrichissement → score → analyse rédigée (règles, puis IA si l'offre le permet).
import 'server-only';
import { z } from 'zod';
import { q, one, json } from './db';
import { HttpError } from './http';
import { features } from './env';
import { consumeProspect } from './quota';
import { getCompany } from './connectors/sirene';
import { bodaccSignals } from './connectors/bodacc';
import { analyzeWebsite } from './connectors/website';
import { lookupPlace } from './connectors/places';
import { scoreCompany, type Offer, type ScoreResult, type Weights } from './scoring';
import { buildInsights, type Insights } from './insights';
import { chatJson, GROUNDING_RULES } from './ai';
import type { SessionUser } from './auth';
import type { Company, Enrichment } from './connectors/types';

export interface OrgSettings {
  offer: Offer;
  weights: Partial<Weights>;
}

export async function orgSettings(orgId: string): Promise<OrgSettings> {
  const row = await one<{ offer: Partial<Offer>; weights: Partial<Weights> }>('select offer, weights from orgs where id = $1', [orgId]);
  return { offer: { services: [], sectors: [], sizes: [], ...(row?.offer || {}) }, weights: row?.weights || {} };
}

export async function storeCompany(c: Company) {
  await q('insert into companies (siren, data, fetched_at) values ($1, $2::jsonb, now()) on conflict (siren) do update set data = excluded.data, fetched_at = now()', [c.siren, json(c)]);
}

export async function isSuppressed(siren: string) {
  return !!(await one('select 1 from suppressions where siren = $1', [siren]));
}

export async function enrich(company: Company, orgId: string, force = false): Promise<Enrichment> {
  if (!force) {
    const row = await one<{ website: Enrichment['website']; signals: Enrichment['signals']; places: Enrichment['places']; analyzed_at: Date }>(
      `select website, signals, places, analyzed_at from company_enrichments where siren = $1 and analyzed_at > now() - interval '14 days'`,
      [company.siren],
    );
    if (row) return { website: row.website, signals: row.signals || [], places: row.places, analyzedAt: new Date(row.analyzed_at).toISOString() };
  }
  const places = await lookupPlace(company, orgId);
  const [website, signals] = await Promise.all([
    analyzeWebsite(company, places?.matched ? places.website : null, orgId),
    bodaccSignals([company.siren], orgId)
      .then((r) => r[company.siren] || [])
      .catch(() => null),
  ]);
  const enrichment: Enrichment = { website, signals: signals || [], places, analyzedAt: new Date().toISOString() };
  await q(
    `insert into company_enrichments (siren, website, signals, places, analyzed_at) values ($1, $2::jsonb, $3::jsonb, $4::jsonb, now())
     on conflict (siren) do update set website = excluded.website, signals = excluded.signals, places = excluded.places, analyzed_at = now()`,
    [company.siren, json(website), json(enrichment.signals), json(places)],
  );
  return enrichment;
}

const InsightsSchema = z.object({
  summary: z.string().min(20).max(1200),
  strengths: z.array(z.string().max(300)).max(8),
  weaknesses: z.array(z.string().max(300)).max(8),
  opportunities: z.array(z.object({ service: z.string().max(120), reason: z.string().max(400) })).max(6),
  rationale: z.string().max(800),
});

async function aiInsights(company: Company, enrichment: Enrichment, score: ScoreResult, rules: Insights, offer: Offer, orgId: string): Promise<Insights | null> {
  const facts = {
    entreprise: {
      nom: company.tradeNames[0] || company.name,
      forme: company.legalForm || 'Non renseigné',
      activite: company.nafLabel || company.naf || 'Non renseigné',
      creation: company.createdOn || 'Non renseigné',
      effectif: company.employeesLabel || 'Non renseigné',
      etablissements: company.establishments ?? 'Non renseigné',
      ville: company.city || 'Non renseigné',
      chiffre_affaires: company.finances ? `${company.finances.revenue} € (${company.finances.year})` : 'Non renseigné',
      labels: company.labels,
    },
    site_web: enrichment.website
      ? {
          statut: enrichment.website.status,
          verification: enrichment.website.verification,
          url: enrichment.website.url || 'Non renseigné',
          constats: (enrichment.website.findings || []).map((f) => f.label),
          reseaux_lies: Object.keys(enrichment.website.socials || {}),
          dernier_contenu: enrichment.website.lastContentDate || 'Non renseigné',
          cms: enrichment.website.cms || 'Non renseigné',
        }
      : 'Non analysé',
    signaux_bodacc: enrichment.signals.map((s) => ({ libelle: s.label, date: s.date, type: s.kind })),
    avis_google: enrichment.places?.matched ? { note: enrichment.places.rating, nombre: enrichment.places.reviews } : 'Non renseigné',
    score: { total: score.total, categorie: score.category.label, confiance: score.confidence, criteres: score.criteria.map((c) => ({ critere: c.label, points: c.points, sur: Math.round(c.weight), raisons: c.reasons })) },
    services_vendus_par_l_utilisateur: offer.services,
    analyse_par_regles: { forces: rules.strengths, faiblesses: rules.weaknesses, opportunites: rules.opportunities },
  };
  const res = await chatJson({
    kind: 'analysis',
    orgId,
    schema: InsightsSchema,
    system: `Tu es un analyste commercial B2B. Tu rédiges l'analyse d'un prospect pour un professionnel qui vend des services marketing ou commerciaux.\n${GROUNDING_RULES}\nRéponds en JSON : {"summary": string, "strengths": string[], "weaknesses": string[], "opportunities": [{"service": string, "reason": string}], "rationale": string}. La justification explique pourquoi contacter (ou non) ce prospect, sans présenter le score comme une probabilité de conversion.`,
    user: JSON.stringify(facts),
  });
  if (!res) return null;
  return { ...res.data, services: rules.services, caveats: rules.caveats };
}

export interface AnalysisView {
  company: Company;
  enrichment: Enrichment;
  score: ScoreResult;
  insights: Insights;
  aiUsed: boolean;
  analyzedAt: string;
}

export async function runAnalysis(user: SessionUser, siren: string, { force = false } = {}): Promise<AnalysisView> {
  const company = await getCompany(siren, user.orgId);
  if (!company) throw new HttpError(404, 'Entreprise introuvable dans la base SIRENE.', 'not_found');
  if (company.optOut) throw new HttpError(403, 'Cette entreprise s’est opposée à l’utilisation de ses données à des fins de prospection (base SIRENE) : elle ne peut pas être analysée.', 'opt_out');
  if (await isSuppressed(siren)) throw new HttpError(403, 'Cette entreprise a demandé à ne plus figurer dans ProspectIQ.', 'suppressed');
  await storeCompany(company);
  await consumeProspect(user.orgId, user.plan, siren);
  const enrichment = await enrich(company, user.orgId, force);
  const { offer, weights } = await orgSettings(user.orgId);
  const score = scoreCompany({ company, website: enrichment.website, signals: enrichment.signals, places: enrichment.places, offer, weights });
  let insights = buildInsights(company, enrichment.website, enrichment.signals, enrichment.places, score, offer);
  let aiUsed = false;
  if (user.plan.features.deepAnalysis && features.ai()) {
    const ai = await aiInsights(company, enrichment, score, insights, offer, user.orgId);
    if (ai) {
      insights = ai;
      aiUsed = true;
    }
  }
  await q(
    `insert into analyses (org_id, siren, score, category, confidence, breakdown, insights, ai_used, created_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, now())
     on conflict (org_id, siren) do update set score = excluded.score, category = excluded.category, confidence = excluded.confidence,
       breakdown = excluded.breakdown, insights = excluded.insights, ai_used = excluded.ai_used, created_at = now()`,
    [user.orgId, siren, score.total, score.category.id, score.confidence, json(score), json(insights), aiUsed],
  );
  return { company, enrichment, score, insights, aiUsed, analyzedAt: enrichment.analyzedAt };
}

/** Analyse déjà réalisée (sans nouvel appel ni décompte). */
export async function storedAnalysis(orgId: string, siren: string): Promise<AnalysisView | null> {
  const row = await one<{ data: Company; breakdown: ScoreResult; insights: Insights; ai_used: boolean; website: Enrichment['website']; signals: Enrichment['signals']; places: Enrichment['places']; analyzed_at: Date | null; created_at: Date }>(
    `select c.data, a.breakdown, a.insights, a.ai_used, e.website, e.signals, e.places, e.analyzed_at, a.created_at
       from analyses a join companies c on c.siren = a.siren left join company_enrichments e on e.siren = a.siren
      where a.org_id = $1 and a.siren = $2`,
    [orgId, siren],
  );
  if (!row) return null;
  return {
    company: row.data,
    enrichment: { website: row.website, signals: row.signals || [], places: row.places, analyzedAt: new Date(row.analyzed_at || row.created_at).toISOString() },
    score: row.breakdown,
    insights: row.insights,
    aiUsed: row.ai_used,
    analyzedAt: new Date(row.analyzed_at || row.created_at).toISOString(),
  };
}
