import { authed, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';

export const DELETE = authed(async (_req, { user, params }) => {
  const { id } = await params;
  if (user.role !== 'owner') throw new HttpError(403, 'Seul le propriétaire peut retirer des membres.', 'forbidden');
  if (id === user.id) throw new HttpError(400, 'Vous ne pouvez pas vous retirer vous-même.', 'self');
  const member = await one('select 1 from users where id::text = $1 and org_id = $2', [id, user.orgId]);
  if (!member) throw new HttpError(404, 'Membre introuvable.', 'not_found');
  await q('delete from users where id::text = $1 and org_id = $2', [id, user.orgId]);
  return ok({ ok: true });
});
