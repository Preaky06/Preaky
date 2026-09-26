// Connexion avec Google (OpenID Connect, flux « authorization code » + PKCE).
// Aucune dépendance : le jeton d'identité est reçu directement de Google par
// le serveur, sur une connexion TLS vérifiée ; on contrôle son émetteur, son
// destinataire, sa date d'expiration et que l'adresse e-mail est vérifiée.
import crypto from "node:crypto";

const STATE_COOKIE = "explisite_google";
const STATE_TTL_MS = 10 * 60_000;

export function createGoogleAuth({ clientId, clientSecret, redirectUri, authUrl, tokenUrl, isSecure }) {
  if (!clientId || !clientSecret) return null;
  const AUTH_URL = authUrl || "https://accounts.google.com/o/oauth2/v2/auth";
  const TOKEN_URL = tokenUrl || "https://oauth2.googleapis.com/token";
  const pendings = new Map(); // state → { verifier, expires }

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of pendings) if (v.expires < now) pendings.delete(k);
  }, 60_000).unref();

  const b64url = (buf) => Buffer.from(buf).toString("base64url");
  const stateCookie = (req, value, maxAge) =>
    `${STATE_COOKIE}=${value}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure(req) ? "; Secure" : ""}`;

  return {
    // 1. Envoie la personne chez Google.
    start(req) {
      const state = b64url(crypto.randomBytes(24));
      const verifier = b64url(crypto.randomBytes(48));
      const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
      pendings.set(state, { verifier, expires: Date.now() + STATE_TTL_MS });
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri(req),
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      });
      return { location: `${AUTH_URL}?${params}`, cookie: stateCookie(req, state, STATE_TTL_MS / 1000) };
    },

    // 2. Retour de Google : échange le code contre l'identité vérifiée.
    async finish(req) {
      const url = new URL(req.url, "http://x");
      const state = url.searchParams.get("state") || "";
      const code = url.searchParams.get("code") || "";
      const clearCookie = stateCookie(req, "", 0);
      if (url.searchParams.get("error")) return { error: "cancelled", clearCookie };

      const fromCookie = String(req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([A-Za-z0-9_-]+)`))?.[1];
      const pending = pendings.get(state);
      pendings.delete(state);
      if (!state || !code || !pending || fromCookie !== state || pending.expires < Date.now()) {
        return { error: "state", clearCookie };
      }

      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret,
          redirect_uri: redirectUri(req), grant_type: "authorization_code", code_verifier: pending.verifier,
        }),
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null);
      if (!res?.ok) return { error: "token", clearCookie };
      const { id_token: idToken } = await res.json().catch(() => ({}));

      const claims = decodeJwt(idToken);
      const now = Date.now() / 1000;
      const okIssuer = claims?.iss === "https://accounts.google.com" || claims?.iss === "accounts.google.com";
      if (!claims || !okIssuer || claims.aud !== clientId || !(claims.exp > now) || !claims.sub) return { error: "token", clearCookie };
      if (!claims.email || claims.email_verified !== true) return { error: "email", clearCookie };
      return { identity: { sub: String(claims.sub), email: String(claims.email).toLowerCase() }, clearCookie };
    },
  };
}

function decodeJwt(token) {
  const part = typeof token === "string" ? token.split(".")[1] : null;
  if (!part) return null;
  try { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")); } catch { return null; }
}
