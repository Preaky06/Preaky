import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { one } from "./db";

const COOKIE = "casier_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export type User = { id: string; discord_id: string; username: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET manquant");
  return "dev-secret-not-for-production";
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function verify(value: string, signature: string): boolean {
  const a = Buffer.from(sign(value));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const devLoginEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "1";

export const secureCookies = () => (process.env.APP_URL ?? "").startsWith("https://");

export async function createSession(userId: string): Promise<void> {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, exp, sig] = raw.split(".");
  if (!userId || !exp || !sig || !verify(`${userId}.${exp}`, sig)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return one<User>("SELECT id, discord_id, username FROM users WHERE id = ?", [userId]);
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
