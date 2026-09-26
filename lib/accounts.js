// Routes des comptes et des documents enregistrés :
//   GET  /api/auth/me            POST /api/auth/register|login|logout|delete
//   GET  /api/documents          POST /api/documents          DELETE /api/documents
//   GET  /api/documents/:id      PATCH /api/documents/:id     DELETE /api/documents/:id
// La session est un jeton aléatoire dans un cookie HttpOnly ; seule son
// empreinte SHA-256 est stockée.

const COOKIE = "explisite_session";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export function createAccountRoutes({ store, sendJson, readJsonBody, foreignOrigin, clientIp, isSecure, validateDocument, allowSignup, maxDocsPerUser }) {
  // Limite les tentatives de connexion et d'inscription (par IP, par heure).
  const attempts = new Map();
  const tooManyAttempts = (ip) => {
    const now = Date.now();
    const list = (attempts.get(ip) || []).filter((t) => now - t < 3600_000);
    list.push(now);
    attempts.set(ip, list);
    return list.length > 20;
  };
  setInterval(() => {
    const now = Date.now();
    for (const [ip, list] of attempts) if (!list.some((t) => now - t < 3600_000)) attempts.delete(ip);
  }, 600_000).unref();

  const cookieHeader = (req, value, maxAge) =>
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure(req) ? "; Secure" : ""}`;

  const tokenOf = (req) => {
    const m = String(req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]+)`));
    return m ? m[1] : null;
  };

  const fail = (status, message) => Object.assign(new Error(message), { status });

  async function credentials(req) {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!EMAIL_RE.test(email) || email.length > 254) throw fail(400, "Adresse e-mail invalide.");
    if (password.length < 8) throw fail(400, "Le mot de passe doit contenir au moins 8 caractères.");
    if (password.length > 200) throw fail(400, "Mot de passe trop long.");
    return { email, password };
  }

  function login(req, res, user, status = 200) {
    const { token, maxAge } = store.createSession(user.id);
    sendJson(res, status, { user: { email: user.email } }, { "Set-Cookie": cookieHeader(req, token, maxAge) });
  }

  // Valide ce que le navigateur envoie pour enregistrer une analyse.
  function documentInput(body) {
    const result = body.result;
    if (!result || typeof result !== "object" || Array.isArray(result)) throw fail(400, "Analyse manquante.");
    if (JSON.stringify(result).length > 200_000) throw fail(413, "Analyse trop volumineuse.");
    const hasDoc = (Array.isArray(body.files) && body.files.length) || (typeof body.text === "string" && body.text.trim());
    const doc = hasDoc ? validateDocument(body) : { files: [], text: "" };
    return {
      result,
      lang: typeof body.lang === "string" ? body.lang : "fr",
      demo: !!body.demo,
      checks: Array.isArray(body.checks) ? body.checks.map(Boolean).slice(0, 100) : [],
      chat: cleanChat(body.chat),
      files: doc.files.map(({ name, type, data }) => ({ name: String(name || "").slice(0, 200), type, data })),
      text: doc.text,
    };
  }

  // Renvoie true si la requête a été traitée ici.
  return async function handle(req, res, url) {
    if (!url.startsWith("/api/auth/") && url !== "/api/documents" && !url.startsWith("/api/documents/")) return false;

    const mutating = req.method !== "GET" && req.method !== "HEAD";
    if (mutating) {
      if (foreignOrigin(req)) { sendJson(res, 403, { error: "Origine non autorisée." }); return true; }
      const hasBody = req.method === "POST" || req.method === "PATCH";
      if (hasBody && !String(req.headers["content-type"] || "").includes("application/json")) {
        sendJson(res, 415, { error: "JSON attendu." }); return true;
      }
    }
    const token = tokenOf(req);
    const user = store.sessionUser(token);

    // ------------------------------------------------------------ comptes
    if (url === "/api/auth/me" && req.method === "GET") {
      sendJson(res, 200, { user: user ? { email: user.email } : null, signup: allowSignup });
      return true;
    }
    if ((url === "/api/auth/register" || url === "/api/auth/login") && req.method === "POST") {
      if (tooManyAttempts(clientIp(req))) throw fail(429, "Trop de tentatives. Réessayez dans une heure.");
      const { email, password } = await credentials(req);
      if (url === "/api/auth/register") {
        if (!allowSignup) throw fail(403, "Les inscriptions sont fermées.");
        const created = await store.createUser(email, password);
        if (!created) throw fail(409, "Un compte existe déjà avec cette adresse. Connectez-vous.");
        login(req, res, created, 201);
      } else {
        const found = await store.checkLogin(email, password);
        if (!found) throw fail(401, "E-mail ou mot de passe incorrect.");
        login(req, res, found);
      }
      return true;
    }
    if (url === "/api/auth/logout" && req.method === "POST") {
      store.deleteSession(token);
      sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(req, "", 0) });
      return true;
    }

    if (!user) throw fail(401, "Connectez-vous pour accéder à vos documents.");

    if (url === "/api/auth/delete" && req.method === "POST") {
      if (tooManyAttempts(clientIp(req))) throw fail(429, "Trop de tentatives. Réessayez dans une heure.");
      const body = await readJsonBody(req);
      if (!(await store.checkPassword(user.id, String(body.password || "")))) throw fail(401, "Mot de passe incorrect.");
      store.deleteUser(user.id);
      sendJson(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(req, "", 0) });
      return true;
    }

    // ---------------------------------------------------------- documents
    if (url === "/api/documents") {
      if (req.method === "GET") { sendJson(res, 200, { documents: store.listDocuments(user.id) }); return true; }
      if (req.method === "POST") {
        if (store.countDocuments(user.id) >= maxDocsPerUser) {
          throw fail(409, `Vous avez atteint ${maxDocsPerUser} documents enregistrés. Supprimez-en quelques-uns.`);
        }
        const id = store.createDocument(user.id, documentInput(await readJsonBody(req)));
        sendJson(res, 201, { id });
        return true;
      }
      if (req.method === "DELETE") { sendJson(res, 200, { deleted: store.deleteAllDocuments(user.id) }); return true; }
    }
    const m = url.match(/^\/api\/documents\/([0-9a-f-]{36})$/);
    if (m) {
      const id = m[1];
      if (req.method === "GET") {
        const doc = store.getDocument(user.id, id);
        if (!doc) throw fail(404, "Document introuvable.");
        sendJson(res, 200, { document: doc });
        return true;
      }
      if (req.method === "PATCH") {
        const body = await readJsonBody(req);
        const patch = {};
        if (Array.isArray(body.checks)) patch.checks = body.checks;
        if (Array.isArray(body.chat)) patch.chat = cleanChat(body.chat);
        if (!store.updateDocument(user.id, id, patch)) throw fail(404, "Document introuvable.");
        sendJson(res, 200, { ok: true });
        return true;
      }
      if (req.method === "DELETE") {
        if (!store.deleteDocument(user.id, id)) throw fail(404, "Document introuvable.");
        sendJson(res, 200, { ok: true });
        return true;
      }
    }
    sendJson(res, 404, { error: "Point d'accès inconnu." });
    return true;
  };
}

function cleanChat(chat) {
  return (Array.isArray(chat) ? chat : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
}
