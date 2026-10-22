#!/usr/bin/env bash
# Full pipeline: silent video -> soundtrack from the same cues -> loudness-normalised mux -> self-contained HTML.
# usage: tools/make.sh            (30 fps)
#        FPS=60 tools/make.sh
set -euo pipefail
cd "$(dirname "$0")/.."
FPS=${FPS:-30}
W=$(mktemp -d)
trap 'rm -rf "$W"' EXIT
export NODE_PATH=${NODE_PATH:-$(npm root -g)}

python3 tools/build.py "$W/page.html"
node tools/render.mjs "$W/page.html" "$W/video.mp4" --fps "$FPS" --cues "$W/cues.json"
python3 tools/audio.py "$W/cues.json" "$W/soundtrack.wav"

# two-pass loudnorm in linear mode: one gain for the whole track, dynamics untouched
LN="I=-16:TP=-1.5:LRA=11"
read -r MI MTP MLRA MTH OFF < <(ffmpeg -hide_banner -i "$W/soundtrack.wav" -af "loudnorm=$LN:print_format=json" -f null - 2>&1 \
  | sed -n '/^{/,/^}/p' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["input_i"], d["input_tp"], d["input_lra"], d["input_thresh"], d["target_offset"])')
ffmpeg -y -loglevel error -i "$W/soundtrack.wav" \
  -af "loudnorm=$LN:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$OFF:linear=true" \
  -ar 48000 "$W/norm.wav"

ffmpeg -y -loglevel error -i "$W/video.mp4" -i "$W/norm.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart vomalia-motion.mp4
ffmpeg -y -loglevel error -i "$W/norm.wav" -c:a aac -b:a 128k "$W/soundtrack.m4a"
python3 tools/build.py vomalia-motion.html --audio "$W/soundtrack.m4a"
echo "done: vomalia-motion.mp4, vomalia-motion.html"
