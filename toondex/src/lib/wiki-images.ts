/**
 * Recherche, depuis le navigateur du visiteur, l'image principale d'un article Wikipédia (anglais).
 * Les demandes faites au même moment sont groupées (50 titres par requête) et les réponses sont
 * gardées 30 jours dans le navigateur. Une redirection vers une page « List of… » est refusée :
 * l'image ne serait pas celle du personnage.
 */

const STORAGE_KEY = "toondex:wiki-images:v1";
const TTL_MS = 30 * 24 * 3600 * 1000;
const API =
  "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1" +
  "&prop=pageimages&piprop=thumbnail&pithumbsize=600&pilicense=any&titles=";

type Entry = { url: string | null; at: number };
type Listener = (url: string | null) => void;

let memory: Record<string, Entry> | null = null;
const listeners = new Map<string, Set<Listener>>();
const queued = new Set<string>();
const inFlight = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function cache(): Record<string, Entry> {
  if (memory) return memory;
  try {
    memory = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, Entry>;
  } catch {
    memory = {};
  }
  return memory;
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache()));
  } catch {
    // Stockage indisponible (navigation privée…) : le cache reste en mémoire.
  }
}

function notify(title: string, url: string | null) {
  for (const fn of listeners.get(title) ?? []) fn(url);
}

async function fetchBatch(titles: string[], attempt = 0): Promise<void> {
  try {
    const res = await fetch(API + encodeURIComponent(titles.join("|")));
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()).query ?? {};
    const alias: Record<string, string> = {};
    for (const n of data.normalized ?? []) alias[n.from] = n.to;
    for (const r of data.redirects ?? []) alias[alias[r.from] ?? r.from] = r.to;
    const pages: Record<string, { thumbnail?: { source: string } }> = Object.fromEntries(
      (data.pages ?? []).map((p: { title: string }) => [p.title, p]),
    );
    const now = Date.now();
    for (const title of titles) {
      let key = title;
      for (let i = 0; i < 3 && alias[key]; i++) key = alias[key];
      const ok = !key.startsWith("List of");
      const url = ok ? (pages[key]?.thumbnail?.source.split("?")[0] ?? null) : null;
      cache()[title] = { url, at: now };
      inFlight.delete(title);
      notify(title, url);
    }
    persist();
  } catch {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      return fetchBatch(titles, attempt + 1);
    }
    // Échec réseau : rien n'est mis en cache, on réessaiera à la prochaine visite.
    for (const title of titles) {
      inFlight.delete(title);
      notify(title, null);
    }
  }
}

function flush() {
  timer = null;
  const titles = [...queued];
  queued.clear();
  for (let i = 0; i < titles.length; i += 50) void fetchBatch(titles.slice(i, i + 50));
}

/** Abonne `listener` à l'image de l'article `title`. Renvoie la fonction de désabonnement. */
export function subscribeWikiImage(title: string, listener: Listener): () => void {
  const set = listeners.get(title) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(title, set);

  const hit = cache()[title];
  if (hit && Date.now() - hit.at < TTL_MS) {
    queueMicrotask(() => listener(hit.url));
  } else if (!inFlight.has(title)) {
    inFlight.add(title);
    queued.add(title);
    timer ??= setTimeout(flush, 40);
  }
  return () => {
    set.delete(listener);
  };
}
