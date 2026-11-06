// Cache clé/valeur en base (résultats de recherche, réponses des API publiques).
import 'server-only';
import { one, q, json } from './db';

export async function cached<T>(key: string, ttlSeconds: number, produce: () => Promise<T>): Promise<T> {
  const hit = await one<{ value: T }>('select value from cache where key = $1 and expires_at > now()', [key]);
  if (hit) return hit.value;
  const value = await produce();
  await q(
    `insert into cache (key, value, expires_at) values ($1, $2::jsonb, now() + make_interval(secs => $3::int))
     on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at`,
    [key, json(value), ttlSeconds],
  );
  return value;
}
