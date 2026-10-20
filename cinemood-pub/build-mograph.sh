#!/usr/bin/env bash
# Reconstruit le motion design vectoriel (src/mograph.html, 41 s).
#   ./build-mograph.sh            → 16:9 (1920×1080) et 9:16 (1080×1920), 60 i/s
#   ./build-mograph.sh 169        → seulement le 16:9
#   ./build-mograph.sh 916        → seulement le 9:16
# Rendu à la définition native uniquement (les cotes de mograph.js sont en pixels).
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-/tmp/cinemood-mograph}"
WORKERS="${WORKERS:-4}"
FORMATS="${1:-169 916}"
mkdir -p out/motion-design "$WORK"

python3 audio/score_mograph.py audio/music_mograph.wav

for fmt in $FORMATS; do
  if [ "$fmt" = 169 ]; then w=1920; h=1080; name=16x9; else w=1080; h=1920; name=9x16; fi
  PAGE=mograph.html node render.mjs frames "$w" "$h" "$WORK/$fmt" "$WORKERS" 0 2460
  ffmpeg -hide_banner -loglevel warning -stats -y \
    -framerate 60 -i "$WORK/$fmt/f%05d.png" -i audio/music_mograph.wav \
    -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 \
    -x264-params "aq-mode=3:deblock=-1,-1" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -aac_pns 0 -aac_is 0 -ar 48000 -shortest -movflags +faststart "out/motion-design/cinemood-motion-design-$name.mp4"
  cp "$WORK/$fmt/f02370.png" "out/motion-design/couverture-$name.png"
done
echo "terminé :"; ls -lh out/motion-design
