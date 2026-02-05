// @ts-nocheck
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