import { z } from 'zod';
import { publicRoute, body, ok, HttpError, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { one } from '@/lib/db';
import { hashPassword, passwordProblem, sha256, createSession } from '@/lib/auth';
import { planOf } from '@/lib/plans';

const Schema = z.object({ token: z.string().min(20), name: z.string().trim().min(2, 'Indiquez votre nom.').max(80), password: z.string() });

export const POST = publicRoute(async (req) => {
  await rateLimit(`invite:${clientIp(req)}`, 10, 3600);
  const data = await body(req, Schema);
  const problem = passwordProblem(data.password);
  if (problem) throw new HttpError(400, problem, 'validation', { field: 'password' });
  const inv = await one<{ org_id: string; email: string; plan: string }>(
    `select i.org_id, i.email, o.plan from invitations i join orgs o on o.id = i.org_id where i.token_hash = $1 and i.accepted_at is null and i.expires_at > now()`,
    [sha256(data.token)],
  );
  if (!inv) throw new HttpError(400, 'Invitation invalide ou expirée.', 'bad_token');
  const seats = await one<{ n: number }>('select count(*)::int as n from users where org_id = $1', [inv.org_id]);
  if ((seats?.n ?? 0) >= planOf(inv.plan).seats) throw new HttpError(402, 'L’équipe a atteint le nombre d’utilisateurs de son offre.', 'seats');
  if (await one('select 1 from users where email = $1', [inv.email])) throw new HttpError(409, 'Un compte existe déjà avec cette adresse.', 'email_taken');
  const user = await one<{ id: string }>('insert into users (org_id, email, name, password_hash, role) values ($1, $2, $3, $4, $5) returning id', [inv.org_id, inv.email, data.name, await hashPassword(data.password), 'member']);
  await one('update invitations set accepted_at = now() where token_hash = $1 returning 1', [sha256(data.token)]);
  await createSession(user!.id);
  return ok({ ok: true });
});
