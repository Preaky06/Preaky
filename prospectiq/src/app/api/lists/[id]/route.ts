import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';
import { ensureProspect } from '@/lib/crm';

async function owned(orgId: string, id: string) {
  const list = await one<{ id: string }>('select id from lists where org_id = $1 and id::text = $2', [orgId, id]);
  if (!list) throw new HttpError(404, 'Liste introuvable.', 'not_found');
}

/** Ajoute (ou retire avec remove: true) une entreprise de la liste. L'entreprise rejoint aussi le portefeuille. */
export const POST = authed(async (req, { user, params }) => {
  const { id } = await params;
  await owned(user.orgId, id);
  const data = await body(req, z.object({ siren: z.string().regex(/^\d{9}$/, 'SIREN invalide.'), remove: z.boolean().optional() }));
  if (data.remove) {
    await q('delete from list_items where list_id = $1 and siren = $2', [id, data.siren]);
    return ok({ ok: true });
  }
  await ensureProspect(user.orgId, user.id, data.siren);
  await q('insert into list_items (list_id, siren) values ($1, $2) on conflict do nothing', [id, data.siren]);
  return ok({ ok: true });
});

export const PATCH = authed(async (req, { user, params }) => {
  const { id } = await params;
  await owned(user.orgId, id);
  const { name } = await body(req, z.object({ name: z.string().trim().min(1).max(80) }));
  await q('update lists set name = $2 where id = $1', [id, name]);
  return ok({ ok: true });
});

export const DELETE = authed(async (_req, { user, params }) => {
  const { id } = await params;
  await owned(user.orgId, id);
  await q('delete from lists where id = $1', [id]);
  return ok({ ok: true });
});
