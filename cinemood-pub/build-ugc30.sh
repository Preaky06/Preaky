#!/usr/bin/env bash
# Reconstruit la pub UGC (src/ugc30.html, 9:16, 27,5 s) : la créatrice fictive (3 images générées), sa voix off,
# les plans du vrai site (out/plans-site), sous-titres façon TikTok calés sur la voix, musique baissée sous la voix.
#   ./build-ugc30.sh agacee.png telephone_cm.png sourire.png voix.mp3
# telephone_cm.png : la 2e image, écran remplacé par la page d'accueil du site (ugc/ecran.py).
# Prérequis : npm install (Playwright + banques de sons), python3 + numpy + scipy + pyloudnorm, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-/tmp/cinemood-ugc30}"
WORKERS="${WORKERS:-4}"
mkdir -p "$WORK/tex/broll" out/ugc-voix

k=1
for img in "$1" "$2" "$3"; do
  ffmpeg -hide_banner -loglevel error -y -i "$img" -vf "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920" -q:v 2 "$WORK/tex/face$k.jpg"
  k=$((k + 1))
done
ffmpeg -hide_banner -loglevel error -y -i "$4" -ac 1 -ar 48000 -c:a pcm_s16le "$WORK/voix.wav"
ffmpeg -hide_banner -loglevel error -y -i out/plans-site/cinemood-plans-site-9x16.mp4 -q:v 2 "$WORK/tex/broll/f%05d.jpg"
python3 audio/score_ugc30.py audio/music_ugc30.wav "$WORK/voix.wav"
PAGE=ugc30.html TEX_DIR="$WORK/tex" node render.mjs frames 1080 1920 "$WORK/916" "$WORKERS" 0 1650
ffmpeg -hide_banner -loglevel warning -y \
  -framerate 60 -i "$WORK/916/f%05d.png" -i audio/music_ugc30.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -aac_pns 0 -aac_is 0 -ar 48000 -shortest -movflags +faststart out/ugc-voix/cinemood-ugc-voix-9x16.mp4
cp "$WORK/916/f01560.png" out/ugc-voix/couverture-9x16.png
echo "terminé :"; ls -lh out/ugc-voix
