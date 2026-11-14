import { NextResponse } from 'next/server';
import { authed, HttpError } from '@/lib/http';
import { storedAnalysis } from '@/lib/analysis';
import { toCsv } from '@/lib/csv';
import { displayName } from '@/lib/insights';

export const GET = authed(async (req, { user, params }) => {
  const { siren } = await params;
  if (!user.plan.features.export) throw new HttpError(402, `L’export est inclus à partir de l’offre Pro.`, 'plan_export');
  const a = await storedAnalysis(user.orgId, siren);
  if (!a) throw new HttpError(404, 'Analysez d’abord cette entreprise.', 'not_analyzed');
  const format = req.nextUrl.searchParams.get('format') === 'json' ? 'json' : 'csv';
  const name = displayName(a.company).replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
  if (format === 'json') {
    return new NextResponse(JSON.stringify(a, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="prospect-${name}.json"` } });
  }
  const w = a.enrichment.website;
  const csv = toCsv([
    ['SIREN', 'Nom', 'Secteur', 'Adresse', 'Ville', 'Site web', 'Statut du site', 'Téléphone public', 'E-mail public', 'Score', 'Catégorie', 'Confiance', 'Résumé', 'Analysé le'],
    [a.company.siren, displayName(a.company), a.company.nafLabel || '', a.company.localAddress || a.company.address || '', a.company.city || '', w?.url || '', w?.status || '', (w?.phones || [])[0] || a.enrichment.places?.phone || '', (w?.emails || []).find((e) => e.kind === 'generique')?.address || '', a.score.total, a.score.category.label, a.score.confidence, a.insights.summary, a.analyzedAt.slice(0, 10)],
  ]);
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="prospect-${name}.csv"` } });
});
