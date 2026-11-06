import { z } from 'zod';
import { authed, body, ok } from '@/lib/http';
import { q } from '@/lib/db';
import { getProspectOwned } from '@/lib/crm';

export const GET = authed(async (_req, { user, params }) => {
  const { id } = await params;
  await getProspectOwned(user.orgId, id);
  const rows = await q<{ id: string; kind: string; content: string; created_at: Date; author: string | null }>(
    'select i.id, i.kind, i.content, i.created_at, u.name as author from interactions i left join users u on u.id = i.user_id where i.org_id = $1 and i.prospect_id = $2 order by i.created_at desc limit 200',
    [user.orgId, id],
  );
  return ok({ interactions: rows });
});

const Add = z.object({ kind: z.enum(['note', 'appel', 'email', 'rdv', 'message']), content: z.string().trim().min(1, 'La note est vide.').max(4000) });

export const POST = authed(async (req, { user, params }) => {
  const { id } = await params;
  await getProspectOwned(user.orgId, id);
  const data = await body(req, Add);
  await q('insert into interactions (org_id, prospect_id, user_id, kind, content) values ($1, $2, $3, $4, $5)', [user.orgId, id, user.id, data.kind, data.content]);
  await q(data.kind === 'note' ? 'update prospects set updated_at = now() where id = $1' : 'update prospects set last_contact_at = now(), updated_at = now() where id = $1', [id]);
  return ok({ ok: true });
});
