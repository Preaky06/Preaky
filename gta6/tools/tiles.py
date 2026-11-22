"""Télécharge et assemble des tuiles gtadb (CC BY 4.0) pour une zone donnée."""
import sys, os, io, math, urllib.request, concurrent.futures as cf
from PIL import Image
BASE = "https://raw.githubusercontent.com/rolux/gtadb.org/main/maps/tiles/6/{set}/{z}/{z},{y},{x}.jpg"
CACHE = os.environ.get("GTADB_TILE_CACHE", "/tmp/gtadb-tiles")

def world_to_px(x, y, z):
    s = 2 ** z
    return (x / 32 + 512) * s, (-y / 32 + 512) * s

def fetch(tset, z, tx, ty):
    path = f"{CACHE}/{tset}/{z}/{tx}_{ty}.jpg"
    if os.path.exists(path):
        return path if os.path.getsize(path) > 0 else None
    os.makedirs(os.path.dirname(path), exist_ok=True)
    url = BASE.format(set=urllib.request.quote(tset, safe=","), z=z, x=tx, y=ty)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            data = r.read()
        open(path, "wb").write(data)
        return path
    except Exception:
        open(path, "wb").close()
        return None

def stitch(tset, z, x0, y0, x1, y1, bg=(20, 40, 60)):
    """Assemble la zone pixel [x0,x1)x[y0,y1) au zoom z (coordonnées pixel)."""
    tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int((x1 - 1) // 256), int((y1 - 1) // 256)
    jobs = [(tx, ty) for tx in range(tx0, tx1 + 1) for ty in range(ty0, ty1 + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        paths = dict(zip(jobs, ex.map(lambda j: fetch(tset, z, *j), jobs)))
    W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
    canvas = Image.new("RGB", (W, H), bg)
    for (tx, ty), p in paths.items():
        if p:
            try:
                canvas.paste(Image.open(p).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
            except Exception:
                pass
    ox, oy = x0 - tx0 * 256, y0 - ty0 * 256
    return canvas.crop((int(ox), int(oy), int(ox + x1 - x0), int(oy + y1 - y0)))

if __name__ == "__main__":
    tset, z, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    # île de Leonida : x -8300..3300, y -7400..8600 (mètres)
    xa, ya = world_to_px(-8500, 9000, z)
    xb, yb = world_to_px(3500, -7700, z)
    im = stitch(tset, z, xa, ya, xb, yb)
    im.save(out, quality=82)
    print(out, im.size)
