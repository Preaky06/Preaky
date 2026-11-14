// Limitation de débit partagée entre instances (stockée en base).
import 'server-only';
import { one } from './db';
import { HttpError } from './http';

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const row = await one<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2::int) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2::int) then now() else rate_limits.window_start end
     returning count`,
    [key, windowSeconds],
  );
  if ((row?.count ?? 0) > limit) {
    throw new HttpError(429, 'Trop de requêtes. Patientez quelques instants avant de réessayer.', 'rate_limited');
  }
}
