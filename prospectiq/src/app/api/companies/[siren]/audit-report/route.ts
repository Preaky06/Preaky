// Rapport d'audit partageable à partir de l'analyse déjà réalisée (aucune nouvelle visite du site).
import { authed, ok, HttpError } from '@/lib/http';
import { one } from '@/lib/db';
import { saveReport, type PublicAudit } from '@/lib/site-audit';
import type { WebsiteAudit } from '@/lib/connectors/types';

export const POST = authed(async (_req, { user, params }) => {
  const { siren } = await params;
  const analyzed = await one('select 1 from analyses where org_id = $1 and siren = $2', [user.orgId, siren]);
  if (!analyzed) throw new HttpError(404, 'Analysez d’abord cette entreprise.', 'not_found');
  const e = await one<{ website: WebsiteAudit | null }>('select website from company_enrichments where siren = $1', [siren]);
  const w = e?.website;
  if (!w?.url || !w.findings) throw new HttpError(400, 'Aucun site analysé pour cette entreprise : rien à partager.', 'no_site');
  const { phones: _p, emails: _e, candidatesTried: _c, ...audit } = w;
  void _p;
  void _e;
  void _c;
  const id = await saveReport({ host: new URL(w.url).hostname, url: w.url, audit: audit as PublicAudit, orgId: user.orgId, siren });
  return ok({ id, path: `/rapport/${id}` });
});
