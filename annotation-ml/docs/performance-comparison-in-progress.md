# Model Performance Comparison - Production Configs (2026-02-05)

## Executive Summary

Running production/fast configs to compare actual model performance:
- **CRF Fast**: 5-fold CV, 2000 bootstrap samples, 100 iterations
- **DistilBERT Baseline**: 3 epochs, full 512-token sequences
- **Quote Baseline**: Rule-based (for comparison)

## Training Status

### ✅ Completed
1. **Quote Baseline Evaluation** - Running on test split (444,790 paragraphs from all 7 corpora)
2. **Test Configs** - All smoke test configs verified working

### 🔄 In Progress
1. **CRF Fast Config** - Training on 22,749 paragraphs from train split
   - 5-fold cross-validation
   - 2000 bootstrap samples for confidence intervals
   - Estimated time: 30-60 minutes

2. **DistilBERT Baseline** - Restarted with correct corpus path
   - Was looking in wrong directory (`../datasets/` instead of `../corpora/`)
   - Now loading from `../corpora/wright-american-fiction`
   - 3 epochs, batch size 32

## Configuration Details

### CRF Fast Config (`config/crf_fast.yaml`)
```yaml
model:
  c1: 0.5  # L1 regularization
  c2: 0.5  # L2 regularization
  max_iterations: 100
  char_ngram_range: [2, 5]
  context_window: 2
  use_speech_verbs: true
  use_orthographic: true

data:
  max_docs: 30  # From wright-american-fiction

training:
  n_folds: 5
  n_bootstrap: 2000
  n_jobs: 2
```

### DistilBERT Baseline (`config/distilbert_baseline.yaml`)
```yaml
model:
  model_name: distilbert/distilbert-base-cased
  max_length: 512
  num_labels: 5
  batch_size: 32
  epochs: 3
  learning_rate: 2.0e-5
  bf16: true

data:
  corpus_dir: ../corpora/wright-american-fiction  # FIXED
  max_docs: null  # All documents
```

## Expected Results

### Quote Baseline (Known)
- **F1**: ~0.0003 (very low due to over-prediction)
- **Precision**: ~0.0002
- **Recall**: ~0.0075
- **Issue**: Marks all quoted text as speech (book titles, citations, etc.)

### CRF Fast (Expected)
Based on previous run with splits (22,749 paragraphs):
- **Expected F1**: 0.1-0.3 range (improved from test config)
- **95% CI**: Will be computed from 2000 bootstrap samples
- **Training time**: ~30-60 minutes

### DistilBERT Baseline (Expected)
- **Expected F1**: Unknown (first run on this corpus)
- **Expected to outperform CRF** due to:
  - Pre-trained language understanding
  - Contextual embeddings
  - Larger training capacity

## Bug Fixes Applied

### 1. Config Path Corrections
**Issue**: Transformer configs pointed to `../datasets/` which has split subdirectories, not XML files

**Fix**: Updated all transformer configs to use `../corpora/` for flat directory structure
- `config/distilbert_baseline.yaml` ✅
- `config/distilbert_test.yaml` ✅
- `config/modernbert_large.yaml` ✅
- `config/modernbert_test.yaml` ✅

### 2. DataCollator Tokenizer Bug
**Issue**: `DataCollatorForTokenClassification.__init__() missing 1 required positional argument: 'tokenizer'`

**Fix**: Uncommented tokenizer parameter in:
- `src/speech_detection/models/transformers/distilbert.py` ✅
- `src/speech_detection/models/transformers/modernbert.py` ✅

## Dataset Information

### Training Split (22,749 paragraphs from 7,570 documents)
```
Corpora:
- wright-american-fiction: 2,013 docs (train)
- victorian-women-writers: 139 docs
- indiana-magazine-history: 5,102 docs
- indiana-authors-books: 275 docs
- brevier-legislative: 13 docs
- tei-texts: 9 docs
- novel-dialogism: 19 docs
```

### Test Split (1,629 paragraphs from 1,629 documents)
- All 7 corpora represented
- Held out for final evaluation

## Next Steps

1. **Wait for CRF to complete** (~30-60 minutes remaining)
2. **DistilBERT training in progress** (~15-20 minutes per epoch × 3 = 45-60 minutes)
3. **Compare final results** with 95% confidence intervals
4. **Generate comparison report** with:
   - F1, Precision, Recall metrics
   - Confidence intervals
   - Training time comparison
   - Model size comparison
   - Recommendations for production use

## Performance Comparison Framework

### Metrics to Compare
1. **F1 Score** - Primary metric (harmonic mean of precision and recall)
2. **Precision** - How many predicted speech tokens are correct
3. **Recall** - How many actual speech tokens were found
4. **Training Time** - Wall-clock time for training
5. **Inference Speed** - Tokens processed per second
6. **Model Size** - Disk space and memory requirements

### Statistical Rigor
- CRF: 95% CI from 2000 bootstrap samples
- Transformers: Single run (can add CV if needed)
- Significance testing: Paired bootstrap if results are close

## Commands to Run

### Check Training Progress
```bash
# CRF training
tail -f /tmp/crf_fast.log | grep -E "Fold|Bootstrap|RESULTS"

# DistilBERT training
tail -f /tmp/distilbert_baseline.log | grep -E "Epoch|Loss|F1"

# Baseline evaluation
cat /tmp/baseline_eval.log | grep -A 10 "RESULTS"
```

### View Results When Complete
```bash
# CRF results
cat /tmp/crf_fast.log | grep -A 20 "RESULTS"

# DistilBERT results
cat /tmp/distilbert_baseline.log | grep -E "Validation Metrics|Training complete"

# Baseline results
cat /tmp/baseline_eval.log | grep -A 10 "BASELINE RESULTS"
```

## Notes

- All training using ROCm 7.1 (AMD GPU)
- BF16 mixed precision enabled for transformers
- CRF using 2 parallel jobs for fold evaluation
- Results will be saved to:
  - `results/crf_fast/crf_results.json`
  - `results/distilbert_baseline/`
  - `/tmp/baseline_eval.log`
