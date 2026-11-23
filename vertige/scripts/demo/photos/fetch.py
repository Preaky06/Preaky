"""Récupère les images Wikimedia Commons des objets (via Wikidata), avec cache disque et pauses polies.
Usage : fetch.py photo-sources.json outdir
Sorties : outdir/raw/<slug>.<ext> et outdir/manifest.json (fichier, auteur, licence, source)."""
import hashlib, html, json, os, re, sys, time
from pathlib import Path
import requests

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
CACHE = OUT / "cache"; RAW = OUT / "raw"
for d in (CACHE, RAW): d.mkdir(parents=True, exist_ok=True)
S = requests.Session()
# Politique Wikimedia : contact obligatoire dans le User-Agent, lu dans VG_CONTACT (jamais écrit dans un fichier).
# Avec le jeton Wikimedia (injecté par le proxy), l'identification passe par l'authentification.
contact = os.environ.get("VG_CONTACT")
S.headers["User-Agent"] = f"VertigeDemoPrototype/0.1{f' ({contact})' if contact else ''} python-requests/{requests.__version__}"
WD = "https://www.wikidata.org/w/api.php"
CM = "https://commons.wikimedia.org/w/api.php"
LOG = open(OUT / "fetch.log", "a")
def log(*a):
    print(*a, file=LOG, flush=True)

def api(url, params):
    key = hashlib.sha1((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()
    f = CACHE / f"{key}.json"
    if f.exists():
        return json.loads(f.read_text())
    if os.environ.get("OFFLINE"):
        log("hors ligne : réponse absente du cache", params.get("action"), str(params)[:80]); return {}
    for attempt in range(40):
        r = S.get(url, params=params, timeout=60)
        if r.status_code == 429 or r.status_code >= 500:
            wait = float(r.headers.get("Retry-After") or 15)
            log(f"429/5xx, pause {wait}s"); time.sleep(min(max(wait, 5), 90)); continue
        r.raise_for_status()
        data = r.json(); f.write_text(json.dumps(data)); time.sleep(2)
        return data
    raise RuntimeError("API indisponible")

spec = {k: v for k, v in json.loads(SRC.read_text()).items() if not k.startswith("_")}
entries = {}
for slug, v in spec.items():
    v, _, kind = v.partition("|")
    prop = "P18"
    if v.startswith("flag:"): prop, v = "P41", v[5:]
    elif v.startswith("logo:"): prop, v = "P154", v[5:]
    lang, _, title = v.partition(":")
    entries[slug] = {"site": f"{lang}wiki", "title": title, "prop": prop, "kind": kind or ("flag" if prop == "P41" else "logo" if prop == "P154" else "cutout")}

# 1. Titres Wikipédia -> entités Wikidata (50 par requête)
def best(claims, prop):
    vals = [c for c in claims.get(prop, []) if c["mainsnak"].get("datavalue")]
    vals.sort(key=lambda c: {"preferred": 0, "normal": 1}.get(c.get("rank"), 2))
    return vals[0]["mainsnak"]["datavalue"]["value"] if vals else None

def resolve(site, titles):
    found = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        d = api(WD, {"action": "wbgetentities", "sites": site, "titles": "|".join(chunk), "props": "claims|sitelinks", "sitefilter": site, "format": "json"})
        for qid, e in d.get("entities", {}).items():
            if "missing" in e: continue
            t = e.get("sitelinks", {}).get(site, {}).get("title")
            if t: found[t] = e
    return found

by_site = {}
for e in entries.values(): by_site.setdefault(e["site"], set()).add(e["title"])
# Entités déjà obtenues lors d'un passage précédent (réponses en cache) : on ne redemande que le reste.
known = {}
for f in CACHE.glob("*.json"):
    for e in json.loads(f.read_text()).get("entities", {}).values():
        for site, sl in e.get("sitelinks", {}).items():
            known.setdefault(site, {})[sl["title"]] = e
ent = {}
for site, titles in by_site.items():
    have = {t: known.get(site, {})[t] for t in titles if t in known.get(site, {})}
    todo = sorted(set(titles) - set(have))
    ent[site] = {**have, **resolve(site, todo)}
    log(site, len(titles), "titres,", len(ent[site]), "trouvés")

# Titres absents (redirections, variantes) : recherche plein texte (une requête par titre), puis entités par lots
missing = sorted({(e["site"], e["title"]) for e in entries.values() if e["title"] not in ent[e["site"]]})
if os.environ.get("SKIP_FALLBACK"): log("replis reportés :", [t for _, t in missing]); missing = []
log(len(missing), "titres à rechercher")
picked = {}
for site, title in missing:
    d = api(WD, {"action": "wbsearchentities", "search": title, "language": "en", "limit": 1, "format": "json", "type": "item"})
    hits = d.get("search", [])
    if not hits: log("introuvable", title); continue
    picked[(site, title)] = hits[0]["id"]
    log("repli", title, "->", hits[0]["id"], hits[0].get("label"), "|", hits[0].get("description"))
qids = sorted(set(picked.values()))
byq = {}
for i in range(0, len(qids), 50):
    d = api(WD, {"action": "wbgetentities", "ids": "|".join(qids[i:i + 50]), "props": "claims", "format": "json"})
    byq.update(d.get("entities", {}))
for (site, title), q in picked.items():
    if q in byq: ent[site][title] = byq[q]

files = {}
for slug, e in entries.items():
    en = ent[e["site"]].get(e["title"])
    if not en: continue
    claims = en.get("claims", {})
    p31 = [c["mainsnak"]["datavalue"]["value"]["id"] for c in claims.get("P31", []) if c["mainsnak"].get("datavalue")]
    if "Q5" in p31: log("personne, ignoré", slug); continue
    f = best(claims, e["prop"])
    if not f and e["prop"] == "P18": f = best(claims, "P154")  # repli logo
    if not f and e["prop"] in ("P154", "P41"):
        f = best(claims, "P18")  # repli photo
        if f: e = {**e, "kind": "photo"}
    if not f: log("pas d'image", slug, e["title"], e["prop"]); continue
    files[slug] = {"file": f, "qid": en.get("id") or en.get("title"), **e}

# 2. Métadonnées Commons (50 fichiers par requête)
names = sorted({v["file"] for v in files.values()})
meta = {}
for i in range(0, len(names), 50):
    chunk = names[i:i + 50]
    d = api(CM, {"action": "query", "titles": "|".join("File:" + n for n in chunk), "prop": "imageinfo",
                 "iiprop": "url|extmetadata|mime|size", "iiurlwidth": 960, "format": "json",
                 "iiextmetadatafilter": "Artist|LicenseShortName|LicenseUrl|UsageTerms|AttributionRequired|Restrictions"})
    norm = {n["to"]: n["from"] for n in d.get("query", {}).get("normalized", [])}
    for p in d.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii: continue
        title = norm.get(p["title"], p["title"])[5:]
        meta[title] = ii
        meta[p["title"][5:]] = ii

FREE = re.compile(r"^(cc0|cc[- ]by(-sa)?[- ]\d(\.\d)?|cc by(-sa)? \d(\.\d)?|public domain|pd\b|pd-|gfdl|copyrighted free use|attribution|ogl|fal\b|free art|apache|bsd|no restrictions)", re.I)
def clean(s):
    s = re.sub(r"<[^>]+>", "", html.unescape(s or "")).strip()
    return re.sub(r"\s+", " ", s)[:140]

manifest = json.loads((OUT / "manifest.json").read_text()) if (OUT / "manifest.json").exists() else {}
links = {}
# Vedettes de l'Ascension d'abord : ce sont les images les plus vues.
demo = json.loads(Path("/home/user/Preaky/vertige/data/demo/ascension.demo.json").read_text())["items"]
rank = {i["slug"]: (0 if i["is_hero"] else 1, i.get("hero_order") or 0) for i in demo}
for slug, v in sorted(files.items(), key=lambda kv: rank.get(kv[0], (2, 0))):
    ii = meta.get(v["file"]) or meta.get(v["file"].replace("_", " "))
    if not ii: log("métadonnées absentes", slug, v["file"]); continue
    em = ii.get("extmetadata", {})
    lic = clean(em.get("LicenseShortName", {}).get("value"))
    if not FREE.match(lic) or "fair use" in lic.lower() or "non-free" in lic.lower():
        log("licence refusée", slug, lic); continue
    author = clean(em.get("Artist", {}).get("value")) or "auteur inconnu"
    url = ii.get("thumburl") or ii["url"]
    # Miniatures annoncées sur thumb.wikimedia.org : même chemin servi par upload.wikimedia.org.
    url = url.replace("://thumb.wikimedia.org/", "://upload.wikimedia.org/").split("?")[0]
    ext = ".png" if ("png" in url.lower() or ii.get("mime") in ("image/svg+xml", "image/png")) else ".jpg"
    if os.environ.get("LINKS"):
        w = ii.get("width") or 0
        orig = ii["url"].split("?")[0]
        m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons)/(\w/\w\w)/([^?]+)", orig)
        if not m: log("url inattendue", slug, orig); continue
        base, path, name = m.groups()
        svg = name.lower().endswith(".svg")
        def thumb(px):
            return f"{base}/thumb/{path}/{name}/{px}px-{name}{'.png' if svg else ''}"
        small = 500 if (svg or w > 500) else max([x for x in (250, 330) if x < w], default=None)
        large = 960 if (svg or w > 960) else small
        links[slug] = {
            "kind": "emblem" if v["kind"] in ("flag", "logo") else "photo",
            "url": thumb(small) if small else orig, "url_large": thumb(large) if large else orig,
            "file": v["file"], "author": author, "license": lic,
            "license_url": clean(em.get("LicenseUrl", {}).get("value")) or None, "source_url": ii.get("descriptionurl"),
        }
        continue
    raw = RAW / f"{slug}{ext}"
    if "/thumb/" not in url:
        # Image plus étroite que 960 px : miniature à la plus grande taille standard possible (jamais l'original).
        step = max([w for w in (250, 330, 500) if w < (ii.get("width") or 0)], default=None)
        m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons)/(\w/\w\w)/([^?]+)", ii["url"])
        if not step or not m:
            log("pas de miniature standard, ignoré", slug); continue
        url = f"{m.group(1)}/thumb/{m.group(2)}/{m.group(3)}/{step}px-{m.group(3)}"
    if not raw.exists():
        for attempt in range(12):
            r = S.get(url, timeout=60)
            if r.status_code == 429 or r.status_code >= 500:
                wait = max(float(r.headers.get("Retry-After") or 0), 300)
                log(f"téléchargement freiné ({r.status_code}), pause {wait:.0f}s"); time.sleep(min(wait + 10, 1200)); continue
            if r.status_code >= 400:
                log(f"téléchargement refusé ({r.status_code})", slug, url[-80:]); time.sleep(3); break
            raw.write_bytes(r.content); log("ok", slug); time.sleep(8); break
    if not raw.exists(): continue
    manifest[slug] = {
        "file": v["file"], "qid": v["qid"], "kind": v["kind"], "raw": raw.name,
        "author": author, "license": lic, "license_url": clean(em.get("LicenseUrl", {}).get("value")) or None,
        "source_url": ii.get("descriptionurl"), "width": ii.get("width"), "height": ii.get("height"),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
log("terminé :", len(manifest), "images sur", len(entries), "demandées")
if os.environ.get("LINKS"):
    (OUT / "links.json").write_text(json.dumps(dict(sorted(links.items())), ensure_ascii=False, indent=1))
    log("liens :", len(links))
