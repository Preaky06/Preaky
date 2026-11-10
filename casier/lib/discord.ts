const API = "https://discord.com/api/v10";

export const isSnowflake = (v: string) => /^\d{17,20}$/.test(v);

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "identify",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export const redirectUri = () =>
  `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/discord/callback`;

export async function exchangeCode(code: string): Promise<{ id: string; username: string }> {
  const tokenRes = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? "",
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  });
  if (!tokenRes.ok) throw new Error(`Discord token: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const meRes = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) throw new Error(`Discord profil: ${meRes.status}`);
  const me = (await meRes.json()) as { id: string; username: string; global_name?: string | null };
  return { id: me.id, username: me.global_name || me.username };
}

/** Attribue le rôle membre sur le serveur Discord. Renvoie "ok" ou un message d'erreur. */
export async function assignRole(guildId: string, roleId: string, discordUserId: string): Promise<string> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return "bot non configuré";
  if (!isSnowflake(discordUserId)) return "compte sans identifiant Discord";
  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}` },
    });
    return res.ok ? "ok" : `erreur Discord ${res.status}`;
  } catch {
    return "Discord injoignable";
  }
}
