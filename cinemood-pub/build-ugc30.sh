#!/usr/bin/env bash
# Reconstruit la pub UGC 30 s (src/ugc30.html, 9:16) : la créatrice fictive (3 images générées),
# les plans du vrai site (out/plans-site), sous-titres façon TikTok, musique sans voix.
#   ./build-ugc30.sh agacee.jpg telephone.jpg sourire.jpg
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-/tmp/cinemood-ugc30}"
WORKERS="${WORKERS:-4}"
mkdir -p "$WORK/tex/broll" out/ugc-30s

k=1
for img in "$@"; do
  ffmpeg -hide_banner -loglevel error -y -i "$img" -vf "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920" -q:v 2 "$WORK/tex/face$k.jpg"
  k=$((k + 1))
done
ffmpeg -hide_banner -loglevel error -y -i out/plans-site/cinemood-plans-site-9x16.mp4 -q:v 2 "$WORK/tex/broll/f%05d.jpg"
python3 audio/score_ugc30.py audio/music_ugc30.wav
PAGE=ugc30.html TEX_DIR="$WORK/tex" node render.mjs frames 1080 1920 "$WORK/916" "$WORKERS" 0 1800
ffmpeg -hide_banner -loglevel warning -stats -y \
  -framerate 60 -i "$WORK/916/f%05d.png" -i audio/music_ugc30.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -aac_pns 0 -aac_is 0 -ar 48000 -shortest -movflags +faststart out/ugc-30s/cinemood-ugc-30s-9x16.mp4
cp "$WORK/916/f01680.png" out/ugc-30s/couverture-9x16.png
echo "terminé :"; ls -lh out/ugc-30s
