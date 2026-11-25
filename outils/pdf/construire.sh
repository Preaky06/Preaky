#!/usr/bin/env bash
# Construit le portfolio PDF à partir du site.
# Usage : bash outils/pdf/construire.sh [sortie.pdf]
# Prérequis : Python 3 (Pillow, pypdf, reportlab) et Node avec Playwright
# (si Playwright est installé globalement : NODE_PATH="$(npm root -g)").
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
SORTIE="${1:-$PWD/Portfolio-Mael-Gillet-Preaky.pdf}"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT

# 1. copies JPEG des images : Chrome les intègre sans les réencoder
mkdir -p "$TRAVAIL/jpg"
python3 - "$RACINE/assets/img" "$TRAVAIL/jpg" <<'PY'
import glob, os, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
for f in glob.glob(os.path.join(src, '*.webp')):
    im = Image.open(f)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        fond = Image.new('RGB', im.size, (11, 12, 18))
        fond.paste(im, mask=im.split()[-1])
        im = fond
    else:
        im = im.convert('RGB')
    im.save(os.path.join(out, os.path.basename(f)[:-5] + '.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
PY

# 2. premier rendu pour relever la page de chaque partie, second rendu avec le sommaire numéroté
python3 "$ICI/compose.py" "$RACINE" "$TRAVAIL/document.html"
node "$ICI/rendu.mjs" "$RACINE" "$TRAVAIL/document.html" "$TRAVAIL/jpg" "$TRAVAIL/passe1.pdf"
python3 "$ICI/finalise.py" pages "$TRAVAIL/passe1.pdf" "$TRAVAIL/pages.json"
python3 "$ICI/compose.py" "$RACINE" "$TRAVAIL/document.html" "$TRAVAIL/pages.json"
node "$ICI/rendu.mjs" "$RACINE" "$TRAVAIL/document.html" "$TRAVAIL/jpg" "$TRAVAIL/passe2.pdf"

# 3. pied de page, signets et métadonnées
python3 "$ICI/finalise.py" final "$TRAVAIL/passe2.pdf" "$TRAVAIL/pages.json" "$SORTIE"
