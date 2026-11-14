import { z } from 'zod';
import { publicRoute, body, ok, HttpError, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { one, q } from '@/lib/db';
import { hashPassword, passwordProblem, sha256, createSession } from '@/lib/auth';

const Schema = z.object({ token: z.string().min(20), password: z.string() });

export const POST = publicRoute(async (req) => {
  await rateLimit(`reset:${clientIp(req)}`, 10, 3600);
  const { token, password } = await body(req, Schema);
  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem, 'validation', { field: 'password' });
  const row = await one<{ user_id: string }>('update password_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning user_id', [sha256(token)]);
  if (!row) throw new HttpError(400, 'Ce lien est invalide ou a expiré. Refaites une demande de réinitialisation.', 'bad_token');
  await q('update users set password_hash = $1 where id = $2', [await hashPassword(password), row.user_id]);
  await q('delete from sessions where user_id = $1', [row.user_id]);
  await createSession(row.user_id);
  return ok({ ok: true });
});
