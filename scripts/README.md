# Scripts

This directory contains utility scripts for TEI corpus management and project maintenance.

## Corpus Scripts

### setup-corpora.sh

Clones and sets up TEI corpus repositories from GitHub. Automatically extracts zip files and ensures repositories are up-to-date.

**Usage:**

```bash
bun run corpus:setup
# or
npm run corpus:setup
```

**Features:**

- Non-destructive: Won't remove existing repositories
- Makefile-like: Only updates when new commits are available
- Auto-extraction: Extracts \*.zip files in corpus directories
- Idempotent: Safe to run multiple times

**Corpora:**

- `wright-american-fiction` - Wright American Fiction collection
- `victorian-women-writers` - Victorian Women Writers Project
- `indiana-magazine-history` - Indiana Magazine of History
- `indiana-authors-books` - Indiana Authors and Their Books
- `brevier-legislative` - Brevier Legislative Reports
- `tei-texts` - French Novels (TEI Texts)

**Output:**

- Repository contents in `corpora/`
- Extracted XML files ready for analysis

---

### analyze-corpora.ts

Analyzes TEI XML files in corpus directories and generates metadata.

**Usage:**

```bash
bun run corpus:analyze
# or
npm run corpus:analyze
```

**Features:**

- Scans all corpus directories for TEI XML files
- Validates TEI structure and version
- Analyzes tag frequency and patterns
- Detects encoding types (dialogue-focused, dramatic-text, minimal-markup)
- Generates per-corpus metadata files

**Output:**

- `tests/corpora/metadata/{corpus-name}.json` - Individual corpus metadata
- `tests/corpora/metadata/summary.json` - Combined summary

**Metrics Collected:**

- Document count and total size
- TEI version (P4, P5)
- Tag frequency distribution
- Structural patterns (uses `<said>`, `<q>`, `<sp>`, etc.)
- Encoding type classification

---

### generate-splits.ts

Generates train/validation/test splits for corpus documents using seeded random sampling.

**Usage:**

```bash
bun run corpus:split
# or
npm run corpus:split
```

**Features:**

- 70% train, 15% validation, 15% test split (configurable)
- Seeded random sampling (seed=42) for reproducibility
- Only includes valid TEI documents
- Uses relative paths for portability

**Output:**

- `tests/corpora/splits.json` - Split definitions for all corpora

**Format:**

```json
{
  "corpus-name": {
    "train": ["path/to/doc1.xml", ...],
    "validation": ["path/to/doc2.xml", ...],
    "test": ["path/to/doc3.xml", ...],
    "excluded": []
  }
}
```

---

### corpus-utils.ts

Shared utility functions for corpus analysis.

**Functions:**

- `findXMLFiles(dir)` - Recursively finds XML files (excludes `toolbox/`, `.git/`, `node_modules/`)
- `validateTEIFile(path)` - Validates TEI structure and parses XML
- `getTEIVersion(xml)` - Detects TEI version (P4, P5)
- `analyzeTags(xml)` - Analyzes tag frequency and attributes
- `determineEncodingType(tags)` - Classifies encoding type

**Used by:**

- `analyze-corpora.ts`
- `generate-splits.ts`

---

### export-datasets.ts

Exports converted corpora with splits to a `datasets/` directory for ML training.

**Usage:**

```bash
bun run corpus:export
```

**Features:**

- Copies TEI files organized by corpus and split (train/validation/test)
- Includes metadata files for each corpus
- Includes splits configuration and summary
- Generates README with dataset statistics

**Output Structure:**

```
datasets/
├── corpus-name/
│   ├── train/           # Training set TEI files
│   ├── validation/      # Validation set TEI files
│   ├── test/            # Test set TEI files
│   └── metadata.json    # Corpus metadata
├── splits.json          # Split configuration
├── summary.json         # All corpora summary
└── README.md            # Dataset documentation
```

**Loading with Python:**

```bash
# Show statistics
uv run scripts/load-datasets.py --stats

# Load specific corpus
uv run scripts/load-datasets.py --corpus wright-american-fiction

# Load all corpora
uv run scripts/load-datasets.py
```

See `load-datasets.py` for usage examples with HuggingFace datasets library.

---

### load-datasets.py

Python script for loading exported TEI corpora using HuggingFace datasets library.

**Usage:**

```bash
# Show dataset statistics
uv run scripts/load-datasets.py --stats

# Load specific corpus
uv run scripts/load-datasets.py --corpus corpus-name

# Load all corpora
uv run scripts/load-datasets.py

# Sample first N examples
uv run scripts/load-datasets.py --corpus corpus-name --sample 5
```

**Dependencies:**

Uses inline dependency specification with uv (see script header). Requires Python >=3.10.

**Output:**

Returns HuggingFace `DatasetDict` objects with `train`, `validation`, and `test` splits.

---

## Development Scripts

### fix-strict-mode.sh

Utility script for fixing TypeScript strict mode issues. (Currently unused)

---

## Running All Corpus Scripts

To setup, analyze, split, and export all corpora:

```bash
# Complete workflow
bun run corpus:all          # Setup, analyze, and split
bun run corpus:export       # Export to datasets/ (after corpus:all)

# Or run export separately
bun run corpus:export       # Requires corpus:analyze and corpus:split to be run first
```

**Complete workflow:**

1. `corpus:setup` - Clone/update repositories
2. `corpus:analyze` - Generate metadata
3. `corpus:split` - Create train/val/test splits
4. `corpus:export` - Export to `datasets/` directory

**Loading exported datasets:**

```bash
uv run scripts/load-datasets.py --stats
```

## Corpus Statistics

Current corpus (as of 2026-02-04):

| Corpus                   | Documents  | Type             | TEI Ver |
| ------------------------ | ---------- | ---------------- | ------- |
| indiana-magazine-history | 7,289      | dialogue-focused | P4      |
| wright-american-fiction  | 2,876      | dramatic-text    | P5      |
| indiana-authors-books    | 394        | dramatic-text    | P4      |
| victorian-women-writers  | 199        | dramatic-text    | P5      |
| brevier-legislative      | 19         | dialogue-focused | P5      |
| tei-texts                | 14         | mixed            | P5      |
| **Total**                | **10,791** |                  |         |

**Splits:** 7,551 train / 1,616 val / 1,624 test (70%/15%/15%)
