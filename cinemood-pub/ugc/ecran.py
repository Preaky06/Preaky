"""Pub UGC 30 s : remplace l'écran du téléphone de la 2e image (elle montre son téléphone) par la page
d'accueil du vrai site (déformation en perspective, coins arrondis, doigts conservés).
Les quatre coins de l'écran (quad) sont mesurés sur l'image générée le 12 novembre (944 × 1680) ; l'image
d'écran est une image des plans du site (out/plans-site), page d'accueil, sans le doigt (image 61).
usage : python3 -I ugc/ecran.py photo.png ecran.jpg sortie.png"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

photo = Image.open(sys.argv[1]).convert('RGB')
W, H = photo.size
screen = Image.open(sys.argv[2]).convert('RGB').crop((112, 48, 970, 1878))  # l'écran, sans le cadre du téléphone
sw, sh = screen.size
quad = [(700.5, 624.5), (863.5, 621.5), (860.0, 971.5), (699.5, 971.5)]  # haut-gauche, haut-droit, bas-droit, bas-gauche
K = 4
dst = [(x * K, y * K) for x, y in quad]
src = [(0, 0), (sw, 0), (sw, sh), (0, sh)]
A, B = [], []
for (x, y), (u, v) in zip(dst, src):
    A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
    B += [u, v]
coef = np.linalg.solve(np.array(A, float), np.array(B, float))
big = screen.transform((W * K, H * K), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
mask = Image.new('L', (W * K, H * K), 0)
d = ImageDraw.Draw(mask)
d.polygon(dst, fill=255)
# coins arrondis : on retire les quatre coins
r = 11 * K
for (cx, cy), (sx, sy) in zip(dst, [(1, 1), (-1, 1), (-1, -1), (1, -1)]):
    corner = Image.new('L', (W * K, H * K), 0)
    cd = ImageDraw.Draw(corner)
    cd.rectangle([min(cx, cx + sx * r), min(cy, cy + sy * r), max(cx, cx + sx * r), max(cy, cy + sy * r)], fill=255)
    cd.ellipse([cx + sx * r - r, cy + sy * r - r, cx + sx * r + r, cy + sy * r + r], fill=0)
    mask = Image.fromarray(np.minimum(np.array(mask), 255 - np.array(corner)))
big = big.resize((W, H), Image.LANCZOS)
m = np.array(mask.resize((W, H), Image.LANCZOS), float) / 255
# les doigts qui débordent sur le bord droit de l'écran restent devant
p = np.array(photo, float)
R, G, Bc = p[..., 0], p[..., 1], p[..., 2]
skin = (R > 95) & (R > G + 12) & (G > Bc) & (R - Bc > 35)
band = np.zeros_like(m, bool)
band[:, 840:] = True
keep = Image.fromarray(((skin & band) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
m *= 1 - np.array(keep, float) / 255
# l'écran éclaire : léger reflet, un peu moins de contraste qu'une capture
s = np.array(big, float) * 0.93 + 6
yy, xx = np.mgrid[0:H, 0:W]
glare = np.clip(1 - np.abs((xx - 700) * 0.9 + (yy - 620) * 0.45 - 140) / 90, 0, 1) * 18
s = np.clip(s + glare[..., None], 0, 255)
out = p * (1 - m[..., None]) + s * m[..., None]
Image.fromarray(out.astype(np.uint8)).save(sys.argv[3])
print('ok', W, H)
