#!/usr/bin/env bash
set -euo pipefail

# Generate Gource visualization video
# Usage: ./scripts/generate-gource-video.sh
# Note: Requires xvfb-run for headless rendering

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="${PROJECT_ROOT}/gource-visualization.mp4"
TEMP_DIR="${PROJECT_ROOT}/.gource-temp"

# Video settings
VIEWPORT="1920x1080"
FPS="30"
MAX_SECONDS="60"  # Limit video to 60 seconds for practical use

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Generating Gource Git History Visualization          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Settings:"
echo "  Viewport: ${VIEWPORT}"
echo "  FPS: ${FPS}"
echo "  Max duration: ${MAX_SECONDS}s"
echo "  Output: ${OUTPUT_FILE}"
echo ""

cd "$PROJECT_ROOT"

# Count commits
TOTAL_COMMITS=$(git rev-list --count HEAD)
echo "Total commits in repo: ${TOTAL_COMMITS}"
echo "Video will show a ${MAX_SECONDS}s animated overview"
echo ""

# Clean up temp dir
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"

echo "Step 1: Rendering Gource frames (using xvfb for headless rendering)..."
nix run nixpkgs#xvfb-run -- \
  nix run nixpkgs#gource -- \
    --viewport "${VIEWPORT}" \
    --stop-at-time "${MAX_SECONDS}" \
    --output-framerate "${FPS}" \
    -o "${TEMP_DIR}/gource.ppm" \
    .

echo ""
echo "Step 2: Encoding video with FFmpeg..."
ffmpeg -y \
  -r "${FPS}" \
  -i "${TEMP_DIR}/gource.ppm" \
  -c:v libx264 \
  -preset medium \
  -pix_fmt yuv420p \
  -crf 23 \
  -movflags +faststart \
  "${OUTPUT_FILE}"

echo ""
echo "Cleaning up temporary files..."
rm -rf "${TEMP_DIR}"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✓ Video generated successfully!                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "File: ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}" | awk '{print "Size: " $5}'
echo ""
echo "Play with:"
echo "  mpv \"${OUTPUT_FILE}\""
echo "  vlc \"${OUTPUT_FILE}\""
echo "  xdg-open \"${OUTPUT_FILE}\""
echo ""
