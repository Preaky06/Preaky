// Audit de site gratuit (sans compte). Limité par adresse IP ; un même site n'est analysé qu'une fois par 24 h.
import { z } from 'zod';
import { publicRoute, body, ok, clientIp, HttpError } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { auditSite, saveReport, recentReport, normalizeTarget } from '@/lib/site-audit';

export const maxDuration = 30;

export const POST = publicRoute(async (req) => {
  const data = await body(req, z.object({ url: z.string().trim().min(3, 'Indiquez l’adresse du site.').max(300) }));
  const target = normalizeTarget(data.url);
  if (!target) throw new HttpError(400, 'Adresse invalide. Exemple : www.exemple.fr', 'validation', { field: 'url' });
  const cachedReport = await recentReport(target.hostname.toLowerCase());
  if (cachedReport) return ok({ id: cachedReport.id, cached: true });
  await rateLimit(`audit:${clientIp(req)}`, 8, 3600);
  await rateLimit('audit:global', 400, 3600);
  const r = await auditSite(data.url);
  if (!r.ok) throw new HttpError(422, r.reason, 'audit_failed', { field: 'url' });
  const id = await saveReport({ host: r.host, url: r.url, audit: r.audit });
  return ok({ id });
});
