import { authed, ok } from '@/lib/http';
import { q } from '@/lib/db';

export const GET = authed(
  async (req) => {
    const errorsOnly = req.nextUrl.searchParams.get('errors') === '1';
    const logs = await q(`select provider, operation, ok, status, ms, error, created_at from api_logs ${errorsOnly ? 'where not ok' : ''} order by created_at desc limit 200`);
    return ok({ logs });
  },
  { admin: true },
);
