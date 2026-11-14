import type { NextRequest } from 'next/server';
import { ok, fail, clientIp } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { findCommunes } from '@/lib/connectors/geo';

export async function GET(req: NextRequest) {
  try {
    await rateLimit(`geo:${clientIp(req)}`, 60, 60);
    return ok({ communes: await findCommunes(req.nextUrl.searchParams.get('q') || '') });
  } catch (e) {
    return fail(e);
  }
}
