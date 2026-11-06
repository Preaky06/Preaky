import { authed, ok } from '@/lib/http';
import { q, one } from '@/lib/db';
import { features } from '@/lib/env';

export const GET = authed(
  async () => {
    const totals = await one<{ users: number; orgs: number; paying: number; searches30: number; analyses30: number; messages30: number; openReports: number }>(
      `select (select count(*)::int from users) as users, (select count(*)::int from orgs) as orgs,
              (select count(*)::int from orgs where plan <> 'decouverte') as paying,
              (select count(*)::int from searches where created_at > now() - interval '30 days') as searches30,
              (select count(*)::int from analyses where created_at > now() - interval '30 days') as analyses30,
              (select count(*)::int from messages where created_at > now() - interval '30 days') as messages30,
              (select count(*)::int from reports where status = 'ouvert') as "openReports"`,
    );
    const plans = await q<{ plan: string; n: number }>('select plan, count(*)::int as n from orgs group by plan order by 2 desc');
    const ai = await one<{ calls: number; input: number; output: number; cost: number }>(
      `select count(*)::int as calls, coalesce(sum(input_tokens),0)::int as input, coalesce(sum(output_tokens),0)::int as output, coalesce(sum(cost_eur),0)::float8 as cost from ai_usage where created_at > now() - interval '30 days'`,
    );
    const aiByOrg = await q<{ org: string | null; cost: number; calls: number }>(
      `select o.name as org, sum(a.cost_eur)::float8 as cost, count(*)::int as calls from ai_usage a left join orgs o on o.id = a.org_id
        where a.created_at > now() - interval '30 days' group by o.name order by cost desc limit 10`,
    );
    const apis = await q<{ provider: string; calls: number; errors: number; avg_ms: number }>(
      `select provider, count(*)::int as calls, count(*) filter (where not ok)::int as errors, coalesce(avg(ms),0)::int as avg_ms
         from api_logs where created_at > now() - interval '7 days' group by provider order by calls desc`,
    );
    const mrr = await one<{ mrr: number }>(`select coalesce(sum(case plan when 'starter' then 19 when 'pro' then 49 when 'business' then 99 else 0 end),0)::int as mrr from orgs where plan_source = 'stripe' and subscription_status in ('active','trialing','past_due')`);
    return ok({ totals, plans, ai, aiByOrg, apis, mrr: mrr?.mrr ?? 0, features: { ai: features.ai(), places: features.places(), stripe: features.stripe(), mail: features.mail() } });
  },
  { admin: true },
);
