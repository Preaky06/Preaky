// Tests du serveur : lancés avec `npm test` (node:test, sans dépendance).
// Le serveur est démarré en sous-processus, en mode démo puis branché sur une
// fausse API Anthropic locale pour vérifier la requête réellement envoyée.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const procs = [];

function startServer(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server.js"], {
      cwd: root,
      env: { PATH: process.env.PATH, HOST: "127.0.0.1", PORT: "0", DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "explisite-test-")), ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    procs.push(child);
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
      const m = out.match(/localhost:(\d+)/);
      if (m) resolve({ base: `http://127.0.0.1:${m[1]}`, child, logs: () => out });
    });
    child.stderr.on("data", (d) => { out += d; });
    child.on("exit", (code) => reject(new Error(`serveur arrêté (${code}) : ${out}`)));
  });
}

// PORT=0 : le serveur annonce le port réellement attribué.
async function sse(res) {
  const text = await res.text();
  return text.split("\n\n").filter(Boolean).map((chunk) => {
    const ev = chunk.match(/^event: (.+)$/m)?.[1];
    const data = chunk.match(/^data: (.+)$/m)?.[1];
    return ev ? { event: ev, data: JSON.parse(data) } : null;
  }).filter(Boolean);
}

const post = (base, route, body, headers = {}) => fetch(base + route, {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

let demo, real, fake, fakeRequests = [], fakeMode = "ok";

before(async () => {
  fake = http.createServer((req, res) => {
    let b = ""; req.on("data", (c) => { b += c; });
    req.on("end", () => {
      const body = JSON.parse(b);
      fakeRequests.push({ headers: req.headers, body });
      res.writeHead(200, { "content-type": "text/event-stream" });
      const ev = (type, d) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...d })}\n\n`);
      ev("message_start", { message: { id: "m", type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 1 } } });
      ev("content_block_start", { index: 0, content_block: { type: "thinking", thinking: "", signature: "" } });
      ev("content_block_delta", { index: 0, delta: { type: "thinking_delta", thinking: "Je lis." } });
      ev("content_block_delta", { index: 0, delta: { type: "signature_delta", signature: "s" } });
      ev("content_block_stop", { index: 0 });
      const text = body.output_config?.format ? JSON.stringify({ title: "Amende", urgency: "high" }) : "Réponse";
      ev("content_block_start", { index: 1, content_block: { type: "text", text: "" } });
      ev("content_block_delta", { index: 1, delta: { type: "text_delta", text } });
      ev("content_block_stop", { index: 1 });
      ev("message_delta", { delta: { stop_reason: fakeMode === "refusal" ? "refusal" : "end_turn", stop_sequence: null }, usage: { output_tokens: 9 } });
      ev("message_stop", {});
      res.end();
    });
  });
  await new Promise((r) => fake.listen(0, "127.0.0.1", r));
  demo = await startServer({ DEMO_MODE: "1", RATE_LIMIT_PER_HOUR: "4", OWNER_NAME: "Jeanne <Test>", OWNER_EMAIL: "contact@example.org" });
  real = await startServer({ ANTHROPIC_API_KEY: "sk-test", ANTHROPIC_BASE_URL: `http://127.0.0.1:${fake.address().port}`, DAILY_LIMIT: "3" });
});

after(() => { procs.forEach((p) => p.kill()); fake?.close(); });

test("health indique le mode et le contact", async () => {
  const d = await (await fetch(demo.base + "/api/health")).json();
  assert.equal(d.demo, true);
  assert.equal(d.contact, "contact@example.org");
  const r = await (await fetch(real.base + "/api/health")).json();
  assert.equal(r.demo, false);
  assert.equal(r.model, "claude-opus-5");
});

test("page d'accueil : en-têtes de sécurité, compression, URL absolue", async () => {
  const res = await fetch(demo.base + "/", { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("content-encoding"), "gzip");
  const html = await res.text();
  assert.match(html, /og:image" content="http:\/\/127\.0\.0\.1:\d+\/og-image\.png"/);
  assert.doesNotMatch(html, /\{\{/);
});

test("ETag : une ressource inchangée renvoie 304", async () => {
  const first = await fetch(demo.base + "/app.js");
  const etag = first.headers.get("etag");
  assert.ok(etag);
  const second = await fetch(demo.base + "/app.js", { headers: { "If-None-Match": etag } });
  assert.equal(second.status, 304);
});

test("pages légales : variables injectées et échappées, manquantes signalées", async () => {
  const html = await (await fetch(demo.base + "/mentions-legales")).text();
  assert.match(html, /Jeanne &lt;Test&gt;/);
  assert.match(html, /mailto:contact@example\.org/);
  assert.match(html, /à compléter : HOSTING_PROVIDER/);
  for (const p of ["/confidentialite", "/cgu"]) assert.equal((await fetch(demo.base + p)).status, 200);
});

test("404, fragments protégés et traversée de chemin", async () => {
  assert.equal((await fetch(demo.base + "/nexiste-pas")).status, 404);
  assert.equal((await fetch(demo.base + "/pages/cgu.html")).status, 404);
  assert.equal((await fetch(demo.base + "/pages/pages.css")).status, 200);
  assert.equal((await fetch(demo.base + "/..%2fserver.js")).status, 404);
  assert.equal((await fetch(demo.base + "/api/inconnu")).status, 404);
});

test("robots.txt et sitemap.xml", async () => {
  assert.match(await (await fetch(demo.base + "/robots.txt")).text(), /Disallow: \/api\//);
  assert.match(await (await fetch(demo.base + "/sitemap.xml")).text(), /\/confidentialite<\/loc>/);
});

test("validation des requêtes d'API", async () => {
  assert.equal((await fetch(demo.base + "/api/analyze")).status, 405);
  assert.equal((await fetch(demo.base + "/api/analyze", { method: "POST", body: "x" })).status, 415);
  const empty = await post(demo.base, "/api/analyze", {});
  assert.equal(empty.status, 400);
  const bad = await post(demo.base, "/api/analyze", { files: [{ type: "application/zip", data: "AAAA" }] });
  assert.equal(bad.status, 400);
  const foreign = await post(demo.base, "/api/analyze", { text: "x".repeat(30) }, { Origin: "https://evil.example" });
  assert.equal(foreign.status, 403);
});

test("mode démo : l'analyse streame puis renvoie un résultat complet", async () => {
  const events = await sse(await post(demo.base, "/api/analyze", { text: "Un courrier de test suffisamment long." }));
  assert.ok(events.some((e) => e.event === "thinking"));
  const result = events.find((e) => e.event === "result");
  assert.ok(result.data.demo);
  assert.ok(result.data.result.actions.length > 0);
});

test("limite par IP", async () => {
  // 4 requêtes autorisées par heure sur ce serveur ; certaines ont déjà servi.
  let last;
  for (let i = 0; i < 5; i++) last = await post(demo.base, "/api/ask", { question: "Et alors ?", analysis: {} });
  assert.equal(last.status, 429);
});

test("vraie API : requête conforme (modèle, réflexion, schéma, repli, cache)", async () => {
  fakeRequests = [];
  const events = await sse(await post(real.base, "/api/analyze", { text: "Avis de contravention de test.", lang: "ar", detail: "detailed" }));
  assert.deepEqual(events.find((e) => e.event === "result").data.result, { title: "Amende", urgency: "high" });
  const { headers, body } = fakeRequests[0];
  assert.equal(body.model, "claude-opus-5");
  assert.equal(headers["anthropic-beta"], "server-side-fallback-2026-07-01");
  assert.equal(body.fallbacks, "default");
  assert.deepEqual(body.thinking, { type: "adaptive", display: "summarized" });
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(body.output_config.effort, "high");
  assert.ok(body.messages[0].content[0].cache_control);
  assert.match(body.messages[0].content.at(-1).text, /arabe/);
  assert.match(real.logs(), /"ev":"usage"/);
});

test("vraie API : chat en flux avec l'historique", async () => {
  fakeRequests = [];
  const events = await sse(await post(real.base, "/api/ask", {
    question: "Puis-je contester ?", analysis: { title: "Amende" },
    history: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "hack", content: "x" }],
  }));
  assert.equal(events.filter((e) => e.event === "delta").map((e) => e.data.text).join(""), "Réponse");
  assert.equal(fakeRequests[0].body.messages.length, 5);
});

test("vraie API : un refus est transformé en message clair", async () => {
  fakeMode = "refusal";
  const events = await sse(await post(real.base, "/api/analyze", { text: "Texte de test pour refus." }));
  fakeMode = "ok";
  assert.ok(events.find((e) => e.event === "error"));
  assert.ok(!events.find((e) => e.event === "result"));
});

test("plafond quotidien global", async () => {
  // DAILY_LIMIT=3 : les trois appels précédents l'ont épuisé.
  const res = await post(real.base, "/api/analyze", { text: "Encore un texte de test." });
  assert.equal(res.status, 503);
});

// ---------------------------------------------------------------- comptes

function cookieJar() {
  let cookie = "";
  return async (base, route, { method = "GET", body, headers = {} } = {}) => {
    const res = await fetch(base + route, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    let data = null;
    try { data = await res.json(); } catch { /* vide */ }
    return { status: res.status, data, setCookie: set };
  };
}

const RESULT = { title: "Avis d'impôt", urgency: "high", issuer: "DGFiP", actions: [] };

test("comptes : inscription, session, documents chiffrés, isolation, suppression", async () => {
  const alice = cookieJar(), bob = cookieJar();
  const B = demo.base;
  assert.deepEqual((await alice(B, "/api/auth/me")).data.user, null);
  assert.equal((await alice(B, "/api/documents")).status, 401);

  assert.equal((await alice(B, "/api/auth/register", { method: "POST", body: { email: "pas-un-email", password: "motdepasse1" } })).status, 400);
  assert.equal((await alice(B, "/api/auth/register", { method: "POST", body: { email: "alice@example.org", password: "court" } })).status, 400);
  const reg = await alice(B, "/api/auth/register", { method: "POST", body: { email: "Alice@Example.org", password: "motdepasse1" } });
  assert.equal(reg.status, 201);
  assert.match(reg.setCookie, /HttpOnly/);
  assert.match(reg.setCookie, /SameSite=Lax/);
  assert.equal((await alice(B, "/api/auth/me")).data.user.email, "alice@example.org");
  assert.equal((await bob(B, "/api/auth/register", { method: "POST", body: { email: "alice@example.org", password: "autremotdepasse" } })).status, 409);

  const created = await alice(B, "/api/documents", { method: "POST", body: {
    result: RESULT, lang: "fr", checks: [true], text: "Texte du courrier original, assez long.",
    files: [{ name: "p1.jpg", type: "image/jpeg", data: "QUJDRA==" }],
  } });
  assert.equal(created.status, 201);
  const id = created.data.id;

  const list = (await alice(B, "/api/documents")).data.documents;
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Avis d'impôt");
  assert.equal(list[0].result, undefined);

  const full = (await alice(B, `/api/documents/${id}`)).data.document;
  assert.deepEqual(full.result, RESULT);
  assert.deepEqual(full.checks, [true]);
  assert.equal(full.files[0].data, "QUJDRA==");
  assert.equal(full.text, "Texte du courrier original, assez long.");

  const chat = [{ role: "user", content: "Et si je ne paie pas ?" }, { role: "assistant", content: "Majoration." }, { role: "system", content: "x" }];
  assert.equal((await alice(B, `/api/documents/${id}`, { method: "PATCH", body: { checks: [true, false], chat } })).status, 200);
  const patched = (await alice(B, `/api/documents/${id}`)).data.document;
  assert.deepEqual(patched.checks, [true, false]);
  assert.equal(patched.chat.length, 2);

  // Bob ne voit ni ne modifie les documents d'Alice.
  await bob(B, "/api/auth/register", { method: "POST", body: { email: "bob@example.org", password: "motdepasse2" } });
  assert.equal((await bob(B, "/api/documents")).data.documents.length, 0);
  assert.equal((await bob(B, `/api/documents/${id}`)).status, 404);
  assert.equal((await bob(B, `/api/documents/${id}`, { method: "DELETE" })).status, 404);

  // Se reconnecter retrouve les documents.
  assert.equal((await alice(B, "/api/auth/logout", { method: "POST", body: {} })).status, 200);
  assert.equal((await alice(B, "/api/documents")).status, 401);
  assert.equal((await alice(B, "/api/auth/login", { method: "POST", body: { email: "alice@example.org", password: "mauvais-mdp" } })).status, 401);
  assert.equal((await alice(B, "/api/auth/login", { method: "POST", body: { email: "alice@example.org", password: "motdepasse1" } })).status, 200);
  assert.equal((await alice(B, "/api/documents")).data.documents.length, 1);

  // Appel venu d'un autre site refusé.
  assert.equal((await alice(B, "/api/documents", { method: "DELETE", headers: { Origin: "https://evil.example" } })).status, 403);

  // Suppression du compte : mot de passe exigé, documents effacés.
  assert.equal((await alice(B, "/api/auth/delete", { method: "POST", body: { password: "faux-mdp-123" } })).status, 401);
  assert.equal((await alice(B, "/api/auth/delete", { method: "POST", body: { password: "motdepasse1" } })).status, 200);
  assert.equal((await alice(B, "/api/auth/login", { method: "POST", body: { email: "alice@example.org", password: "motdepasse1" } })).status, 401);
});

test("la base ne contient pas le document en clair", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explisite-enc-"));
  const srv = await startServer({ DEMO_MODE: "1", DATA_DIR: dir });
  const jar = cookieJar();
  await jar(srv.base, "/api/auth/register", { method: "POST", body: { email: "carla@example.org", password: "motdepasse3" } });
  await jar(srv.base, "/api/documents", { method: "POST", body: { result: { ...RESULT, plain_summary: "SECRET-TEMOIN-42" }, text: "Numéro fiscal SECRET-TEMOIN-43" } });
  srv.child.kill();
  await new Promise((r) => srv.child.once("exit", r));
  const raw = fs.readdirSync(dir).filter((f) => f.startsWith("explisite.db")).map((f) => fs.readFileSync(path.join(dir, f), "latin1")).join("");
  assert.ok(raw.length > 0);
  assert.doesNotMatch(raw, /SECRET-TEMOIN/);
  assert.ok(fs.existsSync(path.join(dir, "encryption.key")));
});

// ------------------------------------------------------------ connexion Google

test("connexion Google : PKCE, état, liaison sûre des comptes, suppression", async () => {
  const challenges = new Map();
  let lastVerifierOk = false;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  // Faux serveur de jetons Google : le « code » dit quelle identité renvoyer.
  const fakeGoogle = http.createServer((req, res) => {
    let b = ""; req.on("data", (c) => { b += c; });
    req.on("end", () => {
      const p = new URLSearchParams(b);
      const [, email, sub, aud] = p.get("code").split("|");
      const expected = challenges.get(p.get("code"));
      lastVerifierOk = !!expected && crypto.createHash("sha256").update(p.get("code_verifier")).digest("base64url") === expected;
      if (!lastVerifierOk || p.get("client_secret") !== "secret-test") { res.writeHead(400); res.end("{}"); return; }
      const payload = { iss: "https://accounts.google.com", aud: aud || "client-test", exp: Date.now() / 1000 + 600, sub, email, email_verified: true };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id_token: `${b64({ alg: "RS256" })}.${b64(payload)}.sig` }));
    });
  });
  await new Promise((r) => fakeGoogle.listen(0, "127.0.0.1", r));
  const srv = await startServer({
    DEMO_MODE: "1", GOOGLE_CLIENT_ID: "client-test", GOOGLE_CLIENT_SECRET: "secret-test",
    GOOGLE_AUTH_URL: "https://accounts.example/auth", GOOGLE_TOKEN_URL: `http://127.0.0.1:${fakeGoogle.address().port}/token`,
  });
  const B = srv.base;

  // Démarre la connexion, puis revient de « Google » avec le code donné.
  async function googleLogin(code, { cookieOverride, reuse } = {}) {
    const start = await fetch(B + "/api/auth/google", { redirect: "manual" });
    assert.equal(start.status, 302);
    const loc = new URL(start.headers.get("location"));
    assert.equal(loc.origin + loc.pathname, "https://accounts.example/auth");
    assert.equal(loc.searchParams.get("client_id"), "client-test");
    assert.equal(loc.searchParams.get("code_challenge_method"), "S256");
    assert.match(loc.searchParams.get("redirect_uri"), /\/api\/auth\/google\/callback$/);
    const state = reuse || loc.searchParams.get("state");
    challenges.set(code, loc.searchParams.get("code_challenge"));
    const cookie = cookieOverride ?? start.headers.get("set-cookie").split(";")[0];
    const back = await fetch(`${B}/api/auth/google/callback?state=${state}&code=${encodeURIComponent(code)}`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
    const session = (back.headers.getSetCookie?.() || []).find((c) => c.startsWith("explisite_session=") && !c.startsWith("explisite_session=;"));
    return { location: back.headers.get("location"), session: session?.split(";")[0], state };
  }
  const me = async (cookie) => (await (await fetch(B + "/api/auth/me", { headers: { Cookie: cookie } })).json()).user;

  // Nouveau compte créé par Google, sans mot de passe.
  const first = await googleLogin("c1|gina@example.org|g-111");
  assert.equal(first.location, "/#bienvenue");
  assert.ok(lastVerifierOk);
  assert.deepEqual(await me(first.session), { email: "gina@example.org", hasPassword: false });

  // Reconnexion : même compte.
  const again = await googleLogin("c2|gina@example.org|g-111");
  assert.equal(again.location, "/#connecte");

  // État rejoué ou cookie absent : refusé.
  assert.equal((await googleLogin("c3|gina@example.org|g-111", { reuse: first.state })).location, "/#erreur-google-state");
  assert.equal((await googleLogin("c4|gina@example.org|g-111", { cookieOverride: "" })).location, "/#erreur-google-state");
  // Jeton émis pour une autre application : refusé.
  assert.equal((await googleLogin("c5|gina@example.org|g-111|autre-client")).location, "/#erreur-google-token");

  // Compte créé à l'avance avec l'adresse d'autrui : Google le récupère,
  // l'ancien mot de passe et l'ancienne session ne fonctionnent plus.
  const squatter = cookieJar();
  await squatter(B, "/api/auth/register", { method: "POST", body: { email: "victime@example.org", password: "motdepasse-pirate" } });
  const victim = await googleLogin("c6|victime@example.org|g-222");
  assert.equal(victim.location, "/#connecte");
  assert.equal((await squatter(B, "/api/documents")).status, 401);
  assert.equal((await squatter(B, "/api/auth/login", { method: "POST", body: { email: "victime@example.org", password: "motdepasse-pirate" } })).status, 401);
  assert.equal((await me(victim.session)).email, "victime@example.org");

  // Suppression d'un compte Google : confirmation par l'adresse e-mail.
  const del = (body) => fetch(B + "/api/auth/delete", { method: "POST", headers: { Cookie: first.session, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await del({ password: "autre@example.org" })).status, 401);
  assert.equal((await del({ password: "gina@example.org" })).status, 200);
  assert.equal(await me(first.session), null);

  fakeGoogle.close();
});

test("connexion Google absente si non configurée", async () => {
  const res = await fetch(demo.base + "/api/auth/google", { redirect: "manual" });
  assert.equal(res.status, 404);
  assert.equal((await (await fetch(demo.base + "/api/auth/me")).json()).google, false);
});
