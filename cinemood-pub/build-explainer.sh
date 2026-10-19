#!/usr/bin/env bash
# Reconstruit le motion design du site (src/explainer.html, 44 s), à partir de l'archive du site.
#   ./build-explainer.sh cinem00d.zip          → 16:9 (1920×1080) et 9:16 (1080×1920), 60 i/s
#   ./build-explainer.sh cinem00d.zip 169      → seulement le 16:9
#   ./build-explainer.sh cinem00d.zip 916      → seulement le 9:16
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg, unzip.
set -euo pipefail
cd "$(dirname "$0")"
ZIP="$(realpath "$1")"
FORMATS="${2:-169 916}"
WORK="${WORK:-/tmp/cinemood-explainer}"
WORKERS="${WORKERS:-4}"
mkdir -p out/explainer "$WORK"

# 1. le vrai site hors ligne, affiches fictives, captures haute définition de l'interface
rm -rf "$WORK/site" && unzip -q "$ZIP" -d "$WORK/site"
SITE_DIR="$(dirname "$(find "$WORK/site" -name index.html | head -1)")"
node ugc/posters.mjs "$WORK/img"
SITE_DIR="$SITE_DIR" IMG_DIR="$WORK/img" node explainer/capture.mjs "$WORK/tex"

# 2. bande-son (calée sur les temps de src/explainer.js)
python3 audio/score_explainer.py audio/music_explainer.wav

# 3. images puis encodage
for fmt in $FORMATS; do
  if [ "$fmt" = 169 ]; then w=1920; h=1080; name=cinemood-explainer-16x9; else w=1080; h=1920; name=cinemood-explainer-9x16; fi
  PAGE=explainer.html TEX_DIR="$WORK/tex" IMG_DIR="$WORK/img" node render.mjs frames "$w" "$h" "$WORK/$fmt" "$WORKERS" 0 2640
  ffmpeg -hide_banner -loglevel warning -stats -y \
    -framerate 60 -i "$WORK/$fmt/f%05d.png" -i audio/music_explainer.wav \
    -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 \
    -x264-params "aq-mode=3:deblock=-1,-1" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "out/explainer/$name.mp4"
  cp "$WORK/$fmt/f02556.png" "out/explainer/couverture-${name#cinemood-explainer-}.png"
done
echo "terminé :"; ls -lh out/explainer
