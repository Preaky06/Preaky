"""Trace les titres du site avec la police Pricedown (style GTA) et les enregistre
en tracés SVG dans js/wordart.js.

La licence gratuite de Pricedown (Typodermic) n'autorise pas l'intégration comme
police web, mais autorise les images : on publie donc des dessins vectoriels,
jamais le fichier de police.

Usage : python3 tools/wordart.py chemin/vers/pricedown.ttf
Dépendances : pip install fonttools uharfbuzz
"""
import json, os, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT = sys.argv[1]
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
font = TTFont(FONT)
gs = font.getGlyphSet()
blob = hb.Blob.from_file_path(FONT)
hbfont = hb.Font(hb.Face(blob))

CATS = {
    "fr": {"map": "carte", "cheats": "triches", "cars": "voitures", "eggs": "easter eggs", "money": "argent",
           "safes": "coffres", "hundred": "100 %", "tips": "astuces", "people": "persos"},
    "en": {"map": "map", "cheats": "cheats", "cars": "rare cars", "eggs": "easter eggs", "money": "cash",
           "safes": "safes", "hundred": "100%", "tips": "tips", "people": "cast"},
    "es": {"map": "mapa", "cheats": "trucos", "cars": "coches", "eggs": "easter eggs", "money": "dinero",
           "safes": "cajas", "hundred": "100 %", "tips": "consejos", "people": "personajes"},
}
TEXTS = {
    "brand": "Grand Theft News",
    "six": "6",
    "grand": "grand", "theft": "theft", "news": "news",
    "choose:fr": "choisis ta catégorie", "choose:en": "pick a category", "choose:es": "elige una categoría",
    "passed:fr": "trouvé !", "passed:en": "found!", "passed:es": "encontrado!",
}
for lang, d in CATS.items():
    for k, v in d.items():
        TEXTS[f"cat:{lang}:{k}"] = v

def shape(text):
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    return buf.glyph_infos, buf.glyph_positions

order = font.getGlyphOrder()
def outline(text):
    infos, pos = shape(text)
    pen = SVGPathPen(gs, ntos=lambda v: str(round(v)))
    bpen = BoundsPen(gs)
    x = 0
    for info, p in zip(infos, pos):
        name = order[info.codepoint]
        g = gs[name]
        tx = x + p.x_offset
        g.draw(TransformPen(pen, (1, 0, 0, -1, tx, -p.y_offset)))
        g.draw(TransformPen(bpen, (1, 0, 0, -1, tx, -p.y_offset)))
        x += p.x_advance
    return pen.getCommands(), bpen.bounds, x

out = {}
raw = {k: outline(v) for k, v in TEXTS.items()}
# même boîte verticale pour tous les titres => même corps de texte partout
top = min(b[1] for _, b, _ in raw.values() if b)
bottom = max(b[3] for _, b, _ in raw.values() if b)
PAD = 60   # marge pour le contour noir
for k, (d, b, adv) in raw.items():
    x0 = (b[0] if b else 0) - PAD
    w = ((b[2] if b else adv) - (b[0] if b else 0)) + 2 * PAD
    out[k] = {"t": TEXTS[k], "d": d, "vb": f"{round(x0)} {round(top - PAD)} {round(w)} {round(bottom - top + 2 * PAD)}"}

js = ("/* Généré par tools/wordart.py — titres tracés avec la police Pricedown (Ray Larabie / Typodermic).\n"
      "   Ce sont des dessins vectoriels : le fichier de police n'est pas publié. */\n"
      "const WORDART = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
open(os.path.join(SITE, "js/wordart.js"), "w").write(js)
print(len(out), "titres,", len(js) // 1024, "Ko")
