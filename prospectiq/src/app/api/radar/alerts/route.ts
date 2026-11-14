// Transformer une recherche en alerte Radar (surveillance quotidienne de sa zone).
import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';
import { zoneOf, type RadarCriteria } from '@/lib/radar-zone';
import { checkSearchAlert } from '@/lib/radar';
import { rateLimit } from '@/lib/ratelimit';

export const maxDuration = 60;

export const POST = authed(async (req, { user }) => {
  const data = await body(req, z.object({ searchId: z.string().uuid(), name: z.string().trim().max(80).optional() }));
  const search = await one<{ id: string; name: string | null; params: RadarCriteria; alert: boolean; alert_checked_at: Date | null }>('select id, name, params, alert, alert_checked_at from searches where org_id = $1 and id = $2', [user.orgId, data.searchId]);
  if (!search) throw new HttpError(404, 'Recherche introuvable.', 'not_found');
  if (!zoneOf(search.params)) throw new HttpError(400, 'Ajoutez une zone à la recherche (code postal, ville, département ou région) : le Radar surveille un territoire.', 'zone_required');
  if (!search.alert) {
    const used = (await one<{ n: number }>('select count(*)::int as n from searches where org_id = $1 and alert = true', [user.orgId]))?.n || 0;
    if (used >= user.plan.alerts) throw new HttpError(402, `Votre offre ${user.plan.name} inclut ${user.plan.alerts} alerte${user.plan.alerts > 1 ? 's' : ''} Radar. Désactivez-en une ou changez d’offre.`, 'plan_alerts');
  }
  await q('update searches set alert = true, name = coalesce($3, name) where org_id = $1 and id = $2', [user.orgId, data.searchId, data.name || null]);
  // Premier passage immédiat : l'utilisateur voit tout de suite ce que l'alerte aurait détecté cette semaine.
  await rateLimit(`radar-alert:${user.orgId}`, 20, 3600);
  const first = await checkSearchAlert(user.orgId, { ...search, alert_checked_at: null }).catch(() => ({ created: 0, examined: 0 }));
  return ok({ ok: true, ...first });
});
