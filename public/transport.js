// Transport « serveur » : l'interface parle au serveur Node (server.js), qui
// détient la clé API. La version claude.ai remplace ce fichier par
// transport.claude.js (voir scripts/build-artifact.mjs).

export const transport = {
  kind: "server",
  features: { consent: true, print: true, ics: true, history: true, themeToggle: true, serviceWorker: true, share: true },

  analyze: (body, onEvent, signal) => postStream("/api/analyze", body, onEvent, signal),
  ask: (body, onEvent, signal) => postStream("/api/ask", body, onEvent, signal),

  async health() {
    const res = await fetch("/api/health");
    return res.json();
  },

  // Compte ExpliSite (e-mail + mot de passe), géré par le serveur.
  account: {
    me: () => json("GET", "/api/auth/me"),
    register: (email, password) => json("POST", "/api/auth/register", { email, password }),
    login: (email, password) => json("POST", "/api/auth/login", { email, password }),
    logout: () => json("POST", "/api/auth/logout", {}),
    remove: (password) => json("POST", "/api/auth/delete", { password }),
  },

  // Documents enregistrés dans le compte.
  docs: {
    label: "votre compte ExpliSite",
    list: async () => (await json("GET", "/api/documents")).documents,
    get: async (id) => (await json("GET", `/api/documents/${id}`)).document,
    create: async (doc) => (await json("POST", "/api/documents", doc)).id,
    update: (id, patch) => json("PATCH", `/api/documents/${id}`, patch),
    remove: (id) => json("DELETE", `/api/documents/${id}`),
    clear: () => json("DELETE", "/api/documents"),
  },

  // Enregistre un fichier généré par la page.
  async save(name, content, type = "text/plain;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  },
};

// Appel JSON simple ; une erreur HTTP devient une exception avec le message du serveur.
async function json(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data = {};
  try { data = await res.json(); } catch { /* réponse vide */ }
  if (!res.ok) throw Object.assign(new Error(data.error || `Erreur serveur (${res.status}).`), { status: res.status });
  return data;
}

// POST JSON, réponse en flux SSE : chaque événement est remis à onEvent.
async function postStream(url, body, onEvent, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json()).error; } catch { /* corps non JSON */ }
    if (res.status === 413) msg ||= "Document trop volumineux.";
    throw new Error(msg || `Erreur serveur (${res.status}).`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
      let event = "message", data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      let payload;
      try { payload = JSON.parse(data); } catch { continue; }
      onEvent(event, payload);
    }
  }
}
