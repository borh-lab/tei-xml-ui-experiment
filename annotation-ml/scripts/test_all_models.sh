#!/bin/bash
# Test all model code paths with minimal configs
# This script verifies training, saving, loading, and prediction work correctly

set -e  # Exit on error

echo "=================================="
echo "Testing All Model Code Paths"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    echo ""
    echo "Cleanup: Removing test models and results..."
    rm -rf models/crf_test.pkl
    rm -rf models/distilbert_test
    rm -rf models/modernbert_test
    rm -rf results/crf_test
    rm -rf results/distilbert_test
    rm -rf results/modernbert_test
    rm -rf checkpoints/distilbert_test
    rm -rf checkpoints/modernbert_test
    rm -f predictions_*.json
    echo "Cleanup complete."
}

# Trap to ensure cleanup runs even if script fails
trap cleanup EXIT

# Initialize counter
STEP=0

# Helper function
run_step() {
    STEP=$((STEP + 1))
    echo ""
    echo -e "${BLUE}Step $STEP: $1${NC}"
    echo "=================================="
}

# ============================================================================
# 1. Test Quote Baseline Evaluation
# ============================================================================
run_step "Quote Baseline Evaluation (using splits)"
uv run python -m speech_detection.cli evaluate-baseline \
    --splits-path ../datasets/splits.json \
    --split test \
    --max-docs 5

echo -e "${GREEN}✓ Baseline evaluation complete${NC}"

# ============================================================================
# 2. Test CRF Model
# ============================================================================
run_step "CRF Training (minimal config with splits)"
uv run python -m speech_detection.cli train-crf \
    --config config/crf_test.yaml \
    --use-splits \
    --save-model models/crf_test.pkl

echo -e "${GREEN}✓ CRF training complete${NC}"

run_step "CRF Prediction (load saved model)"
uv run python -m speech_detection.cli predict \
    --model-type crf \
    --model-path models/crf_test.pkl \
    --corpus ../corpora/wright-american-fiction \
    --max-docs 3 \
    --output predictions_crf.json

echo -e "${GREEN}✓ CRF prediction complete${NC}"

# ============================================================================
# 3. Test DistilBERT Model
# ============================================================================
run_step "DistilBERT Training (minimal config)"
uv run python -m speech_detection.cli train-transformer \
    --config config/distilbert_test.yaml \
    --save-model models/distilbert_test

echo -e "${GREEN}✓ DistilBERT training complete${NC}"

run_step "DistilBERT Prediction (load saved model)"
uv run python -m speech_detection.cli predict \
    --model-type distilbert \
    --model-path models/distilbert_test \
    --corpus ../corpora/wright-american-fiction \
    --max-docs 3 \
    --output predictions_distilbert.json

echo -e "${GREEN}✓ DistilBERT prediction complete${NC}"

# ============================================================================
# 4. Test ModernBERT Model
# ============================================================================
run_step "ModernBERT Training (minimal config)"
uv run python -m speech_detection.cli train-transformer \
    --config config/modernbert_test.yaml \
    --save-model models/modernbert_test

echo -e "${GREEN}✓ ModernBERT training complete${NC}"

run_step "ModernBERT Prediction (load saved model)"
uv run python -m speech_detection.cli predict \
    --model-type modernbert \
    --model-path models/modernbert_test \
    --corpus ../corpora/wright-american-fiction \
    --max-docs 3 \
    --output predictions_modernbert.json

echo -e "${GREEN}✓ ModernBERT prediction complete${NC}"

# ============================================================================
# 5. Test Baseline Prediction
# ============================================================================
run_step "Baseline Prediction (rule-based, no training)"
uv run python -m speech_detection.cli predict \
    --model-type baseline \
    --model-path unused \
    --corpus ../corpora/wright-american-fiction \
    --max-docs 3 \
    --output predictions_baseline.json

echo -e "${GREEN}✓ Baseline prediction complete${NC}"

# ============================================================================
# 6. Verify Prediction Files
# ============================================================================
run_step "Verify Prediction Outputs"
for file in predictions_*.json; do
    if [ -f "$file" ]; then
        count=$(jq '.n_predictions' "$file")
        echo "  ✓ $file: $count predictions"
    fi
done

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=================================="
echo -e "${GREEN}ALL TESTS PASSED!${NC}"
echo "=================================="
echo ""
echo "Code paths verified:"
echo "  ✓ Quote baseline evaluation"
echo "  ✓ CRF training with config"
echo "  ✓ CRF model saving/loading"
echo "  ✓ CRF prediction"
echo "  ✓ DistilBERT training with config"
echo "  ✓ DistilBERT model saving/loading"
echo "  ✓ DistilBERT prediction"
echo "  ✓ ModernBERT training with config"
echo "  ✓ ModernBERT model saving/loading"
echo "  ✓ ModernBERT prediction"
echo "  ✓ Baseline prediction"
echo ""
echo "Total steps completed: $STEP"
