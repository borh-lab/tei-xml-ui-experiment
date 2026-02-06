#!/usr/bin/env bash
set -euo pipefail

# Generate Gource visualization video (WebM VP9)
# Usage: ./scripts/generate-gource-webm.sh
# Note: Requires xvfb-run for headless rendering

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="${PROJECT_ROOT}/gource-visualization.webm"
TEMP_DIR="${PROJECT_ROOT}/.gource-temp"

# Video settings
VIEWPORT="1920x1080"
FPS="30"
MAX_SECONDS="60"

# Quality settings
CRF="15"  # Lower = better quality (15-31 is good range, 15 is high quality)
BITRATE="6M"  # Target bitrate for VP9 (higher = better quality)

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Generating Gource WebM Video                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Settings:"
echo "  Viewport: ${VIEWPORT}"
echo "  FPS: ${FPS}"
echo "  Max duration: ${MAX_SECONDS}s"
echo "  Quality: CRF ${CRF}, ${BITRATE}"
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
echo "  • File extension key enabled (shows what colors mean)"
nix run nixpkgs#xvfb-run -- \
  nix run nixpkgs#gource -- \
    --viewport "${VIEWPORT}" \
    --stop-at-time "${MAX_SECONDS}" \
    --output-framerate "${FPS}" \
    --hide-date \
    --hide usernames \
    --key \
    -o "${TEMP_DIR}/gource.ppm" \
    .

echo ""
echo "Step 2: Encoding WebM with VP9..."
ffmpeg -y \
  -r "${FPS}" \
  -i "${TEMP_DIR}/gource.ppm" \
  -c:v libvpx-vp9 \
  -b:v "${BITRATE}" \
  -crf "${CRF}" \
  -r "${FPS}" \
  -threads 8 \
  "${OUTPUT_FILE}"

echo ""
echo "Cleaning up temporary files..."
rm -rf "${TEMP_DIR}"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✓ WebM video generated successfully!                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "File: ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}" | awk '{print "Size: " $5}'
echo ""
echo "Features:"
echo "  • File extension key (built-in gource legend)"
echo "  • No timestamp display (cleaner visual)"
echo "  • Shows colors by file type (.ts, .xml, .md, etc.)"
echo ""
echo "Play with:"
echo "  mpv \"${OUTPUT_FILE}\""
echo "  vlc \"${OUTPUT_FILE}\""
echo "  xdg-open \"${OUTPUT_FILE}\""
echo ""
echo "Web-optimized: Upload directly to web, no transcoding needed!"
echo ""
