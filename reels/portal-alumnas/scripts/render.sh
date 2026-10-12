#!/usr/bin/env bash
# Render final: MP4 H.264 yuv420p CRF 18 + AAC 48 kHz (pista silenciosa) y portada PNG 1080x1920.
# Uso: npm run render   (o: bash scripts/render.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
BROWSER=()
if [ -z "${REMOTION_CHROME:-}" ]; then
  # Entornos sin acceso a internet: usar el Chromium headless local si existe.
  for d in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do
    [ -x "$d" ] && REMOTION_CHROME="$d" && break
  done
fi
if [ -n "${REMOTION_CHROME:-}" ]; then BROWSER=(--browser-executable="$REMOTION_CHROME"); fi

npx remotion render YohiPortalAlumnas out/yohi-portal-alumnas.mp4 \
  --codec=h264 --crf=18 --pixel-format=yuv420p --image-format=png --color-space=bt709 \
  --audio-codec=aac --audio-bitrate=192k "${BROWSER[@]}"

# Portada (frame 50 del gancho: texto legible, sin glitch, Yohi ya entro)
npx remotion still YohiPortalAlumnas out/portada.png --frame=50 "${BROWSER[@]}"
echo "Listo: out/yohi-portal-alumnas.mp4 y out/portada.png"
