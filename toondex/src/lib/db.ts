import "server-only";
import path from "node:path";

/**
 * Accès base de données.
 * - Avec DATABASE_URL : Postgres (Neon, Supabase, serveur maison…) via le paquet `postgres`.
 * - Sans : PGlite, un Postgres embarqué stocké dans .data/pglite. Un seul processus à la fois.
 */

export type Queryable = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export type Db = Queryable & {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
};

const SCHEMA = `
create table if not exists users (
  id text primary key,
  pseudo text not null,
  pseudo_key text not null unique,
  password_hash text not null,
  shards integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions(user_id);
create table if not exists collection (
  user_id text not null references users(id) on delete cascade,
  work_id text not null,
  copies integer not null default 0,
  gold integer not null default 0,
  first_at timestamptz not null default now(),
  primary key (user_id, work_id)
);
create table if not exists packs (
  user_id text not null references users(id) on delete cascade,
  day text not null,
  cards jsonb not null,
  opened_at timestamptz not null default now(),
  primary key (user_id, day)
);
`;

async function createPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 5, onnotice: () => {} });
  const wrap = (runner: { unsafe: typeof sql.unsafe }): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await runner.unsafe(text, params as never[])) as unknown as T[];
    },
  });
  const db: Db = {
    ...wrap(sql),
    transaction: (fn) => sql.begin((tx) => fn(wrap(tx as unknown as typeof sql))) as never,
  };
  await sql.unsafe(SCHEMA);
  return db;
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const pg = new PGlite(dir);
  await pg.exec(SCHEMA);
  type Runner = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (runner: Runner): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await runner.query(text, params)).rows as T[];
    },
  });
  return {
    ...wrap(pg),
    transaction: (fn) => pg.transaction((tx) => fn(wrap(tx))),
  };
}

const globalForDb = globalThis as unknown as { toondexDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.toondexDb) {
    const url = process.env.DATABASE_URL;
    globalForDb.toondexDb = url ? createPostgres(url) : createPglite();
    globalForDb.toondexDb.catch(() => {
      globalForDb.toondexDb = undefined;
    });
  }
  return globalForDb.toondexDb;
}
