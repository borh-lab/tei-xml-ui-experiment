#!/usr/bin/env bash
set -euo pipefail

# Preview Gource visualization interactively
# Usage: ./scripts/preview-gource.sh
# Press ESC or q to exit

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Gource Interactive Preview                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Controls:"
echo "  ESC or q  - Exit"
echo "  Space     - Pause"
echo "  +/-       - Zoom in/out"
echo "  ←/→       - Seek backward/forward"
echo ""

cd "$PROJECT_ROOT"

# Count commits
TOTAL_COMMITS=$(git rev-list --count HEAD)
echo "Total commits: ${TOTAL_COMMITS}"
echo ""
echo "Starting preview..."
echo ""

# Run gource interactively via nix
nix run nixpkgs#gource -- \
  --resolution 1280x720 \
  --framerate 30 \
  --auto-skip-seconds 0.5 \
  --time-scale 1.0 \
  --seconds-per-day 1.0 \
  --max-files 0 \
  --file-idle-time 0 \
  --max-file-lag 5.0 \
  --hide filenames \
  --hide dirnames \
  --hide users \
  --colour-images \
  --bloom-intensity 0.3 \
  --bloom-multiplier 1.5 \
  --elasticity 0.5 \
  --font-size 18 \
  --title "TEI XML Editor - Git History (Preview)" \
  --background 111111 \
  --camera-mode track \
  --highlight-all-users

echo ""
echo "Preview ended."
