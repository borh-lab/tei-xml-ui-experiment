# Speech Detection Package Reorganization

**Date**: 2026-02-05
**Status**: Design Complete
**Author**: Claude & User

## Overview

Reorganize the speech detection codebase into a proper uv package with:
- Clean separation of concerns (models, evaluation, data, CLI)
- Protocol-based design (no inheritance where not needed)
- Full type annotations
- Doctests for key functions
- Unified CLI with YAML config support
- Parallel CRF training (n_jobs=2)

## Project Structure

```
speech-detection/
├── pyproject.toml              # uv package configuration
├── README.md
├── config/                     # Experiment configurations
│   ├── crf_fast.yaml
│   ├── distilbert_baseline.yaml
│   └── modernbert_large.yaml
├── src/
│   └── speech_detection/
│       ├── __init__.py
│       ├── cli.py              # Main CLI entry point
│       ├── models/
│       │   ├── __init__.py
│       │   ├── protocols.py    # TrainedModel, ModelPrediction, configs
│       │   ├── crf.py          # CRFModel implementation
│       │   └── transformers/
│       │       ├── __init__.py
│       │       ├── distilbert.py
│       │       └── modernbert.py
│       ├── evaluation/
│       │   ├── __init__.py
│       │   ├── metrics.py      # compute_metrics, seqeval wrappers
│       │   ├── statistical.py   # Cross-validation, bootstrap CIs
│       │   ├── split.py        # Document-level splitting
│       │   └── protocols.py    # StatisticalResult, EvaluationConfig
│       └── data/
│           ├── __init__.py
│           ├── parsers.py      # TEIParser (lxml-based)
│           └── protocols.py    # TEIDocument, TEIParagraph
├── tests/
│   ├── __init__.py
│   ├── test_crf.py
│   ├── test_transformers.py
│   ├── test_evaluation.py
│   └── test_data.py
└── scripts/                    # Development/quick scripts
    ├── train_crf_dev.py
    └── train_transformer_dev.py
```

## Design Principles

### 1. Protocol-Based Design

No base classes - use protocols for interfaces:

```python
# models/protocols.py
from typing import Protocol, List, Dict, Any

class TrainedModel(Protocol):
    """Protocol for trainable models."""

    def train(self, train_data: List[Dict[str, Any]],
              val_data: List[Dict[str, Any]] | None = None) -> None:
        """Train the model on provided data."""
        ...

    def predict_paragraphs(self, data: List[Dict[str, Any]]) -> List['ModelPrediction']:
        """Predict speech labels for paragraphs."""
        ...

@dataclass(frozen=True)
class ModelPrediction:
    """Immutable prediction result."""
    doc_id: str
    para_id: str
    tokens: List[str]
    predicted_bio_labels: List[str]
    text: str
```

### 2. Values Over Places

Use immutable dataclasses, avoid state mutation:

```python
# evaluation/protocols.py
@dataclass(frozen=True)
class EvaluationConfig:
    """Immutable evaluation configuration."""
    n_folds: int = 5
    n_bootstrap: int = 2000
    n_jobs: int = 1
    random_state: int = 42

@dataclass(frozen=True)
class StatisticalResult:
    """Value object for statistical results with confidence intervals."""
    estimate: float
    ci_lower: float
    ci_upper: float
    se: float

    def __str__(self) -> str:
        """Return formatted string representation.

        >>> result = StatisticalResult(0.5, 0.3, 0.7, 0.1)
        >>> print(result)
        0.500, 95% CI [0.300, 0.700], SE: 0.100
        """
        return f"{self.estimate:.3f}, 95% CI [{self.ci_lower:.3f}, {self.ci_upper:.3f}], SE: {self.se:.3f}"
```

### 3. Composable Functions

Decompose complex workflows into simple, composable functions:

```python
# evaluation/split.py
from typing import List, Tuple, Dict, Any
from speech_detection.evaluation.protocols import EvaluationConfig

def split_documents_by_id(
    data: List[Dict[str, Any]],
    n_folds: int,
    random_state: int
) -> List[Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]]:
    """Split data into train/test folds at document level.

    Groups paragraphs by document_id, then randomly assigns
    documents to folds to prevent data leakage.

    Args:
        data: List of tokenized paragraphs with 'doc_id' field
        n_folds: Number of cross-validation folds
        random_state: Random seed for reproducibility

    Returns:
        List of (train_data, test_data) tuples, one per fold

    Examples:
        >>> data = [
        ...     {'doc_id': 'doc1', 'para_id': 'p1', 'tokens': [], ...},
        ...     {'doc_id': 'doc1', 'para_id': 'p2', 'tokens': [], ...},
        ...     {'doc_id': 'doc2', 'para_id': 'p3', 'tokens': [], ...},
        ... ]
        >>> splits = split_documents_by_id(data, n_folds=2, random_state=42)
        >>> len(splits)
        2
        >>> train, test = splits[0]
        >>> all(p['doc_id'] != t['doc_id'] for p in train for t in test)
        True
    """
    import numpy as np
    np.random.seed(random_state)

    # Group by document
    docs: Dict[str, List[Dict[str, Any]]] = {}
    for para in data:
        doc_id = para.get('doc_id', 'unknown')
        if doc_id not in docs:
            docs[doc_id] = []
        docs[doc_id].append(para)

    # Shuffle document IDs
    doc_ids = list(docs.keys())
    np.random.shuffle(doc_ids)

    # Assign to folds
    fold_size = len(doc_ids) // n_folds
    splits = []

    for fold_idx in range(n_folds):
        test_doc_ids = doc_ids[fold_idx * fold_size:(fold_idx + 1) * fold_size]
        train_doc_ids = [doc_id for doc_id in doc_ids if doc_id not in test_doc_ids]

        test_data = []
        for doc_id in test_doc_ids:
            test_data.extend(docs[doc_id])

        train_data = []
        for doc_id in train_doc_ids:
            train_data.extend(docs[doc_id])

        splits.append((train_data, test_data))

    return splits
```

## CLI Design

### Main Command Structure

```bash
# Train CRF
uv run speech-detector train crf --config config/crf_fast.yaml

# Train Transformer
uv run speech-detector train transformer --config config/distilbert_baseline.yaml

# Evaluate
uv run speech-detector evaluate crf --checkpoint results/crf.pkl
uv run speech-detector evaluate transformer --checkpoint checkpoints/distilbert

# Data info
uv run speech-detector data info --corpus /path/to/corpora
```

### Click Implementation

```python
# cli.py
import click
from pathlib import Path
import yaml
from speech_detection.models import CRFModel, DistilBERTModel
from speech_detection.evaluation import StatisticalEvaluator

@click.group()
@click.version_option(version='0.1.0')
def cli():
    """Speech detection in TEI XML documents.

    Train and evaluate models for detecting speech in TEI XML documents.
    """
    pass

@cli.command()
@click.option('--config', type=click.Path(exists=True), required=True,
              help='Path to YAML configuration file')
def train_crf(config: str):
    """Train CRF model with cross-validation."""
    cfg = yaml.safe_load(Path(config))
    model = CRFModel(**cfg['model'])

    data = load_data(**cfg['data'])
    evaluator = StatisticalEvaluator(**cfg['training'])

    results = evaluator.evaluate(model, data)
    print_results(results)

@cli.command()
@click.option('--config', type=click.Path(exists=True), required=True,
              help='Path to YAML configuration file')
def train_transformer(config: str):
    """Train transformer model with train/val/test split."""
    cfg = yaml.safe_load(Path(config))
    model = DistilBERTModel(TransformerConfig(**cfg['model']))

    train_data = load_data(**cfg['data'])
    # ... train model
```

## Configuration Format

### CRF Config

```yaml
# config/crf_fast.yaml
model:
  c1: 0.5
  c2: 0.5
  max_iterations: 100

data:
  corpus_dir: /home/bor/Projects/tei-xml/corpora
  max_docs: 30
  train_split: 0.7
  val_split: 0.15
  test_split: 0.15

training:
  folds: 5
  bootstrap: 2000
  jobs: 2  # Parallel fold evaluation

output:
  results_dir: results/crf_fast
  save_predictions: true
  save_model: true
```

### Transformer Config

```yaml
# config/distilbert_baseline.yaml
model:
  name: distilbert/distilbert-base-cased
  max_length: 512
  num_labels: 5

data:
  corpus_dir: /home/bor/Projects/tei-xml/corpora
  max_docs: null  # All documents
  train_split: 0.7
  val_split: 0.15
  test_split: 0.15

training:
  batch_size: 32
  epochs: 3
  learning_rate: 2.0e-5
  warmup_steps: 100
  bf16: true
  gradient_accumulation: 1
  logging_steps: 100

output:
  results_dir: results/distilbert_baseline
  checkpoint_dir: checkpoints/distilbert
  save_predictions: true
```

## Type Annotations

### Complete Typing Example

```python
# models/transformers/distilbert.py
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification

@dataclass(frozen=True)
class TransformerConfig:
    """Configuration for transformer models."""
    model_name: str
    max_length: int
    num_labels: int
    batch_size: int
    epochs: int
    learning_rate: float
    warmup_steps: int
    bf16: bool
    gradient_accumulation: int

class DistilBERTModel:
    """DistilBERT model for token classification.

    Uses BFloat16 mixed precision and dynamic padding for efficiency.
    """

    def __init__(self, config: TransformerConfig) -> None:
        """Initialize model with tokenizer and weights.

        Args:
            config: Model configuration
        """
        self.config: TransformerConfig = config
        self.device: torch.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.tokenizer: AutoTokenizer = AutoTokenizer.from_pretrained(
            config.model_name
        )

        self.model: AutoModelForTokenClassification = (
            AutoModelForTokenClassification
            .from_pretrained(config.model_name, num_labels=config.num_labels)
            .to(self.device)
        )

    def train(
        self,
        train_data: List[Dict[str, Any]],
        val_data: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """Train the model.

        Args:
            train_data: Training paragraphs
            val_data: Optional validation paragraphs
        """
        # Implementation...
        pass

    def predict_paragraphs(
        self,
        data: List[Dict[str, Any]]
    ) -> List[ModelPrediction]:
        """Predict on paragraphs.

        Args:
            data: List of tokenized paragraphs

        Returns:
            List of ModelPrediction objects
        """
        # Implementation...
        pass
```

## Doctests

### Examples for Key Functions

```python
# evaluation/metrics.py
def compute_f1(true_labels: List[List[str]],
                pred_labels: List[List[str]]) -> float:
    """Compute F1 score using seqeval.

    Args:
        true_labels: Ground truth BIO labels
        pred_labels: Predicted BIO labels

    Returns:
        F1 score between 0 and 1

    Examples:
        >>> true = [['O', 'B-DIRECT', 'I-DIRECT', 'O']]
        >>> pred = [['O', 'B-DIRECT', 'I-DIRECT', 'O']]
        >>> round(compute_f1(true, pred), 2)
        1.0

        >>> true = [['O', 'B-DIRECT', 'O']]
        >>> pred = [['O', 'O', 'O']]
        >>> round(compute_f1(true, pred), 2)
        0.0
    """
    from seqeval.metrics import f1_score
    return f1_score(true_labels, pred_labels)

# data/parsers.py
def load_corpus(
    corpus_dir: str,
    max_docs: int | None = None,
    min_paras: int = 1
) -> List[TEIParagraph]:
    """Load TEI XML documents from corpus directory.

    Args:
        corpus_dir: Path to corpus directory
        max_docs: Maximum documents to load (None for all)
        min_paras: Minimum paragraphs required per document

    Returns:
        List of TEIParagraph objects

    Raises:
        ValueError: If corpus_dir doesn't exist or is empty

    Examples:
        >>> paras = load_corpus('/path/to/corpora', max_docs=2)
        >>> len(paras) > 0
        True
        >>> all(isinstance(p, TEIParagraph) for p in paras)
        True
    """
    # Implementation...
    pass
```

## uv Integration

### pyproject.toml

```toml
[project]
name = "speech-detection"
version = "0.1.0"
description = "Speech detection in TEI XML documents"
readme = "README.md"
requires-python = ">=3.10"
dependencies = [
    "click>=8.0.0",
    "pyyaml>=6.0",
    "torch>=2.0.0",
    "transformers>=5.0.0",
    "accelerate>=1.1.0",
    "scikit-learn",
    "sklearn-crfsuite",
    "seqeval",
    "lxml",
    "tqdm",
    "numpy",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-cov>=4.0.0",
    "ruff>=0.1.0",
]

[project.scripts]
speech-detector = "speech_detection.cli:cli"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/speech_detection"]

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "B"]
ignore = ["E501"]  # Line length

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
```

## Implementation Plan

### Phase 1: Package Structure
1. Create `src/speech_detection/` hierarchy
2. Set up `pyproject.toml` with uv
3. Move and refactor model code
4. Move and refactor evaluation code
5. Move and refactor data code

### Phase 2: CLI Implementation
1. Create `cli.py` with Click commands
2. Implement config file loading
3. Add CLI parameter overrides

### Phase 3: Type Annotations & Doctests
1. Add complete type hints to all functions
2. Write doctests for key functions
3. Set up pytest with doctest integration

### Phase 4: Testing
1. Migrate existing tests
2. Add new tests for refactored code
3. Ensure all tests pass

### Phase 5: Documentation
1. Update README.md
2. Document CLI usage
3. Add example configs

## Success Criteria

- [ ] Package installs via `uv pip install -e .`
- [ ] CLI works: `uv run speech-detector train crf --config config/crf.yaml`
- [ ] All functions have type annotations
- [ ] Key functions have doctests
- [ ] All tests pass
- [ ] Type checking with mypy passes
- [ ] Ruff linting passes
