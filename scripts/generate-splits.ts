#!/usr/bin/env bun
// @ts-nocheck
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { SplitDefinition, CorpusMetadata } from './types';
import { validateTEIFile } from './corpus-utils';

const CORPORA_DIR = 'corpora';
const METADATA_DIR = 'tests/corpora/metadata';
const OUTPUT_FILE = 'tests/corpora/splits.json';

// Path overrides for corpora that use different directory names
const CORPUS_PATH_OVERRIDES: Record<string, string> = {
  'novel-dialogism': 'novel-dialogism-converted',
};

const SPLIT_CONFIG = {
  train: 0.7,
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
function splitFiles(
  files: string[],
  rng: SeededRandom
): {
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
  console.log(
    `Config: ${SPLIT_CONFIG.train * 100}% train, ${SPLIT_CONFIG.validation * 100}% val, ${SPLIT_CONFIG.test * 100}% test`
  );
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
    const pathOverride = CORPUS_PATH_OVERRIDES[corpusId];
    const corpusPath = join(CORPORA_DIR, pathOverride || corpusId);
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
