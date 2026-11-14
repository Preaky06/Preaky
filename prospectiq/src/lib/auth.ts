// Authentification : mots de passe scrypt, sessions opaques stockées hachées, cookie HttpOnly.
import 'server-only';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { q, one } from './db';
import { env } from './env';
import { planOf, type Plan } from './plans';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
export const SESSION_COOKIE = 'piq_session';
const N = 16384;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, saltB64, hashB64] = String(stored).split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(n), r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  plan: Plan;
  subscriptionStatus: string | null;
}

export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + env.sessionDays * 86400000);
  const h = await headers();
  await q('insert into sessions (id, user_id, expires_at, ip, user_agent) values ($1, $2, $3, $4, $5)', [
    sha256(token),
    userId,
    expires,
    (h.get('x-forwarded-for') || '').split(',')[0].trim() || null,
    (h.get('user-agent') || '').slice(0, 300),
  ]);
  await q('update users set last_login_at = now() where id = $1', [userId]);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/', expires });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q('delete from sessions where id = $1', [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one<{
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'member';
    is_admin: boolean;
    disabled_at: Date | null;
    org_id: string;
    org_name: string;
    plan: string;
    subscription_status: string | null;
    expires_at: Date;
  }>(
    `select u.id, u.email, u.name, u.role, u.is_admin, u.disabled_at, u.org_id, o.name as org_name, o.plan, o.subscription_status, s.expires_at
       from sessions s join users u on u.id = s.user_id join orgs o on o.id = u.org_id
      where s.id = $1`,
    [sha256(token)],
  );
  if (!row || new Date(row.expires_at) < new Date() || row.disabled_at) return null;
  const isAdmin = row.is_admin || env.adminEmails.includes(row.email.toLowerCase());
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isAdmin,
    orgId: row.org_id,
    orgName: row.org_name,
    plan: planOf(row.plan),
    subscriptionStatus: row.subscription_status,
  };
}

/** Pour les pages serveur : redirige vers la connexion si besoin. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/connexion');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect('/app');
  return user;
}

export function passwordProblem(pw: string): string | null {
  if (typeof pw !== 'string' || pw.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.';
  if (pw.length > 200) return 'Mot de passe trop long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Le mot de passe doit contenir des lettres et des chiffres.';
  return null;
}
