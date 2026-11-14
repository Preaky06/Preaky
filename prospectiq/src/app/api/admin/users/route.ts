import { authed, ok } from '@/lib/http';
import { q } from '@/lib/db';
import { period } from '@/lib/quota';

export const GET = authed(
  async (req) => {
    const term = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    const rows = await q(
      `select u.id, u.email, u.name, u.role, u.disabled_at, u.created_at, u.last_login_at, o.id as org_id, o.name as org_name, o.plan, o.plan_source, o.subscription_status,
              coalesce(us.prospects, 0) as prospects, coalesce(us.ai_messages, 0) as ai_messages
         from users u join orgs o on o.id = u.org_id
         left join usage us on us.org_id = o.id and us.period = $2
        where ($1 = '' or lower(u.email) like '%' || $1 || '%' or lower(u.name) like '%' || $1 || '%' or lower(o.name) like '%' || $1 || '%')
        order by u.created_at desc limit 200`,
      [term, period()],
    );
    return ok({ users: rows });
  },
  { admin: true },
);
