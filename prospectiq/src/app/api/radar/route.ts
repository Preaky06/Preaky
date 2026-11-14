// Radar : vue d'ensemble (alertes, notifications, réglages) et préférence de résumé e-mail.
import { z } from 'zod';
import { authed, body, ok } from '@/lib/http';
import { q, one } from '@/lib/db';
import { describeSearch } from '@/lib/describe';
import { zoneOf, type RadarCriteria } from '@/lib/radar-zone';
import { features } from '@/lib/env';

export const GET = authed(async (_req, { user }) => {
  const alerts = await q<{ id: string; name: string | null; params: RadarCriteria; alert_checked_at: Date | null; created_at: Date }>(
    'select id, name, params, alert_checked_at, created_at from searches where org_id = $1 and alert = true order by created_at desc',
    [user.orgId],
  );
  const notifications = await q<{ id: string; kind: string; siren: string | null; title: string; detail: string | null; url: string | null; source_url: string | null; event_date: string | null; created_at: Date; read_at: Date | null; search_id: string | null }>(
    `select id, kind, siren, title, detail, url, source_url, to_char(event_date, 'YYYY-MM-DD') as event_date, created_at, read_at, search_id
     from notifications where org_id = $1 order by created_at desc, event_date desc nulls last limit 150`,
    [user.orgId],
  );
  const org = await one<{ digest: string; radar_checked_at: Date | null; watched: number }>(
    'select digest, radar_checked_at, (select count(*)::int from prospects where org_id = $1) as watched from orgs where id = $1',
    [user.orgId],
  );
  return ok({
    alerts: alerts.map((a) => ({ id: a.id, name: a.name || describeSearch(a.params as Record<string, unknown>), description: describeSearch(a.params as Record<string, unknown>), zone: zoneOf(a.params)?.label || null, checkedAt: a.alert_checked_at, createdAt: a.created_at })),
    notifications,
    unread: notifications.filter((n) => !n.read_at).length,
    limits: { alerts: user.plan.alerts, used: alerts.length },
    digest: org?.digest || 'hebdo',
    mailConfigured: features.mail(),
    checkedAt: org?.radar_checked_at || null,
    watched: org?.watched || 0,
  });
});

export const PUT = authed(async (req, { user }) => {
  const data = await body(req, z.object({ digest: z.enum(['quotidien', 'hebdo', 'aucun']) }));
  await q('update orgs set digest = $2 where id = $1', [user.orgId, data.digest]);
  return ok({ ok: true });
});
