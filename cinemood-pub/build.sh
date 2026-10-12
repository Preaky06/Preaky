#!/usr/bin/env bash
# Reconstruit le film CinéMood de bout en bout.
#   ./build.sh            → 16:9 (1920×1080) et 9:16 (1080×1920), 60 i/s
#   ./build.sh 169        → seulement le 16:9
#   ./build.sh 916        → seulement le 9:16
# Prérequis : node + playwright (Chromium), python3 + numpy + scipy + pyloudnorm, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-/tmp/cinemood-frames}"
WORKERS="${WORKERS:-4}"
FORMATS="${1:-169 916}"
mkdir -p out "$WORK"

# 1. son : intensité du néon image par image, puis synthèse de la bande-son
node render.mjs neon 640 360 audio
python3 audio/synth.py audio/neon.json audio/music.wav

encode() { # $1 dossier d'images, $2 fichier de sortie
  ffmpeg -hide_banner -loglevel warning -stats -y \
    -framerate 60 -i "$1/f%05d.png" -i audio/music.wav \
    -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.2 \
    -x264-params "aq-mode=3:deblock=-1,-1" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$2"
}

for fmt in $FORMATS; do
  if [ "$fmt" = 169 ]; then w=1920; h=1080; name=cinemood-pub-16x9.mp4; else w=1080; h=1920; name=cinemood-pub-9x16.mp4; fi
  node render.mjs frames "$w" "$h" "$WORK/$fmt" "$WORKERS"
  encode "$WORK/$fmt" "out/$name"
done
echo "terminé :"; ls -lh out
