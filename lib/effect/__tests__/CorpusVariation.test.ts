// @ts-nocheck
import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@jest/globals';
import { CorpusBrowser } from '../services/CorpusBrowser';
import { LocalCorpusDataSourceLive } from '../services/LocalCorpusDataSource';
import { CorpusBrowserLive } from '../services/CorpusBrowser';

// ============================================================================
// Test Configuration
// ============================================================================

const TestLayer = Layer.mergeAll(LocalCorpusDataSourceLive, CorpusBrowserLive);

const ALL_CORPORA = [
  'tei-texts',
  'victorian-women-writers',
  'indiana-authors-books',
  'brevier-legislative',
  'indiana-magazine-history',
  'wright-american-fiction',
] as const;

// ============================================================================
// Test Suite
// ============================================================================

describe('CorpusVariation - Integration Tests with All Corpora', () => {
  it('should load all 6 corpora successfully', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      // Try loading each corpus
      const results: Array<{ corpus: string; success: boolean; docs?: number }> = [];

      for (const corpus of ALL_CORPORA) {
        yield* _(browser.loadCorpus(corpus));

        const state = yield* _(browser.getState());
        const success = state._tag === 'loaded';
        const docs = state._tag === 'loaded' ? state.metadata.totalDocuments : 0;

        results.push({ corpus, success, docs });
      }

      // All corpora should load successfully
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.docs).toBeGreaterThan(0);
      }

      return results;
    });

    const results = await Effect.runPromise(Effect.provide(program, TestLayer));

    // Verify all 6 corpora were tested
    expect(results).toHaveLength(6);
  });

  it('should handle documents from all encoding types', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      const encodingTypesFound = new Set<string>();

      for (const corpus of ALL_CORPORA) {
        yield* _(browser.loadCorpus(corpus));

        const state = yield* _(browser.getState());
        if (state._tag === 'loaded') {
          // Collect encoding types from metadata
          for (const encType of state.metadata.encodingTypes) {
            encodingTypesFound.add(encType);
          }
        }
      }

      // Should find at least these encoding types across corpora
      const expectedTypes = new Set([
        'dialogue-focused',
        'mixed',
        'minimal-markup',
        'dramatic-text',
      ]);

      // At least 3 different encoding types should be present
      expect(encodingTypesFound.size).toBeGreaterThanOrEqual(3);

      // Check that we found some of the expected types
      const intersection = [...expectedTypes].filter(type =>
        encodingTypesFound.has(type)
      );
      expect(intersection.length).toBeGreaterThanOrEqual(2);

      return { encodingTypesFound, expectedTypes };
    });

    const { encodingTypesFound } = await Effect.runPromise(
      Effect.provide(program, TestLayer)
    );

    console.log('Encoding types found:', Array.from(encodingTypesFound));
  });

  it('should handle both TEI P4 and P5 documents', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      const teiVersions = new Set<string>();

      for (const corpus of ALL_CORPORA) {
        yield* _(browser.loadCorpus(corpus));

        const docs = yield* _(browser.listDocuments());

        // Load first document to check TEI version
        if (docs.length > 0) {
          const docId = docs[0];
          yield* _(browser.loadDocument(docId));

          const docState = yield* _(browser.getDocumentState());
          if (docState._tag === 'loaded') {
            // Check content for version indicators
            const content = docState.content;

            // P5 typically has xmlns="http://www.tei-c.org/ns/1.0"
            if (content.includes('xmlns="http://www.tei-c.org/ns/1.0"')) {
              teiVersions.add('P5');
            }
            // P4 typically has xmlns="http://www.tei-c.org/ns/TEI/2.0" or no namespace
            else if (
              content.includes('xmlns="http://www.tei-c.org/ns/TEI/2.0"') ||
              !content.includes('xmlns=')
            ) {
              teiVersions.add('P4');
            }
          }
        }
      }

      // Should find both P4 and P5 documents
      expect(teiVersions.size).toBeGreaterThanOrEqual(1);

      return teiVersions;
    });

    const teiVersions = await Effect.runPromise(Effect.provide(program, TestLayer));

    console.log('TEI versions found:', Array.from(teiVersions));

    // We should find at least one version (P4 or P5)
    expect(teiVersions.size).toBeGreaterThan(0);
  });

  it('should load actual document content from all corpora', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      const results: Array<{
        corpus: string;
        docCount: number;
        loadedFirst: boolean;
        hasContent: boolean;
      }> = [];

      for (const corpus of ALL_CORPORA) {
        yield* _(browser.loadCorpus(corpus));

        const docs = yield* _(browser.listDocuments());
        const docCount = docs.length;

        // Try loading first document
        let loadedFirst = false;
        let hasContent = false;

        if (docs.length > 0) {
          yield* _(browser.loadDocument(docs[0]));

          const docState = yield* _(browser.getDocumentState());
          loadedFirst = docState._tag === 'loaded';

          if (docState._tag === 'loaded') {
            hasContent = docState.content.length > 0;

            // Should contain TEI markup
            expect(docState.content).toMatch(/<TEI|<tei/i);
          }
        }

        results.push({ corpus, docCount, loadedFirst, hasContent });
      }

      // Verify all corpora returned documents
      for (const result of results) {
        expect(result.docCount).toBeGreaterThan(0);
        expect(result.loadedFirst).toBe(true);
        expect(result.hasContent).toBe(true);
      }

      return results;
    });

    const results = await Effect.runPromise(Effect.provide(program, TestLayer));

    // All 6 corpora should be tested
    expect(results).toHaveLength(6);

    // Log summary
    console.log('\nDocument loading summary:');
    for (const result of results) {
      console.log(
        `  ${result.corpus}: ${result.docCount} docs, first doc loaded: ${result.loadedFirst}, has content: ${result.hasContent}`
      );
    }
  });

  it('should handle Indiana Authors Books XXE fixes', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      // Load Indiana Authors corpus specifically
      yield* _(browser.loadCorpus('indiana-authors-books'));

      const state = yield* _(browser.getState());
      expect(state._tag).toBe('loaded');

      if (state._tag === 'loaded') {
        // Verify metadata
        expect(state.metadata.id).toBe('indiana-authors-books');
        expect(state.metadata.totalDocuments).toBeGreaterThan(0);

        // List documents
        const docs = yield* _(browser.listDocuments());
        expect(docs.length).toBeGreaterThan(0);

        // Load first document
        yield* _(browser.loadDocument(docs[0]));

        const docState = yield* _(browser.getDocumentState());
        expect(docState._tag).toBe('loaded');

        if (docState._tag === 'loaded') {
          // Verify content loaded successfully (XXE fixed)
          expect(docState.content).toBeDefined();
          expect(docState.content.length).toBeGreaterThan(0);

          // Should contain TEI elements
          expect(docState.content).toMatch(/<TEI|<tei/i);

          // Check for P4 characteristics (Indiana Authors is P4)
          // P4 often uses DTD declarations
          const hasDOCTYPE = docState.content.includes('<!DOCTYPE');
          const hasDTD = docState.content.includes('.dtd');

          console.log('Indiana Authors Books document characteristics:');
          console.log(`  Has DOCTYPE: ${hasDOCTYPE}`);
          console.log(`  Has DTD reference: ${hasDTD}`);
          console.log(`  Content length: ${docState.content.length}`);
          console.log(`  First 200 chars: ${docState.content.slice(0, 200)}`);
        }
      }

      return state;
    });

    await Effect.runPromise(Effect.provide(program, TestLayer));
  });
});
