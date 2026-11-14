// Lancer le Radar immédiatement pour l'organisation (le passage automatique a lieu chaque jour).
import { authed, ok } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { runRadar } from '@/lib/radar';

export const maxDuration = 60;

export const POST = authed(async (_req, { user }) => {
  await rateLimit(`radar:${user.orgId}`, 6, 3600);
  return ok(await runRadar(user.orgId));
});
