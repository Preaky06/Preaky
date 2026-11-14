// Démonstration publique (page d'accueil) : vraies données SIRENE, 5 résultats, score préliminaire générique.
import { z } from 'zod';
import { publicRoute, body, ok, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { searchCompanies } from '@/lib/connectors/sirene';
import { scoreCompany } from '@/lib/scoring';
import { displayName } from '@/lib/insights';

const Schema = z.object({ sector: z.string().max(40).optional(), postalCode: z.string().regex(/^\d{5}$/, 'Code postal à 5 chiffres.'), q: z.string().max(60).optional() });

export const POST = publicRoute(async (req) => {
  await rateLimit(`demo:${clientIp(req)}`, 10, 300);
  const input = await body(req, Schema);
  const res = await searchCompanies({ sector: input.sector, postalCode: input.postalCode, q: input.q, excludeLarge: true });
  const rows = res.companies.slice(0, 5).map((c) => {
    const s = scoreCompany({ company: c, signals: null });
    return { name: displayName(c), sector: c.nafLabel, city: c.city, created: c.createdOn, score: s.total, category: s.category.label, confidence: s.confidence };
  });
  return ok({ rows, total: res.total, source: res.source });
});
