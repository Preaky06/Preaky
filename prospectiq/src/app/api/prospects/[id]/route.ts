import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q } from '@/lib/db';
import { getProspectOwned, STATUS_IDS, statusLabel } from '@/lib/crm';

const Patch = z.object({
  status: z.enum(STATUS_IDS).optional(),
  favorite: z.boolean().optional(),
  nextFollowupAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  contacted: z.boolean().optional(),
});

export const PATCH = authed(async (req, { user, params }) => {
  const { id } = await params;
  const p = await getProspectOwned(user.orgId, id);
  const data = await body(req, Patch);
  if (data.nextFollowupAt !== undefined && !user.plan.features.crmFull) throw new HttpError(402, 'Les relances planifiées sont incluses à partir de l’offre Pro.', 'plan_crm');
  let status = data.status;
  if (data.contacted && (!status || status === p.status) && ['nouveau', 'a_contacter'].includes(p.status)) status = 'contacte';
  await q(
    `update prospects set status = coalesce($3, status), favorite = coalesce($4, favorite),
       next_followup_at = case when $5::boolean then $6::date else next_followup_at end,
       last_contact_at = case when $7::boolean then now() else last_contact_at end,
       updated_at = now()
     where org_id = $1 and id = $2`,
    [user.orgId, id, status ?? null, data.favorite ?? null, data.nextFollowupAt !== undefined, data.nextFollowupAt ?? null, !!data.contacted],
  );
  const events: { kind: string; content: string }[] = [];
  if (status && status !== p.status) events.push({ kind: 'status', content: `Statut : ${statusLabel(p.status)} → ${statusLabel(status)}` });
  if (data.contacted) events.push({ kind: 'contact', content: 'Marqué comme contacté' });
  if (data.nextFollowupAt) events.push({ kind: 'status', content: `Relance prévue le ${new Date(data.nextFollowupAt).toLocaleDateString('fr-FR')}` });
  for (const e of events) await q('insert into interactions (org_id, prospect_id, user_id, kind, content) values ($1, $2, $3, $4, $5)', [user.orgId, id, user.id, e.kind, e.content]);
  return ok({ ok: true, status: status || p.status });
});

export const DELETE = authed(async (_req, { user, params }) => {
  const { id } = await params;
  await getProspectOwned(user.orgId, id);
  await q('delete from prospects where org_id = $1 and id = $2', [user.orgId, id]);
  return ok({ ok: true });
});
