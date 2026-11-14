import { z } from 'zod';
import { publicRoute, body, ok, HttpError, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { one } from '@/lib/db';
import { createSession, hashPassword, passwordProblem } from '@/lib/auth';

const Schema = z.object({
  name: z.string().trim().min(2, 'Indiquez votre nom.').max(80),
  company: z.string().trim().max(120).optional().default(''),
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.').max(200),
  password: z.string(),
  acceptTerms: z.literal(true, { message: 'Vous devez accepter les conditions d’utilisation.' }),
});

export const POST = publicRoute(async (req) => {
  await rateLimit(`register:${clientIp(req)}`, 8, 3600);
  const data = await body(req, Schema);
  const problem = passwordProblem(data.password);
  if (problem) throw new HttpError(400, problem, 'validation', { field: 'password' });
  if (await one('select 1 from users where email = $1', [data.email])) throw new HttpError(409, 'Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.', 'email_taken', { field: 'email' });
  const org = await one<{ id: string }>('insert into orgs (name) values ($1) returning id', [data.company || data.name]);
  const user = await one<{ id: string }>('insert into users (org_id, email, name, password_hash, role) values ($1, $2, $3, $4, $5) returning id', [org!.id, data.email, data.name, await hashPassword(data.password), 'owner']);
  await createSession(user!.id);
  return ok({ ok: true });
});
