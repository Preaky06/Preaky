// Quotas mensuels contrôlés côté serveur.
import 'server-only';
import { q, one } from './db';
import { HttpError } from './http';
import type { Plan } from './plans';

export const period = (d = new Date()) => d.toISOString().slice(0, 7);

export async function usageOf(orgId: string) {
  const row = await one<{ prospects: number; ai_messages: number; searches: number }>('select prospects, ai_messages, searches from usage where org_id = $1 and period = $2', [orgId, period()]);
  return { prospects: row?.prospects ?? 0, aiMessages: row?.ai_messages ?? 0, searches: row?.searches ?? 0 };
}

/** Décompte une entreprise analysée (une seule fois par mois et par entreprise). */
export async function consumeProspect(orgId: string, plan: Plan, siren: string): Promise<{ charged: boolean }> {
  const p = period();
  const already = await one('select 1 from usage_prospects where org_id = $1 and period = $2 and siren = $3', [orgId, p, siren]);
  if (already) return { charged: false };
  const used = (await usageOf(orgId)).prospects;
  if (used >= plan.prospects) {
    throw new HttpError(402, `Quota atteint : ${plan.prospects} prospects analysés ce mois-ci avec l’offre ${plan.name}.`, 'quota_prospects', { limit: plan.prospects });
  }
  const inserted = await q('insert into usage_prospects (org_id, period, siren) values ($1, $2, $3) on conflict do nothing returning siren', [orgId, p, siren]);
  if (inserted.length) {
    await q('insert into usage (org_id, period, prospects) values ($1, $2, 1) on conflict (org_id, period) do update set prospects = usage.prospects + 1', [orgId, p]);
  }
  return { charged: inserted.length > 0 };
}

export async function consumeAiMessage(orgId: string, plan: Plan, count = 1) {
  const p = period();
  const row = await one<{ ai_messages: number }>(
    `insert into usage (org_id, period, ai_messages) values ($1, $2, $3)
     on conflict (org_id, period) do update set ai_messages = usage.ai_messages + $3
     where usage.ai_messages + $3 <= $4
     returning ai_messages`,
    [orgId, p, count, plan.aiMessages],
  );
  if (!row) throw new HttpError(402, `Quota atteint : ${plan.aiMessages} messages générés ce mois-ci avec l’offre ${plan.name}.`, 'quota_messages', { limit: plan.aiMessages });
}

export async function countSearch(orgId: string) {
  await q('insert into usage (org_id, period, searches) values ($1, $2, 1) on conflict (org_id, period) do update set searches = usage.searches + 1', [orgId, period()]);
}
