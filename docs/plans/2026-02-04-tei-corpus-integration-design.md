# TEI Corpus Integration Design

**Date:** 2026-02-04
**Status:** Design Approved
**Goal:** Integrate real TEI corpora for ML development, parser testing, and schema analysis

## Overview

This design integrates external TEI-encoded novel repositories into the TEI Dialogue Editor project for:

1. **ML model training** - Improve dialogue detection accuracy with real data
2. **Parser testing** - Validate correct parsing of various TEI structures
3. **Schema analysis** - Understand and categorize different TEI encoding patterns

## Repository Structure

```
tei-xml/
├── corpora/                          # Git submodules (not versioned)
│   ├── wright-american-fiction/      # iulibdcs/Wright-American-Fiction
│   ├── victorian-women-writers/      # iulibdcs/Victorian-Women-Writers-Project
│   ├── indiana-magazine-history/     # iulibdcs/Indiana-Magazine-of-History
│   ├── indiana-authors-books/        # iulibdcs/Indiana-Authors-and-Their-Books
│   ├── brevier-legislative/          # iulibdcs/Brevier-Legislative-Reports
│   └── tei-texts/                    # christofs/tei-texts
├── tests/
│   └── corpora/
│       ├── splits.json               # Train/val/test split definition
│       └── metadata/                 # Per-corpus analysis
│           ├── wright-american-fiction.json
│           ├── victorian-women-writers.json
│           └── ...
├── scripts/
│   ├── setup-corpora.sh              # Initialize git submodules
│   ├── analyze-corpora.ts            # Generate metadata
│   ├── generate-splits.ts            # Create train/val/test splits
│   └── corpus-utils.ts               # Shared utilities
└── lib/
    └── corpora/
        └── index.ts                  # CorpusManager API
```

## Corpus Sources

| Repository               | Size          | TEI Version | Content                   |
| ------------------------ | ------------- | ----------- | ------------------------- |
| Wright American Fiction  | ~3,000 novels | P4→P5       | American novels 1851-1875 |
| Victorian Women Writers  | ~100s texts   | P5          | British women writers     |
| Indiana Magazine History | Periodicals   | Mixed       | Historical journal        |
| Indiana Authors Books    | Varied        | Mixed       | Indiana authors           |
| Brevier Legislative      | Varied        | Mixed       | Legislative reports       |
| tei-texts                | ~20 novels    | P5          | French novels (clean)     |

## Metadata Schema

Each corpus gets a `tests/corpora/metadata/{corpus-name}.json`:

```typescript
interface CorpusMetadata {
  name: string;
  sourceUrl: string;
  documentCount: number;
  totalSizeBytes: number;
  teiVersion: string[]; // "P4", "P5", "mixed"
  tagFrequency: {
    [tagName: string]: number; // <said>, <q>, <sp>, <speaker>, etc.
  };
  structuralPatterns: {
    usesSaid: boolean;
    usesQ: boolean;
    usesSp: boolean;
    usesWhoAttributes: boolean;
    nestingLevels: number;
  };
  encodingType: 'dialogue-focused' | 'dramatic-text' | 'minimal-markup' | 'mixed';
  sampleDocuments: string[]; // 5 representative file paths
  issues: string[]; // Encoding problems found
}
```

## Train/Validation/Test Split

**Configuration:**

- **Split ratio**: 70% train, 15% validation, 15% test
- **Strategy**: Document-level (entire documents go to one set)
- **Seed**: 42 (for reproducible shuffling)
- **Stratification**: Each corpus contributes proportionally to all sets

**Split Definition (`tests/corpora/splits.json`):**

```typescript
interface SplitDefinition {
  version: string;
  generatedAt: string;
  config: {
    train: 0.7;
    validation: 0.15;
    test: 0.15;
    seed: 42;
  };
  corpora: {
    [corpusName: string]: {
      train: string[]; // Relative file paths
      validation: string[];
      test: string[];
      excluded: string[]; // Malformed, non-TEI, too small
    };
  };
  summary: {
    totalDocuments: number;
    trainCount: number;
    valCount: number;
    testCount: number;
    excludedCount: number;
  };
}
```

**Exclusion Criteria:**

- Malformed XML files
- Non-TEI files (`.txt`, `.md`, etc.)
- Documents too small (< 500 characters)
- Duplicate documents

## Corpus Manager API

```typescript
// lib/corpora/index.ts
export class CorpusManager {
  // Get all documents from a specific split
  getSplit(split: 'train' | 'validation' | 'test'): TEIDocument[];

  // Get metadata for a specific corpus
  getCorpus(name: string): CorpusMetadata;

  // Get a random document from a split
  getRandomDocument(split: string): TEIDocument;

  // Get documents containing specific tags
  getDocumentsByTag(tagName: string, split: string): TEIDocument[];

  // Get all corpora using a specific encoding pattern
  getCorporaByEncoding(type: EncodingType): CorpusMetadata[];
}
```

## Integration Points

### ML/AI Features

- `lib/ai/ax-provider.ts` - Optionally train on corpus data
- `lib/ai/corpus-trainer.ts` - New: Batch processing for ML
- Accuracy metrics against corpus ground truth

### Testing

- Extend existing tests to use real corpus documents
- `tests/integration/corpus-validation.test.ts` - Parser testing
- Parameterize tests to run against all corpora

### Schema Validation

- Use `splits.json` in existing schema tests
- Track validation failures per corpus

## NPM Scripts

```json
{
  "corpus:setup": "scripts/setup-corpora.sh",
  "corpus:analyze": "tsx scripts/analyze-corpora.ts",
  "corpus:split": "tsx scripts/generate-splits.ts",
  "corpus:all": "npm run corpus:setup && npm run corpus:analyze && npm run corpus:split"
}
```

## Usage Examples

```typescript
// Get training documents for ML
const corpus = new CorpusManager();
const trainDocs = corpus.getSplit('train');

// Find documents with <said> tags for testing
const saidDocs = corpus.getDocumentsByTag('said', 'test');

// Get corpus metadata
const wrightInfo = corpus.getCorpus('wright-american-fiction');
console.log(`Wright has ${wrightInfo.documentCount} documents`);
```

## Implementation Checklist

1. **Setup Infrastructure**
   - [ ] Create `corpora/` directory structure
   - [ ] Add `corpora/` to `.gitignore`
   - [ ] Create git submodules for all 6 repos
   - [ ] Write `setup-corpora.sh` script

2. **Analysis Tools**
   - [ ] Implement `corpus-utils.ts` shared utilities
   - [ ] Implement `analyze-corpora.ts` metadata generator
   - [ ] Run analysis on all corpora

3. **Split Generation**
   - [ ] Implement `generate-splits.ts` with 70/15/15 split
   - [ ] Generate initial `splits.json`
   - [ ] Document split methodology in README

4. **Corpus Manager**
   - [ ] Implement `lib/corpora/index.ts`
   - [ ] Add TypeScript types for corpus data
   - [ ] Write unit tests for CorpusManager

5. **Integration**
   - [ ] Update ML features to use corpus data
   - [ ] Extend parser tests with corpus documents
   - [ ] Add corpus validation tests

## Notes

- **Storage**: Git submodules allow tracking external repos without bloating main repo
- **Reproducibility**: Seeded random splits ensure consistent ML experiments
- **Extensibility**: New corpora can be added by updating `setup-corpora.sh` and rerunning analysis
- **Performance**: Large corpora (Wright ~3,000 docs) may need lazy loading
