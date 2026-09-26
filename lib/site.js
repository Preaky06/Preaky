// Fichiers statiques, pages gabarits (accueil, pages légales, 404), robots et
// sitemap. Compression gzip/brotli et ETag pour les ressources texte.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg", ".webmanifest", ".txt", ".xml"]);

export const PAGES = {
  "/mentions-legales": { file: "mentions-legales.html", title: "Mentions légales" },
  "/confidentialite": { file: "confidentialite.html", title: "Confidentialité" },
  "/cgu": { file: "cgu.html", title: "Conditions d'utilisation" },
};

// Variables des pages légales, lues dans l'environnement.
export const LEGAL_VARS = ["OWNER_NAME", "OWNER_STATUS", "OWNER_ADDRESS", "OWNER_EMAIL", "HOSTING_PROVIDER"];

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function createSite({ publicDir, env, securityHeaders, siteUrl, trustProxy }) {
  const cache = new Map();
  const read = (rel) => fs.readFileSync(path.join(publicDir, rel), "utf8");
  const updated = new Date(fs.statSync(path.join(publicDir, "pages", "confidentialite.html")).mtime)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const missing = (name) => `<span class="missing">[à compléter : ${name}]</span>`;
  const val = (name) => (env[name] ? escapeHtml(env[name]) : missing(name));

  function legalVars() {
    const email = env.OWNER_EMAIL;
    return {
      OWNER_NAME: val("OWNER_NAME"),
      OWNER_STATUS: val("OWNER_STATUS"),
      OWNER_ADDRESS: val("OWNER_ADDRESS"),
      OWNER_EMAIL_LINK: email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : missing("OWNER_EMAIL"),
      PUBLICATION_DIRECTOR: env.PUBLICATION_DIRECTOR ? escapeHtml(env.PUBLICATION_DIRECTOR) : val("OWNER_NAME"),
      HOSTING_PROVIDER: val("HOSTING_PROVIDER"),
      HOSTING_SHORT: env.HOSTING_PROVIDER ? escapeHtml(env.HOSTING_PROVIDER.split(/[,–—(]/)[0].trim()) : missing("HOSTING_PROVIDER"),
      UPDATED: escapeHtml(updated),
    };
  }

  function fill(template, vars) {
    return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  }

  function baseUrl(req) {
    if (siteUrl) return siteUrl;
    const fwdProto = trustProxy ? String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() : "";
    const proto = fwdProto === "https" || req.socket.encrypted ? "https" : "http";
    const host = String(req.headers.host || "");
    return `${proto}://${/^[a-z0-9.-]+(:\d+)?$/i.test(host) ? host : "localhost"}`;
  }

  function send(req, res, status, body, ext, cacheControl) {
    const type = MIME[ext] || "application/octet-stream";
    const etag = `"${crypto.createHash("sha1").update(body).digest("base64url").slice(0, 20)}"`;
    const headers = { ...securityHeaders, "Content-Type": type, "Cache-Control": cacheControl, ETag: etag, Vary: "Accept-Encoding" };
    if (status === 200 && req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers); res.end(); return;
    }
    let payload = body;
    if (COMPRESSIBLE.has(ext) && body.length > 1024) {
      const accept = String(req.headers["accept-encoding"] || "");
      if (/\bbr\b/.test(accept)) { payload = compressed(body, "br"); headers["Content-Encoding"] = "br"; }
      else if (/\bgzip\b/.test(accept)) { payload = compressed(body, "gzip"); headers["Content-Encoding"] = "gzip"; }
    }
    headers["Content-Length"] = payload.length;
    res.writeHead(status, headers);
    res.end(req.method === "HEAD" ? undefined : payload);
  }

  const compressCache = new Map();
  function compressed(body, enc) {
    const key = `${enc}:${crypto.createHash("sha1").update(body).digest("hex")}`;
    let out = compressCache.get(key);
    if (!out) {
      out = enc === "br"
        ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } })
        : zlib.gzipSync(body, { level: 9 });
      if (compressCache.size > 200) compressCache.clear();
      compressCache.set(key, out);
    }
    return out;
  }

  function renderPage(req, pathName, file, title, robots = "index, follow") {
    const layout = read("pages/_layout.html");
    const content = fill(read(`pages/${file}`), legalVars());
    return Buffer.from(fill(layout, { TITLE: escapeHtml(title), ROBOTS: robots, PATH: pathName, BASE_URL: baseUrl(req), CONTENT: content }));
  }

  function notFound(req, res) {
    send(req, res, 404, renderPage(req, "/404", "404.html", "Page introuvable", "noindex"), ".html", "no-cache");
  }

  function readStatic(filePath) {
    const stat = fs.statSync(filePath, { throwIfNoEntry: false });
    if (!stat?.isFile()) return null;
    const hit = cache.get(filePath);
    if (hit && hit.mtime === stat.mtimeMs) return hit.body;
    const body = fs.readFileSync(filePath);
    cache.set(filePath, { mtime: stat.mtimeMs, body });
    return body;
  }

  return function handle(req, res) {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname); }
    catch { res.writeHead(400, securityHeaders); res.end(); return; }

    if (urlPath === "/" || urlPath === "/index.html") {
      const html = fill(read("index.html"), { BASE_URL: escapeHtml(baseUrl(req)) });
      return send(req, res, 200, Buffer.from(html), ".html", "no-cache");
    }
    const page = PAGES[urlPath.replace(/\/$/, "")];
    if (page) return send(req, res, 200, renderPage(req, urlPath.replace(/\/$/, ""), page.file, page.title), ".html", "no-cache");

    if (urlPath === "/robots.txt") {
      return send(req, res, 200, Buffer.from(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl(req)}/sitemap.xml\n`), ".txt", "public, max-age=86400");
    }
    if (urlPath === "/sitemap.xml") {
      const urls = ["/", ...Object.keys(PAGES)].map((p) => `  <url><loc>${escapeHtml(baseUrl(req) + p)}</loc></url>`).join("\n");
      return send(req, res, 200, Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`), ".xml", "public, max-age=86400");
    }

    // Les fragments de pages ne sont servis qu'à travers le gabarit.
    if (urlPath.startsWith("/pages/") && !urlPath.endsWith(".css")) return notFound(req, res);

    const filePath = path.normalize(path.join(publicDir, urlPath));
    if (!filePath.startsWith(publicDir + path.sep)) return notFound(req, res);
    const body = readStatic(filePath);
    if (!body) return notFound(req, res);

    const ext = path.extname(filePath);
    const cacheControl = urlPath === "/sw.js" ? "no-cache"
      : urlPath.startsWith("/fonts/") ? "public, max-age=31536000, immutable"
      : "public, max-age=3600";
    const extra = urlPath === "/sw.js" ? { "Service-Worker-Allowed": "/" } : {};
    Object.entries(extra).forEach(([k, v]) => res.setHeader(k, v));
    send(req, res, 200, body, ext, cacheControl);
  };
}
