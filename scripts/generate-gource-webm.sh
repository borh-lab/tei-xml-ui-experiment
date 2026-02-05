#!/usr/bin/env bash
set -euo pipefail

# Generate Gource visualization video (WebM VP9 with legend)
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
CRF="18"  # Lower = better quality (18-25 is good range, 18 is high quality)
BITRATE="4M"  # Target bitrate for VP9

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Generating Gource WebM with Legend Overlay          ║"
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
nix run nixpkgs#xvfb-run -- \
  nix run nixpkgs#gource -- \
    --viewport "${VIEWPORT}" \
    --stop-at-time "${MAX_SECONDS}" \
    --output-framerate "${FPS}" \
    -o "${TEMP_DIR}/gource.ppm" \
    .

echo ""
echo "Step 2: Encoding WebM with VP9 + Legend overlay..."

# Create legend overlay using ffmpeg drawtext
# Shows conventional commit colors at the bottom of the video
ffmpeg -y \
  -r "${FPS}" \
  -i "${TEMP_DIR}/gource.ppm" \
  -vf "\
    drawtext=text='feat':fontsize=24:fontcolor=white:x=50:y=50:box=1:boxcolor=0x0096FF@0.8:boxborderw=2,\
    drawtext=text='fix':fontsize=24:fontcolor=white:x=150:y=50:box=1:boxcolor=0xFF9600@0.8:boxborderw=2,\
    drawtext=text='docs':fontsize=24:fontcolor=white:x=250:y=50:box=1:boxcolor=0x00C832@0.8:boxborderw=2,\
    drawtext=text='test':fontsize=24:fontcolor=white:x=370:y=50:box=1:boxcolor=0xDCDC32@0.8:boxborderw=2,\
    drawtext=text='refactor':fontsize=24:fontcolor=white:x=490:y=50:box=1:boxcolor=0x969696@0.8:boxborderw=2,\
    drawtext=text='perf':fontsize=24:fontcolor=white:x=630:y=50:box=1:boxcolor=0xB432C8@0.8:boxborderw=2,\
    drawtext=text='chore':fontsize=24:fontcolor=white:x=750:y=50:box=1:boxcolor=0x646464@0.8:boxborderw=2,\
    drawtext=text='Files colored by type - Users unique colors':fontsize=18:fontcolor=0xCCCCCC@0.9:x=50:y=h-60" \
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
echo "Legend overlay shows:"
echo "  • Conventional commit types (colored boxes)"
echo "  • Note: Files are colored by type, users by unique color"
echo ""
echo "Play with:"
echo "  mpv \"${OUTPUT_FILE}\""
echo "  vlc \"${OUTPUT_FILE}\""
echo "  xdg-open \"${OUTPUT_FILE}\""
echo ""
echo "Web-optimized: Upload directly to web, no transcoding needed!"
echo ""
