#!/usr/bin/env bash
set -euo pipefail

# SLOC Visualization Generator Wrapper
# Usage: ./scripts/generate-sloc-viz.sh [output-file]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="${1:-${PROJECT_ROOT}/sloc-visualization.svg}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  SLOC Visualization Generator                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Output: ${OUTPUT_FILE}"
echo ""

cd "${PROJECT_ROOT}"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed"
    echo "Install from: https://github.com/astral-sh/uv"
    exit 1
fi

# Run the Python script with uv
uv run scripts/generate-sloc-viz.py . -o "${OUTPUT_FILE}"

echo ""
echo "✓ Complete!"
