// Fiche : analyse déjà réalisée (sans décompte) ou données d'identification + score préliminaire.
import { authed, ok, HttpError } from '@/lib/http';
import { storedAnalysis, orgSettings, isSuppressed } from '@/lib/analysis';
import { getCompany } from '@/lib/connectors/sirene';
import { scoreCompany } from '@/lib/scoring';
import { one, q } from '@/lib/db';

export const GET = authed(async (_req, { user, params }) => {
  const { siren } = await params;
  if (!/^\d{9}$/.test(siren)) throw new HttpError(400, 'SIREN invalide.', 'bad_siren');
  const prospect = await one<{ id: string; status: string; favorite: boolean; next_followup_at: string | null; last_contact_at: Date | null }>(
    'select id, status, favorite, next_followup_at::text, last_contact_at from prospects where org_id = $1 and siren = $2',
    [user.orgId, siren],
  );
  const lists = await q<{ id: string; name: string }>('select l.id, l.name from lists l join list_items i on i.list_id = l.id where l.org_id = $1 and i.siren = $2', [user.orgId, siren]);
  const analysis = await storedAnalysis(user.orgId, siren);
  if (analysis) return ok({ analysis, prospect, lists, analyzed: true });
  const company = await getCompany(siren, user.orgId);
  if (!company) throw new HttpError(404, 'Entreprise introuvable dans la base SIRENE.', 'not_found');
  const blocked = company.optOut || (await isSuppressed(siren));
  const { offer, weights } = await orgSettings(user.orgId);
  return ok({ analysis: null, company, preliminary: scoreCompany({ company, offer, weights }), blocked, prospect, lists, analyzed: false });
});
