#!/usr/bin/env bash
# Reconstruit la version motion design (typographie seule, src/motion.html).
#   ./build-motion.sh            → 16:9 (1920×1080) et 9:16 (1080×1920), 60 i/s
#   ./build-motion.sh 169        → seulement le 16:9
#   ./build-motion.sh 916        → seulement le 9:16
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-/tmp/cinemood-motion-frames}"
WORKERS="${WORKERS:-4}"
FORMATS="${1:-169 916}"
mkdir -p out "$WORK"

python3 audio/score_motion.py audio/music_motion.wav

for fmt in $FORMATS; do
  if [ "$fmt" = 169 ]; then w=1920; h=1080; name=cinemood-motion-16x9; else w=1080; h=1920; name=cinemood-motion-9x16; fi
  PAGE=motion.html node render.mjs frames "$w" "$h" "$WORK/$fmt" "$WORKERS"
  ffmpeg -hide_banner -loglevel warning -stats -y \
    -framerate 60 -i "$WORK/$fmt/f%05d.png" -i audio/music_motion.wav \
    -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 \
    -x264-params "aq-mode=3:deblock=-1,-1" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "out/$name.mp4"
  cp "$WORK/$fmt/f01674.png" "out/couverture-motion-${name#cinemood-motion-}.png"
done
echo "terminé :"; ls -lh out
