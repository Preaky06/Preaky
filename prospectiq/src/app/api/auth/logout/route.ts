import { publicRoute, ok } from '@/lib/http';
import { destroySession } from '@/lib/auth';

export const POST = publicRoute(async () => {
  await destroySession();
  return ok({ ok: true });
});
