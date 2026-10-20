#!/usr/bin/env bash
# Reconstruit le film « nouvelle version » (src/launch.html, 23,5 s) : 8 questions au lieu de 12, interface réelle.
#   ./build-launch.sh cinem00d.zip          → 16:9 (1920×1080) et 9:16 (1080×1920), 60 i/s
#   ./build-launch.sh cinem00d.zip 169|916  → un seul format
# L'ancienne interface (12 questions) vient de assets/launch/ (capture de l'ancienne version du site).
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg, unzip.
set -euo pipefail
cd "$(dirname "$0")"
ZIP="$(realpath "$1")"
FORMATS="${2:-169 916}"
WORK="${WORK:-/tmp/cinemood-launch}"
WORKERS="${WORKERS:-4}"
mkdir -p out/nouvelle-version "$WORK"

rm -rf "$WORK/site" && unzip -q "$ZIP" -d "$WORK/site"
SITE_DIR="$(dirname "$(find "$WORK/site" -name index.html | head -1)")"
node ugc/posters.mjs "$WORK/img"
SITE_DIR="$SITE_DIR" IMG_DIR="$WORK/img" node explainer/capture.mjs "$WORK/tex"
cp assets/launch/ancienne-interface-12-questions.png "$WORK/tex/old_q.png"
python3 audio/score_launch.py audio/music_launch.wav

for fmt in $FORMATS; do
  if [ "$fmt" = 169 ]; then w=1920; h=1080; name=16x9; else w=1080; h=1920; name=9x16; fi
  PAGE=launch.html TEX_DIR="$WORK/tex" node render.mjs frames "$w" "$h" "$WORK/$fmt" "$WORKERS" 0 1410
  ffmpeg -hide_banner -loglevel warning -stats -y \
    -framerate 60 -i "$WORK/$fmt/f%05d.png" -i audio/music_launch.wav \
    -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 \
    -x264-params "aq-mode=3:deblock=-1,-1" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -aac_pns 0 -aac_is 0 -ar 48000 -shortest -movflags +faststart "out/nouvelle-version/cinemood-nouvelle-version-$name.mp4"
  cp "$WORK/$fmt/f01350.png" "out/nouvelle-version/couverture-$name.png"
done
echo "terminé :"; ls -lh out/nouvelle-version
