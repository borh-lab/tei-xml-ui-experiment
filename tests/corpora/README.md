# TEI Corpora

This directory contains train/validation/test splits for TEI corpus integration.

## Setup

To download and setup all TEI corpus repositories:

```bash
npm run corpus:all
```

Or step by step:

```bash
npm run corpus:setup     # Clone git submodules
npm run corpus:analyze   # Generate metadata
npm run corpus:split     # Create train/val/test splits
```

## Corpus Sources

| Corpus | Documents | Encoding Type | Description |
|--------|-----------|---------------|-------------|
| Wright American Fiction | ~3,000 | Mixed | American novels 1851-1875 |
| Victorian Women Writers | ~100s | dialogue-focused | British women writers |
| Indiana Magazine History | Varied | Mixed | Historical journal |
| Indiana Authors Books | Varied | Mixed | Indiana authors |
| Brevier Legislative | Varied | Mixed | Legislative reports |
| TEI Texts | ~20 | dialogue-focused | French novels |

## Split Configuration

- **Train**: 70% of documents
- **Validation**: 15% of documents
- **Test**: 15% of documents
- **Strategy**: Document-level (entire files go to one set)
- **Seed**: 42 (reproducible)

## File Structure

```
tests/corpora/
├── splits.json           # Main split definition
└── metadata/
    ├── summary.json      # All corpus metadata
    ├── wright-american-fiction.json
    ├── victorian-women-writers.json
    └── ...
```

## Usage

```typescript
import { CorpusManager } from '@/lib/corpora';

const corpus = new CorpusManager();

// Get training documents
const trainDocs = corpus.getSplit('train');

// Get documents with <said> tags
const saidDocs = corpus.getDocumentsByTag('said', 'test');

// Get corpus metadata
const wrightInfo = corpus.getCorpus('wright-american-fiction');
console.log(`Documents: ${wrightInfo.documentCount}`);

// Find dialogue-focused corpora
const dialogueCorpora = corpus.getCorporaByEncoding('dialogue-focused');
```

## Regenerating Splits

To regenerate splits with different ratios or after adding new corpora:

```bash
npm run corpus:split
```

This will update `splits.json` while maintaining the same seed for reproducibility.