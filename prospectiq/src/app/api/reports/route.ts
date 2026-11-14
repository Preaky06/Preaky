// Signalements : erreur de données (utilisateur connecté) ou opposition / suppression (formulaire public RGPD).
import { z } from 'zod';
import { publicRoute, body, ok, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { q } from '@/lib/db';
import { getUser } from '@/lib/auth';

const Schema = z.object({
  kind: z.enum(['opposition', 'data_error', 'abuse']),
  siren: z.string().regex(/^\d{9}$/, 'Le SIREN comporte 9 chiffres.').optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.').optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Décrivez votre demande.').max(3000),
});

export const POST = publicRoute(async (req) => {
  await rateLimit(`report:${clientIp(req)}`, 5, 3600);
  const data = await body(req, Schema);
  const user = await getUser();
  await q('insert into reports (kind, siren, email, message, user_id) values ($1, $2, $3, $4, $5)', [data.kind, data.siren || null, data.email || user?.email || null, data.message, user?.id || null]);
  return ok({ ok: true });
});
