import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { q, one } from '@/lib/db';
import { rateLimit } from '@/lib/ratelimit';
import { countSearch } from '@/lib/quota';
import { runSearch, SearchSchema } from '@/lib/search';

async function owned(orgId: string, id: string) {
  const row = await one<{ id: string; params: unknown; sirens: string[]; name: string | null; created_at: Date }>('select id, params, sirens, name, created_at from searches where org_id = $1 and id::text = $2', [orgId, id]);
  if (!row) throw new HttpError(404, 'Recherche introuvable.', 'not_found');
  return row;
}

/** Sauvegarder / renommer une recherche. */
export const PATCH = authed(async (req, { user, params }) => {
  const { id } = await params;
  if (!user.plan.features.savedSearches) throw new HttpError(402, 'Les recherches sauvegardées sont incluses à partir de l’offre Pro.', 'plan_saved');
  await owned(user.orgId, id);
  const data = await body(req, z.object({ name: z.string().trim().min(1, 'Donnez un nom à la recherche.').max(80), saved: z.boolean().default(true) }));
  await q('update searches set name = $2, saved = $3 where id = $1', [id, data.name, data.saved]);
  return ok({ ok: true });
});

/** Relancer une recherche : nouvelle exécution, comparée à la précédente. */
export const POST = authed(async (_req, { user, params }) => {
  const { id } = await params;
  await rateLimit(`search:${user.id}`, 30, 60);
  const prev = await owned(user.orgId, id);
  const input = SearchSchema.parse(prev.params);
  const result = await runSearch(user.orgId, user.id, input);
  await countSearch(user.orgId);
  const before = new Set(prev.sirens);
  const after = new Set(result.rows.map((r) => r.company.siren));
  return ok({ ...result, comparison: { previousAt: prev.created_at, added: [...after].filter((s) => !before.has(s)), removed: [...before].filter((s) => !after.has(s)) } });
});

export const DELETE = authed(async (_req, { user, params }) => {
  const { id } = await params;
  await owned(user.orgId, id);
  await q('delete from searches where id = $1', [id]);
  return ok({ ok: true });
});
