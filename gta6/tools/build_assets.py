"""Génère les images du site à partir de gtadb.org (CC BY 4.0) : carte, mini-cartes, photos."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from tiles import stitch, world_to_px
from PIL import Image, ImageEnhance

# Usage : python3 build_assets.py <dossier gtadb.org cloné> [--geo-only]
#   git clone --depth 1 --filter=blob:none --sparse https://github.com/rolux/gtadb.org
#   git -C gtadb.org sparse-checkout set map/data/6 map/photos/6
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GTADB = next((a for a in sys.argv[1:] if not a.startswith("--")), "gtadb.org")
PHOTOS_SRC = os.path.join(GTADB, "map/photos/6")
LANDMARKS = json.load(open(os.path.join(GTADB, "map/data/6/landmarks.json")))
TSET = "day"

# --- photos : clé -> (id gtadb, recadrage vertical optionnel 0..1 centre)
PHOTOS = {
    "vice-city-sign": "L456", "catalan-bay": "L1500", "vice-beach-car": "L583", "cape-domes": "L430",
    "uncle-jacks": "L313", "delights": "L629", "kayak-river": "L906", "shoreline-friends": "L1076",
    "jason-lucia": "L3275", "lucia-car": "L510", "port-tunnel": "L3000", "rialto-mansion": "L791",
    "pegassi-residences": "L130", "gellhorn-roadhouse": "L1383", "wyman-salvage": "L1494",
    "mariana-hunters": "L763", "starlet-motel": "L304", "vice-regal": "L1", "radio-mast": "L264",
    "key-lento-dock": "L1497", "mount-kalaga": "L530", "belville-house": "L3455", "jacobs-tavern": "L3398",
    "w-blanco": "L403", "hotel-neptune": "L41", "apollo-aggregates": "L2453", "jason-house": "L266",
    "hamlet-motel": "L1843", "watson-bay": "L395", "underwater": "L447", "ptt-youngins": "L1491",
    "paradise-garage": "L1495", "alpha-gas": "L308", "muscle-sands": "L1015", "sunrise-rv": "L265",
    "sugar-mill": "L399", "kalaga-mud": "L822", "electric-fang": "L1482",
}

# --- géolocalisation des éléments : clé -> (x, y monde en mètres, approximatif ?)
GEO = {
    "cars:penumbra": (470, 1280, True), "cars:rubyemerus": (495, 1207, True), "cars:purpleemerus": (722, -522, True),
    "cars:cheetah": (48, -1081, False), "cars:sultan": (-6445, 3278, False), "cars:italirsx": (560, 1310, True),
    "cars:coquette": (420, 1390, True), "cars:buggy": (-2796, 3954, True),
    "eggs:skunkape": (-3480, -4788, True), "eggs:ufo": (-5450, 3560, True), "eggs:dexter": (1702, 2183, True),
    "eggs:eggnest": (-2543, -2346, False), "eggs:parrot": (-2420, -5600, True), "eggs:meteor": (-3430, 6371, True),
    "eggs:stones": (-3360, 6430, True), "eggs:belville": (-1509, 2973, True), "eggs:pentagram": (-6500, 480, True),
    "eggs:pineapple": (-1817, -2306, True), "eggs:rdr": (-1059, 6490, False), "eggs:blanco": (-2741, 4272, False),
    "money:apollo": (-1837, -2876, False), "money:threesheets": (-2440, -5620, True), "money:motel": (-2690, -3300, True),
    "money:plane": (-2650, -3750, True), "money:donnie": (-2950, -3450, True), "money:crab": (-3716, -3085, True),
    "money:watson": (-5255, -3390, True), "money:bobcat": (-6484, -1528, True),
    "safes:kingpin": (-6520, 3700, True), "safes:brooks": (-6630, 3620, True), "safes:cascara": (-6470, 3790, True),
    "safes:nova": (-2640, -3240, True), "safes:janjak": (-968, 1430, True), "safes:sunrise": (-3477, -4497, False),
    "safes:delights": (-6360, 3591, False), "safes:crab": (-3716, -3085, True), "safes:cottonmouth": (-3480, -4788, True),
    "safes:saber": (-1400, 80, True),
}
ITEM_PHOTO = {
    "cars:penumbra": "vice-beach-car", "cars:rubyemerus": "rialto-mansion", "cars:cheetah": "pegassi-residences",
    "cars:sultan": "gellhorn-roadhouse", "cars:buggy": "wyman-salvage",
    "eggs:skunkape": "mariana-hunters", "eggs:ufo": "starlet-motel", "eggs:dexter": "vice-regal",
    "eggs:eggnest": "radio-mast", "eggs:parrot": "key-lento-dock", "eggs:meteor": "mount-kalaga",
    "eggs:belville": "belville-house", "eggs:rdr": "jacobs-tavern", "eggs:blanco": "w-blanco", "eggs:vercetti": "hotel-neptune",
    "money:apollo": "apollo-aggregates", "money:threesheets": "jason-house", "money:motel": "hamlet-motel",
    "money:watson": "watson-bay", "money:crab": "sunrise-rv",
    "method:kenton": "underwater", "method:ops": "ptt-youngins", "method:cars": "paradise-garage",
    "method:robbery": "alpha-gas", "method:heists": "port-tunnel", "method:cards": "electric-fang",
    "safes:delights": "delights", "safes:sunrise": "sunrise-rv",
}

def caption(lid):
    name = LANDMARKS[lid][0]
    parts = [p.strip() for p in name.split(",") if p.strip() and p.strip() != "?"]
    return ", ".join(parts)

def build_photos():
    os.makedirs(f"{SITE}/img/photos", exist_ok=True)
    out = {}
    for key, lid in PHOTOS.items():
        im = Image.open(f"{PHOTOS_SRC}/{lid},ig.jpg").convert("RGB")
        w, h = im.size
        # recadrage 16:9 max (évite les formats très hauts)
        if h / w > 0.75:
            nh = int(w * 0.75); top = (h - nh) // 2
            im = im.crop((0, top, w, top + nh))
        large = im.copy(); large.thumbnail((1400, 1400), Image.LANCZOS)
        small = im.copy(); small.thumbnail((720, 720), Image.LANCZOS)
        large.save(f"{SITE}/img/photos/{key}.jpg", quality=76, optimize=True, progressive=True)
        small.save(f"{SITE}/img/photos/{key}-s.jpg", quality=74, optimize=True, progressive=True)
        out[key] = {"cap": caption(lid), "id": lid}
    return out

def build_minimaps():
    os.makedirs(f"{SITE}/img/minimap", exist_ok=True)
    out = {}
    for key, (x, y, approx) in GEO.items():
        z = 4 if approx else 5
        cx, cy = world_to_px(x, y, z)
        im = stitch(TSET, z, cx - 320, cy - 200, cx + 320, cy + 200)
        im = ImageEnhance.Color(im).enhance(1.2)
        fn = key.replace(":", "-")
        im.save(f"{SITE}/img/minimap/{fn}.jpg", quality=76, optimize=True, progressive=True)
        out[key] = {"xy": [x, y], "approx": approx, "z": z}
    return out

# Carte fournie par l'utilisateur (675x1200, agrandie x2) alignée sur les coordonnées monde :
# ux = (x - X0) / S ; uy = (Y0 - y) / S   (S en mètres par pixel)
USERMAP = {"src": "img/map/leonida.jpg", "w": 1350, "h": 2400, "S": 20.45 / 2, "X0": -10550, "Y0": 13170}

if __name__ == "__main__":
    import sys as _s
    fast = "--geo-only" in _s.argv
    photos = {k: {"cap": caption(v), "id": v} for k, v in PHOTOS.items()} if fast else build_photos()
    ov = USERMAP
    mm = {k: {"xy": [x, y], "approx": a, "z": 4 if a else 5} for k, (x, y, a) in GEO.items()} if fast else build_minimaps()
    js = "/* Généré par build_assets.py — données géographiques et photos (gtadb.org, CC BY 4.0) */\n"
    js += "const MAPIMG = " + json.dumps(ov) + ";\n"
    js += "const PHOTOS = " + json.dumps(photos, ensure_ascii=False, indent=0) + ";\n"
    js += "const GEO = " + json.dumps(mm, indent=0) + ";\n"
    js += "const ITEM_PHOTO = " + json.dumps(ITEM_PHOTO, indent=0) + ";\n"
    open(f"{SITE}/js/geo.js", "w").write(js)
    print("photos", len(photos), "minimaps", len(mm), "map", ov)
