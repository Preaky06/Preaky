import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { exchangeCode } from "@/lib/discord";
import { createSession } from "@/lib/auth";
import { one, run } from "@/lib/db";

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const fail = (msg: string) => NextResponse.redirect(new URL(`/login?erreur=${encodeURIComponent(msg)}`, base));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("casier_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) return fail("Connexion Discord invalide, réessaie.");

  let profile: { id: string; username: string };
  try {
    profile = await exchangeCode(code);
  } catch {
    return fail("Discord a refusé la connexion.");
  }

  await run(
    `INSERT INTO users (id, discord_id, username) VALUES (?, ?, ?)
     ON CONFLICT(discord_id) DO UPDATE SET username = excluded.username`,
    [randomUUID(), profile.id, profile.username],
  );
  const user = await one<{ id: string }>("SELECT id FROM users WHERE discord_id = ?", [profile.id]);
  if (!user) return fail("Création du compte impossible.");
  await createSession(user.id);
  const res = NextResponse.redirect(new URL("/dashboard", base));
  res.cookies.delete("casier_oauth_state");
  return res;
}
