# Evaluation Module Documentation

The evaluation module provides statistically rigorous evaluation functions for speech detection models.

## Overview

The evaluation module (`src/speech_detection/evaluation/`) includes:

- **protocols.py** - Immutable configuration and result types
- **split.py** - Document-level cross-validation splitting
- **metrics.py** - Sequence labeling metrics (F1, precision, recall)
- **statistical.py** - Bootstrap confidence intervals and model evaluation

## Quick Start

```python
from speech_detection.evaluation import (
    EvaluationConfig,
    evaluate_model_with_cv,
    format_results
)

# Configure evaluation
config = EvaluationConfig(
    n_folds=5,
    n_bootstrap=2000,
    random_state=42
)

# Evaluate model
results = evaluate_model_with_cv(model, data, config)

# Display results
print(format_results(results, "MyModel"))
```

## Key Features

### 1. Document-Level Cross-Validation

Prevents data leakage by ensuring all paragraphs from the same document stay in the same fold:

```python
from speech_detection.evaluation import split_documents_by_id, verify_no_leakage

# Create folds
folds = split_documents_by_id(data, n_folds=5, random_state=42)

# Verify no leakage
train_data = [data[i] for i in train_idx]
test_data = [data[i] for i in test_idx]
assert verify_no_leakage(train_data, test_data)
```

### 2. Bootstrap Confidence Intervals

Provides robust uncertainty quantification:

```python
from speech_detection.evaluation import bootstrap_metric

scores = [0.8, 0.85, 0.9, 0.82, 0.88]
result = bootstrap_metric(scores, n_bootstrap=2000, ci_width=0.95, random_state=42)

print(result)  # 0.850, 95% CI [0.820, 0.882], SE: 0.018
```

### 3. Sequence Labeling Metrics

Uses seqeval for proper BIO-tagged evaluation:

```python
from speech_detection.evaluation import compute_f1, compute_metrics

true = [['O', 'O', 'B-DIRECT'], ['O', 'B-DIRECT']]
pred = [['O', 'O', 'B-DIRECT'], ['O', 'O']]

f1 = compute_f1(true, pred)
metrics = compute_metrics(true, pred)  # Returns dict with f1, precision, recall
```

## Module Reference

### protocols.py

Immutable data structures for evaluation configuration and results.

**`EvaluationConfig`**
- `n_folds`: Number of CV folds (default: 5)
- `n_bootstrap`: Bootstrap iterations (default: 2000)
- `n_jobs`: Parallel jobs (default: 2)
- `random_state`: Random seed (default: 42)
- `ci_width`: Confidence interval width (default: 0.95)

**`StatisticalResult`**
- `estimate`: Point estimate
- `ci_lower`: Lower CI bound
- `ci_upper`: Upper CI bound
- `se`: Standard error
- `fold_scores`: Tuple of fold scores
- `n_samples`: Number of samples

### split.py

Document-level splitting functions.

**`split_documents_by_id(data, n_folds, random_state)`**
Creates CV folds ensuring document-level separation.

**`create_document_folds(data, n_folds, random_state)`**
Creates detailed folds with metadata (document counts, speech ratios).

**`verify_no_leakage(train_data, test_data)`**
Validates no document appears in both sets.

### metrics.py

Pure functions for sequence labeling evaluation.

**`compute_f1(true_labels, pred_labels)`**
Computes F1 score using seqeval.

**`compute_precision(true_labels, pred_labels)`**
Computes precision score.

**`compute_recall(true_labels, pred_labels)`**
Computes recall score.

**`compute_metrics(true_labels, pred_labels)`**
Returns dict with all metrics.

### statistical.py

Bootstrap and cross-validation evaluation.

**`bootstrap_metric(scores, n_bootstrap, ci_width, random_state)`**
Calculates bootstrap CI for metric scores.

**`evaluate_model_with_cv(model, data, config)`**
Performs full CV evaluation with CIs.

**`compare_models(model1_results, model2_results, alpha)`**
Compares two models with statistical tests.

**`format_results(results, model_name)`**
Formats results for display.

## Example Usage

### Complete Evaluation Workflow

```python
from speech_detection.evaluation import (
    EvaluationConfig,
    evaluate_model_with_cv,
    format_results,
    compare_models
)

# Prepare data
data = [
    {
        "doc_id": "doc1",
        "para_id": "para1",
        "tokens": ["Hello", "world"],
        "bio_labels": ["O", "O"]
    },
    # ... more paragraphs
]

# Configure evaluation
config = EvaluationConfig(
    n_folds=5,
    n_bootstrap=2000,
    n_jobs=2,
    random_state=42
)

# Evaluate model 1
results1 = evaluate_model_with_cv(model1, data, config)
print(format_results(results1, "CRF Model"))

# Evaluate model 2
results2 = evaluate_model_with_cv(model2, data, config)
print(format_results(results2, "BERT Model"))

# Compare models
comparison = compare_models(results1, results2, alpha=0.05)
for metric, comp in comparison.items():
    if comp['significant']:
        print(f"{metric}: p={comp['p_value']:.3f} (significant)")
        print(f"  Cohen's d = {comp['cohens_d']:.2f} ({comp['interpretation']})")
```

## Testing

Run doctests to verify functionality:

```bash
# Activate virtual environment
source .venv/bin/activate

# Run doctests
python -m doctest src/speech_detection/evaluation/protocols.py -v
python -m doctest src/speech_detection/evaluation/metrics.py -v
python -m doctest src/speech_detection/evaluation/split.py -v

# Run integration test
python test_evaluation_module.py
```

## Design Principles

1. **Pure Functions** - All functions are pure (no side effects)
2. **Immutable Types** - Frozen dataclasses with slots=True
3. **Type Annotations** - Complete type hints for all functions
4. **Document-Level Splitting** - Prevents data leakage
5. **Statistical Rigor** - Bootstrap CIs for all metrics
6. **Functional Programming** - No mutable classes (except frozen dataclasses)

## Dependencies

- scikit-learn - For GroupKFold splitting
- seqeval - For sequence labeling metrics
- numpy - For numerical operations
- scipy - For statistical tests (optional)

Install with:
```bash
uv pip install scikit-learn seqeval numpy scipy
```
