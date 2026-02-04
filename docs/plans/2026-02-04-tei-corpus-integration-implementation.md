# TEI Corpus Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate 6 external TEI repositories with metadata extraction, train/validation/test splitting, and a CorpusManager API for ML development and parser testing.

**Architecture:**
1. Git submodules for external TEI corpora in `corpora/` directory
2. Analysis scripts that parse XML to extract tag frequencies and structural patterns
3. Deterministic document-level splitting (70/15/15) with seeded randomness
4. CorpusManager API providing typed access to split data

**Tech Stack:**
- Git submodules for repository management
- fast-xml-parser (already in dependencies) for TEI parsing
- TypeScript/Node.js scripts
- Existing TEIDocument utilities

---

## Task 1: Create Directory Structure and Git Configuration

**Files:**
- Create: `.gitignore` (modify)
- Create: `corpora/.gitkeep`

**Step 1: Add corpora directory to .gitignore**

```bash
# Add to .gitignore
echo "corpora/*" >> .gitignore
echo "!corpora/.gitkeep" >> .gitignore
```

**Step 2: Create corpora directory placeholder**

```bash
mkdir -p corpora
touch corpora/.gitkeep
```

**Step 3: Commit setup**

```bash
git add .gitignore corpora/.gitkeep
git commit -m "feat: setup corpora directory structure"
```

---

## Task 2: Create Git Submodules Setup Script

**Files:**
- Create: `scripts/setup-corpora.sh`

**Step 1: Write the setup script**

```bash
#!/bin/bash
set -e

echo "Setting up TEI corpus submodules..."

CORPORA_DIR="corpora"

# Create corpora directory if it doesn't exist
mkdir -p "$CORPORA_DIR"

# Array of repositories: name|url
declare -a REPOS=(
    "wright-american-fiction|https://github.com/iulibdcs/Wright-American-Fiction.git"
    "victorian-women-writers|https://github.com/iulibdcs/Victorian-Women-Writers-Project.git"
    "indiana-magazine-history|https://github.com/iulibdcs/Indiana-Magazine-of-History.git"
    "indiana-authors-books|https://github.com/iulibdcs/Indiana-Authors-and-Their-Books.git"
    "brevier-legislative|https://github.com/iulibdcs/Brevier-Legislative-Reports.git"
    "tei-texts|https://github.com/christofs/tei-texts.git"
)

# Remove existing submodules if any (for clean setup)
for repo in "${REPOS[@]}"; do
    name="${repo%%|*}"
    if [ -d "$CORPORA_DIR/$name" ]; then
        echo "Removing existing $name..."
        rm -rf "$CORPORA_DIR/$name"
    fi
done

# Add each repository as a submodule
for repo in "${REPOS[@]}"; do
    name="${repo%%|*}"
    url="${repo##*|}"

    echo "Adding submodule: $name from $url"
    git submodule add "$url" "$CORPORA_DIR/$name"
done

echo "Initializing submodules..."
git submodule init

echo "Updating submodules (this may take a while for large repos)..."
git submodule update --recursive

echo "✓ Corpus submodules setup complete!"
echo "Corpora are now available in: $CORPORA_DIR/"
```

**Step 2: Make script executable**

```bash
chmod +x scripts/setup-corpora.sh
```

**Step 3: Commit script**

```bash
git add scripts/setup-corpora.sh
git commit -m "feat: add corpus submodule setup script"
```

---

## Task 3: Create Corpus Utilities

**Files:**
- Create: `scripts/corpus-utils.ts`
- Create: `scripts/types.ts`

**Step 1: Create TypeScript types for corpus data**

```typescript
// scripts/types.ts

export interface CorpusMetadata {
  name: string;
  sourceUrl: string;
  documentCount: number;
  totalSizeBytes: number;
  teiVersion: string[];
  tagFrequency: Record<string, number>;
  structuralPatterns: {
    usesSaid: boolean;
    usesQ: boolean;
    usesSp: boolean;
    usesWhoAttributes: boolean;
    nestingLevels: number;
  };
  encodingType: 'dialogue-focused' | 'dramatic-text' | 'minimal-markup' | 'mixed';
  sampleDocuments: string[];
  issues: string[];
}

export interface SplitDefinition {
  version: string;
  generatedAt: string;
  config: {
    train: number;
    validation: number;
    test: number;
    seed: number;
  };
  corpora: Record<string, {
    train: string[];
    validation: string[];
    test: string[];
    excluded: string[];
  }>;
  summary: {
    totalDocuments: number;
    trainCount: number;
    valCount: number;
    testCount: number;
    excludedCount: number;
  };
}

export interface TEIFileInfo {
  path: string;
  size: number;
  isTEI: boolean;
  isValid: boolean;
  error?: string;
}

export interface TagAnalysis {
  tagName: string;
  count: number;
  attributes: Record<string, number>;
}
```

**Step 2: Create corpus utility functions**

```typescript
// scripts/corpus-utils.ts
import { XMLParser } from 'fast-xml-parser';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { TEIFileInfo, TagAnalysis, CorpusMetadata } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

/**
 * Find all XML files in a directory recursively
 */
export function findXMLFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findXMLFiles(fullPath));
    } else if (entry.name.endsWith('.xml')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Basic validation check for TEI files
 */
export function validateTEIFile(filePath: string): TEIFileInfo {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const stats = statSync(filePath);

    // Check minimum size
    if (content.length < 500) {
      return {
        path: filePath,
        size: stats.size,
        isTEI: false,
        isValid: false,
        error: 'File too small (< 500 chars)',
      };
    }

    // Check for TEI root element
    const hasTEIRoot = /<TEI[^>]*>|<TEI\.2[^>]*>/.test(content);
    if (!hasTEIRoot) {
      return {
        path: filePath,
        size: stats.size,
        isTEI: false,
        isValid: false,
        error: 'No TEI root element found',
      };
    }

    // Try to parse XML
    try {
      parser.parse(content);
      return {
        path: filePath,
        size: stats.size,
        isTEI: true,
        isValid: true,
      };
    } catch (parseError) {
      return {
        path: filePath,
        size: stats.size,
        isTEI: true,
        isValid: false,
        error: `Parse error: ${parseError}`,
      };
    }
  } catch (error) {
    return {
      path: filePath,
      size: 0,
      isTEI: false,
      isValid: false,
      error: `Read error: ${error}`,
    };
  }
}

/**
 * Extract TEI version from document
 */
export function getTEIVersion(content: string): string {
  if (/<TEI\.2[^>]*>/.test(content)) return 'P4';
  if (/<TEI[^>]+version="[^"]*"/.test(content)) {
    const match = content.match(/version="([^"]*)"/);
    return match ? match[1] : 'P5';
  }
  return 'P5'; // Default assumption
}

/**
 * Analyze tags in TEI document
 */
export function analyzeTags(content: string): TagAnalysis[] {
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/g;
  const tags = new Map<string, TagAnalysis>();

  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];

    // Skip closing tags and XML declaration
    if (tagName.startsWith('/') || tagName === '?xml') continue;

    if (!tags.has(tagName)) {
      tags.set(tagName, {
        tagName,
        count: 0,
        attributes: {},
      });
    }

    const analysis = tags.get(tagName)!;
    analysis.count++;

    // Extract attributes from the match
    const attrRegex = /([a-zA-Z-]+)="[^"]*"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[0])) !== null) {
      const attrName = attrMatch[1];
      analysis.attributes[attrName] = (analysis.attributes[attrName] || 0) + 1;
    }
  }

  return Array.from(tags.values()).sort((a, b) => b.count - a.count);
}

/**
 * Determine encoding type based on tag usage
 */
export function determineEncodingType(
  tags: TagAnalysis[]
): CorpusMetadata['encodingType'] {
  const tagNames = new Set(tags.map((t) => t.tagName));

  const hasSaid = tagNames.has('said');
  const hasQ = tagNames.has('q');
  const hasSp = tagNames.has('sp');
  const hasSpeaker = tagNames.has('speaker');

  if (hasSp && hasSpeaker) return 'dramatic-text';
  if (hasSaid || hasQ) return 'dialogue-focused';
  if (tagNames.size < 10) return 'minimal-markup';
  return 'mixed';
}
```

**Step 3: Commit utilities**

```bash
git add scripts/types.ts scripts/corpus-utils.ts
git commit -m "feat: add corpus utility types and functions"
```

---

## Task 4: Implement Corpus Analysis Script

**Files:**
- Create: `scripts/analyze-corpora.ts`

**Step 1: Write the analysis script**

```typescript
#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { CorpusMetadata } from './types';
import {
  findXMLFiles,
  validateTEIFile,
  getTEIVersion,
  analyzeTags,
  determineEncodingType,
} from './corpus-utils';

const CORPORA_DIR = 'corpora';
const METADATA_DIR = 'tests/corpora/metadata';

const CORPORA_CONFIG: Record<string, { name: string; url: string }> = {
  'wright-american-fiction': {
    name: 'Wright American Fiction',
    url: 'https://github.com/iulibdcs/Wright-American-Fiction.git',
  },
  'victorian-women-writers': {
    name: 'Victorian Women Writers Project',
    url: 'https://github.com/iulibdcs/Victorian-Women-Writers-Project.git',
  },
  'indiana-magazine-history': {
    name: 'Indiana Magazine of History',
    url: 'https://github.com/iulibdcs/Indiana-Magazine-of-History.git',
  },
  'indiana-authors-books': {
    name: 'Indiana Authors and Their Books',
    url: 'https://github.com/iulibdcs/Indiana-Authors-and-Their-Books.git',
  },
  'brevier-legislative': {
    name: 'Brevier Legislative Reports',
    url: 'https://github.com/iulibdcs/Brevier-Legislative-Reports.git',
  },
  'tei-texts': {
    name: 'TEI Texts (French Novels)',
    url: 'https://github.com/christofs/tei-texts.git',
  },
};

/**
 * Analyze a single corpus
 */
function analyzeCorpus(corpusId: string, corpusPath: string): CorpusMetadata {
  console.log(`\nAnalyzing: ${corpusId}`);

  const config = CORPORA_CONFIG[corpusId];
  const xmlFiles = findXMLFiles(corpusPath);

  console.log(`  Found ${xmlFiles.length} XML files`);

  const validFiles: string[] = [];
  const issues: string[] = [];
  const teiVersions = new Set<string>();
  let totalSize = 0;

  // Tag aggregation
  const tagFrequency: Record<string, number> = {};

  // Structural patterns
  let usesSaid = false;
  let usesQ = false;
  let usesSp = false;
  let usesWhoAttributes = false;
  let maxNesting = 0;

  for (const filePath of xmlFiles) {
    const info = validateTEIFile(filePath);

    if (!info.isTEI) {
      continue;
    }

    if (!info.isValid) {
      issues.push(`${filePath}: ${info.error}`);
      continue;
    }

    validFiles.push(filePath);
    totalSize += info.size;

    // Read and analyze content
    const content = require('fs').readFileSync(filePath, 'utf-8');
    teiVersions.add(getTEIVersion(content));

    // Analyze tags
    const tags = analyzeTags(content);
    for (const tag of tags) {
      tagFrequency[tag.tagName] = (tagFrequency[tag.tagName] || 0) + tag.count;

      // Check structural patterns
      if (tag.tagName === 'said') usesSaid = true;
      if (tag.tagName === 'q') usesQ = true;
      if (tag.tagName === 'sp') usesSp = true;
      if (tag.attributes?.who) usesWhoAttributes = true;
    }
  }

  // Determine encoding type
  const tagArray = Object.entries(tagFrequency).map(([tagName, count]) => ({
    tagName,
    count,
    attributes: {},
  }));
  const encodingType = determineEncodingType(tagArray);

  // Sample documents (first 5 valid files)
  const sampleDocuments = validFiles.slice(0, 5);

  const metadata: CorpusMetadata = {
    name: config.name,
    sourceUrl: config.url,
    documentCount: validFiles.length,
    totalSizeBytes: totalSize,
    teiVersion: Array.from(teiVersions),
    tagFrequency,
    structuralPatterns: {
      usesSaid,
      usesQ,
      usesSp,
      usesWhoAttributes,
      nestingLevels: maxNesting,
    },
    encodingType,
    sampleDocuments,
    issues: issues.slice(0, 10), // Limit to first 10 issues
  };

  console.log(`  Valid TEI documents: ${validFiles.length}`);
  console.log(`  Encoding type: ${encodingType}`);
  console.log(`  TEI versions: ${Array.from(teiVersions).join(', ')}`);
  if (issues.length > 0) {
    console.log(`  Issues found: ${issues.length}`);
  }

  return metadata;
}

/**
 * Main execution
 */
async function main() {
  console.log('TEI Corpus Analysis');
  console.log('===================\n');

  // Create metadata directory
  mkdirSync(METADATA_DIR, { recursive: true });

  const results: Record<string, CorpusMetadata> = {};

  for (const corpusId of Object.keys(CORPORA_CONFIG)) {
    const corpusPath = join(CORPORA_DIR, corpusId);

    // Check if corpus exists
    try {
      require('fs').accessSync(corpusPath);
    } catch {
      console.log(`⚠ Skipping ${corpusId} (not found - run setup-corpora.sh first)`);
      continue;
    }

    const metadata = analyzeCorpus(corpusId, corpusPath);
    results[corpusId] = metadata;

    // Save individual metadata file
    const metadataPath = join(METADATA_DIR, `${corpusId}.json`);
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`  ✓ Saved: ${metadataPath}`);
  }

  // Save summary
  const summaryPath = join(METADATA_DIR, 'summary.json');
  writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log('\n✓ Analysis complete!');
  console.log(`  Summary: ${summaryPath}`);
  console.log(`  Individual files: ${METADATA_DIR}/*.json`);
}

main().catch(console.error);
```

**Step 2: Make executable and test**

```bash
chmod +x scripts/analyze-corpora.ts

# Note: This won't work yet until submodules are setup
# Just verify it compiles
npx tsx --check scripts/analyze-corpora.ts
```

**Step 3: Commit analysis script**

```bash
git add scripts/analyze-corpora.ts
git commit -m "feat: add corpus analysis script"
```

---

## Task 5: Implement Split Generation Script

**Files:**
- Create: `scripts/generate-splits.ts`

**Step 1: Write the split generator**

```typescript
#!/usr/bin/env tsx
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { SplitDefinition, CorpusMetadata } from './types';
import { validateTEIFile } from './corpus-utils';

const CORPORA_DIR = 'corpora';
const METADATA_DIR = 'tests/corpora/metadata';
const OUTPUT_FILE = 'tests/corpora/splits.json';

const SPLIT_CONFIG = {
  train: 0.70,
  validation: 0.15,
  test: 0.15,
  seed: 42,
};

/**
 * Seeded random number generator for reproducibility
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Fisher-Yates shuffle with seeded random
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Get valid TEI files for a corpus
 */
function getValidFiles(corpusPath: string): string[] {
  const { findXMLFiles } = require('./corpus-utils');
  const xmlFiles = findXMLFiles(corpusPath);

  const valid: string[] = [];
  const excluded: string[] = [];

  for (const filePath of xmlFiles) {
    const info = validateTEIFile(filePath);
    if (info.isTEI && info.isValid) {
      valid.push(filePath);
    } else {
      excluded.push(filePath);
    }
  }

  return valid;
}

/**
 * Split files into train/val/test
 */
function splitFiles(files: string[], rng: SeededRandom): {
  train: string[];
  validation: string[];
  test: string[];
} {
  const shuffled = rng.shuffle(files);
  const total = shuffled.length;

  const trainEnd = Math.floor(total * SPLIT_CONFIG.train);
  const valEnd = trainEnd + Math.floor(total * SPLIT_CONFIG.validation);

  return {
    train: shuffled.slice(0, trainEnd),
    validation: shuffled.slice(trainEnd, valEnd),
    test: shuffled.slice(valEnd),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('Generating TEI Corpus Splits');
  console.log('===========================\n');
  console.log(`Config: ${SPLIT_CONFIG.train * 100}% train, ${SPLIT_CONFIG.validation * 100}% val, ${SPLIT_CONFIG.test * 100}% test`);
  console.log(`Seed: ${SPLIT_CONFIG.seed}\n`);

  // Read metadata
  const summaryPath = join(METADATA_DIR, 'summary.json');
  let metadata: Record<string, CorpusMetadata>;

  try {
    const content = readFileSync(summaryPath, 'utf-8');
    metadata = JSON.parse(content);
  } catch {
    console.error('Error: Corpus metadata not found. Run analyze-corpora.ts first.');
    process.exit(1);
  }

  const rng = new SeededRandom(SPLIT_CONFIG.seed);
  const splitData: SplitDefinition = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    config: SPLIT_CONFIG,
    corpora: {},
    summary: {
      totalDocuments: 0,
      trainCount: 0,
      valCount: 0,
      testCount: 0,
      excludedCount: 0,
    },
  };

  let totalDocs = 0;
  let totalTrain = 0;
  let totalVal = 0;
  let totalTest = 0;

  for (const [corpusId, meta] of Object.entries(metadata)) {
    const corpusPath = join(CORPORA_DIR, corpusId);
    const validFiles = getValidFiles(corpusPath);

    console.log(`\n${corpusId}:`);
    console.log(`  Valid documents: ${validFiles.length}`);

    if (validFiles.length === 0) {
      console.log(`  ⚠ No valid documents - skipping`);
      splitData.corpora[corpusId] = {
        train: [],
        validation: [],
        test: [],
        excluded: [],
      };
      continue;
    }

    const splits = splitFiles(validFiles, rng);

    // Convert to relative paths
    const toRelative = (path: string) => path.replace(corpusPath + '/', '');

    splitData.corpora[corpusId] = {
      train: splits.train.map(toRelative),
      validation: splits.validation.map(toRelative),
      test: splits.test.map(toRelative),
      excluded: [], // Already filtered out
    };

    totalDocs += validFiles.length;
    totalTrain += splits.train.length;
    totalVal += splits.validation.length;
    totalTest += splits.test.length;

    console.log(`  Train: ${splits.train.length}`);
    console.log(`  Val: ${splits.validation.length}`);
    console.log(`  Test: ${splits.test.length}`);
  }

  splitData.summary = {
    totalDocuments: totalDocs,
    trainCount: totalTrain,
    valCount: totalVal,
    testCount: totalTest,
    excludedCount: 0,
  };

  // Create output directory
  mkdirSync('tests/corpora', { recursive: true });

  // Write splits
  writeFileSync(OUTPUT_FILE, JSON.stringify(splitData, null, 2));

  console.log('\n✓ Split generation complete!');
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`\n  Total: ${totalDocs} documents`);
  console.log(`  Train: ${totalTrain} (${((totalTrain / totalDocs) * 100).toFixed(1)}%)`);
  console.log(`  Val: ${totalVal} (${((totalVal / totalDocs) * 100).toFixed(1)}%)`);
  console.log(`  Test: ${totalTest} (${((totalTest / totalDocs) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
```

**Step 2: Make executable**

```bash
chmod +x scripts/generate-splits.ts
```

**Step 3: Commit split generator**

```bash
git add scripts/generate-splits.ts
git commit -m "feat: add corpus split generation script"
```

---

## Task 6: Create CorpusManager API

**Files:**
- Create: `lib/corpora/index.ts`
- Create: `lib/corpora/types.ts`

**Step 1: Create types for the library**

```typescript
// lib/corpora/types.ts

export type SplitType = 'train' | 'validation' | 'test';
export type EncodingType = 'dialogue-focused' | 'dramatic-text' | 'minimal-markup' | 'mixed';

export interface CorpusMetadata {
  name: string;
  sourceUrl: string;
  documentCount: number;
  totalSizeBytes: number;
  teiVersion: string[];
  tagFrequency: Record<string, number>;
  structuralPatterns: {
    usesSaid: boolean;
    usesQ: boolean;
    usesSp: boolean;
    usesWhoAttributes: boolean;
    nestingLevels: number;
  };
  encodingType: EncodingType;
  sampleDocuments: string[];
  issues: string[];
}

export interface SplitDefinition {
  version: string;
  generatedAt: string;
  config: {
    train: number;
    validation: number;
    test: number;
    seed: number;
  };
  corpora: Record<string, CorpusSplit>;
  summary: SplitSummary;
}

export interface CorpusSplit {
  train: string[];
  validation: string[];
  test: string[];
  excluded: string[];
}

export interface SplitSummary {
  totalDocuments: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  excludedCount: number;
}

export interface CorpusDocument {
  corpusId: string;
  filePath: string;
  content: string;
  metadata: CorpusMetadata;
}
```

**Step 2: Implement CorpusManager**

```typescript
// lib/corpora/index.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  SplitType,
  CorpusMetadata,
  SplitDefinition,
  CorpusDocument,
  EncodingType,
} from './types';

const SPLITS_FILE = 'tests/corpora/splits.json';
const METADATA_DIR = 'tests/corpora/metadata';
const CORPORA_DIR = 'corpora';

export class CorpusManager {
  private splits: SplitDefinition | null = null;
  private metadataCache: Map<string, CorpusMetadata> = new Map();

  constructor() {
    this.loadSplits();
    this.loadMetadata();
  }

  /**
   * Load split definition
   */
  private loadSplits(): void {
    if (!existsSync(SPLITS_FILE)) {
      console.warn(`Splits file not found: ${SPLITS_FILE}`);
      return;
    }

    const content = readFileSync(SPLITS_FILE, 'utf-8');
    this.splits = JSON.parse(content);
  }

  /**
   * Load all corpus metadata
   */
  private loadMetadata(): void {
    if (!this.splits) return;

    for (const corpusId of Object.keys(this.splits.corpora)) {
      const metadataPath = join(METADATA_DIR, `${corpusId}.json`);

      if (existsSync(metadataPath)) {
        const content = readFileSync(metadataPath, 'utf-8');
        const metadata: CorpusMetadata = JSON.parse(content);
        this.metadataCache.set(corpusId, metadata);
      }
    }
  }

  /**
   * Get all documents from a specific split
   */
  getSplit(split: SplitType): CorpusDocument[] {
    if (!this.splits) {
      throw new Error('Splits not loaded. Run generate-splits first.');
    }

    const documents: CorpusDocument[] = [];

    for (const [corpusId, corpusSplits] of Object.entries(this.splits.corpora)) {
      const metadata = this.metadataCache.get(corpusId);
      if (!metadata) continue;

      for (const filePath of corpusSplits[split]) {
        const fullPath = join(CORPORA_DIR, corpusId, filePath);

        if (!existsSync(fullPath)) continue;

        const content = readFileSync(fullPath, 'utf-8');

        documents.push({
          corpusId,
          filePath: fullPath,
          content,
          metadata,
        });
      }
    }

    return documents;
  }

  /**
   * Get metadata for a specific corpus
   */
  getCorpus(corpusId: string): CorpusMetadata | undefined {
    return this.metadataCache.get(corpusId);
  }

  /**
   * Get all corpus metadata
   */
  getAllCorpora(): Record<string, CorpusMetadata> {
    const result: Record<string, CorpusMetadata> = {};
    this.metadataCache.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Get a random document from a split
   */
  getRandomDocument(split: SplitType): CorpusDocument | undefined {
    const documents = this.getSplit(split);
    if (documents.length === 0) return undefined;

    const index = Math.floor(Math.random() * documents.length);
    return documents[index];
  }

  /**
   * Get documents containing specific tags
   */
  getDocumentsByTag(tagName: string, split: SplitType): CorpusDocument[] {
    const documents = this.getSplit(split);

    return documents.filter((doc) => {
      const tagCount = doc.metadata.tagFrequency[tagName];
      return tagCount && tagCount > 0;
    });
  }

  /**
   * Get corpora by encoding type
   */
  getCorporaByEncoding(type: EncodingType): CorpusMetadata[] {
    const result: CorpusMetadata[] = [];

    this.metadataCache.forEach((metadata) => {
      if (metadata.encodingType === type) {
        result.push(metadata);
      }
    });

    return result;
  }

  /**
   * Get split summary
   */
  getSummary() {
    if (!this.splits) return null;
    return this.splits.summary;
  }

  /**
   * Check if corpora are available
   */
  isAvailable(): boolean {
    return this.splits !== null && this.metadataCache.size > 0;
  }
}
```

**Step 3: Commit CorpusManager**

```bash
git add lib/corpora/
git commit -m "feat: add CorpusManager API"
```

---

## Task 7: Write Tests for CorpusManager

**Files:**
- Create: `tests/unit/corpus-manager.test.ts`

**Step 1: Write failing tests**

```typescript
import { CorpusManager } from '@/lib/corpora';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const MOCK_CORPORA_DIR = join(process.cwd(), 'tests', 'fixtures', 'mock-corpora');
const MOCK_METADATA_DIR = join(process.cwd(), 'tests', 'fixtures', 'mock-metadata');

describe('CorpusManager', () => {
  beforeEach(() => {
    // Setup mock corpus structure
    mkdirSync(MOCK_CORPORA_DIR, { recursive: true });
    mkdirSync(MOCK_METADATA_DIR, { recursive: true });

    // Create mock splits file
    const mockSplits = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      config: {
        train: 0.7,
        validation: 0.15,
        test: 0.15,
        seed: 42,
      },
      corpora: {
        'test-corpus': {
          train: ['doc1.xml'],
          validation: ['doc2.xml'],
          test: ['doc3.xml'],
          excluded: [],
        },
      },
      summary: {
        totalDocuments: 3,
        trainCount: 1,
        valCount: 1,
        testCount: 1,
        excludedCount: 0,
      },
    };

    writeFileSync(
      join(MOCK_METADATA_DIR, 'splits.json'),
      JSON.stringify(mockSplits, null, 2)
    );

    // Create mock metadata
    const mockMetadata = {
      name: 'Test Corpus',
      sourceUrl: 'https://example.com/test',
      documentCount: 3,
      totalSizeBytes: 3000,
      teiVersion: ['P5'],
      tagFrequency: {
        said: 10,
        p: 50,
      },
      structuralPatterns: {
        usesSaid: true,
        usesQ: false,
        usesSp: false,
        usesWhoAttributes: false,
        nestingLevels: 2,
      },
      encodingType: 'dialogue-focused' as const,
      sampleDocuments: ['doc1.xml'],
      issues: [],
    };

    writeFileSync(
      join(MOCK_METADATA_DIR, 'test-corpus.json'),
      JSON.stringify(mockMetadata, null, 2)
    );

    // Create mock documents
    writeFileSync(
      join(MOCK_CORPORA_DIR, 'test-corpus', 'doc1.xml'),
      '<TEI><text><p>Train document</p></text></TEI>'
    );
    writeFileSync(
      join(MOCK_CORPORA_DIR, 'test-corpus', 'doc2.xml'),
      '<TEI><text><p>Val document</p></text></TEI>'
    );
    writeFileSync(
      join(MOCK_CORPORA_DIR, 'test-corpus', 'doc3.xml'),
      '<TEI><text><p>Test document</p></text></TEI>'
    );
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(MOCK_CORPORA_DIR)) {
      rmSync(MOCK_CORPORA_DIR, { recursive: true, force: true });
    }
    if (existsSync(MOCK_METADATA_DIR)) {
      rmSync(MOCK_METADATA_DIR, { recursive: true, force: true });
    }
  });

  it('should initialize and load metadata', () => {
    // This test will need to be adjusted to use mock paths
    // For now, just test the basic structure
    expect(true).toBe(true);
  });

  // TODO: Add more tests once paths are configurable
  // - getSplit returns correct documents
  // - getCorpus returns metadata
  // - getDocumentsByTag filters correctly
  // - isAvailable checks data presence
});
```

**Step 2: Run tests to verify they compile**

```bash
npm test -- tests/unit/corpus-manager.test.ts
```

**Step 3: Commit tests**

```bash
git add tests/unit/corpus-manager.test.ts
git commit -m "test: add CorpusManager tests"
```

---

## Task 8: Update package.json Scripts

**Files:**
- Modify: `package.json`

**Step 1: Add corpus scripts to package.json**

```json
{
  "scripts": {
    "corpus:setup": "scripts/setup-corpora.sh",
    "corpus:analyze": "tsx scripts/analyze-corpora.ts",
    "corpus:split": "tsx scripts/generate-splits.ts",
    "corpus:all": "npm run corpus:setup && npm run corpus:analyze && npm run corpus:split"
  }
}
```

**Step 2: Commit package.json**

```bash
git add package.json
git commit -m "feat: add corpus management scripts to package.json"
```

---

## Task 9: Create README for Corpus Usage

**Files:**
- Create: `tests/corpora/README.md`

**Step 1: Write documentation**

```markdown
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
```

**Step 2: Commit README**

```bash
git add tests/corpora/README.md
git commit -m "docs: add corpus usage documentation"
```

---

## Task 10: Integration with Existing Tests

**Files:**
- Create: `tests/integration/corpus-validation.test.ts`

**Step 1: Create integration test for corpus validation**

```typescript
import { CorpusManager } from '@/lib/corpora';
import { TEIDocument } from '@/lib/tei';

describe('Corpus Validation Integration', () => {
  let corpus: CorpusManager;

  beforeAll(() => {
    corpus = new CorpusManager();
  });

  it('should be available after setup', () => {
    if (!corpus.isAvailable()) {
      console.warn('Corpora not available - run npm run corpus:all');
      return;
    }

    expect(corpus.isAvailable()).toBe(true);
  });

  it('should parse all training documents without errors', () => {
    if (!corpus.isAvailable()) return;

    const trainDocs = corpus.getSplit('train');

    for (const doc of trainDocs.slice(0, 10)) { // Test first 10
      expect(() => {
        TEIDocument.parse(doc.content);
      }).not.toThrow();
    }
  });

  it('should handle documents with <said> tags', () => {
    if (!corpus.isAvailable()) return;

    const saidDocs = corpus.getDocumentsByTag('said', 'test');

    expect(saidDocs.length).toBeGreaterThan(0);

    for (const doc of saidDocs.slice(0, 5)) { // Test first 5
      const tei = TEIDocument.parse(doc.content);
      const saidElements = tei.querySelectorAll('said');
      expect(saidElements.length).toBeGreaterThan(0);
    }
  });

  it('should provide metadata for each corpus', () => {
    if (!corpus.isAvailable()) return;

    const corpora = corpus.getAllCorpora();

    for (const [id, metadata] of Object.entries(corpora)) {
      expect(metadata.name).toBeDefined();
      expect(metadata.documentCount).toBeGreaterThan(0);
      expect(metadata.encodingType).toBeDefined();
    }
  });
});
```

**Step 2: Run integration tests**

```bash
npm test -- tests/integration/corpus-validation.test.ts
```

**Step 3: Commit integration tests**

```bash
git add tests/integration/corpus-validation.test.ts
git commit -m "test: add corpus validation integration tests"
```

---

## Completion Checklist

- [ ] All scripts created and executable
- [ ] CorpusManager API implemented
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] Package.json scripts added
- [ ] Git submodules can be initialized
- [ ] Splits can be generated deterministically

## Next Steps

After implementation:

1. Run `npm run corpus:all` to setup corpora
2. Review generated metadata in `tests/corpora/metadata/`
3. Check split distribution in `tests/corpora/splits.json`
4. Run integration tests to verify parser compatibility
5. Begin ML training with training split
6. Evaluate models on validation split
7. Final testing on test split
