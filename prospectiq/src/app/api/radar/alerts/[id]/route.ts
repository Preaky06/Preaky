// Désactiver une alerte Radar (la recherche reste dans l'historique).
import { authed, ok } from '@/lib/http';
import { q } from '@/lib/db';

export const DELETE = authed(async (_req, { user, params }) => {
  const { id } = await params;
  await q('update searches set alert = false where org_id = $1 and id::text = $2', [user.orgId, id]);
  return ok({ ok: true });
});
