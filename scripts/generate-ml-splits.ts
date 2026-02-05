#!/usr/bin/env bun
// @ts-nocheck
/**
 * Generate ML-specific train/val/test splits for TEI corpora
 *
 * This generates splits formatted for ML training pipelines.
 * Uses the same split generation logic as regular splits but
 * outputs in a format convenient for ML data loaders.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { SplitDefinition, CorpusMetadata } from './types';
import { validateTEIFile } from './corpus-utils';

const CORPORA_DIR = 'corpora';
const METADATA_DIR = 'tests/corpora/metadata';
const OUTPUT_FILE = 'tests/corpora/ml-splits.json';

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

  for (const filePath of xmlFiles) {
    const info = validateTEIFile(filePath);
    if (info.isTEI && info.isValid) {
      valid.push(filePath);
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
  const total = files.length;
  const trainSize = Math.floor(total * SPLIT_CONFIG.train);
  const valSize = Math.floor(total * SPLIT_CONFIG.validation);

  return {
    train: shuffled.slice(0, trainSize),
    validation: shuffled.slice(trainSize, trainSize + valSize),
    test: shuffled.slice(trainSize + valSize),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('Generating ML Training Splits');
  console.log('=============================\n');
  console.log(`Config: ${SPLIT_CONFIG.train * 100}% train, ${SPLIT_CONFIG.validation * 100}% val, ${SPLIT_CONFIG.test * 100}% test`);
  console.log(`Seed: ${SPLIT_CONFIG.seed}\n`);

  // Load metadata to get corpus list
  const summaryPath = join(METADATA_DIR, 'summary.json');
  try {
    require('fs').accessSync(summaryPath);
  } catch {
    console.error('Error: Corpus metadata not found. Run analyze-corpora.ts first.');
    process.exit(1);
  }

  const metadata: Record<string, CorpusMetadata> = JSON.parse(readFileSync(summaryPath, 'utf-8'));

  const rng = new SeededRandom(SPLIT_CONFIG.seed);

  const mlData: {
    version: string;
    generatedAt: string;
    config: typeof SPLIT_CONFIG;
    splits: Record<
      string,
      {
        train: string[];
        val: string[];
        test: string[];
      }
    >;
    metadata: Record<string, { total: number; train: number; val: number; test: number }>;
  } = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    config: SPLIT_CONFIG,
    splits: {},
    metadata: {},
  };

  let totalDocs = 0;
  let totalTrain = 0;
  let totalVal = 0;
  let totalTest = 0;

  // Process each corpus
  for (const [corpusId, corpusMeta] of Object.entries(metadata)) {
    const corpusPath = join(CORPORA_DIR, corpusId);

    // Check if corpus directory exists
    try {
      require('fs').accessSync(corpusPath);
    } catch {
      console.log(`⊙ Skipping ${corpusId} (not found)`);
      continue;
    }

    console.log(`\n${corpusId}:`);

    const validFiles = getValidFiles(corpusPath);

    if (validFiles.length === 0) {
      console.log(`  ⚠ No valid documents - skipping`);
      mlData.splits[corpusId] = {
        train: [],
        val: [],
        test: [],
      };
      mlData.metadata[corpusId] = {
        total: 0,
        train: 0,
        val: 0,
        test: 0,
      };
      continue;
    }

    const splits = splitFiles(validFiles, rng);

    // Convert to relative paths
    const toRelative = (path: string) => path.replace(corpusPath + '/', '');

    mlData.splits[corpusId] = {
      train: splits.train.map(toRelative),
      val: splits.validation.map(toRelative),
      test: splits.test.map(toRelative),
    };

    mlData.metadata[corpusId] = {
      total: validFiles.length,
      train: splits.train.length,
      val: splits.validation.length,
      test: splits.test.length,
    };

    totalDocs += validFiles.length;
    totalTrain += splits.train.length;
    totalVal += splits.validation.length;
    totalTest += splits.test.length;

    console.log(`  Total: ${validFiles.length}`);
    console.log(`  Train: ${splits.train.length}`);
    console.log(`  Val: ${splits.validation.length}`);
    console.log(`  Test: ${splits.test.length}`);
  }

  // Add overall summary
  mlData.metadata['_overall'] = {
    total: totalDocs,
    train: totalTrain,
    val: totalVal,
    test: totalTest,
  };

  // Create output directory
  mkdirSync('tests/corpora', { recursive: true });

  // Write ML splits
  writeFileSync(OUTPUT_FILE, JSON.stringify(mlData, null, 2));

  console.log('\n✓ ML splits generation complete!');
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`\n  Total: ${totalDocs} documents`);
  console.log(`  Train: ${totalTrain} (${((totalTrain / totalDocs) * 100).toFixed(1)}%)`);
  console.log(`  Val: ${totalVal} (${((totalVal / totalDocs) * 100).toFixed(1)}%)`);
  console.log(`  Test: ${totalTest} (${((totalTest / totalDocs) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
