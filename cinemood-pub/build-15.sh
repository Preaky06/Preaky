#!/usr/bin/env bash
# Reconstruit la version 15 s (src/s15.html) : textes du site du 20 octobre, affiches en image.
#   ./build-15.sh            → 16:9 (1920×1080) et 9:16 (1080×1920), 60 i/s
#   ./build-15.sh 169 | 916  → un seul format
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-/tmp/cinemood-short}"
WORKERS="${WORKERS:-4}"
FORMATS="${1:-169 916}"
mkdir -p out/motion-design-15s "$WORK"

node ugc/posters.mjs "$WORK/img"            # affiches fictives (aucune image de film réelle)
python3 audio/score_15.py audio/music_15.wav

for fmt in $FORMATS; do
  if [ "$fmt" = 169 ]; then w=1920; h=1080; name=16x9; else w=1080; h=1920; name=9x16; fi
  PAGE=s15.html IMG_DIR="$WORK/img" node render.mjs frames "$w" "$h" "$WORK/$fmt" "$WORKERS" 0 900
  ffmpeg -hide_banner -loglevel warning -stats -y \
    -framerate 60 -i "$WORK/$fmt/f%05d.png" -i audio/music_15.wav \
    -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 \
    -x264-params "aq-mode=3:deblock=-1,-1" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -aac_pns 0 -aac_is 0 -ar 48000 -shortest -movflags +faststart "out/motion-design-15s/cinemood-15s-$name.mp4"
  cp "$WORK/$fmt/f00870.png" "out/motion-design-15s/couverture-$name.png"
done
echo "terminé :"; ls -lh out/motion-design-15s
