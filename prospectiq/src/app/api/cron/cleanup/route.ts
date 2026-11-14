// Purge périodique (durées de conservation). À appeler chaque jour (Vercel Cron) avec l'en-tête Authorization: Bearer CRON_SECRET.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  if (!env.cronSecret || req.headers.get('authorization') !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  const done: Record<string, number> = {};
  const run = async (name: string, sql: string) => {
    done[name] = (await q(`${sql} returning 1`)).length;
  };
  await run('sessions', 'delete from sessions where expires_at < now()');
  await run('password_resets', `delete from password_resets where expires_at < now() - interval '1 day'`);
  await run('invitations', `delete from invitations where expires_at < now() - interval '30 days'`);
  await run('cache', 'delete from cache where expires_at < now()');
  await run('rate_limits', `delete from rate_limits where window_start < now() - interval '1 day'`);
  await run('api_logs', `delete from api_logs where created_at < now() - interval '90 days'`);
  await run('outbox', `delete from outbox where created_at < now() - interval '7 days'`);
  // Données d'entreprises collectées : conservées 12 mois si elles ne sont plus utilisées par aucun compte
  await run(
    'enrichments',
    `delete from company_enrichments e where e.analyzed_at < now() - interval '12 months'
       and not exists (select 1 from prospects p where p.siren = e.siren)`,
  );
  await run(
    'companies',
    `delete from companies c where c.fetched_at < now() - interval '12 months'
       and not exists (select 1 from prospects p where p.siren = c.siren)
       and not exists (select 1 from analyses a where a.siren = c.siren and a.created_at > now() - interval '12 months')`,
  );
  await run('searches', `delete from searches where saved = false and alert = false and created_at < now() - interval '6 months'`);
  await run('notifications', `delete from notifications where created_at < now() - interval '6 months'`);
  await run('audit_reports', `delete from audit_reports where created_at < now() - interval '12 months'`);
  return NextResponse.json({ ok: true, deleted: done });
}
