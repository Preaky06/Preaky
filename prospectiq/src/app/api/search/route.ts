import { authed, body, ok } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { countSearch } from '@/lib/quota';
import { runSearch, SearchSchema } from '@/lib/search';

// Durée maximale de la fonction (Vercel) : appels à des sources externes.
export const maxDuration = 30;

export const POST = authed(async (req, { user }) => {
  await rateLimit(`search:${user.id}`, 30, 60);
  const input = await body(req, SearchSchema);
  const result = await runSearch(user.orgId, user.id, input);
  await countSearch(user.orgId);
  return ok(result);
});
