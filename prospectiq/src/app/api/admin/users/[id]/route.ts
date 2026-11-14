// Administration d'un compte : désactivation, changement manuel d'offre, remise à zéro du quota du mois.
import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';
import { period } from '@/lib/quota';

const Schema = z.object({
  disabled: z.boolean().optional(),
  plan: z.enum(['decouverte', 'starter', 'pro', 'business']).optional(),
  resetUsage: z.boolean().optional(),
});

export const PATCH = authed(
  async (req, { user, params }) => {
    const { id } = await params;
    const data = await body(req, Schema);
    const target = await one<{ id: string; org_id: string }>('select id, org_id from users where id::text = $1', [id]);
    if (!target) throw new HttpError(404, 'Utilisateur introuvable.', 'not_found');
    if (data.disabled !== undefined) {
      if (target.id === user.id) throw new HttpError(400, 'Vous ne pouvez pas désactiver votre propre compte.', 'self');
      await q('update users set disabled_at = case when $2 then now() else null end where id = $1', [target.id, data.disabled]);
      if (data.disabled) await q('delete from sessions where user_id = $1', [target.id]);
    }
    if (data.plan) await q(`update orgs set plan = $2, plan_source = 'admin' where id = $1`, [target.org_id, data.plan]);
    if (data.resetUsage) {
      await q('delete from usage where org_id = $1 and period = $2', [target.org_id, period()]);
      await q('delete from usage_prospects where org_id = $1 and period = $2', [target.org_id, period()]);
    }
    return ok({ ok: true });
  },
  { admin: true },
);
