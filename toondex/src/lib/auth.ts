import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "toondex_session";
const SESSION_DAYS = 30;

export type User = { id: string; pseudo: string; shards: number };

/* ---------- Mots de passe (scrypt, sel aléatoire) ---------- */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64url");
  const key = await scryptAsync(password, Buffer.from(saltText, "base64url"));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Calcul factice pour que « pseudo inconnu » prenne autant de temps que « mauvais mot de passe ». */
export async function burnPasswordCheck(password: string): Promise<void> {
  await scryptAsync(password, Buffer.alloc(16));
}

/* ---------- Pseudo ---------- */

export const PSEUDO_RULE = /^[A-Za-z0-9_.-]{3,20}$/;

export function pseudoKey(pseudo: string): string {
  return pseudo.trim().toLowerCase();
}

/* ---------- Sessions ---------- */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [
    hashToken(token),
    userId,
    expires.toISOString(),
  ]);
  // Ménage des sessions expirées de ce compte.
  await db.query("delete from sessions where user_id = $1 and expires_at < now()", [userId]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.query("delete from sessions where token_hash = $1", [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

/** Utilisateur connecté, ou null. Mis en cache le temps d'une requête. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db.query<User>(
    `select u.id, u.pseudo, u.shards from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
});

export function newUserId(): string {
  return randomUUID();
}

/* ---------- Limite de tentatives de connexion (par processus) ---------- */

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export function isLoginBlocked(key: string): boolean {
  const entry = attempts.get(key);
  return !!entry && entry.count >= MAX_ATTEMPTS && entry.until > Date.now();
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) attempts.set(key, { count: 1, until: now + WINDOW_MS });
  else entry.count += 1;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
