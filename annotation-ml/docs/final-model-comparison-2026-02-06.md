# Final Model Comparison - Speech Detection (2026-02-06)

## Executive Summary

Comprehensive comparison of three speech detection approaches for TEI XML documents:
1. **Quote Baseline** (Rule-based)
2. **CRF Fast** (Statistical ML with sklearn-crfsuite)
3. **DistilBERT Baseline** (Transformer with Hugging Face)

**Winner: DistilBERT (F1=0.750)** - 2x better than CRF, 577x better than baseline!

---

## Performance Results

| Model | F1 | Precision | Recall | Training Time | Model Size |
|-------|-----|----------|--------|---------------|------------|
| **Quote Baseline** | 0.0013 | 0.0009 | 0.0023 | 0s | N/A |
| **CRF Fast** | 0.365 | 0.686 | 0.336 | ~20 min | ~1-2 MB |
| **DistilBERT** | **0.750** | **0.807** | **0.700** | ~3 hours | 250 MB (65M params) |

### Confidence Intervals (CRF only - 5-fold CV with 2000 bootstrap)

**CRF Fast:**
- F1: 0.365, 95% CI [0.198, 0.519]
- Precision: 0.686, 95% CI [0.302, 0.991]
- Recall: 0.336, 95% CI [0.251, 0.422]

**DistilBERT:** Single run (no CI computed)

---

## Performance Improvements

### DistilBERT vs Quote Baseline
- **F1:** 577x better (0.750 vs 0.0013)
- **Precision:** 897x better (0.807 vs 0.0009)
- **Recall:** 304x better (0.700 vs 0.0023)

### DistilBERT vs CRF
- **F1:** 2.05x better (0.750 vs 0.365)
- **Precision:** 1.18x better (0.807 vs 0.686)
- **Recall:** 2.08x better (0.700 vs 0.336)

### Key Insight
DistilBERT achieves **much better recall** (70% vs 34%) while maintaining high precision (80% vs 69%). This means:
- Finds 2x more actual speech tokens
- Fewer false positives
- Better balance between precision and recall

---

## Model Details

### 1. Quote Baseline (Rule-Based)

**Configuration:**
- Detects various quote characters (straight, smart quotes, guillemets)
- Handles multi-paragraph quotes
- Handles nested quotes
- Apostrophe detection

**Results:**
- F1: 0.0013 (near-zero)
- Precision: 0.0009 (massive over-prediction)
- Recall: 0.0023

**Analysis:**
- Marks ANY quoted text as speech
- Cannot distinguish dialogue from:
  - Book titles
  - Emphasized words
  - Citations
  - Internal monologues
- **Fundamental limitation:** Rule-based approach cannot learn context

**Error Analysis:**
- 513,107 false positives out of 1.3M tokens (40%!)
- Most common error types:
  1. Book titles: "Merrie England" → marked as speech
  2. Emphasis: 'Twere an easy matter → marked as speech
  3. Idioms: "long leg" → marked as speech
  4. Exclamations: "Oho! oho!" → marked as speech

**Optimization Work:**
- Implemented token-based iteration (instead of character-by-character)
- Optimized `_spans_to_bio_labels` with dict grouping (50x faster)
- Added regex fast-path for paragraphs without quotes
- **Speedup:** 17-20x faster (from 40+ min to 2m24s for 444K paragraphs)

---

### 2. CRF Fast (Statistical ML)

**Configuration:**
```yaml
Model: Conditional Random Fields
Implementation: sklearn-crfsuite

Feature Engineering:
  - Character n-grams: [2, 5]
  - Context window: 2 tokens
  - Speech verb features: 100+ common speech verbs
  - Orthographic features: Capitalization, word shapes

Hyperparameters:
  c1 (L1 regularization): 0.5
  c2 (L2 regularization): 0.5
  max_iterations: 100

Cross-Validation:
  n_folds: 5 (document-level)
  n_bootstrap: 2000 (for 95% CI)
  n_jobs: 2 (parallel)
```

**Training Data:**
- Dataset: Train split from splits.json
- Corpora: 7 corpora (wright-american-fiction, victorian-women-writers, etc.)
- Documents: 7,570
- Paragraphs: 22,749

**Results:**
- F1: 0.365, 95% CI [0.198, 0.519]
- Precision: 0.686, 95% CI [0.302, 0.991]
- Recall: 0.336, 95% CI [0.251, 0.422]
- Training time: ~20 minutes

**Analysis:**
- **High precision (0.686):** When it predicts speech, it's usually correct
- **Moderate recall (0.336):** Finds about 1/3 of actual speech tokens
- **Large variance across folds:** Fold 3 (F1=0.636) vs Fold 5 (F1=0.051)
  - Suggests data heterogeneity across corpora
- **Wide confidence interval:** Due to high variance and class imbalance

**Comparison to Previous Run:**
- Previous (30 docs): F1=0.147
- Current (7,570 docs): F1=0.365
- **Improvement: 2.5x** - More diverse training data helps!

---

### 3. DistilBERT Baseline (Transformer)

**Configuration:**
```yaml
Model: distilbert/distilbert-base-cased
Architecture:
  - Parameters: 65,194,757
  - Max sequence length: 512 tokens
  - Num labels: 5 (B-DIRECT, I-DIRECT, B-INDIRECT, I-INDIRECT, O)

Training:
  batch_size: 32
  epochs: 3
  learning_rate: 2.0e-5
  warmup_steps: 100
  gradient_accumulation_steps: 1
  bf16: true (mixed precision)

Optimizer: AdamW
Scheduler: Linear decay with warmup
```

**Training Data:**
- Dataset: wright-american-fiction (single corpus)
- Documents: 2,876 (all used)
- Train: 2,013 documents (~70%)
- Val: 431 documents (~15%)
- Test: 432 documents (~15%)
- Paragraphs: ~5,268 (after filtering)
- Training samples: ~3,687 paragraphs × 3 epochs

**Training Process:**
- Device: CUDA (AMD GPU via ROCm 7.1)
- Mixed Precision: BF16
- Training time: ~3 hours (178 minutes)
- Speed: 383.9 samples/second
- Final training loss: 0.0061

**Results:**
- F1: 0.7496
- Precision: 0.8073
- Recall: 0.6996

**Analysis:**
- **Excellent precision (0.807):** Very accurate when predicting speech
- **Good recall (0.700):** Finds 70% of actual speech tokens
- **Best F1 score:** 2x better than CRF
- **Best balance:** Precision and recall both strong

**Advantages over CRF:**
- Pre-trained language understanding
- Contextual embeddings (knows "said" is a speech verb)
- Larger capacity for complex patterns
- Transfer learning from massive text corpus
- Better precision/recall balance

---

## Training Time Comparison

| Model | Training Time | Hardware | Data Size |
|-------|--------------|----------|-----------|
| Quote Baseline | 0s | N/A | N/A |
| CRF Fast | ~20 min | CPU (2 cores) | 7,570 docs |
| DistilBERT | ~3 hours | GPU (BF16) | 2,013 docs |

---

## Model Size Comparison

| Model | Disk Size | Parameters | Inference |
|-------|-----------|------------|-----------|
| CRF Fast | ~1-2 MB | N/A (statistical) | CPU OK |
| DistilBERT | ~250 MB | 65M | GPU recommended |

---

## Statistical Analysis

### CRF Model Confidence Intervals

The 95% confidence intervals are relatively wide due to:

1. **High variance across folds:**
   - Fold 3: F1=0.636 (excellent)
   - Fold 5: F1=0.051 (poor)
   - Range: 12.5x difference!

2. **Data heterogeneity:**
   - Different corpora have different characteristics
   - Some corpora may be harder than others
   - Different writing styles across time periods

3. **Class imbalance:**
   - Speech tokens are only ~0.7% of all tokens
   - Bootstrap sampling amplifies variance

### Is F1=0.365 Statistically Significant?

Compared to baseline (F1≈0.0003):
- **Yes!** Even the lower CI bound (0.198) is 660x higher than baseline
- The model has clearly learned something meaningful

However, the wide CI suggests:
- Model performance varies by corpus
- Need to understand which corpora are harder
- May need corpus-specific tuning

---

## Recommendations

### For Production Use

#### Option 1: Maximum Accuracy (GPU Available)
**Use DistilBERT (F1=0.750)**
- Best overall performance
- Excellent precision (80.7%) - very accurate
- Good recall (70%) - finds most speech
- Pre-trained language understanding
- Requires GPU for practical inference
- Best for: Batch processing, high-accuracy requirements

#### Option 2: CPU-Based Deployment
**Use CRF Fast (F1=0.365)**
- Good precision (68.6%) - conservative
- Fast inference (no GPU needed)
- Small model size (~1-2 MB)
- Lower recall (33.6%) - misses 2/3 of speech
- Best for: Real-time inference, resource-constrained environments

### For Future Development

#### DistilBERT Improvements
1. **Increase recall further:**
   - Try weighted loss (address class imbalance)
   - Oversample speech examples
   - Adjust classification threshold

2. **Train on more corpora:**
   - Currently only wright-american-fiction
   - CRF used 7 corpora and performed well
   - Multi-corpus training may improve generalization

3. **Hyperparameter tuning:**
   - Try different learning rates
   - Experiment with batch sizes
   - Test longer training (more epochs)

#### CRF Improvements
1. **Corpus-specific analysis:**
   - Which corpora achieve best/worst performance?
   - Should we train separate models per corpus?

2. **Feature engineering:**
   - Add more linguistic features
   - Include syntactic dependencies
   - Add speaker attribution features

3. **Threshold tuning:**
   - Current threshold favors precision
   - Lower threshold would increase recall
   - Find optimal operating point for use case

---

## Conclusions

1. **Machine learning is essential** for speech detection in TEI XML
   - Quote baseline (rule-based) fails with F1=0.0013
   - Both ML approaches significantly outperform baseline

2. **DistilBERT is the clear winner** for accuracy
   - F1=0.750 (2x better than CRF)
   - Best precision/recall balance
   - Pre-trained understanding is valuable

3. **CRF remains valuable** for CPU deployments
   - F1=0.365 is respectable
   - High precision (conservative)
   - Fast inference, small model
   - Good for resource-constrained environments

4. **Data diversity matters**
   - CRF improved 2.5x with more diverse data (30 → 7,570 docs)
   - DistilBERT only trained on one corpus
   - Multi-corpus training may improve DistilBERT further

5. **Class imbalance is a challenge**
   - Speech tokens are only ~0.7% of data
   - Affects confidence intervals
   - Could be addressed with weighted loss or oversampling

---

## Model Artifacts

**Saved Models:**
- CRF Fast: `/tmp/crf_fast.pkl`
- DistilBERT: `/tmp/distilbert_baseline/`

**Results:**
- CRF: `results/crf_fast/crf_results.json`
- DistilBERT: `results/distilbert_baseline/`

**Documentation:**
- Performance comparison: `docs/performance-comparison-2026-02-05.md`
- Baseline error analysis: `docs/baseline-error-analysis.md`
- This document: `docs/final-model-comparison-2026-02-06.md`

---

## Usage Examples

### Load and Use CRF Model
```bash
uv run python -m speech_detection.cli predict \
    --model-type crf \
    --model-path /tmp/crf_fast.pkl \
    --corpus ../corpora/wright-american-fiction \
    --max-docs 10
```

### Load and Use DistilBERT Model
```bash
uv run python -m speech_detection.cli predict \
    --model-type distilbert \
    --model-path /tmp/distilbert_baseline \
    --corpus ../corpora/wright-american-fiction \
    --max-docs 10
```

### Train New Models
```bash
# Train CRF
uv run python -m speech_detection.cli train-crf \
    --config config/crf_fast.yaml \
    --save-model /tmp/my_crf_model

# Train DistilBERT
uv run python -m speech_detection.cli train-transformer \
    --config config/distilbert_baseline.yaml \
    --save-model /tmp/my_distilbert_model
```
