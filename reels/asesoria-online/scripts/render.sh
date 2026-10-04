#!/usr/bin/env bash
# Render final: MP4 H.264 yuv420p CRF 18 + AAC 48 kHz, audio normalizado a -14 LUFS (pico -1,5 dBTP),
# y portada PNG. Uso: bash scripts/render.sh
set -euo pipefail
# Uso: bash scripts/render.sh [COMPOSICION] [NOMBRE_SALIDA] [FRAME_PORTADA]
COMP="${1:-YohiAsesoriaOnline}"
NAME="${2:-yohi-asesoria-online}"
COVER="${3:-190}"
cd "$(dirname "$0")/.."
mkdir -p out
BROWSER=()
if [ -n "${REMOTION_CHROME:-}" ]; then BROWSER=(--browser-executable="$REMOTION_CHROME"); fi

npx remotion render "$COMP" out/_raw.mp4 \
  --codec=h264 --crf=18 --pixel-format=yuv420p --image-format=png --color-space=bt709 \
  --audio-codec=aac --audio-bitrate=320k "${BROWSER[@]}"

# Normalizacion de loudness en 2 pasadas (video se copia sin recomprimir)
STATS=$(ffmpeg -hide_banner -i out/_raw.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$STATS" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
ffmpeg -y -hide_banner -loglevel error -i out/_raw.mp4 -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "out/$NAME.mp4"
rm -f out/_raw.mp4

# Portada (frame de la escena 2)
npx remotion still "$COMP" "out/$NAME-portada.png" --frame="$COVER" "${BROWSER[@]}"
echo "Listo: out/$NAME.mp4 y out/$NAME-portada.png"
