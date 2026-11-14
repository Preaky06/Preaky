import { z } from 'zod';
import { authed, body, ok } from '@/lib/http';
import { q } from '@/lib/db';
import { ensureProspect, STATUS_IDS } from '@/lib/crm';
import type { Company } from '@/lib/connectors/types';

export const GET = authed(async (req, { user }) => {
  const sp = req.nextUrl.searchParams;
  const params: unknown[] = [user.orgId];
  const where = ['p.org_id = $1'];
  const add = (sql: (n: number) => string, value: unknown) => {
    params.push(value);
    where.push(sql(params.length));
  };
  const status = sp.get('status');
  if (status && (STATUS_IDS as readonly string[]).includes(status)) add((n) => `p.status = $${n}`, status);
  if (sp.get('favorite') === '1') where.push('p.favorite = true');
  if (sp.get('due') === '1') where.push('p.next_followup_at <= current_date');
  const term = (sp.get('q') || '').trim().toLowerCase();
  if (term) {
    add(
      (n) => `(lower(c.data->>'name') like $${n} or lower(coalesce(c.data->>'city','')) like $${n} or p.siren like $${n} or lower(coalesce(c.data->'tradeNames'->>0,'')) like $${n})`,
      `%${term}%`,
    );
  }
  const list = sp.get('list');
  if (list) add((n) => `exists (select 1 from list_items li join lists l on l.id = li.list_id where li.siren = p.siren and l.id::text = $${n} and l.org_id = p.org_id)`, list);
  const rows = await q<{
    id: string;
    siren: string;
    status: string;
    favorite: boolean;
    last_contact_at: Date | null;
    next_followup_at: string | null;
    updated_at: Date;
    data: Company;
    score: number | null;
    category: string | null;
    notes: number;
  }>(
    `select p.id, p.siren, p.status, p.favorite, p.last_contact_at, p.next_followup_at::text as next_followup_at, p.updated_at, c.data, a.score, a.category,
            (select count(*)::int from interactions i where i.prospect_id = p.id and i.kind = 'note') as notes
       from prospects p join companies c on c.siren = p.siren
       left join analyses a on a.org_id = p.org_id and a.siren = p.siren
      where ${where.join(' and ')}
      order by p.updated_at desc limit 500`,
    params,
  );
  return ok({
    prospects: rows.map((r) => ({
      id: r.id,
      siren: r.siren,
      status: r.status,
      favorite: r.favorite,
      lastContactAt: r.last_contact_at,
      nextFollowupAt: r.next_followup_at,
      updatedAt: r.updated_at,
      score: r.score,
      category: r.category,
      notes: r.notes,
      company: { name: r.data.name, tradeNames: r.data.tradeNames, city: r.data.city, nafLabel: r.data.nafLabel, sectorId: r.data.sectorId },
    })),
  });
});

const AddSchema = z.object({ siren: z.string().regex(/^\d{9}$/, 'SIREN invalide.'), status: z.enum(STATUS_IDS).optional(), favorite: z.boolean().optional() });

export const POST = authed(async (req, { user }) => {
  const data = await body(req, AddSchema);
  const res = await ensureProspect(user.orgId, user.id, data.siren, data);
  if (!res.created && (data.favorite !== undefined || data.status)) {
    await q('update prospects set favorite = coalesce($3, favorite), status = coalesce($4, status), updated_at = now() where org_id = $1 and id = $2', [user.orgId, res.id, data.favorite ?? null, data.status ?? null]);
  }
  return ok(res);
});
