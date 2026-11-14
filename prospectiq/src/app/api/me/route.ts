// Profil : modification, changement de mot de passe, suppression du compte (droit à l'effacement).
import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';
import { hashPassword, verifyPassword, passwordProblem, destroySession } from '@/lib/auth';
import { usageOf } from '@/lib/quota';

export const GET = authed(async (_req, { user }) => ok({ user, usage: await usageOf(user.orgId) }));

const Patch = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export const PATCH = authed(async (req, { user }) => {
  const data = await body(req, Patch);
  const row = await one<{ password_hash: string }>('select password_hash from users where id = $1', [user.id]);
  const sensitive = data.newPassword || (data.email && data.email !== user.email);
  if (sensitive && !(data.currentPassword && (await verifyPassword(data.currentPassword, row!.password_hash)))) {
    throw new HttpError(400, 'Mot de passe actuel incorrect.', 'bad_password', { field: 'currentPassword' });
  }
  if (data.newPassword) {
    const problem = passwordProblem(data.newPassword);
    if (problem) throw new HttpError(400, problem, 'validation', { field: 'newPassword' });
    await q('update users set password_hash = $2 where id = $1', [user.id, await hashPassword(data.newPassword)]);
  }
  if (data.email && data.email !== user.email) {
    if (await one('select 1 from users where email = $1', [data.email])) throw new HttpError(409, 'Cette adresse est déjà utilisée.', 'email_taken', { field: 'email' });
    await q('update users set email = $2 where id = $1', [user.id, data.email]);
  }
  if (data.name) await q('update users set name = $2 where id = $1', [user.id, data.name]);
  return ok({ ok: true });
});

export const DELETE = authed(async (req, { user }) => {
  const { password } = await body(req, z.object({ password: z.string().min(1, 'Confirmez avec votre mot de passe.') }));
  const row = await one<{ password_hash: string }>('select password_hash from users where id = $1', [user.id]);
  if (!(await verifyPassword(password, row!.password_hash))) throw new HttpError(400, 'Mot de passe incorrect.', 'bad_password', { field: 'password' });
  const members = await one<{ n: number }>('select count(*)::int as n from users where org_id = $1', [user.orgId]);
  if (user.role === 'owner' && (members?.n ?? 1) > 1) throw new HttpError(409, 'Retirez d’abord les autres membres de l’équipe, ou transférez la propriété.', 'has_members');
  if (user.role === 'owner') {
    const org = await one<{ subscription_status: string | null }>('select subscription_status from orgs where id = $1', [user.orgId]);
    if (org?.subscription_status && ['active', 'trialing', 'past_due'].includes(org.subscription_status)) {
      throw new HttpError(409, 'Résiliez d’abord votre abonnement depuis la page Abonnement.', 'active_subscription');
    }
  }
  await destroySession();
  if (user.role === 'owner') await q('delete from orgs where id = $1', [user.orgId]);
  else await q('delete from users where id = $1', [user.id]);
  return ok({ ok: true });
});
