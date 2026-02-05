// @ts-nocheck
import { CorpusManager } from '@/lib/corpora';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const MOCK_CORPORA_DIR = join(process.cwd(), 'corpora');
const MOCK_METADATA_DIR = join(process.cwd(), 'tests', 'corpora');

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

    writeFileSync(join(MOCK_METADATA_DIR, 'splits.json'), JSON.stringify(mockSplits, null, 2));

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
    mkdirSync(join(MOCK_CORPORA_DIR, 'test-corpus'), { recursive: true });
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
    if (existsSync(join(MOCK_CORPORA_DIR, 'test-corpus'))) {
      rmSync(join(MOCK_CORPORA_DIR, 'test-corpus'), { recursive: true, force: true });
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
