// Équipe (offre Business) : membres et invitations.
import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';
import { newToken, sha256 } from '@/lib/auth';
import { sendMail } from '@/lib/mail';
import { env } from '@/lib/env';

export const GET = authed(async (_req, { user }) => {
  const members = await q('select id, name, email, role, created_at, last_login_at from users where org_id = $1 order by created_at', [user.orgId]);
  const invitations = await q(`select email, created_at, expires_at from invitations where org_id = $1 and accepted_at is null and expires_at > now() order by created_at desc`, [user.orgId]);
  return ok({ members, invitations, seats: user.plan.seats });
});

export const POST = authed(async (req, { user }) => {
  if (!user.plan.features.team) throw new HttpError(402, 'Le travail en équipe est inclus dans l’offre Business.', 'plan_team');
  if (user.role !== 'owner') throw new HttpError(403, 'Seul le propriétaire peut inviter des membres.', 'forbidden');
  const { email } = await body(req, z.object({ email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.') }));
  const used = await one<{ n: number }>(`select (select count(*) from users where org_id = $1) + (select count(*) from invitations where org_id = $1 and accepted_at is null and expires_at > now()) as n`, [user.orgId]);
  if (Number(used?.n ?? 0) >= user.plan.seats) throw new HttpError(402, `Votre offre inclut ${user.plan.seats} utilisateurs.`, 'seats');
  if (await one('select 1 from users where email = $1', [email])) throw new HttpError(409, 'Cette adresse a déjà un compte Pro Spectre.', 'email_taken');
  const token = newToken();
  await q(`insert into invitations (token_hash, org_id, email, invited_by, expires_at) values ($1, $2, $3, $4, now() + interval '7 days')`, [sha256(token), user.orgId, email, user.id]);
  const link = `${env.appUrl}/invitation?token=${token}`;
  const { delivered } = await sendMail(email, `${user.name} vous invite sur Pro Spectre`, `Bonjour,\n\n${user.name} vous invite à rejoindre l’espace « ${user.orgName} » sur Pro Spectre.\n\nCréez votre accès ici (lien valable 7 jours) :\n${link}\n\nL’équipe Pro Spectre`);
  // Sans e-mail configuré, le lien est remis au propriétaire pour qu'il le transmette lui-même.
  return ok({ ok: true, delivered, link: delivered ? undefined : link });
});
