# TEI Dialogue Corpus - ML Examples

✅ **Validated Scripts** - All examples tested and verified working!

This directory contains validated examples for using the TEI dialogue corpus with machine learning libraries. Each script uses **uv** for dependency management and has been tested to work correctly.

## Prerequisites

Install [uv](https://github.com/astral-sh/uv) (the fast Python package installer):

```bash
# Linux/macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with pip
pip install uv
```

## Quick Start

### 1. Generate ML-Compatible Splits

```bash
bun run corpus:split:ml
```

This creates `data/splits.json` with:
- Flat structure organized by split
- Full file paths from project root
- Dataset metadata and split details

### 2. Run Example Scripts

All scripts are self-contained with inline dependencies. Just run with `uv`:

```bash
# Basic loading (no dependencies)
uv run examples/01_basic_load.py

# HuggingFace Datasets
uv run examples/02_huggingface_datasets.py

# Polars analysis
uv run examples/03_polars_analysis.py
```

## Examples

### `01_basic_load.py` - ✅ Validated

**Dependencies**: None (Python standard library only)

Demonstrates basic dataset loading with just the standard library:
- Load dataset metadata
- Access train/validation/test splits
- Read document contents
- Verify file paths

**Run:**
```bash
uv run examples/01_basic_load.py
```

**Output:**
```
============================================================
TEI Corpus - Basic Loading Example
============================================================

Dataset: tei-dialogue-corpus
Version: 1.0.0
Total documents: 10,819
  Train:      7,570
  Validation: 1,620
  Test:       1,629

✓ Loaded 7,570 training file paths
```

---

### `02_huggingface_datasets.py` - ✅ Validated

**Dependencies**: `datasets>=3.0.0`

Demonstrates HuggingFace Datasets integration:
- Convert to `DatasetDict` format
- Filter and map operations
- Aggregate by corpus
- Compatible with Transformers, Trainer API

**Run:**
```bash
uv run examples/02_huggingface_datasets.py
```

**Use for:**
- Fine-tuning BERT/GPT/T5 models
- Using HuggingFace Trainer API
- Built-in metrics and evaluation
- Stream processing for large datasets

---

### `03_polars_analysis.py` - ✅ Validated

**Dependencies**: `polars>=1.0.0`

Demonstrates high-performance data analysis with Polars:
- Fast DataFrame operations
- Memory-efficient lazy evaluation
- Filtering and aggregation
- Multi-threaded processing

**Run:**
```bash
uv run examples/03_polars_analysis.py
```

**Use for:**
- Large dataset analysis (faster than pandas)
- Data exploration and filtering
- Complex aggregations
- Memory-efficient processing

## Dataset Structure

### File Organization

```
data/
└── splits.json          # ML-compatible split definitions (generated)

corpora/
├── wright-american-fiction/
├── victorian-women-writers/
├── indiana-magazine-history/
├── indiana-authors-books/
├── brevier-legislative/
├── tei-texts/
└── novel-dialogism/
```

### Splits Format

```json
{
  "dataset_info": {
    "name": "tei-dialogue-corpus",
    "splits": {"train": 7570, "validation": 1620, "test": 1629}
  },
  "splits": {
    "train": ["corpora/wright-american-fiction/VAC5518.xml", ...],
    "validation": [...],
    "test": [...]
  },
  "split_details": {
    "train": [
      {
        "file": "corpora/wright-american-fiction/VAC5518.xml",
        "corpus": "wright-american-fiction"
      },
      ...
    ]
  }
}
```

## Common Use Cases

### Text Classification

Classify documents by corpus, encoding type, or other features:

```python
from datasets import Dataset

# Load and classify
train_ds = Dataset.from_list(data['split_details']['train'])

# Add labels
def add_label(example):
    # Your classification logic here
    example['label'] = classify_document(example['file'])
    return example

train_ds = train_ds.map(add_label)
```

### Named Entity Recognition

Train NER models on character names, locations, organizations:

```python
# Extract entities from TEI documents
def extract_entities(example):
    content = Path(example['file']).read_text()
    example['entities'] = parse_tei_entities(content)
    return example

ner_ds = train_ds.map(extract_entities)
```

### Transformer Fine-Tuning

Fine-tune models for dialogue detection, speaker attribution, etc.:

```python
from transformers import AutoModelForSequenceClassification, Trainer

# Load pre-trained model
model = AutoModelForSequenceClassification.from_pretrained('bert-base-uncased')

# Fine-tune on your data
trainer = Trainer(model=model, train_dataset=train_ds)
trainer.train()
```

### Corpus Filtering

Filter by corpus type for specific analyses:

```python
import polars as pl

df = pl.DataFrame(data['split_details']['train'])

# Get only dramatic texts
dramatic_df = df.filter(
    pl.col('corpus').is_in([
        'wright-american-fiction',
        'indiana-authors-books'
    ])
)
```

## Performance Tips

### For Large Datasets (10K+ documents)

Use **Polars** instead of pandas:
- **10-100x faster** operations
- **Lower memory usage** with lazy evaluation
- **Multi-threaded** by default

```python
import polars as pl

# Lazy loading for huge datasets
df = pl.scan_parquet('huge_dataset.parquet')
result = df.filter(pl.col('corpus') == 'wright-american-fiction').collect()
```

### For ML Model Training

Use **HuggingFace Datasets**:
- **Memory-mapped** files (don't load all into RAM)
- **Streaming** mode for infinite datasets
- **Built-in** metrics and preprocessing

```python
from datasets import load_dataset

# Stream without loading all data
dataset = load_dataset('parquet', data_files='data/*.parquet', streaming=True)
```

### For Quick Exploration

Use **standard library** (no dependencies):
- Fast to load
- No installation needed
- Sufficient for basic tasks

## Validation Results

All scripts have been tested and verified:

| Script | Dependencies | Status | Test Date |
|--------|--------------|--------|-----------|
| 01_basic_load.py | None | ✅ Working | 2025-02-05 |
| 02_huggingface_datasets.py | datasets | ✅ Working | 2025-02-05 |
| 03_polars_analysis.py | polars | ✅ Working | 2025-02-05 |

**Test Results:**
- ✅ File paths validated (all 10,819 documents)
- ✅ File reading verified (573KB XML document loaded)
- ✅ Corpus counts match metadata
- ✅ Filters and aggregations working

## Troubleshooting

### `uv: command not found`

Install uv:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### `FileNotFoundError: data/splits.json`

Generate splits first:
```bash
bun run corpus:split:ml
```

### `ModuleNotFoundError: No module named 'datasets'`

This shouldn't happen with uv scripts - dependencies are declared inline and installed automatically. If you see this error, check that the script has the correct `# /// script` dependencies section at the top.

## Advanced Examples

Want more examples? Request them:
- Fine-tuning BERT for dialogue detection
- Training NER models on TEI documents
- Cross-corpus transfer learning
- Data augmentation techniques

## See Also

- [Corpus Reference](../docs/corpus-reference.md) - Detailed corpus statistics
- [Corpus Browsing](../docs/corpus-browsing.md) - How to browse corpora in the UI
- [TEI Documentation](https://tei-c.org/guidelines/) - TEI markup guidelines
