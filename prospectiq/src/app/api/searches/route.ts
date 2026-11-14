import { authed, ok } from '@/lib/http';
import { q } from '@/lib/db';

export const GET = authed(async (req, { user }) => {
  const savedOnly = req.nextUrl.searchParams.get('saved') === '1';
  const rows = await q<{ id: string; name: string | null; params: Record<string, unknown>; total: number; count: number; saved: boolean; created_at: Date }>(
    `select id, name, params, total, jsonb_array_length(sirens) as count, saved, created_at
       from searches where org_id = $1 ${savedOnly ? 'and saved = true' : ''}
      order by created_at desc limit 100`,
    [user.orgId],
  );
  return ok({ searches: rows });
});
