# Speech Detection Package

Speech detection in TEI XML documents using CRF and transformer models.

## Installation

```bash
uv pip install -e .
```

## CLI Usage

### Data Info

Display corpus statistics:

```bash
uv run speech-detector data-info --corpus /path/to/corpora
```

### Train CRF Model

Train CRF with cross-validation:

```bash
uv run speech-detector train-crf --config config/crf_fast.yaml
```

With CLI overrides:

```bash
uv run speech-detector train-crf --config config/crf_fast.yaml --jobs 4 --folds 10
```

### Train Transformer Model

Train DistilBERT:

```bash
uv run speech-detector train-transformer --config config/distilbert_baseline.yaml
```

Train ModernBERT (long context):

```bash
uv run speech-detector train-transformer --config config/modernbert_large.yaml
```

With CLI overrides:

```bash
uv run speech-detector train-transformer --config config/distilbert_baseline.yaml --batch-size 16 --epochs 5 --lr 3e-5
```

## Configuration

Config files use YAML format with three sections:

- `model`: Model hyperparameters
- `data`: Corpus path and split ratios
- `training`: Training settings (CV folds, bootstrap samples, etc.)

See `config/*.yaml` for examples.

## Package Structure

```
src/speech_detection/
├── cli.py              # Unified CLI
├── models/             # CRF and transformer models
│   ├── protocols.py    # Model interfaces and configs
│   ├── crf.py         # CRF implementation
│   └── transformers/  # Transformer models
├── evaluation/        # Statistical evaluation
│   ├── protocols.py   # EvaluationConfig, StatisticalResult
│   ├── split.py      # Document-level splitting
│   ├── metrics.py    # seqeval metrics
│   └── statistical.py # Bootstrap CI, CV
└── data/             # TEI XML parsing
    ├── protocols.py  # TEIParagraph, TEIDocument
    └── parsers.py    # Fast lxml parser
```

## Design Principles

- **Protocol-based**: No inheritance, use structural typing via Protocols
- **Values over places**: Frozen dataclasses for immutability
- **Pure functions**: Decomposed, composable functions
- **Type-safe**: Complete type annotations throughout
- **Statistical rigor**: Bootstrap confidence intervals for all metrics
