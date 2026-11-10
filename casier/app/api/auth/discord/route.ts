import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeUrl } from "@/lib/discord";
import { secureCookies } from "@/lib/auth";

export async function GET() {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/login?erreur=Connexion Discord non configurée", process.env.APP_URL ?? "http://localhost:3000"),
    );
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("casier_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: 600,
  });
  return res;
}
