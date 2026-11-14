// Accès base de données.
// - Production : PostgreSQL (Supabase, Neon…) via DATABASE_URL.
// - Local / tests : PGlite (PostgreSQL compilé en WebAssembly), sans aucune installation.
// Les deux exécutent exactement le même SQL.
import 'server-only';
import { mkdirSync } from 'node:fs';
import { env } from './env';
import { MIGRATIONS } from './migrations';

export interface Driver {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  kind: 'postgres' | 'pglite';
}

const g = globalThis as unknown as { __piqDb?: Promise<Driver> };

async function createDriver(): Promise<Driver> {
  if (env.databaseUrl) {
    const postgres = (await import('postgres')).default;
    // prepare:false : compatible avec les poolers en mode transaction (Supabase, PgBouncer)
    const sql = postgres(env.databaseUrl, { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
    return {
      kind: 'postgres',
      query: async (q, p = []) => (await sql.unsafe(q, p as never[])) as never,
      exec: async (q) => {
        await sql.unsafe(q);
      },
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = env.pgliteDir === ':memory:' ? undefined : env.pgliteDir;
  if (dir) mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  return {
    kind: 'pglite',
    query: async (q, p = []) => (await pg.query(q, p)).rows as never,
    exec: async (q) => {
      await pg.exec(q);
    },
  };
}

async function migrate(db: Driver) {
  await db.exec('create table if not exists schema_migrations (version int primary key, applied_at timestamptz not null default now())');
  const done = new Set((await db.query<{ version: number }>('select version from schema_migrations')).map((r) => Number(r.version)));
  for (const [i, sql] of MIGRATIONS.entries()) {
    const version = i + 1;
    if (done.has(version)) continue;
    await db.exec(`begin; ${sql}; insert into schema_migrations(version) values (${version}); commit;`);
  }
}

export function getDb(): Promise<Driver> {
  if (!g.__piqDb) {
    g.__piqDb = createDriver().then(async (d) => {
      await migrate(d);
      return d;
    });
    g.__piqDb.catch(() => {
      g.__piqDb = undefined;
    });
  }
  return g.__piqDb;
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await getDb()).query<T>(sql, params);
}

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(sql, params))[0] ?? null;
}

export const json = (v: unknown) => JSON.stringify(v ?? null);
