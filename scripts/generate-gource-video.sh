#!/usr/bin/env bash
set -euo pipefail

# Generate Gource visualization video
# Usage: ./scripts/generate-gource-video.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="${PROJECT_ROOT}/gource-visualization.mp4"

# Video settings
VIEWPORT="1920x1080"
FPS="30"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Generating Gource Git History Visualization          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Settings:"
echo "  Viewport: ${VIEWPORT}"
echo "  FPS: ${FPS}"
echo "  Output: ${OUTPUT_FILE}"
echo ""
echo "This may take a few minutes depending on git history size..."
echo ""

cd "$PROJECT_ROOT"

# Count commits for progress estimation
TOTAL_COMMITS=$(git rev-list --count HEAD)
echo "Total commits to visualize: ${TOTAL_COMMITS}"
echo ""

# Run gource via nix and pipe to ffmpeg
nix run nixpkgs#gource -- \
  --viewport "${VIEWPORT}" \
  -o - | \
  ffmpeg -y \
    -r "${FPS}" \
    -f image2pipe \
    -vcodec ppm \
    -i - \
    -c:v libx264 \
    -preset medium \
    -pix_fmt yuv420p \
    -crf 23 \
    -movflags +faststart \
    "${OUTPUT_FILE}"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✓ Video generated successfully!                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "File: ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}" 2>/dev/null | awk '{print "Size: " $5}' || echo "Size: calculating..."
echo ""
echo "Play with:"
echo "  mpv \"${OUTPUT_FILE}\""
echo "  vlc \"${OUTPUT_FILE}\""
echo "  xdg-open \"${OUTPUT_FILE}\""
echo ""
