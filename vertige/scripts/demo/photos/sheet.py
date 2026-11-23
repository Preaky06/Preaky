"""Planches de contrôle : vignettes 150 px sur fond bleu clair, nom de l'objet dessous."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
OUT = Path(sys.argv[1]); per = int(sys.argv[2]) if len(sys.argv) > 2 else 60
res = json.loads((OUT / "final.json").read_text())
slugs = sorted(res); C, R, T = 10, per // 10, 150
for k in range(0, len(slugs), per):
    chunk = slugs[k:k + per]
    sheet = Image.new("RGB", (C * T, ((len(chunk) + C - 1) // C) * (T + 18)), (238, 243, 250))
    d = ImageDraw.Draw(sheet)
    for i, s in enumerate(chunk):
        x, y = (i % C) * T, (i // C) * (T + 18)
        im = Image.open(OUT / "final" / f"{s}.webp").convert("RGBA"); im.thumbnail((T - 10, T - 10))
        bg = Image.new("RGBA", im.size, (220, 232, 250, 255) if res[s]["kind"] == "cutout" else (255, 255, 255, 255)); bg.alpha_composite(im)
        sheet.paste(bg.convert("RGB"), (x + 5, y + 5))
        d.text((x + 4, y + T), s[:24], fill=(11, 18, 32))
    sheet.save(OUT / f"sheet-{k // per:02d}.png")
print("ok", (len(slugs) + per - 1) // per, "planches")
