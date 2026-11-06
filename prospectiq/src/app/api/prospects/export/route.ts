import { NextResponse } from 'next/server';
import { authed, HttpError } from '@/lib/http';
import { q } from '@/lib/db';
import { toCsv } from '@/lib/csv';
import { statusLabel } from '@/lib/crm';
import { displayName } from '@/lib/insights';
import type { Company, WebsiteAudit } from '@/lib/connectors/types';

export const GET = authed(async (_req, { user }) => {
  if (!user.plan.features.export) throw new HttpError(402, 'L’export CSV est inclus à partir de l’offre Pro.', 'plan_export');
  const rows = await q<{ siren: string; status: string; favorite: boolean; last_contact_at: Date | null; next_followup_at: string | null; data: Company; score: number | null; website: WebsiteAudit | null }>(
    `select p.siren, p.status, p.favorite, p.last_contact_at, p.next_followup_at::text as next_followup_at, c.data, a.score, e.website
       from prospects p join companies c on c.siren = p.siren
       left join analyses a on a.org_id = p.org_id and a.siren = p.siren
       left join company_enrichments e on e.siren = p.siren
      where p.org_id = $1 order by p.updated_at desc`,
    [user.orgId],
  );
  const csv = toCsv([
    ['SIREN', 'Entreprise', 'Secteur', 'Ville', 'Statut', 'Favori', 'Score', 'Site web', 'Téléphone public', 'E-mail générique', 'Dernier contact', 'Relance'],
    ...rows.map((r) => [
      r.siren,
      displayName(r.data),
      r.data.nafLabel || '',
      r.data.city || '',
      statusLabel(r.status),
      r.favorite ? 'Oui' : 'Non',
      r.score ?? '',
      r.website?.url || '',
      r.website?.phones?.[0] || '',
      r.website?.emails?.find((e) => e.kind === 'generique')?.address || '',
      r.last_contact_at ? new Date(r.last_contact_at).toLocaleDateString('fr-FR') : '',
      r.next_followup_at || '',
    ]),
  ]);
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="prospectiq-crm-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
