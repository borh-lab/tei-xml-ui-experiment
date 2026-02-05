#!/usr/bin/env bun
/**
 * Export TEI Corpora for ML Training
 *
 * This script creates a clean datasets/ directory with:
 * - Converted P5 TEI files organized by corpus and split
 * - Metadata for each corpus
 * - Splits configuration
 * - README with usage instructions
 *
 * @ts-nocheck
 */

import { writeFileSync, readFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import type { SplitDefinition, CorpusMetadata } from './types';

const CORPORA_DIR = 'corpora';
const METADATA_DIR = 'tests/corpora/metadata';
const SPLITS_FILE = 'tests/corpora/splits.json';
const DATASETS_DIR = 'datasets';

// Path overrides for corpora that use different directory names
const CORPUS_PATH_OVERRIDES: Record<string, string> = {
  'novel-dialogism': 'novel-dialogism-converted',
};

interface CopyOperation {
  source: string;
  target: string;
  split: 'train' | 'validation' | 'test';
  corpus: string;
}

/**
 * Collect all files to copy organized by corpus and split
 */
function collectCopyOperations(
  splits: SplitDefinition,
  metadata: Record<string, CorpusMetadata>
): CopyOperation[] {
  const operations: CopyOperation[] = [];

  for (const [corpusId, corpusSplits] of Object.entries(splits.corpora)) {
    const pathOverride = CORPUS_PATH_OVERRIDES[corpusId];
    const corpusPath = join(CORPORA_DIR, pathOverride || corpusId);

    // Process each split
    for (const splitType of ['train', 'validation', 'test'] as const) {
      const files = corpusSplits[splitType];

      for (const file of files) {
        const sourcePath = join(corpusPath, file);
        const targetPath = join(DATASETS_DIR, corpusId, splitType, basename(file));

        operations.push({
          source: sourcePath,
          target: targetPath,
          split: splitType,
          corpus: corpusId,
        });
      }
    }
  }

  return operations;
}

/**
 * Copy files with progress reporting
 */
function copyFiles(operations: CopyOperation[]): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  console.log(`\nCopying ${operations.length} files...`);

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    // Create target directory
    mkdirSync(dirname(op.target), { recursive: true });

    // Copy file
    try {
      if (existsSync(op.source)) {
        copyFileSync(op.source, op.target);
        success++;

        // Progress indicator every 100 files
        if ((i + 1) % 100 === 0) {
          console.log(`  ✓ Progress: ${i + 1}/${operations.length} files copied`);
        }
      } else {
        console.warn(`  ⚠ Source not found: ${op.source}`);
        failed++;
      }
    } catch (error) {
      console.error(`  ✗ Failed to copy: ${op.source} -> ${op.target}`);
      console.error(`    Error: ${error}`);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Generate README for datasets directory
 */
function generateDatasetsREADME(
  splits: SplitDefinition,
  metadata: Record<string, CorpusMetadata>
): string {
  const totalDocs = splits.summary.totalDocuments;
  const trainPct = ((splits.summary.trainCount / totalDocs) * 100).toFixed(1);
  const valPct = ((splits.summary.valCount / totalDocs) * 100).toFixed(1);
  const testPct = ((splits.summary.testCount / totalDocs) * 100).toFixed(1);

  let readme = `# TEI Corpora - ML Training Datasets

This directory contains TEI corpora organized for machine learning training.

## Directory Structure

\`\`\`
datasets/
├── corpus-name/
│   ├── train/           # Training set files
│   ├── validation/      # Validation set files
│   ├── test/            # Test set files
│   └── metadata.json    # Corpus metadata
├── splits.json          # Split configuration
├── summary.json         # All corpora summary
└── README.md            # This file
\`\`\`

## Dataset Statistics

**Total Documents:** ${totalDocs}
- Train: ${splits.summary.trainCount} (${trainPct}%)
- Validation: ${splits.summary.valCount} (${valPct}%)
- Test: ${splits.summary.testCount} (${testPct}%)

## Corpora Included

`;

  for (const [corpusId, corpusSplits] of Object.entries(splits.corpora)) {
    const meta = metadata[corpusId];
    if (!meta) continue;

    const totalInCorpus =
      corpusSplits.train.length + corpusSplits.validation.length + corpusSplits.test.length;

    readme += `### ${corpusId}

- **Name:** ${meta.name}
- **Documents:** ${totalInCorpus}
- **Train:** ${corpusSplits.train.length}
- **Validation:** ${corpusSplits.validation.length}
- **Test:** ${corpusSplits.test.length}
- **TEI Version:** ${meta.teiVersion.join(', ')}
- **Encoding Type:** ${meta.encodingType}

`;
  }

  readme += `## Split Configuration

- **Strategy:** Train/Validation/Test split
- **Ratios:** 70% / 15% / 15%
- **Seed:** ${splits.config.seed} (for reproducibility)
- **Generated:** ${splits.generatedAt}

## Loading with Python

See \`scripts/load-datasets.py\` for an example of loading these datasets using HuggingFace datasets library.

Quick start:
\`\`\`bash
# Install dependencies with uv
uv run scripts/load-datasets.py
\`\`\`

## Metadata

Each corpus directory contains a \`metadata.json\` file with detailed statistics:
- Tag frequencies
- Structural patterns
- Validation results
- Sample documents

For full corpus details, see the main metadata in \`tests/corpora/metadata/\`.

## Generated

This dataset was exported from the TEI Dialogue Editor project.
- **Date:** ${new Date().toISOString()}
- **Split Version:** ${splits.version}
`;

  return readme;
}

/**
 * Main execution
 */
async function main() {
  console.log('Exporting TEI Corpora for ML Training');
  console.log('=======================================\n');

  // Read splits
  console.log('Reading splits configuration...');
  let splits: SplitDefinition;
  try {
    const content = readFileSync(SPLITS_FILE, 'utf-8');
    splits = JSON.parse(content);
  } catch {
    console.error('Error: Splits file not found. Run corpus:split first.');
    process.exit(1);
  }

  // Read metadata
  console.log('Reading corpus metadata...');
  const summaryPath = join(METADATA_DIR, 'summary.json');
  let metadata: Record<string, CorpusMetadata>;
  try {
    const content = readFileSync(summaryPath, 'utf-8');
    metadata = JSON.parse(content);
  } catch {
    console.error('Error: Metadata file not found. Run corpus:analyze first.');
    process.exit(1);
  }

  // Collect copy operations
  console.log('\nOrganizing files...');
  const operations = collectCopyOperations(splits, metadata);
  console.log(`  Found ${operations.length} files to copy`);

  // Create datasets directory
  mkdirSync(DATASETS_DIR, { recursive: true });

  // Copy files
  const result = copyFiles(operations);
  console.log(`\n✓ Copy complete!`);
  console.log(`  Success: ${result.success}`);
  if (result.failed > 0) {
    console.log(`  Failed: ${result.failed}`);
  }

  // Copy metadata files to each corpus directory
  console.log('\nCopying metadata files...');
  for (const corpusId of Object.keys(splits.corpora)) {
    const meta = metadata[corpusId];
    if (!meta) continue;

    const metadataPath = join(METADATA_DIR, `${corpusId}.json`);
    const targetPath = join(DATASETS_DIR, corpusId, 'metadata.json');

    try {
      copyFileSync(metadataPath, targetPath);
      console.log(`  ✓ ${corpusId}/metadata.json`);
    } catch {
      console.warn(`  ⚠ Could not copy metadata for ${corpusId}`);
    }
  }

  // Copy splits and summary to datasets root
  console.log('\nCopying splits configuration...');
  copyFileSync(SPLITS_FILE, join(DATASETS_DIR, 'splits.json'));
  copyFileSync(summaryPath, join(DATASETS_DIR, 'summary.json'));

  // Generate README
  console.log('\nGenerating README...');
  const readme = generateDatasetsREADME(splits, metadata);
  writeFileSync(join(DATASETS_DIR, 'README.md'), readme);
  console.log(`  ✓ ${DATASETS_DIR}/README.md`);

  console.log('\n✓ Export complete!');
  console.log(`  Output: ${DATASETS_DIR}/`);
  console.log(`\nTo load with Python:`);
  console.log(`  uv run scripts/load-datasets.py`);
}

main().catch(console.error);
