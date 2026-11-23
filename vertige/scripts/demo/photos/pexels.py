"""Photos produits Pexels : recherche par objet (titre anglais de photo-sources.json), contrôle du texte
alternatif, téléchargement. La clé est injectée par le proxy (jamais lue ici).
Usage : pexels.py photo-sources.json demo.json outdir   -> outdir/raw/<slug>.jpg + outdir/manifest.json"""
import json, re, sys, time
from pathlib import Path
import requests

SRC, DEMO, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
(OUT / "raw").mkdir(parents=True, exist_ok=True)
S = requests.Session(); S.headers["User-Agent"] = "VertigeDemoPrototype/0.1 python-requests"
LOG = open(OUT / "pexels.log", "a")
def log(*a): print(*a, file=LOG, flush=True)

STOP = {"the", "and", "of", "for", "with", "class", "series", "family", "unit", "food", "machine", "inc", "company"}
def tokens(q): return [t for t in re.findall(r"[a-z0-9]+", q.lower()) if len(t) > 2 and t not in STOP]

spec = {k: v for k, v in json.loads(SRC.read_text()).items() if not k.startswith("_")}
demo = json.loads(DEMO.read_text())["items"]
order = sorted(demo, key=lambda i: (0 if i["is_hero"] else 1, i.get("hero_order") or 0))
manifest = json.loads((OUT / "manifest.json").read_text()) if (OUT / "manifest.json").exists() else {}
done = set(json.loads((OUT / "tried.json").read_text())) if (OUT / "tried.json").exists() else set()

for it in order:
    slug = it["slug"]
    v = spec.get(slug)
    if not v or v.startswith(("flag:", "logo:")) or slug in done: continue
    v, _, kind = v.partition("|")
    query = re.sub(r"\s*\(.*?\)", "", v.split(":", 1)[1]).strip()
    for attempt in range(6):
        r = S.get("https://api.pexels.com/v1/search", params={"query": query, "per_page": 8}, timeout=30)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After") or 900); log("quota Pexels atteint, pause", wait); time.sleep(min(wait, 3600)); continue
        break
    if r.status_code == 401: log("clé refusée (401)"); sys.exit(2)
    if r.status_code != 200: log("erreur", r.status_code, slug); continue
    toks = tokens(query); best = None
    for ph in r.json().get("photos", []):
        alt = (ph.get("alt") or "").lower()
        hit = sum(1 for t in toks if t in alt)
        score = hit / max(1, len(toks))
        if (score >= 0.5 or (toks and toks[0] in alt)) and (not best or score > best[0]): best = (score, ph)
    done.add(slug); (OUT / "tried.json").write_text(json.dumps(sorted(done)))
    if not best: log("aucune photo fidèle", slug, "|", query); continue
    ph = best[1]
    img = S.get(ph["src"]["large"], timeout=60)
    if img.status_code != 200: log("téléchargement refusé", img.status_code, slug); continue
    (OUT / "raw" / f"{slug}.jpg").write_bytes(img.content)
    manifest[slug] = {"raw": f"{slug}.jpg", "kind": "photo" if kind == "photo" else "cutout", "file": ph["url"],
                      "author": f"{ph['photographer']} (Pexels)", "license": "Licence Pexels", "license_url": "https://www.pexels.com/fr-fr/licence/",
                      "source_url": ph["url"], "alt": ph.get("alt"), "query": query, "score": round(best[0], 2)}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    log("ok", slug, "|", query, "|", ph.get("alt"))
    time.sleep(0.5)
log("terminé :", len(manifest), "photos")
