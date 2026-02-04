import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@jest/globals';
import { CorpusDataSource, DocumentId } from '../protocols/CorpusDataSource';
import { LocalCorpusDataSourceLive } from '../services/LocalCorpusDataSource';

// Test layer uses real corpus data
const TestLayer = LocalCorpusDataSourceLive;

describe('LocalCorpusDataSource', () => {
  it('should load corpus metadata', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      const metadata = yield* _(
        dataSource.getCorpusMetadata('tei-texts')
      );

      expect(metadata.id).toBe('tei-texts');
      expect(metadata.name).toBeDefined();
      expect(metadata.totalDocuments).toBeGreaterThan(0);
      expect(metadata.encodingTypes.length).toBeGreaterThan(0);
    });

    await Effect.runPromise(
      Effect.provide(program, TestLayer)
    );
  });

  it('should list documents with pagination', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      // First page
      const page1 = yield* _(
        dataSource.listDocuments('tei-texts', {
          page: 0,
          pageSize: 10,
        })
      );

      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page1[0]).toBeInstanceOf(DocumentId);

      // Second page should be different
      const page2 = yield* _(
        dataSource.listDocuments('tei-texts', {
          page: 1,
          pageSize: 10,
        })
      );

      expect(page2.length).toBeLessThanOrEqual(10);

      // Pages should not overlap
      const page1Paths = new Set(page1.map((d) => d.path));
      const page2Paths = new Set(page2.map((d) => d.path));
      const intersection = [...page1Paths].filter((x) => page2Paths.has(x));
      expect(intersection.length).toBe(0);
    });

    await Effect.runPromise(
      Effect.provide(program, TestLayer)
    );
  });

  it('should get document metadata', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      // First get a document ID
      const docs = yield* _(
        dataSource.listDocuments('tei-texts', {
          page: 0,
          pageSize: 1,
        })
      );

      const metadata = yield* _(dataSource.getDocumentMetadata(docs[0]));

      expect(metadata.id).toEqual(docs[0]);
      expect(metadata.title).toBeDefined();
      expect(metadata.teiVersion).toMatch(/P[45]/);
    });

    await Effect.runPromise(
      Effect.provide(program, TestLayer)
    );
  });

  it('should get document content', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      const docs = yield* _(
        dataSource.listDocuments('tei-texts', {
          page: 0,
          pageSize: 1,
        })
      );

      const content = yield* _(dataSource.getDocumentContent(docs[0]));

      expect(content).toContain('<TEI'); // All TEI documents have this
      expect(content.length).toBeGreaterThan(0);
    });

    await Effect.runPromise(
      Effect.provide(program, TestLayer)
    );
  });

  it('should return error for non-existent corpus', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      const result = yield* _(
        Effect.either(
          dataSource.getCorpusMetadata('non-existent' as any)
        )
      );

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('CorpusNotFound');
      }
    });

    await Effect.runPromise(
      Effect.provide(program, TestLayer)
    );
  });
});
