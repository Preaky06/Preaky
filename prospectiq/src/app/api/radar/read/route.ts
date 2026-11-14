// Marquer des notifications comme lues (toutes, ou une liste).
import { z } from 'zod';
import { authed, body, ok } from '@/lib/http';
import { q } from '@/lib/db';

export const POST = authed(async (req, { user }) => {
  const data = await body(req, z.object({ ids: z.array(z.string().uuid()).max(200).optional(), all: z.boolean().optional() }));
  if (data.all) await q('update notifications set read_at = now() where org_id = $1 and read_at is null', [user.orgId]);
  else if (data.ids?.length) await q('update notifications set read_at = now() where org_id = $1 and id = any($2::uuid[]) and read_at is null', [user.orgId, data.ids]);
  return ok({ ok: true });
});
