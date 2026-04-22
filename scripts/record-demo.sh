#!/usr/bin/env bash
# Record a capture-mode demo to docs/ as MP4.
# Usage: scripts/record-demo.sh [output.mp4]
# Requires: ffmpeg, Xorg.
set -euo pipefail

OUT=${1:-docs/demo/capture-$(date +%Y%m%d-%H%M%S).mp4}

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is not installed. Install it first (e.g. 'sudo pacman -S ffmpeg' or 'apt install ffmpeg')."
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

echo "Starting capture-mode dev server…"
RUNTIME_MODE=capture pnpm dev &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT

echo "Waiting 3s for dev server to settle…"
sleep 3

echo "Recording 90s screen capture to $OUT (press q in ffmpeg window to stop early)"
ffmpeg -y -f x11grab -video_size 1920x1080 -framerate 30 -i :0.0 -t 90 \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p "$OUT"

echo "Done: $OUT"
