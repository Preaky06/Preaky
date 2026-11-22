"""Aperçu complet de VERTIGE (toutes les pages) publiable comme artefact multi-fichiers.

- Chaque page pré-rendue de Next devient un fichier HTML à la racine (explorer.html, categorie-<slug>.html, …).
- Les 1 000 fiches passent par une seule page, apercu-fiche.html#<slug> (route /apercu/fiche) :
  des fichiers séparés dépasseraient la limite de fichiers d'une version d'artefact.
- Les chemins absolus deviennent relatifs ; les liens internes sont redirigés vers ces fichiers.
- Les visuels sont regroupés dans images.js (la limite de fichiers par version l'impose).
- La page principale (index.html) est enveloppée par l'artefact : son en-tête Next est remonté
  dans <head> avant l'hydratation.
"""
import base64, json, re, shutil, sys
from pathlib import Path

app, out = Path(sys.argv[1]), Path(sys.argv[2])
if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)
srv = app / ".next/server/app"
PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

pages = {"index.html": srv / "index.html", "accueil.html": srv / "index.html"}
for name in ["explorer", "duel", "jeu", "budget", "methodologie", "design"]:
    pages[f"{name}.html"] = srv / f"{name}.html"
pages["apercu-fiche.html"] = srv / "apercu/fiche.html"
for sub in ["categorie"]:
    for f in sorted((srv / sub).glob("*.html")):
        if not f.name.startswith("["):
            pages[f"{sub}-{f.name}"] = f

BOOT = r"""<script>
(function () {
  var root = document.documentElement;
  if (!root.className) { root.lang = %(lang)s; root.className = %(cls)s; }
  window.TURBOPACK_CHUNK_BASE_PATH = "next/";

  /* Visuels regroupés dans images.js : on traduit "…/objets/x.webp" en données intégrées. */
  function key(v) { var m = /objets\/([^"'?#]+\.webp)/.exec(v || ""); return m ? m[1] : null; }
  function img(v) { var k = key(v); return k && window.__VG_IMG ? window.__VG_IMG[k] || null : null; }
  var setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    if ((n === "src" || n === "href") && typeof v === "string" && v.indexOf("objets/") !== -1) {
      var r = img(v); if (r) return setAttr.call(this, n, r);
    }
    return setAttr.call(this, n, v);
  };
  var d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true, get: d.get,
    set: function (v) { var r = typeof v === "string" ? img(v) : null; d.set.call(this, r || v); }
  });
  function swap(el) {
    var k = el.getAttribute("data-vg"), r = k && window.__VG_IMG && window.__VG_IMG[k];
    if (r) { setAttr.call(el, el.tagName.toLowerCase() === "image" ? "href" : "src", r); el.removeAttribute("data-vg"); }
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.hasAttribute("data-vg")) swap(node);
    var list = node.querySelectorAll ? node.querySelectorAll("[data-vg]") : [];
    for (var i = 0; i < list.length; i++) swap(list[i]);
  }
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      for (var j = 0; j < r.addedNodes.length; j++) scan(r.addedNodes[j]);
    }
  }).observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", function () { scan(document.documentElement); });

  /* Pas de serveur : les préchargements de routes sont neutralisés. */
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && (input.href || input.url)) || "";
    if (url.indexOf("_rsc=") !== -1) return Promise.resolve(new Response("", { status: 204 }));
    return nativeFetch(input, init);
  };

  /* Liens internes → fichiers de l'aperçu. */
  var IS_HOME = %(home)s;
  function target(href) {
    var hash = "", q = "", path = href;
    var h = path.indexOf("#"); if (h !== -1) { hash = path.slice(h); path = path.slice(0, h); }
    var s = path.indexOf("?"); if (s !== -1) { q = path.slice(s); path = path.slice(0, s); }
    path = path.replace(/\/$/, "");
    if (path === "") return { home: true, hash: hash };
    var m = /^\/objet\/([a-z0-9-]+)$/.exec(path);
    if (m) return { url: "apercu-fiche.html#" + m[1] };
    m = /^\/categorie\/([a-z0-9-]+)$/.exec(path);
    if (m) return { url: "categorie-" + m[1] + ".html" + q + hash };
    m = /^\/(explorer|duel|jeu|budget|methodologie|design)$/.exec(path);
    if (m) return { url: m[1] + ".html" + q + hash };
    return null;
  }
  window.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) !== "/") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var t = target(href);
    if (!t) return;
    if (t.home) {
      if (IS_HOME) {
        var el = t.hash ? document.getElementById(t.hash.slice(1)) : null;
        if (el) el.scrollIntoView({ behavior: "smooth" }); else window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        location.href = "accueil.html" + t.hash;
      }
      return;
    }
    location.href = t.url;
  }, true);
})();
</script>
<script src="images.js"></script>
"""

def rewrite(html: str) -> str:
    html = re.sub(r'<link rel="preload" as="image" href="/objets/[^"]+"[^>]*/>', "", html)
    html = re.sub(r'(<(?:img|image)\b[^>]*?)\b(src|href)="/objets/([^"]+?\.webp)"', lambda m: f'{m.group(1)}{m.group(2)}="{PIXEL}" data-vg="{m.group(3)}"', html)
    return html.replace("/_next/", "next/").replace('"/icon.svg', '"icon.svg')

MOVER = '<script>(function(){var me=document.currentScript,h=document.head,n;while((n=document.body.firstChild)&&n!==me){h.appendChild(n);}me.remove();})();</script>'
OVERRIDE = "<style>body{font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.55;background:#eef3fa;color:#0b1220}</style>"

for name, src in pages.items():
    html = src.read_text()
    attrs = re.search(r"<html([^>]*)>", html).group(1)
    lang = re.search(r'lang="([^"]*)"', attrs).group(1)
    cls = re.search(r'class="([^"]*)"', attrs).group(1)
    is_home = name in ("index.html", "accueil.html")
    boot = BOOT % {"lang": json.dumps(lang), "cls": json.dumps(cls), "home": "true" if is_home else "false"}
    if name == "index.html":
        head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
        body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
        head = re.sub(r'<meta charSet="utf-8"/>', "", head)
        head = re.sub(r'<meta name="viewport"[^>]*/>', "", head)
        head = re.sub(r"<title>.*?</title>", "", head, flags=re.S)
        page = "<title>VERTIGE</title>\n" + OVERRIDE + "\n" + boot + rewrite(head) + MOVER + rewrite(body)
    else:
        page = rewrite(html).replace("<head>", "<head>" + boot, 1)
    (out / name).write_text(page)

# Visuels regroupés
imgs = {p.name: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted((app / "public/objets").glob("*.webp"))}
(out / "images.js").write_text("window.__VG_IMG=" + json.dumps(imgs, separators=(",", ":")) + ";\n")

shutil.copytree(app / ".next/static/chunks", out / "next/static/chunks")
shutil.copytree(app / ".next/static/media", out / "next/static/media")
shutil.copy(app / "src/app/icon.svg", out / "icon.svg")
for js in (out / "next").rglob("*.js"):  # le service refuse U+FFFD : échappement équivalent
    s = js.read_text(encoding="utf-8")
    if "�" in s:
        js.write_text(s.replace("�", "\\ufffd"), encoding="utf-8")

files = [p for p in out.rglob("*") if p.is_file()]
print(len(files), "fichiers,", round(sum(p.stat().st_size for p in files) / 1e6, 1), "Mo ;", len(pages), "pages ; images.js", round((out / "images.js").stat().st_size / 1e6, 2), "Mo")
left = sum(1 for p in out.rglob("*.html") if '="/objets/' in p.read_text() or '="/_next/' in p.read_text())
print("pages avec chemins absolus restants :", left)
