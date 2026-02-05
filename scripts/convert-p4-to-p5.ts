#!/usr/bin/env bun
/**
 * Convert TEI P4 corpora to P5 format using official p4top5.xsl stylesheet
 *
 * Converts two TEI P4 corpora to TEI P5:
 * - Indiana Magazine of History (7,289 documents)
 * - Indiana Authors and Books (394 documents)
 *
 * Usage: bun run scripts/convert-p4-to-p5.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname, parse } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const XSLT_STYLESHEET = join(__dirname, 'p4top5.xsl');
const CORPORA_DIR = join(__dirname, '..', 'corpora');
const BACKUP_DIR = join(__dirname, '..', 'corpora-p4-backup');
const OUTPUT_DIR = join(__dirname, '..', 'corpora-p5');

// P4 corpora to convert
const P4_CORPORA = [
  'indiana-magazine-history',
  'indiana-authors-books',
];

interface ConversionStats {
  corpus: string;
  total: number;
  converted: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

interface ConversionResult {
  corpora: Record<string, ConversionStats>;
  summary: {
    totalCorpora: number;
    totalFiles: number;
    totalConverted: number;
    totalFailed: number;
    totalSkipped: number;
    duration: number;
  };
}

/**
 * Recursively find all XML files in a directory
 */
function findXMLFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip certain directories
        if (entry.name !== '.git' && entry.name !== 'node_modules') {
          traverse(fullPath);
        }
      } else if (entry.name.endsWith('.xml')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Check if a file is TEI P4 format
 */
function isTEIP4(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Check for TEI.2 root element
    return /<TEI\.2[^>]*>/.test(content);
  } catch {
    return false;
  }
}

/**
 * Check if a file is already TEI P5 format
 */
function isTEIP5(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Check for TEI root element with namespace
    return /<TEI[^>]+xmlns=["']http:\/\/www\.tei-c\.org\/ns\/1\.0["']/.test(content);
  } catch {
    return false;
  }
}

/**
 * Convert a single P4 file to P5 using xsltproc
 */
function convertFile(inputPath: string, outputPath: string): { success: boolean; error?: string } {
  try {
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Run xsltproc
    const cmd = `xsltproc -o "${outputPath}" "${XSLT_STYLESHEET}" "${inputPath}"`;
    execSync(cmd, { stdio: 'ignore' });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Convert all P4 files in a corpus
 */
function convertCorpus(corpusName: string): ConversionStats {
  const inputDir = join(CORPORA_DIR, corpusName);
  const outputDir = join(OUTPUT_DIR, corpusName);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Converting: ${corpusName}`);
  console.log(`${'='.repeat(60)}`);

  // Check if corpus directory exists
  if (!existsSync(inputDir)) {
    console.log(`⚠️  Corpus directory not found: ${inputDir}`);
    return {
      corpus: corpusName,
      total: 0,
      converted: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
  }

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Find all XML files
  const allFiles = findXMLFiles(inputDir);
  const stats: ConversionStats = {
    corpus: corpusName,
    total: allFiles.length,
    converted: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`  Total XML files: ${allFiles.length}`);

  for (const file of allFiles) {
    const relativePath = file.replace(inputDir + '/', '');
    const outputFile = join(outputDir, relativePath);

    // Check if file is P4 or P5
    if (!isTEIP4(file)) {
      if (isTEIP5(file)) {
        stats.skipped++;
        console.log(`  ⊙  Skipping (already P5): ${relativePath}`);
        // Still copy P5 files to output directory
        const outputDirName = dirname(outputFile);
        if (!existsSync(outputDirName)) {
          mkdirSync(outputDirName, { recursive: true });
        }
        const content = readFileSync(file, 'utf-8');
        writeFileSync(outputFile, content, 'utf-8');
      } else {
        stats.skipped++;
        console.log(`  ⊙  Skipping (not TEI): ${relativePath}`);
      }
      continue;
    }

    // Convert P4 to P5
    const result = convertFile(file, outputFile);

    if (result.success) {
      stats.converted++;
      // Progress indicator every 100 files
      if (stats.converted % 100 === 0) {
        console.log(`  ✓ Progress: ${stats.converted}/${allFiles.length} files converted`);
      }
    } else {
      stats.failed++;
      stats.errors.push({
        file: relativePath,
        error: result.error || 'Unknown error'
      });
      console.log(`  ✗ Failed: ${relativePath}`);
      console.log(`    Error: ${result.error}`);
    }
  }

  return stats;
}

/**
 * Create backup of original P4 files
 */
function createBackup(corpusName: string): void {
  const sourceDir = join(CORPORA_DIR, corpusName);
  const backupDir = join(BACKUP_DIR, corpusName);

  if (!existsSync(sourceDir)) {
    console.log(`⚠️  Source directory not found: ${sourceDir}`);
    return;
  }

  console.log(`\nCreating backup: ${backupDir}`);
  mkdirSync(backupDir, { recursive: true });

  // Copy all files using rsync or cp
  try {
    execSync(`cp -r "${sourceDir}"/* "${backupDir}/"`, { stdio: 'ignore' });
    console.log(`  ✓ Backup created`);
  } catch (error) {
    console.log(`  ✗ Backup failed: ${error}`);
  }
}

/**
 * Main conversion execution
 */
function main(): ConversionResult {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         TEI P4 → P5 Conversion                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nStylesheet: ${XSLT_STYLESHEET}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Backup: ${BACKUP_DIR}`);

  // Check xsltproc availability
  try {
    execSync('xsltproc --version', { stdio: 'ignore' });
    console.log('\n✓ xsltproc found');
  } catch {
    console.error('\n✗ Error: xsltproc not found in PATH.');
    console.error('\nPlease run this script in a nix-shell with libxslt:');
    console.error('  nix-shell -p libxslt --run "bun scripts/convert-p4-to-p5.ts"');
    console.error('\nOr install libxslt permanently via Nix/env:');
    console.error('  nix-env install -i nixpkgs.libxslt');
    process.exit(1);
  }

  const allStats: Record<string, ConversionStats> = {};

  // Create backups first
  console.log('\n' + '='.repeat(60));
  console.log('Phase 1: Creating backups');
  console.log('='.repeat(60));

  for (const corpus of P4_CORPORA) {
    createBackup(corpus);
  }

  // Convert corpora
  console.log('\n' + '='.repeat(60));
  console.log('Phase 2: Converting corpora');
  console.log('='.repeat(60));

  for (const corpus of P4_CORPORA) {
    const stats = convertCorpus(corpus);
    allStats[corpus] = stats;

    console.log(`\n${corpus} Summary:`);
    console.log(`  Total files:    ${stats.total}`);
    console.log(`  Converted:      ${stats.converted} ✓`);
    console.log(`  Already P5:     ${stats.skipped} ⊙`);
    console.log(`  Failed:         ${stats.failed} ✗`);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Overall summary
  const totalFiles = Object.values(allStats).reduce((sum, s) => sum + s.total, 0);
  const totalConverted = Object.values(allStats).reduce((sum, s) => sum + s.converted, 0);
  const totalFailed = Object.values(allStats).reduce((sum, s) => sum + s.failed, 0);
  const totalSkipped = Object.values(allStats).reduce((sum, s) => sum + s.skipped, 0);

  console.log('\n' + '='.repeat(60));
  console.log('Conversion Summary');
  console.log('='.repeat(60));
  console.log(`Total corpora:       ${P4_CORPORA.length}`);
  console.log(`Total files:         ${totalFiles}`);
  console.log(`Converted:           ${totalConverted} ✓`);
  console.log(`Already P5:          ${totalSkipped} ⊙`);
  console.log(`Failed:              ${totalFailed} ✗`);
  console.log(`Duration:            ${(duration / 60).toFixed(1)} minutes`);

  // Save conversion report
  const reportPath = join(OUTPUT_DIR, 'conversion-report.json');
  const result: ConversionResult = {
    corpora: allStats,
    summary: {
      totalCorpora: P4_CORPORA.length,
      totalFiles,
      totalConverted,
      totalFailed,
      totalSkipped,
      duration,
    },
  };

  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);

  // Save error details if any
  if (totalFailed > 0) {
    const errorsPath = join(OUTPUT_DIR, 'conversion-errors.json');
    writeFileSync(errorsPath, JSON.stringify(allStats, null, 2));
    console.log(`Errors saved to: ${errorsPath}`);
  }

  console.log('\n✓ Conversion complete!');

  return result;
}

main();
