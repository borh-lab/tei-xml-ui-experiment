#!/usr/bin/env bun
// @ts-nocheck
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CorpusMetadata, SchemaValidationResult, SchemaValidationError } from './types';
import {
  findXMLFiles,
  validateTEIFile,
  getTEIVersion,
  analyzeTags,
  determineEncodingType,
  validateWithSchemas,
  convertP4toP5OnTheFly,
} from './corpus-utils';
import { SchemaLoader } from '../lib/schema/SchemaLoader';

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
  'novel-dialogism': {
    name: 'Novel Dialogism Corpus',
    url: 'https://github.com/Priya22/project-dialogism-novel-corpus.git',
  },
};

/**
 * Analyze a single corpus
 */
async function analyzeCorpus(
  corpusId: string,
  corpusPath: string,
  schemaLoader: SchemaLoader,
  validationStats: Map<string, SchemaValidationResult[]>,
  validationErrors: SchemaValidationError[]
): Promise<CorpusMetadata> {
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
  const maxNesting = 0;

  const MAX_SAMPLE_ERRORS = 10;
  const results: SchemaValidationResult[] = [];

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

    // Read content
    let content = readFileSync(filePath, 'utf-8');
    const teiVersion = getTEIVersion(content);
    teiVersions.add(teiVersion);

    // Convert P4 to P5 on-the-fly for validation and analysis
    if (teiVersion === 'P4') {
      try {
        content = convertP4toP5OnTheFly(content);
      } catch (error) {
        issues.push(`${filePath}: P4→P5 conversion failed - ${error}`);
        continue;
      }
    }

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

    // NEW: Validate against schemas
    const validationResult = await validateWithSchemas(content, filePath, schemaLoader);
    results.push(validationResult);
    validationStats.set(corpusId, results);
  }

  // Aggregate validation results
  const teiAllPass = results.filter(r => r.teiAllPass).length;
  const teiNovelPass = results.filter(r => r.teiNovelPass).length;
  const teiMinimalPass = results.filter(r => r.teiMinimalPass).length;
  const filesWithValidationErrors = results.filter(r => !r.teiAllPass && !r.teiNovelPass && !r.teiMinimalPass).length;

  // Collect sample errors (up to MAX_SAMPLE_ERRORS)
  const errorCount = validationErrors.length;
  if (errorCount < MAX_SAMPLE_ERRORS) {
    // Add files that failed all schemas with sample errors
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.teiAllPass && !result.teiNovelPass && !result.teiMinimalPass) {
        const filePath = validFiles[i];
        const sampleErrors = result.errors.slice(0, 5); // Max 5 errors per file

        validationErrors.push({
          file: filePath,
          attemptedSchemas: ['tei-all', 'tei-novel', 'tei-minimal'],
          allErrors: sampleErrors,
        });
      }
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
    validationResults: {
      totalDocuments: validFiles.length,
      validAgainstSchema: results.filter(r => r.teiAllPass || r.teiNovelPass || r.teiMinimalPass).length,
      schemaCompliance: 0, // Calculated below
      teiAllPass,
      teiNovelPass,
      teiMinimalPass,
      filesWithValidationErrors,
      sampleErrors: validationErrors,
    },
    issues,
  };

  // Calculate compliance percentage
  metadata.validationResults.schemaCompliance = Math.round(
    (metadata.validationResults.validAgainstSchema / metadata.validationResults.totalDocuments) * 100
  );

  console.log(`  Valid TEI documents: ${validFiles.length}`);
  console.log(`  Encoding type: ${encodingType}`);
  console.log(`  TEI versions: ${Array.from(teiVersions).join(', ')}`);
  console.log(`  Schema validation: ${teiAllPass} tei-all, ${teiNovelPass} tei-novel, ${teiMinimalPass} tei-minimal`);
  console.log(`  Compliance: ${metadata.validationResults.schemaCompliance}%`);

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

  // Initialize SchemaLoader for validation
  const schemaLoader = new SchemaLoader();

  // Create metadata directory
  mkdirSync(METADATA_DIR, { recursive: true });

  const results: Record<string, CorpusMetadata> = {};
  const validationStats: Map<string, SchemaValidationResult[]> = new Map();
  const validationErrors: SchemaValidationError[] = [];

  for (const corpusId of Object.keys(CORPORA_CONFIG)) {
    const corpusPath = join(CORPORA_DIR, corpusId);

    // Check if corpus exists
    try {
      require('fs').accessSync(corpusPath);
    } catch {
      console.log(`⚠ Skipping ${corpusId} (not found - run setup-corpora.sh first)`);
      continue;
    }

    const metadata = await analyzeCorpus(
      corpusId,
      corpusPath,
      schemaLoader,
      validationStats,
      validationErrors
    );
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
