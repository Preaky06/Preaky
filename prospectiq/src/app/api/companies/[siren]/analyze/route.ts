import { z } from 'zod';
import { authed, ok, HttpError } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { runAnalysis } from '@/lib/analysis';
import { usageOf } from '@/lib/quota';

// Durée maximale de la fonction (Vercel) : appels à des sources externes.
export const maxDuration = 60;

export const POST = authed(async (req, { user, params }) => {
  const { siren } = await params;
  if (!/^\d{9}$/.test(siren)) throw new HttpError(400, 'SIREN invalide.', 'bad_siren');
  // Une page de résultats = 25 entreprises : la limite doit permettre « Analyser la page ».
  await rateLimit(`analyze:${user.id}`, 60, 60);
  const opts = z.object({ force: z.boolean().optional() }).safeParse(await req.json().catch(() => ({})));
  const analysis = await runAnalysis(user, siren, { force: opts.success ? !!opts.data.force : false });
  return ok({ analysis, usage: await usageOf(user.orgId) });
});
