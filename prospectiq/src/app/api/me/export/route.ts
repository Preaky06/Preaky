// Droit d'accès (RGPD) : export de toutes les données du compte au format JSON.
import { NextResponse } from 'next/server';
import { authed } from '@/lib/http';
import { q, one } from '@/lib/db';

export const GET = authed(async (_req, { user }) => {
  const [account, org, prospects, interactions, lists, searches, messages] = await Promise.all([
    one('select id, email, name, role, created_at, last_login_at from users where id = $1', [user.id]),
    one('select id, name, plan, offer, weights, created_at from orgs where id = $1', [user.orgId]),
    q('select siren, status, favorite, last_contact_at, next_followup_at, created_at from prospects where org_id = $1', [user.orgId]),
    q('select prospect_id, kind, content, created_at from interactions where org_id = $1', [user.orgId]),
    q('select l.name, array(select siren from list_items i where i.list_id = l.id) as sirens from lists l where l.org_id = $1', [user.orgId]),
    q('select name, params, total, saved, created_at from searches where org_id = $1', [user.orgId]),
    q('select siren, channel, tone, content, created_at from messages where org_id = $1', [user.orgId]),
  ]);
  const data = { exportedAt: new Date().toISOString(), account, organisation: org, prospects, interactions, lists, searches, messages };
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="prospectiq-mes-donnees.json"' } });
});
