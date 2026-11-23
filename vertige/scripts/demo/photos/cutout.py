"""Détoure (objets) ou recadre (lieux, œuvres) les images téléchargées ; drapeaux et logos posés sur fond blanc.
Usage : cutout.py outdir [slug ...]   -> outdir/final/<slug>.webp + outdir/final.json"""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps
from rembg import new_session, remove

OUT = Path(sys.argv[1]); only = set(sys.argv[2:])
FINAL = OUT / "final"; FINAL.mkdir(exist_ok=True)
manifest = json.loads((OUT / "manifest.json").read_text())
result = json.loads((OUT / "final.json").read_text()) if (OUT / "final.json").exists() else {}
session = new_session("isnet-general-use")
SIZE = 512

def square_pad(img, margin, bg=(0, 0, 0, 0)):
    w, h = img.size
    side = int(max(w, h) * (1 + 2 * margin))
    canvas = Image.new("RGBA", (side, side), bg)
    canvas.paste(img, ((side - w) // 2, (side - h) // 2), img if img.mode == "RGBA" else None)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)

def save(img, slug, kind):
    img.save(FINAL / f"{slug}.webp", "WEBP", quality=80, method=6, alpha_quality=85)
    return kind

for slug, m in manifest.items():
    if only and slug not in only: continue
    if not only and slug in result and (FINAL / f"{slug}.webp").exists(): continue
    if not (OUT / "raw" / m["raw"]).exists(): continue
    src = Image.open(OUT / "raw" / m["raw"])
    src = ImageOps.exif_transpose(src).convert("RGBA")
    kind = m["kind"]
    note = ""
    if kind == "cutout":
        small = src.copy(); small.thumbnail((1024, 1024))
        cut = remove(small, session=session, post_process_mask=True)
        a = cut.getchannel("A")
        fg = sum(1 for p in a.getdata() if p > 128) / (a.width * a.height)
        bbox = a.point(lambda p: 255 if p > 24 else 0).getbbox()
        if bbox and 0.03 <= fg <= 0.9:
            obj = cut.crop(bbox)
            kind = save(square_pad(obj, 0.04), slug, "cutout")
        else:
            note = f"détourage rejeté (premier plan {fg:.0%})"
            kind = "photo"
    if kind == "photo":
        img = ImageOps.fit(src.convert("RGB"), (SIZE, SIZE), Image.LANCZOS, centering=(0.5, 0.45))
        save(img, slug, "photo")
    elif kind in ("flag", "logo"):
        img = src.copy(); img.thumbnail((900, 900))
        white = Image.new("RGBA", img.size, (255, 255, 255, 255)); white.alpha_composite(img)
        if kind == "flag":
            # drapeau : bord fin gris pour les drapeaux à fond blanc
            framed = ImageOps.expand(white.convert("RGB"), border=max(2, img.width // 200), fill=(220, 226, 235)).convert("RGBA")
            out = square_pad(framed, 0.1, (255, 255, 255, 255))
        else:
            out = square_pad(white, 0.16, (255, 255, 255, 255))
        kind = save(out.convert("RGB"), slug, "photo")
    result[slug] = {**{k: m[k] for k in ("file", "author", "license", "license_url", "source_url")}, "kind": kind, "note": note}
    (OUT / "final.json").write_text(json.dumps(result, ensure_ascii=False, indent=1))
    print(slug, kind, note, flush=True)
