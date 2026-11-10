import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id),
    plan TEXT NOT NULL DEFAULT 'free',
    questions TEXT NOT NULL,
    discord_guild_id TEXT,
    discord_role_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS memberships (
    community_id TEXT NOT NULL REFERENCES communities(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('owner','staff','member')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (community_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES communities(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    answers TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    reviewer_id TEXT REFERENCES users(id),
    review_note TEXT,
    discord_sync TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_applications_community ON applications(community_id, status)`,
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES communities(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birthdate TEXT NOT NULL DEFAULT '',
    occupation TEXT NOT NULL DEFAULT '',
    backstory TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_characters_community ON characters(community_id)`,
  `CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    community_id TEXT NOT NULL REFERENCES communities(id),
    author_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    amount INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_records_character ON records(character_id)`,
  `CREATE TABLE IF NOT EXISTS waitlist (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    community TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

type Store = { client?: Client; ready?: Promise<void> };
const store = ((globalThis as unknown as { __casierDb?: Store }).__casierDb ??= {});

function client(): Client {
  if (!store.client) {
    const url = process.env.DATABASE_URL || "file:./data/casier.db";
    if (url.startsWith("file:")) mkdirSync(dirname(url.slice(5)), { recursive: true });
    store.client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return store.client;
}

function ensureSchema(): Promise<void> {
  store.ready ??= client()
    .batch(SCHEMA, "write")
    .then(() => undefined);
  return store.ready;
}

export async function query<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await client().execute({ sql, args });
  return res.rows.map((row) => {
    const out: Record<string, unknown> = {};
    res.columns.forEach((col, i) => (out[col] = row[i]));
    return out as T;
  });
}

export async function one<T>(sql: string, args: InValue[] = []): Promise<T | null> {
  return (await query<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []): Promise<void> {
  await ensureSchema();
  await client().execute({ sql, args });
}
