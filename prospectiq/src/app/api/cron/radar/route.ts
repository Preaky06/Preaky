// Passage quotidien du Radar pour toutes les organisations concernées, puis résumés e-mail.
// Appelé par Vercel Cron avec l'en-tête Authorization: Bearer CRON_SECRET.
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { env } from '@/lib/env';
import { runRadar, sendDigest } from '@/lib/radar';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!env.cronSecret || req.headers.get('authorization') !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  const started = Date.now();
  const orgs = await q<{ id: string }>(
    `select o.id from orgs o
     where exists (select 1 from searches s where s.org_id = o.id and s.alert) or exists (select 1 from prospects p where p.org_id = o.id)
     order by o.radar_checked_at nulls first limit 500`,
  );
  let processed = 0;
  let created = 0;
  let mails = 0;
  for (const o of orgs) {
    // Budget de temps : les organisations restantes passent en premier au prochain appel.
    if (Date.now() - started > 50_000) break;
    const r = await runRadar(o.id).catch(() => ({ created: 0 }));
    created += r.created;
    mails += (await sendDigest(o.id).catch(() => ({ sent: 0 }))).sent;
    processed++;
  }
  return NextResponse.json({ processed, remaining: orgs.length - processed, created, mails });
}
