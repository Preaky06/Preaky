// Statistiques du tableau de bord (organisation courante).
import { authed, ok } from '@/lib/http';
import { q, one } from '@/lib/db';
import { usageOf } from '@/lib/quota';
import { sectorById } from '@/lib/sectors';
import { displayName } from '@/lib/insights';
import type { Company } from '@/lib/connectors/types';

export const GET = authed(async (_req, { user }) => {
  const org = user.orgId;
  const counts = await one<{ found: number; qualified: number; analyzed: number; saved: number; contacted: number }>(
    `select
       (select count(distinct s.value)::int from searches, jsonb_array_elements_text(sirens) s(value) where org_id = $1) as found,
       (select count(*)::int from analyses where org_id = $1 and score >= 60) as qualified,
       (select count(*)::int from analyses where org_id = $1) as analyzed,
       (select count(*)::int from prospects where org_id = $1) as saved,
       (select count(*)::int from prospects where org_id = $1 and status in ('contacte','reponse','rdv','client','non_interesse')) as contacted`,
    [org],
  );
  const sectors = await q<{ sector: string | null; n: number }>(
    `select c.data->>'sectorId' as sector, count(*)::int as n from analyses a join companies c on c.siren = a.siren where a.org_id = $1 group by 1 order by 2 desc`,
    [org],
  );
  const activity = await q<{ day: string; searches: number; analyses: number; contacts: number }>(
    `with days as (select generate_series(current_date - 29, current_date, interval '1 day')::date as day)
     select to_char(d.day, 'YYYY-MM-DD') as day,
       (select count(*)::int from searches s where s.org_id = $1 and s.created_at::date = d.day) as searches,
       (select count(*)::int from analyses a where a.org_id = $1 and a.created_at::date = d.day) as analyses,
       (select count(*)::int from interactions i where i.org_id = $1 and i.kind in ('contact','appel','email','message','rdv') and i.created_at::date = d.day) as contacts
     from days d order by d.day`,
    [org],
  );
  const recentSearches = await q<{ id: string; name: string | null; params: Record<string, unknown>; total: number; created_at: Date }>('select id, name, params, total, created_at from searches where org_id = $1 order by created_at desc limit 5', [org]);
  const top = await q<{ siren: string; score: number; category: string; confidence: string; data: Company; status: string | null }>(
    `select a.siren, a.score, a.category, a.confidence, c.data, p.status
       from analyses a join companies c on c.siren = a.siren
       left join prospects p on p.org_id = a.org_id and p.siren = a.siren
      where a.org_id = $1 and (p.status is null or p.status in ('nouveau','a_contacter'))
      order by a.score desc, a.created_at desc limit 6`,
    [org],
  );
  const followups = await q<{ id: string; siren: string; next_followup_at: string; data: Company }>(
    `select p.id, p.siren, p.next_followup_at::text as next_followup_at, c.data from prospects p join companies c on c.siren = p.siren
      where p.org_id = $1 and p.next_followup_at is not null and p.next_followup_at <= current_date + 7 order by p.next_followup_at limit 6`,
    [org],
  );
  const onboarding = await one<{ offer: boolean; searches: number; analyses: number; alerts: number; messages: number; prospects: number }>(
    `select
       (select jsonb_array_length(coalesce(offer->'services', '[]'::jsonb)) > 0 from orgs where id = $1) as offer,
       (select count(*)::int from searches where org_id = $1) as searches,
       (select count(*)::int from analyses where org_id = $1) as analyses,
       (select count(*)::int from searches where org_id = $1 and alert) as alerts,
       (select count(*)::int from messages where org_id = $1) as messages,
       (select count(*)::int from prospects where org_id = $1) as prospects`,
    [org],
  );
  const unread = (await one<{ n: number }>('select count(*)::int as n from notifications where org_id = $1 and read_at is null', [org]))?.n || 0;
  const c = counts!;
  return ok({
    counts: { ...c, qualificationRate: c.analyzed ? Math.round((c.qualified / c.analyzed) * 100) : null },
    sectors: sectors.map((s) => ({ id: s.sector, label: (s.sector && sectorById(s.sector)?.label) || 'Autres secteurs', count: s.n })),
    activity,
    recentSearches,
    recommended: top.map((t) => ({ siren: t.siren, name: displayName(t.data), city: t.data.city, sector: t.data.nafLabel, score: t.score, category: t.category, confidence: t.confidence, status: t.status })),
    followups: followups.map((f) => ({ id: f.id, siren: f.siren, name: displayName(f.data), date: f.next_followup_at })),
    onboarding,
    unread,
    usage: await usageOf(org),
    plan: user.plan,
  });
});
