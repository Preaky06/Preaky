// ExpliSite — serveur HTTP : fichiers statiques + proxy sécurisé vers l'API Claude.
// La clé API reste côté serveur ; le navigateur ne la voit jamais.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_SCHEMA, ANALYSIS_SYSTEM, CHAT_SYSTEM, LANGUAGES } from "./lib/prompts.js";
import { mockAnalysis, mockAnswer } from "./lib/mock.js";
import { createSite, LEGAL_VARS } from "./lib/site.js";
import { openStore } from "./lib/store.js";
import { createAccountRoutes } from "./lib/accounts.js";

try { process.loadEnvFile(); } catch { /* pas de .env : on utilise l'environnement */ }

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000; // 0 = port libre au hasard
const HOST = process.env.HOST || "0.0.0.0";
const MODEL = process.env.EXPLISITE_MODEL || "claude-opus-5";
const ANALYSIS_EFFORT = process.env.EXPLISITE_EFFORT || "high";
const CHAT_EFFORT = process.env.EXPLISITE_CHAT_EFFORT || "medium";
const USE_FALLBACKS = process.env.EXPLISITE_FALLBACKS !== "0";
const MAX_BODY_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 24) * 1024 * 1024;
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR) || 40;
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT) || 1000;
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const CONTACT = process.env.OWNER_EMAIL || "";
const DATA_DIR = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const ACCOUNTS = process.env.ACCOUNTS !== "0";
const ALLOW_SIGNUP = process.env.ALLOW_SIGNUP !== "0";
const MAX_DOCS_PER_USER = Number(process.env.MAX_DOCS_PER_USER) || 300;

const HAS_KEY = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const DEMO = process.env.DEMO_MODE === "1" || !HAS_KEY;
const client = HAS_KEY ? new Anthropic({ maxRetries: 2, timeout: 10 * 60 * 1000 }) : null;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILES = 12;

// ---------------------------------------------------------------- utilitaires


const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' blob: data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "script-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  ...(SITE_URL.startsWith("https://") ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
};

function sendJson(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders });
  res.end(body);
}

function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// Limiteur simple en mémoire : fenêtre glissante d'une heure par IP.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (list.length >= RATE_LIMIT) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (!list.some((t) => now - t < 3600_000)) hits.delete(ip);
}, 600_000).unref();

// Plafond global quotidien : protège la facture API si le site est pris d'assaut.
let day = new Date().toISOString().slice(0, 10);
let dayCount = 0;
function dailyCapReached() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; }
  if (dayCount >= DAILY_LIMIT) return true;
  dayCount++;
  return false;
}

// Refuse les appels d'API lancés depuis un autre site (le navigateur envoie Origin).
function foreignOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let host;
  try { host = new URL(origin).host; } catch { return true; }
  if (host === req.headers.host) return false;
  if (SITE_URL) { try { if (host === new URL(SITE_URL).host) return false; } catch { /* SITE_URL invalide */ } }
  return true;
}

function logUsage(route, message, started) {
  const u = message.usage || {};
  console.log(JSON.stringify({
    ev: "usage", route, model: message.model, stop: message.stop_reason, ms: Date.now() - started,
    input: u.input_tokens, output: u.output_tokens, cache_read: u.cache_read_input_tokens || 0, cache_write: u.cache_creation_input_tokens || 0,
  }));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Fichier trop volumineux."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(Object.assign(new Error("Requête illisible."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

function openSse(res) {
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  const send = (event, data) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const ping = setInterval(() => { if (!res.writableEnded) res.write(": ping\n\n"); }, 15_000);
  res.on("close", () => clearInterval(ping));
  return send;
}

function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "La clé API est invalide. Vérifiez ANTHROPIC_API_KEY sur le serveur.";
  if (err instanceof Anthropic.PermissionDeniedError) return "La clé API n'a pas accès à ce modèle.";
  if (err instanceof Anthropic.RateLimitError) return "Trop de demandes en ce moment. Réessayez dans une minute.";
  if (err instanceof Anthropic.BadRequestError) {
    if (/too large|too long|exceed/i.test(err.message)) return "Le document est trop volumineux. Essayez avec moins de pages.";
    if (/image|pdf|document|media/i.test(err.message)) return "Ce fichier n'a pas pu être lu. Essayez une photo plus nette ou un autre format.";
    return "La demande a été refusée par le service d'analyse.";
  }
  if (err instanceof Anthropic.InternalServerError) return "Le service d'analyse est momentanément surchargé. Réessayez.";
  if (err instanceof Anthropic.APIConnectionError) return "Impossible de joindre le service d'analyse.";
  if (err instanceof Anthropic.APIError) return `Erreur du service d'analyse (${err.status ?? "?"}).`;
  return err?.message || "Erreur inattendue.";
}

// --------------------------------------------------------- validation entrée

function validateDocument(body) {
  const files = Array.isArray(body.files) ? body.files : [];
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!files.length && !text) throw Object.assign(new Error("Ajoutez un document ou collez un texte."), { status: 400 });
  if (files.length > MAX_FILES) throw Object.assign(new Error(`${MAX_FILES} fichiers maximum.`), { status: 400 });
  if (text.length > 200_000) throw Object.assign(new Error("Texte trop long (200 000 caractères max)."), { status: 400 });
  const pdfs = files.filter((f) => f?.type === "application/pdf");
  if (pdfs.length > 1) throw Object.assign(new Error("Un seul PDF à la fois."), { status: 400 });
  for (const f of files) {
    if (!f || typeof f.data !== "string" || !(IMAGE_TYPES.has(f.type) || f.type === "application/pdf")) {
      throw Object.assign(new Error("Format non pris en charge. Utilisez une photo (JPG, PNG, WebP) ou un PDF."), { status: 400 });
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(f.data.slice(0, 200))) {
      throw Object.assign(new Error("Fichier corrompu."), { status: 400 });
    }
  }
  return { files, text };
}

// Construit les blocs de contenu du document. Le dernier bloc porte le
// cache_control pour que les questions suivantes réutilisent le cache.
function documentBlocks({ files, text }) {
  const blocks = files.map((f) =>
    f.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } }
      : { type: "image", source: { type: "base64", media_type: f.type, data: f.data } },
  );
  if (text) blocks.push({ type: "text", text: `<document_texte>\n${text}\n</document_texte>` });
  blocks[blocks.length - 1].cache_control = { type: "ephemeral" };
  return blocks;
}

function langName(code) {
  return LANGUAGES[code] || LANGUAGES.fr;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function requestExtras() {
  return USE_FALLBACKS ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : { betas: [] };
}

// ----------------------------------------------------------------- endpoints

async function handleAnalyze(req, res) {
  const body = await readJsonBody(req);
  const doc = validateDocument(body);
  const lang = langName(body.lang);
  const detail = body.detail === "detailed" ? "détaillé (développe davantage chaque point)" : "simple (phrases courtes, zéro jargon, comme pour un ami)";

  const send = openSse(res);
  let closed = false;

  if (DEMO) {
    res.on("close", () => { closed = true; });
    await mockAnalysis(send, () => closed, body.lang);
    res.end();
    return;
  }

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive", display: "summarized" },
    output_config: {
      effort: ANALYSIS_EFFORT,
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system: ANALYSIS_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...documentBlocks(doc),
          {
            type: "text",
            text: `Date du jour : ${todayIso()}.\nLangue de toutes les explications : ${lang}.\nNiveau d'explication : ${detail}.\nAnalyse ce document et remplis le schéma.`,
          },
        ],
      },
    ],
    ...requestExtras(),
  });

  res.on("close", () => { closed = true; stream.abort(); });

  const started = Date.now();
  let chars = 0;
  let phase = "";
  try {
    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const t = event.content_block.type;
        if (t === "thinking" && phase !== "thinking") { phase = "thinking"; send("phase", { phase }); }
        if (t === "text" && phase !== "writing") { phase = "writing"; send("phase", { phase }); }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "thinking_delta") send("thinking", { text: event.delta.thinking });
        else if (event.delta.type === "text_delta") {
          chars += event.delta.text.length;
          send("progress", { chars });
        }
      }
    }
    const message = await stream.finalMessage();
    logUsage("analyze", message, started);
    if (message.stop_reason === "refusal") {
      send("error", { message: "Ce document n'a pas pu être analysé. Essayez avec un autre document." });
    } else if (message.stop_reason === "max_tokens") {
      send("error", { message: "Le document est trop long pour être résumé en une fois. Essayez avec moins de pages." });
    } else {
      const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      let result;
      try { result = JSON.parse(text); }
      catch { send("error", { message: "La réponse d'analyse était incomplète. Réessayez." }); res.end(); return; }
      send("result", { result, model: message.model });
    }
  } catch (err) {
    if (!closed) {
      console.error("[analyze]", err?.status ?? "", err?.message);
      send("error", { message: friendlyError(err) });
    }
  }
  res.end();
}

async function handleAsk(req, res) {
  const body = await readJsonBody(req);
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 2000) : "";
  if (!question) throw Object.assign(new Error("Posez une question."), { status: 400 });
  const lang = langName(body.lang);
  const hasDoc = (Array.isArray(body.files) && body.files.length) || (typeof body.text === "string" && body.text.trim());
  const doc = hasDoc ? validateDocument(body) : null;
  const analysis = body.analysis && typeof body.analysis === "object" ? JSON.stringify(body.analysis).slice(0, 60_000) : "";
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const send = openSse(res);
  let closed = false;

  if (DEMO) {
    res.on("close", () => { closed = true; });
    await mockAnswer(send, () => closed, question);
    res.end();
    return;
  }

  // Premier tour : le document (ou, à défaut, l'analyse déjà faite) sert de contexte.
  const context = doc
    ? [...documentBlocks(doc), { type: "text", text: `Analyse déjà réalisée (JSON) :\n${analysis}` }]
    : [{ type: "text", text: `Le document original n'est plus disponible. Voici l'analyse qui en a été faite (JSON) :\n${analysis}`, cache_control: { type: "ephemeral" } }];

  const messages = [
    { role: "user", content: context },
    { role: "assistant", content: "J'ai le document sous les yeux. Quelle est votre question ?" },
    ...history,
    { role: "user", content: `(Date du jour : ${todayIso()}. Réponds en ${lang}.)\n\n${question}` },
  ];

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: CHAT_EFFORT },
    system: CHAT_SYSTEM,
    messages,
    ...requestExtras(),
  });
  res.on("close", () => { closed = true; stream.abort(); });
  const started = Date.now();

  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        send("delta", { text: event.delta.text });
      }
    }
    const message = await stream.finalMessage();
    logUsage("ask", message, started);
    if (message.stop_reason === "refusal") send("error", { message: "Je ne peux pas répondre à cette question." });
    else send("done", {});
  } catch (err) {
    if (!closed) {
      console.error("[ask]", err?.status ?? "", err?.message);
      send("error", { message: friendlyError(err) });
    }
  }
  res.end();
}

// Comptes et documents enregistrés (désactivables avec ACCOUNTS=0).
const store = ACCOUNTS ? openStore({ dataDir: DATA_DIR, encryptionKey: process.env.ENCRYPTION_KEY }) : null;
const accountRoutes = store ? createAccountRoutes({
  store, sendJson, readJsonBody, foreignOrigin, clientIp, validateDocument,
  allowSignup: ALLOW_SIGNUP, maxDocsPerUser: MAX_DOCS_PER_USER,
  isSecure: (req) => SITE_URL.startsWith("https://") || req.socket.encrypted
    || (TRUST_PROXY && String(req.headers["x-forwarded-proto"] || "").startsWith("https")),
}) : null;

const serveSite = createSite({ publicDir: PUBLIC_DIR, env: process.env, securityHeaders: SECURITY_HEADERS, siteUrl: SITE_URL, trustProxy: TRUST_PROXY });

const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  try {
    if (url === "/api/health" && (req.method === "GET" || req.method === "HEAD")) {
      return sendJson(res, 200, { ok: true, demo: DEMO, model: DEMO ? null : MODEL, contact: CONTACT || null, accounts: !!store });
    }
    if (url === "/api/analyze" || url === "/api/ask") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "Méthode non autorisée." });
      if (foreignOrigin(req)) return sendJson(res, 403, { error: "Origine non autorisée." });
      if (!String(req.headers["content-type"] || "").includes("application/json")) {
        return sendJson(res, 415, { error: "JSON attendu." });
      }
      if (rateLimited(clientIp(req))) {
        return sendJson(res, 429, { error: "Limite atteinte pour l'instant. Réessayez dans un moment." });
      }
      if (!DEMO && dailyCapReached()) {
        return sendJson(res, 503, { error: "ExpliSite a atteint sa limite d'analyses pour aujourd'hui. Revenez demain." });
      }
      return url === "/api/analyze" ? await handleAnalyze(req, res) : await handleAsk(req, res);
    }
    if (accountRoutes && await accountRoutes(req, res, url)) return;
    if (url.startsWith("/api/")) return sendJson(res, 404, { error: "Point d'accès inconnu." });
    if (req.method === "GET" || req.method === "HEAD") return serveSite(req, res);
    sendJson(res, 405, { error: "Méthode non autorisée." });
  } catch (err) {
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.status ? err.message : "Erreur serveur." });
    else res.end();
    if (!err.status) console.error(err);
  }
});

server.requestTimeout = 0; // les analyses longues sont streamées
server.headersTimeout = 30_000;
server.keepAliveTimeout = 65_000;
server.listen(PORT, HOST, () => {
  console.log(`ExpliSite → http://localhost:${server.address().port}  (${DEMO ? "MODE DÉMO — aucune clé API détectée" : `modèle ${MODEL}`})`);
  const missingLegal = LEGAL_VARS.filter((k) => !process.env[k]);
  if (missingLegal.length) console.warn(`⚠ Pages légales incomplètes : renseignez ${missingLegal.join(", ")} (voir .env.example).`);
});

// Arrêt propre : on laisse les analyses en cours se terminer (30 s max).
let stopping = false;
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    if (stopping) process.exit(1);
    stopping = true;
    console.log(`${sig} reçu, arrêt en cours…`);
    server.close(() => { store?.close(); process.exit(0); });
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(0), 30_000).unref();
  });
}
