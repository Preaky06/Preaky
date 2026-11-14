import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';

export const GET = authed(async (_req, { user }) => {
  const lists = await q<{ id: string; name: string; count: number; created_at: Date }>(
    'select l.id, l.name, l.created_at, (select count(*)::int from list_items i where i.list_id = l.id) as count from lists l where l.org_id = $1 order by l.created_at desc',
    [user.orgId],
  );
  return ok({ lists });
});

export const POST = authed(async (req, { user }) => {
  if (!user.plan.features.savedSearches) throw new HttpError(402, 'Les listes personnalisées sont incluses à partir de l’offre Pro.', 'plan_lists');
  const { name } = await body(req, z.object({ name: z.string().trim().min(1, 'Donnez un nom à la liste.').max(80) }));
  const count = await one<{ n: number }>('select count(*)::int as n from lists where org_id = $1', [user.orgId]);
  if ((count?.n ?? 0) >= 100) throw new HttpError(400, 'Nombre maximal de listes atteint (100).', 'limit');
  const list = await one<{ id: string }>('insert into lists (org_id, name) values ($1, $2) returning id', [user.orgId, name]);
  return ok({ id: list!.id });
});
