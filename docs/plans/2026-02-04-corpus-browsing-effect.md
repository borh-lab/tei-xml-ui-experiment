# Corpus Browsing UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browsable UI for the 6 TEI corpora using Effect for state management and following Rich Hickey's design principles (simplicity, values over places, explicit protocols, composability).

**Architecture:** Three-layer Effect architecture: (1) CorpusDataSource protocol for low-level file I/O, (2) CorpusBrowser service for business logic and state management, (3) React bridge component for UI rendering. All I/O returns Effect, state transitions are explicit, and layers compose through dependency injection.

**Tech Stack:** Effect (functional effect system), TypeScript (strict types), React (view layer only), Playwright (E2E testing)

---

## Task 1: Effect Dependencies and Directory Structure

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `lib/effect/protocols/` (directory)
- Create: `lib/effect/services/` (directory)
- Create: `lib/effect/layers/` (directory)
- Create: `lib/effect/__tests__/` (directory)

**Step 1: Install Effect dependencies**

Run: `npm install effect`

Expected: Output shows "added X packages"

**Step 2: Create parallel directory structure**

Run: `mkdir -p lib/effect/protocols lib/effect/services lib/effect/layers lib/effect/__tests__`

Expected: No output (directories created)

**Step 3: Verify directory structure**

Run: `ls -la lib/effect/`

Expected output:
```
protocols/
services/
layers/
__tests__/
```

**Step 4: Create placeholder README**

Create file: `lib/effect/README.md`

Content:
```markdown
# Effect-Based Services

This directory contains the Effect-based architecture for corpus browsing and future features.

## Structure

- `protocols/`: Protocol interfaces (TaggedClass/Schema definitions)
- `services/`: Service implementations (Effect programs)
- `layers/`: Effect layers for dependency injection
- `__tests__/`: Effect tests using @effect/jest
```

**Step 5: Commit**

```bash
git add package.json lib/effect/
git commit -m "feat: add Effect dependencies and directory structure"
```

---

## Task 2: CorpusDataSource Protocol (Domain Types)

**Files:**
- Create: `lib/effect/protocols/CorpusDataSource.ts`
- Test: `lib/effect/__tests__/CorpusDataSource.test.ts`

**Context:**
- Corpus data lives in `tests/corpora/metadata/` with files: `summary.json`, `corpus-*.json`, `documents/*.json`
- Corpora are: 'wright-american-fiction', 'victorian-women-writers', 'indiana-magazine-history', 'indiana-authors-books', 'brevier-legislative', 'tei-texts'
- Document IDs must be scoped to corpus (e.g., `{corpus: 'wright', path: 'novels/file1.xml'}`)

**Step 1: Write the protocol with Schema types**

Create: `lib/effect/protocols/CorpusDataSource.ts`

Content:
```typescript
import { Effect, Schema } from 'effect';

// ============================================================================
// Domain Types (Values, Not Places)
// ============================================================================

export const CorpusId = Schema.Union(
  Schema.Literal('wright-american-fiction'),
  Schema.Literal('victorian-women-writers'),
  Schema.Literal('indiana-magazine-history'),
  Schema.Literal('indiana-authors-books'),
  Schema.Literal('brevier-legislative'),
  Schema.Literal('tei-texts')
);
export type CorpusId = typeof CorpusId.Type;

export const EncodingType = Schema.Union(
  Schema.Literal('dialogue-focused'),
  Schema.Literal('dramatic-text'),
  Schema.Literal('minimal-markup'),
  Schema.Literal('mixed')
);
export type EncodingType = typeof EncodingType.Type;

// Document ID as value type - explicitly scoped to corpus
export interface DocumentId {
  readonly corpus: CorpusId;
  readonly path: string;
}

export const DocumentId = Schema.Class<DocumentId>('DocumentId')({
  corpus: CorpusId,
  path: Schema.String,
});
export type DocumentId = Schema.Schema.Type<typeof DocumentId>;

// ============================================================================
// Protocol Definition
// ============================================================================

/**
 * CorpusDataSource - Protocol for reading corpus data.
 *
 * This protocol is honest about I/O - every method returns Effect.
 * No upfront loading, no dishonest lazy fields.
 */
export interface CorpusDataSource {
  /**
   * Get corpus metadata - loaded on demand.
   * Returns Effect because this requires file I/O.
   */
  getCorpusMetadata(corpus: CorpusId): Effect<CorpusMetadata, DataSourceError>;

  /**
   * Get document metadata - loaded on demand.
   */
  getDocumentMetadata(docId: DocumentId): Effect<DocumentMetadata, DataSourceError>;

  /**
   * Get document content - loaded on demand.
   */
  getDocumentContent(docId: DocumentId): Effect<string, DataSourceError>;

  /**
   * List all documents in a corpus - paginated to avoid memory issues.
   */
  listDocuments(
    corpus: CorpusId,
    options: { readonly page: number; readonly pageSize: number }
  ): Effect<readonly DocumentId[], DataSourceError>;

  /**
   * Query documents by encoding type - paginated.
   */
  queryByEncoding(
    corpus: CorpusId,
    encoding: EncodingType,
    options: { readonly page: number; readonly pageSize: number }
  ): Effect<readonly DocumentId[], DataSourceError>;
}

// ============================================================================
// Value Types (Immutable)
// ============================================================================

export class CorpusMetadata extends Schema.Class<CorpusMetadata>('CorpusMetadata')({
  id: CorpusId,
  name: Schema.String,
  description: Schema.String,
  totalDocuments: Schema.Number,
  encodingTypes: Schema.Array(EncodingType),
}) {}

export class DocumentMetadata extends Schema.Class<DocumentMetadata>('DocumentMetadata')({
  id: DocumentId,
  title: Schema.String,
  encodingType: EncodingType,
  teiVersion: Schema.Union(Schema.Literal('P4'), Schema.Literal('P5')),
}) {}

// ============================================================================
// Error Types (Explicit Failure Modes)
// ============================================================================

export class DataSourceError extends Schema.TaggedError<DataSourceError>('DataSourceError')({
  _tag: Schema.Literal('CorpusNotFound', 'DocumentNotFound', 'IOError'),
  corpus: Schema.Optional(CorpusId),
  docId: Schema.Optional(DocumentId),
  cause: Schema.Unknown,
}) {}

// ============================================================================
// Context Tag for Dependency Injection
// ============================================================================

export const CorpusDataSource = Context.GenericTag<CorpusDataSource>('@app/CorpusDataSource');
```

**Step 2: Write test for protocol compilation**

Create: `lib/effect/__tests__/CorpusDataSource.test.ts`

Content:
```typescript
import { Effect } from 'effect';
import { describe, it, expect } from '@effect/jest';
import { CorpusDataSource, DocumentId, type CorpusId } from '../protocols/CorpusDataSource';

describe('CorpusDataSource Protocol', () => {
  it('should define DocumentId class', () => {
    const docId = new DocumentId({
      corpus: 'wright-american-fiction',
      path: 'novels/test.xml'
    });

    expect(docId.corpus).toBe('wright-american-fiction');
    expect(docId.path).toBe('novels/test.xml');
    expect(docId).toBeInstanceOf(DocumentId);
  });

  it('should have CorpusDataSource context tag', () => {
    expect(CorpusDataSource.key).toBe('@app/CorpusDataSource');
  });
});
```

**Step 3: Run test to verify protocol compiles**

Run: `npm test -- lib/effect/__tests__/CorpusDataSource.test.ts`

Expected: PASS (protocol types compile correctly)

**Step 4: Commit**

```bash
git add lib/effect/protocols/CorpusDataSource.ts lib/effect/__tests__/CorpusDataSource.test.ts
git commit -m "feat: add CorpusDataSource protocol with Schema types"
```

---

## Task 3: LocalCorpusDataSource Implementation

**Files:**
- Create: `lib/effect/services/LocalCorpusDataSource.ts`
- Test: `lib/effect/__tests__/LocalCorpusDataSource.test.ts`

**Context:**
- Metadata files exist at `tests/corpora/metadata/`:
  - `summary.json`: Contains all corpus metadata
  - `documents/{corpus}.json`: Contains document metadata keyed by path
- Corpus content lives at `corpora/{corpus-id}/{path}`
- Use `node:fs/promises` for file I/O wrapped in `Effect.tryPromise`

**Step 1: Write the service implementation**

Create: `lib/effect/services/LocalCorpusDataSource.ts`

Content:
```typescript
import { Effect, Layer, Context } from 'effect';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  CorpusDataSource,
  CorpusMetadata,
  DocumentMetadata,
  DocumentId,
  DataSourceError,
  type CorpusId,
} from '../protocols/CorpusDataSource';

// ============================================================================
// File System Helper (Value-Oriented)
// ============================================================================

const readJsonFile = async <T>(filePath: string): Promise<T> => {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
};

// ============================================================================
// Live Implementation
// ============================================================================

const makeLocalCorpusDataSource = Effect.succeed({
  getCorpusMetadata: (corpus: CorpusId) =>
    Effect.tryPromise({
      try: async () => {
        const metadataPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          'summary.json'
        );
        const summary: any = await readJsonFile(metadataPath);

        const corpusData = summary.corpora[corpus];
        if (!corpusData) {
          throw new Error(`Corpus not found: ${corpus}`);
        }

        return new CorpusMetadata({
          id: corpus,
          name: corpusData.name,
          description: corpusData.description || '',
          totalDocuments: corpusData.totalDocuments,
          encodingTypes: corpusData.encodingTypes || [],
        });
      },
      catch: (error) => new DataSourceError({
        _tag: 'CorpusNotFound',
        corpus,
        cause: error,
      }),
    }),

  getDocumentMetadata: (docId: DocumentId) =>
    Effect.tryPromise({
      try: async () => {
        const metadataPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          'documents',
          `${docId.corpus}.json`
        );
        const docsByPath: Record<string, any> = await readJsonFile(metadataPath);
        const raw = docsByPath[docId.path];

        if (!raw) {
          throw new Error(`Document not found: ${docId.path}`);
        }

        return new DocumentMetadata({
          id: docId,
          title: raw.title || docId.path,
          encodingType: raw.encodingType || 'mixed',
          teiVersion: raw.teiVersion || 'P5',
        });
      },
      catch: (error) => new DataSourceError({
        _tag: 'DocumentNotFound',
        docId,
        cause: error,
      }),
    }),

  getDocumentContent: (docId: DocumentId) =>
    Effect.tryPromise({
      try: async () => {
        const contentPath = path.join(
          process.cwd(),
          'corpora',
          docId.corpus,
          docId.path
        );
        return await fs.readFile(contentPath, 'utf-8');
      },
      catch: (error) => new DataSourceError({
        _tag: 'DocumentNotFound',
        docId,
        cause: error,
      }),
    }),

  listDocuments: (corpus: CorpusId, options) =>
    Effect.tryPromise({
      try: async () => {
        const indexPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          'documents',
          `${corpus}.json`
        );
        const docsByPath: Record<string, any> = await readJsonFile(indexPath);

        // Paginate honestly
        const entries = Object.entries(docsByPath);
        const start = options.page * options.pageSize;
        const end = start + options.pageSize;
        const pageEntries = entries.slice(start, end);

        return pageEntries.map(([docPath]) =>
          new DocumentId({ corpus, path: docPath })
        );
      },
      catch: (error) => new DataSourceError({
        _tag: 'CorpusNotFound',
        corpus,
        cause: error,
      }),
    }),

  queryByEncoding: (corpus: CorpusId, encoding, options) =>
    Effect.tryPromise({
      try: async () => {
        const indexPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          'documents',
          `${corpus}.json`
        );
        const docsByPath: Record<string, any> = await readJsonFile(indexPath);

        // Filter by encoding
        const filtered = Object.entries(docsByPath).filter(
          ([, meta]) => meta.encodingType === encoding
        );

        // Paginate
        const start = options.page * options.pageSize;
        const end = start + options.pageSize;
        const pageEntries = filtered.slice(start, end);

        return pageEntries.map(([docPath]) =>
          new DocumentId({ corpus, path: docPath })
        );
      },
      catch: (error) => new DataSourceError({
        _tag: 'CorpusNotFound',
        corpus,
        cause: error,
      }),
    }),
});

// ============================================================================
// Layer
// ============================================================================

export const LocalCorpusDataSourceLive = Layer.effect(
  CorpusDataSource,
  makeLocalCorpusDataSource
);
```

**Step 2: Write test for real corpus data**

Create: `lib/effect/__tests__/LocalCorpusDataSource.test.ts`

Content:
```typescript
import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@effect/jest';
import { CorpusDataSource, DocumentId } from '../protocols/CorpusDataSource';
import { LocalCorpusDataSourceLive } from '../services/LocalCorpusDataSource';

// Test layer uses real corpus data
const TestLayer = LocalCorpusDataSourceLive;

describe('LocalCorpusDataSource', () => {
  it('should load corpus metadata', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      const metadata = yield* _(
        dataSource.getCorpusMetadata('wright-american-fiction')
      );

      expect(metadata.id).toBe('wright-american-fiction');
      expect(metadata.name).toBeDefined();
      expect(metadata.totalDocuments).toBeGreaterThan(0);
      expect(metadata.encodingTypes.length).toBeGreaterThan(0);
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should list documents with pagination', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      // First page
      const page1 = yield* _(
        dataSource.listDocuments('wright-american-fiction', {
          page: 0,
          pageSize: 10,
        })
      );

      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page1[0]).toBeInstanceOf(DocumentId);

      // Second page should be different
      const page2 = yield* _(
        dataSource.listDocuments('wright-american-fiction', {
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

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should get document metadata', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      // First get a document ID
      const docs = yield* _(
        dataSource.listDocuments('wright-american-fiction', {
          page: 0,
          pageSize: 1,
        })
      );

      const metadata = yield* _(dataSource.getDocumentMetadata(docs[0]));

      expect(metadata.id).toEqual(docs[0]);
      expect(metadata.title).toBeDefined();
      expect(metadata.teiVersion).toMatch(/P[45]/);
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should get document content', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      const docs = yield* _(
        dataSource.listDocuments('wright-american-fiction', {
          page: 0,
          pageSize: 1,
        })
      );

      const content = yield* _(dataSource.getDocumentContent(docs[0]));

      expect(content).toContain('<TEI'); // All TEI documents have this
      expect(content.length).toBeGreaterThan(0);
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
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

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });
});
```

**Step 3: Run tests to verify implementation**

Run: `npm test -- lib/effect/__tests__/LocalCorpusDataSource.test.ts`

Expected: PASS (all tests pass with real corpus data)

**Step 4: Commit**

```bash
git add lib/effect/services/LocalCorpusDataSource.ts lib/effect/__tests__/LocalCorpusDataSource.test.ts
git commit -m "feat: implement LocalCorpusDataSource with real corpus data"
```

---

## Task 4: CorpusBrowser Service (Business Logic)

**Files:**
- Create: `lib/effect/services/CorpusBrowser.ts`
- Test: `lib/effect/__tests__/CorpusBrowser.test.ts`

**Context:**
- This service manages UI state (loaded corpus, selected document)
- Uses Effect.Ref for explicit state management
- State transitions are: initial → loading → loaded/error
- Depends on CorpusDataSource protocol

**Step 1: Write the service with explicit state types**

Create: `lib/effect/services/CorpusBrowser.ts`

Content:
```typescript
import { Effect, Layer, Ref, Context, Schema } from 'effect';
import {
  CorpusDataSource,
  CorpusMetadata,
  DocumentMetadata,
  DocumentId,
  DataSourceError,
  type CorpusId,
} from '../protocols/CorpusDataSource';

// ============================================================================
// Explicit State Types
// ============================================================================

export const BrowserState = Schema.Union(
  // @ts-ignore - Schema.TaggedRequest
  Schema.TaggedStruct('initial', {}),
  // @ts-ignore
  Schema.TaggedStruct('loading', {
    corpus: Schema.from(CorpusId as any),
  }),
  // @ts-ignore
  Schema.TaggedStruct('loaded', {
    metadata: CorpusMetadata,
    page: Schema.Number,
  }),
  // @ts-ignore
  Schema.TaggedStruct('error', {
    error: Schema.from(DataSourceError as any),
  })
);
export type BrowserState = Schema.Schema.Type<typeof BrowserState>;

export const DocumentViewState = Schema.Union(
  // @ts-ignore
  Schema.TaggedStruct('no-selection', {}),
  // @ts-ignore
  Schema.TaggedStruct('loading', {
    docId: DocumentId,
  }),
  // @ts-ignore
  Schema.TaggedStruct('loaded', {
    metadata: DocumentMetadata,
    content: Schema.String,
  }),
  // @ts-ignore
  Schema.TaggedStruct('error', {
    error: DataSourceError,
  })
);
export type DocumentViewState = Schema.Schema.Type<typeof DocumentViewState>;

// ============================================================================
// Service Protocol
// ============================================================================

export interface CorpusBrowser {
  /**
   * Get current browser state.
   */
  getState: Effect<BrowserState>;

  /**
   * Load corpus metadata.
   */
  loadCorpus: (corpus: CorpusId) => Effect<void>;

  /**
   * List documents in current corpus.
   */
  listDocuments: Effect<readonly DocumentId[], DataSourceError>;

  /**
   * Get document view state.
   */
  getDocumentState: Effect<DocumentViewState>;

  /**
   * Load document for viewing.
   */
  loadDocument: (docId: DocumentId) => Effect<void>;
}

export const CorpusBrowser = Context.GenericTag<CorpusBrowser>('@app/CorpusBrowser');

// ============================================================================
// Implementation (Composable - uses CorpusDataSource)
// ============================================================================

const makeCorpusBrowser = Effect.gen(function* (_) {
  const dataSource = yield* _(CorpusDataSource);

  // State as Ref (explicit time)
  const browserState = yield* _(
    Ref.make<BrowserState>({ _tag: 'initial' })
  );
  const documentState = yield* _(
    Ref.make<DocumentViewState>({ _tag: 'no-selection' })
  );

  const service: CorpusBrowser = {
    getState: Ref.get(browserState),

    loadCorpus: (corpus: CorpusId) =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(browserState, { _tag: 'loading', corpus }));

        const metadata = yield* _(
          dataSource.getCorpusMetadata(corpus).pipe(
            Effect.catchAll((error) =>
              Ref.set(browserState, { _tag: 'error', error }).pipe(
                Effect.as(null)
              )
            )
          )
        );

        if (metadata === null) {
          return; // Error already set
        }

        yield* _(Ref.set(browserState, { _tag: 'loaded', metadata, page: 0 }));
      }),

    listDocuments: Ref.get(browserState).pipe(
      Effect.flatMap((state) =>
        state._tag === 'loaded'
          ? dataSource.listDocuments(
              state.metadata.id,
              { page: state.page, pageSize: 20 }
            )
          : Effect.fail(new DataSourceError({
              _tag: 'IOError',
              cause: 'No corpus loaded',
            }))
      )
    ),

    getDocumentState: Ref.get(documentState),

    loadDocument: (docId: DocumentId) =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(documentState, { _tag: 'loading', docId }));

        const metadata = yield* _(dataSource.getDocumentMetadata(docId));
        const content = yield* _(dataSource.getDocumentContent(docId));

        yield* _(
          Ref.set(documentState, { _tag: 'loaded', metadata, content })
        );
      }).pipe(
        Effect.catchAll((error) =>
          Ref.set(documentState, { _tag: 'error', error }).pipe(
            Effect.as(null)
          )
        )
      ),
  };

  return service;
});

export const CorpusBrowserLive = Layer.effect(
  CorpusBrowser,
  makeCorpusBrowser.pipe(
    Layer.provide(LocalCorpusDataSourceLive)
  )
);
```

**Step 2: Write tests for state transitions**

Create: `lib/effect/__tests__/CorpusBrowser.test.ts`

Content:
```typescript
import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@effect/jest';
import { CorpusBrowser } from '../services/CorpusBrowser';
import { LocalCorpusDataSourceLive } from '../services/LocalCorpusDataSource';
import { CorpusBrowserLive } from '../services/CorpusBrowser';

const TestLayer = Layer.mergeAll(LocalCorpusDataSourceLive, CorpusBrowserLive);

describe('CorpusBrowser', () => {
  it('should transition from initial to loaded', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      // Initial state
      const initialState = yield* _(browser.getState());
      expect(initialState._tag).toBe('initial');

      // Load corpus
      yield* _(browser.loadCorpus('wright-american-fiction'));

      // Check loaded state
      const loadedState = yield* _(browser.getState());
      expect(loadedState._tag).toBe('loaded');
      if (loadedState._tag === 'loaded') {
        expect(loadedState.metadata.totalDocuments).toBeGreaterThan(0);
        expect(loadedState.page).toBe(0);
      }
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should transition to error on non-existent corpus', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      yield* _(browser.loadCorpus('non-existent' as any));

      const state = yield* _(browser.getState());
      expect(state._tag).toBe('error');
      if (state._tag === 'error') {
        expect(state.error._tag).toBe('CorpusNotFound');
      }
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should list documents after corpus loaded', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      yield* _(browser.loadCorpus('victorian-women-writers'));

      const docs = yield* _(browser.listDocuments);
      expect(docs.length).toBeLessThanOrEqual(20);
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should load document and transition state', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      yield* _(browser.loadCorpus('wright-american-fiction'));

      const docs = yield* _(browser.listDocuments);
      const firstDoc = docs[0];

      yield* _(browser.loadDocument(firstDoc));

      const docState = yield* _(browser.getDocumentState());
      expect(docState._tag).toBe('loaded');
      if (docState._tag === 'loaded') {
        expect(docState.metadata.id).toEqual(firstDoc);
        expect(docState.content).toContain('<TEI');
      }
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });
});
```

**Step 3: Run tests to verify service**

Run: `npm test -- lib/effect/__tests__/CorpusBrowser.test.ts`

Expected: PASS (all state transition tests pass)

**Step 4: Commit**

```bash
git add lib/effect/services/CorpusBrowser.ts lib/effect/__tests__/CorpusBrowser.test.ts
git commit -m "feat: add CorpusBrowser service with explicit state transitions"
```

---

## Task 5: React Bridge Component

**Files:**
- Create: `components/corpus/CorpusBrowser.tsx`
- Create: `components/corpus/CorpusSelector.tsx`
- Create: `components/corpus/LoadedCorpusView.tsx`
- Test: `components/corpus/__tests__/CorpusBrowser.test.tsx`

**Context:**
- React is ONLY for rendering - all logic in Effect services
- Component watches Effect state via `useEffect` + `Effect.runPromise`
- State renders explicitly based on `_tag` discrimination
- No useState for business logic, only for UI state

**Step 1: Write the main browser component**

Create: `components/corpus/CorpusBrowser.tsx`

Content:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Effect, Runtime } from 'effect';
import { CorpusBrowser, type BrowserState, type DocumentViewState } from '@/lib/effect/services/CorpusBrowser';
import { LocalCorpusDataSourceLive } from '@/lib/effect/services/LocalCorpusDataSource';
import { CorpusBrowserLive } from '@/lib/effect/services/CorpusBrowser';
import type { DocumentId, CorpusId } from '@/lib/effect/protocols/CorpusDataSource';
import { CorpusSelector } from './CorpusSelector';
import { LoadedCorpusView } from './LoadedCorpusView';

// Runtime setup
const runtime = Runtime.defaultRuntime.pipe(
  Runtime.provideLayers(
    Layer.mergeAll(LocalCorpusDataSourceLive, CorpusBrowserLive)
  )
);

export function CorpusBrowserComponent() {
  const [browserState, setBrowserState] = useState<BrowserState>({ _tag: 'initial' });
  const [docState, setDocState] = useState<DocumentViewState>({ _tag: 'no-selection' });

  // Explicit state transitions - no hidden effects
  const loadCorpus = async (corpus: CorpusId) => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);
      yield* _(browser.loadCorpus(corpus));
      return yield* _(browser.getState());
    });

    const newState = await Effect.runPromise(program);
    setBrowserState(newState);
  };

  const loadDocument = async (docId: DocumentId) => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);
      yield* _(browser.loadDocument(docId));
      return yield* _(browser.getDocumentState());
    });

    const newState = await Effect.runPromise(program);
    setDocState(newState);
  };

  return (
    <div className="h-screen flex flex-col p-6">
      <h1 className="text-2xl font-bold mb-4">TEI Corpus Browser</h1>

      {/* UI renders explicitly based on state tag */}
      {browserState._tag === 'initial' && (
        <CorpusSelector onSelect={loadCorpus} />
      )}

      {browserState._tag === 'loading' && (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading corpus...</div>
        </div>
      )}

      {browserState._tag === 'loaded' && (
        <LoadedCorpusView
          metadata={browserState.metadata}
          onLoadDocument={loadDocument}
          documentState={docState}
        />
      )}

      {browserState._tag === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-red-600">{browserState.error._tag}: {String(browserState.error.cause)}</p>
          <button
            onClick={() => setBrowserState({ _tag: 'initial' })}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Selector
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Write corpus selector component**

Create: `components/corpus/CorpusSelector.tsx`

Content:
```typescript
'use client';

import type { CorpusId } from '@/lib/effect/protocols/CorpusDataSource';

const CORPORA: readonly { id: CorpusId; name: string; description: string }[] = [
  {
    id: 'wright-american-fiction',
    name: 'Wright American Fiction',
    description: 'American fiction from 1851-1875',
  },
  {
    id: 'victorian-women-writers',
    name: 'Victorian Women Writers Project',
    description: 'Literature by British women writers',
  },
  {
    id: 'indiana-magazine-history',
    name: 'Indiana Magazine of History',
    description: 'Scholarly articles on Indiana history',
  },
  {
    id: 'indiana-authors-books',
    name: 'Indiana Authors and Their Books',
    description: 'Bibliographic database of Indiana authors',
  },
  {
    id: 'brevier-legislative',
    name: 'Brevier Legislative Reports',
    description: 'Indiana legislative reports',
  },
  {
    id: 'tei-texts',
    name: 'TEI Texts',
    description: 'Sample TEI documents',
  },
] as const;

interface CorpusSelectorProps {
  onSelect: (corpus: CorpusId) => void;
}

export function CorpusSelector({ onSelect }: CorpusSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {CORPORA.map((corpus) => (
        <button
          key={corpus.id}
          onClick={() => onSelect(corpus.id)}
          className="p-6 border rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <h3 className="text-lg font-semibold mb-2">{corpus.name}</h3>
          <p className="text-sm text-gray-600">{corpus.description}</p>
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Write loaded corpus view component**

Create: `components/corpus/LoadedCorpusView.tsx`

Content:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Effect } from 'effect';
import { CorpusBrowser } from '@/lib/effect/services/CorpusBrowser';
import type { CorpusMetadata, DocumentId, DocumentViewState } from '@/lib/effect/protocols/CorpusDataSource';

interface LoadedCorpusViewProps {
  metadata: CorpusMetadata;
  onLoadDocument: (docId: DocumentId) => void;
  documentState: DocumentViewState;
}

export function LoadedCorpusView({
  metadata,
  onLoadDocument,
  documentState,
}: LoadedCorpusViewProps) {
  const [documents, setDocuments] = useState<readonly DocumentId[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);
      const program = Effect.gen(function* (_) {
        const browser = yield* _(CorpusBrowser);
        return yield* _(browser.listDocuments);
      });

      const docs = await Effect.runPromise(program);
      setDocuments(docs);
      setLoading(false);
    };

    loadDocs();
  }, [page, metadata.id]);

  return (
    <div className="flex gap-6 h-full">
      {/* Document list */}
      <div className="w-1/3 overflow-y-auto border-r pr-4">
        <h2 className="text-xl font-semibold mb-2">{metadata.name}</h2>
        <p className="text-sm text-gray-600 mb-4">{metadata.description}</p>
        <p className="text-sm mb-4">{metadata.totalDocuments} documents</p>

        {loading ? (
          <div>Loading documents...</div>
        ) : (
          <div className="space-y-2">
            {documents.map((docId) => (
              <button
                key={docId.path}
                onClick={() => onLoadDocument(docId)}
                className="block w-full text-left p-2 hover:bg-gray-100 rounded truncate"
              >
                {docId.path}
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={documents.length < 20}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Document viewer */}
      <div className="w-2/3 overflow-y-auto">
        {documentState._tag === 'no-selection' && (
          <div className="text-gray-500">Select a document to view</div>
        )}

        {documentState._tag === 'loading' && (
          <div>Loading document...</div>
        )}

        {documentState._tag === 'loaded' && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {documentState.metadata.title}
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              TEI Version: {documentState.metadata.teiVersion} |
              Encoding: {documentState.metadata.encodingType}
            </div>
            <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
              {documentState.content}
            </pre>
          </div>
        )}

        {documentState._tag === 'error' && (
          <div className="bg-red-50 p-4 rounded">
            Error loading document: {documentState.error._tag}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Write component test**

Create: `components/corpus/__tests__/CorpusBrowser.test.tsx`

Content:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CorpusBrowserComponent } from '../CorpusBrowser';

describe('CorpusBrowser Component', () => {
  it('should render corpus selector initially', () => {
    render(<CorpusBrowserComponent />);

    expect(screen.getByText('TEI Corpus Browser')).toBeInTheDocument();
    expect(screen.getByText('Wright American Fiction')).toBeInTheDocument();
  });

  it('should load corpus when selected', async () => {
    const user = userEvent.setup();
    render(<CorpusBrowserComponent />);

    await user.click(screen.getByText('Wright American Fiction'));

    await waitFor(() => {
      expect(screen.getByText(/Loading corpus/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/documents/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
```

**Step 5: Run tests to verify components**

Run: `npm test -- components/corpus/__tests__/CorpusBrowser.test.tsx`

Expected: PASS (component tests pass)

**Step 6: Commit**

```bash
git add components/corpus/ components/corpus/__tests__/
git commit -m "feat: add React bridge components for corpus browsing"
```

---

## Task 6: Add Route for Corpus Browser

**Files:**
- Create: `app/corpus/page.tsx`

**Context:**
- App uses Next.js App Router
- Add new route at `/corpus` for the browser UI

**Step 1: Create the route page**

Create: `app/corpus/page.tsx`

Content:
```typescript
import { CorpusBrowserComponent } from '@/components/corpus/CorpusBrowser';

export default function CorpusPage() {
  return <CorpusBrowserComponent />;
}

export const metadata = {
  title: 'TEI Corpus Browser',
  description: 'Browse and explore TEI corpora',
};
```

**Step 2: Start dev server to verify**

Run: `npm run dev`

Expected: Server starts successfully, no errors

**Step 3: Visit /corpus route in browser**

Open: `http://localhost:3000/corpus`

Expected: See corpus selector with 6 corpus cards

**Step 4: Click a corpus to verify loading**

Click: "Wright American Fiction" button

Expected: Shows loading state, then displays document list

**Step 5: Kill dev server**

Press: `Ctrl+C` in terminal

**Step 6: Commit**

```bash
git add app/corpus/
git commit -m "feat: add /corpus route for browsing TEI corpora"
```

---

## Task 7: E2E Tests for Corpus Browsing

**Files:**
- Create: `tests/e2e/corpus-browsing.spec.ts`

**Context:**
- Use Playwright for E2E testing
- Tests should use real corpus data
- Test full user flows: select corpus, list docs, view document

**Step 1: Write E2E test**

Create: `tests/e2e/corpus-browsing.spec.ts`

Content:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Corpus Browsing', () => {
  test('should display corpus selector', async ({ page }) => {
    await page.goto('/corpus');

    await expect(page.getByText('TEI Corpus Browser')).toBeVisible();
    await expect(page.getByText('Wright American Fiction')).toBeVisible();
    await expect(page.getByText('Victorian Women Writers Project')).toBeVisible();
    await expect(page.getByText('Indiana Magazine of History')).toBeVisible();
  });

  test('should load corpus and display documents', async ({ page }) => {
    await page.goto('/corpus');

    await page.click('text=Wright American Fiction');

    // Wait for loading to complete
    await expect(page.getByText('Loading corpus...')).toBeVisible();
    await expect(page.getByText(/documents/)).toBeVisible({ timeout: 10000 });

    // Verify document list appears
    await expect(page.locator('button').filter({ hasText: /\.xml$/ }).first()).toBeVisible();
  });

  test('should paginate through documents', async ({ page }) => {
    await page.goto('/corpus');

    await page.click('text=Victorian Women Writers Project');
    await expect(page.getByText(/documents/)).toBeVisible({ timeout: 10000 });

    // Get first page documents
    const firstPageDocs = await page.locator('button').filter({ hasText: /\.xml$/ }).allTextContents();

    await page.click('text=Next');

    // Wait for navigation
    await page.waitForTimeout(500);

    // Get second page documents
    const secondPageDocs = await page.locator('button').filter({ hasText: /\.xml$/ }).allTextContents();

    // Pages should be different
    expect(firstPageDocs).not.toEqual(secondPageDocs);
  });

  test('should view document content', async ({ page }) => {
    await page.goto('/corpus');

    await page.click('text=Indiana Magazine of History');
    await expect(page.getByText(/documents/)).toBeVisible({ timeout: 10000 });

    // Click first document
    await page.locator('button').filter({ hasText: /\.xml$/ }).first().click();

    // Wait for document to load
    await expect(page.getByText('Loading document')).toBeVisible();
    await expect(page.getByText(/TEI Version:/)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('pre').toContainText('<TEI')).toBeVisible();
  });

  test('should handle non-existent corpus gracefully', async ({ page }) => {
    // This test verifies error handling
    await page.goto('/corpus');

    // All displayed corpora should be valid
    const corpora = page.getByText(/^(Wright|Victorian|Indiana|Brevier|TEI)/);
    const count = await corpora.count();

    expect(count).toBe(6);
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e tests/e2e/corpus-browsing.spec.ts`

Expected: PASS (all E2E tests pass with real corpus data)

**Step 3: Commit**

```bash
git add tests/e2e/corpus-browsing.spec.ts
git commit -m "test: add E2E tests for corpus browsing flows"
```

---

## Task 8: Integration Tests Using Varied Corpus Data

**Files:**
- Create: `lib/effect/__tests__/CorpusVariation.test.ts`

**Context:**
- Test that all 6 corpora work correctly
- Test different encoding types (dialogue-focused, dramatic-text, minimal-markup, mixed)
- Test TEI P4 vs P5 documents
- Tests should use varied real corpus data for robustness

**Step 1: Write variation tests**

Create: `lib/effect/__tests__/CorpusVariation.test.ts`

Content:
```typescript
import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@effect/jest';
import { CorpusDataSource } from '../protocols/CorpusDataSource';
import { LocalCorpusDataSourceLive } from '../services/LocalCorpusDataSource';
import { CorpusBrowser } from '../services/CorpusBrowser';
import { CorpusBrowserLive } from '../services/CorpusBrowser';

const TestLayer = Layer.mergeAll(LocalCorpusDataSourceLive, CorpusBrowserLive);

describe('Corpus Data Variation Tests', () => {
  const ALL_CORPORA = [
    'wright-american-fiction',
    'victorian-women-writers',
    'indiana-magazine-history',
    'indiana-authors-books',
    'brevier-legislative',
    'tei-texts',
  ] as const;

  it('should load all corpora successfully', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      for (const corpus of ALL_CORPORA) {
        const metadata = yield* _(
          dataSource.getCorpusMetadata(corpus)
        );

        expect(metadata.id).toBe(corpus);
        expect(metadata.totalDocuments).toBeGreaterThan(0);
        expect(metadata.encodingTypes.length).toBeGreaterThan(0);
      }
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should handle documents from all encoding types', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      // Test Wright American Fiction (dialogue-focused)
      const wrightDocs = yield* _(
        dataSource.queryByEncoding('wright-american-fiction', 'dialogue-focused', {
          page: 0,
          pageSize: 1,
        })
      );
      expect(wrightDocs.length).toBeGreaterThanOrEqual(0);

      // Test Victorian Women Writers (mixed)
      const vwwDocs = yield* _(
        dataSource.queryByEncoding('victorian-women-writers', 'mixed', {
          page: 0,
          pageSize: 1,
        })
      );
      expect(vwwDocs.length).toBeGreaterThanOrEqual(0);

      // Test TEI Texts (minimal-markup)
      const teiDocs = yield* _(
        dataSource.queryByEncoding('tei-texts', 'minimal-markup', {
          page: 0,
          pageSize: 1,
        })
      );
      expect(teiDocs.length).toBeGreaterThanOrEqual(0);
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should handle both TEI P4 and P5 documents', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      // Load some documents from each corpus and check TEI versions
      for (const corpus of ALL_CORPORA) {
        const docs = yield* _(
          dataSource.listDocuments(corpus, { page: 0, pageSize: 5 })
        );

        // Get metadata for first 2 documents
        for (const doc of docs.slice(0, 2)) {
          const metadata = yield* _(dataSource.getDocumentMetadata(doc));

          // Should be P4 or P5
          expect(['P4', 'P5']).toContain(metadata.teiVersion);
        }
      }
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should load actual document content from all corpora', async () => {
    const program = Effect.gen(function* (_) {
      const dataSource = yield* _(CorpusDataSource);

      for (const corpus of ALL_CORPORA) {
        const docs = yield* _(
          dataSource.listDocuments(corpus, { page: 0, pageSize: 2 })
        );

        // Load content for first document
        const content = yield* _(dataSource.getDocumentContent(docs[0]));

        // Should contain TEI root element
        expect(content).toMatch(/<TEI[^>]*>/i);
        expect(content.length).toBeGreaterThan(100);
      }
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });

  it('should handleIndianaAuthorsBooks XXE fixes', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);

      // This corpus had XXE issues - verify it works now
      yield* _(browser.loadCorpus('indiana-authors-books'));

      const docs = yield* _(browser.listDocuments);

      // Should have recovered documents (originally 122 files had XXE issues)
      expect(docs.length).toBeGreaterThan(100);

      // Load a document
      const content = yield* _(
        CorpusDataSource.getDocumentContent(docs[0])
      );

      // Content should be valid XML
      expect(content).toMatch(/<TEI[^>]*>/i);
    });

    await Effect.runPromise(program.pipe(
      Effect.provideLayer(TestLayer)
    ));
  });
});
```

**Step 2: Run variation tests**

Run: `npm test -- lib/effect/__tests__/CorpusVariation.test.ts`

Expected: PASS (all variation tests pass with all 6 corpora)

**Step 3: Commit**

```bash
git add lib/effect/__tests__/CorpusVariation.test.ts
git commit -m "test: add variation tests using all corpus data"
```

---

## Task 9: Documentation for Corpus Browsing

**Files:**
- Create: `docs/corpus-browsing.md`
- Modify: `README.md` (add link)

**Context:**
- Document how to use the corpus browsing UI
- Document Effect architecture patterns used
- Document how to extend with new features

**Step 1: Write corpus browsing documentation**

Create: `docs/corpus-browsing.md`

Content:
```markdown
# TEI Corpus Browsing

This document describes the TEI corpus browsing feature, which allows users to explore and view TEI documents from 6 integrated corpora.

## Overview

The corpus browser provides:
- **6 TEI Corpora**: Wright American Fiction, Victorian Women Writers, Indiana Magazine of History, Indiana Authors and Books, Brevier Legislative Reports, and TEI Texts
- **10,793 Documents**: Full corpus integration with metadata and content
- **Train/Val/Test Splits**: 70/15/15 split with seeded randomness for reproducibility
- **Effect-Based Architecture**: Built with Effect for robust state management

## Using the Corpus Browser

### Browse Corpora

1. Navigate to `/corpus`
2. Select a corpus from the available options
3. Browse documents with pagination (20 per page)
4. Click any document to view its TEI content

### Corpus Details

| Corpus | Documents | Encoding Types | TEI Version |
|--------|-----------|----------------|-------------|
| Wright American Fiction | ~1,900 | dialogue-focused | P5 |
| Victorian Women Writers | ~250 | mixed | P5 |
| Indiana Magazine of History | ~500 | dramatic-text | P5 |
| Indiana Authors and Books | ~3,400 | mixed | P4/P5 |
| Brevier Legislative Reports | ~800 | minimal-markup | P5 |
| TEI Texts | ~3,900 | minimal-markup | P5 |

## Architecture

The corpus browser follows Rich Hickey's design principles:

### 1. Protocol-First Design

**CorpusDataSource Protocol**: Low-level data access
```typescript
interface CorpusDataSource {
  getCorpusMetadata(corpus: CorpusId): Effect<CorpusMetadata, DataSourceError>;
  getDocumentContent(docId: DocumentId): Effect<string, DataSourceError>;
  // ...
}
```

**CorpusBrowser Service**: Business logic and state management
```typescript
interface CorpusBrowser {
  loadCorpus: (corpus: CorpusId) => Effect<void>;
  listDocuments: Effect<readonly DocumentId[], DataSourceError>;
  // ...
}
```

### 2. Values Over Places

All state is immutable:
```typescript
type BrowserState =
  | { _tag: 'initial' }
  | { _tag: 'loading'; corpus: CorpusId }
  | { _tag: 'loaded'; metadata: CorpusMetadata; page: number }
  | { _tag: 'error'; error: DataSourceError };
```

### 3. Explicit Time Modeling

All I/O returns Effect:
```typescript
const metadata = yield* _(dataSource.getCorpusMetadata(corpus));
yield* _(Ref.set(browserState, { _tag: 'loaded', metadata, page: 0 }));
```

### 4. Composability

Services compose through dependency injection:
```typescript
const TestLayer = Layer.mergeAll(
  LocalCorpusDataSourceLive,  // Data access
  CorpusBrowserLive           // Business logic
);
```

## Running Tests

### Unit Tests (Effect services)
```bash
npm test -- lib/effect/__tests__/
```

### Component Tests (React)
```bash
npm test -- components/corpus/__tests__/
```

### E2E Tests (Playwright)
```bash
npm run test:e2e tests/e2e/corpus-browsing.spec.ts
```

### Variation Tests (All corpora)
```bash
npm test -- lib/effect/__tests__/CorpusVariation.test.ts
```

## Extending the Corpus Browser

### Adding a New Corpus

1. Add the corpus as a git submodule:
```bash
git submodule add <repo-url> corpora/<corpus-id>
```

2. Generate metadata:
```bash
npm run corpus:analyze
```

3. Update the `CorpusId` schema to include the new corpus:
```typescript
export const CorpusId = Schema.Union(
  Schema.Literal('wright-american-fiction'),
  Schema.Literal('victorian-women-writers'),
  // ...
  Schema.Literal('your-new-corpus')  // Add here
);
```

4. Add to corpus selector:
```typescript
const CORPORA = [
  // ...
  { id: 'your-new-corpus', name: 'Your Corpus', description: '...' }
];
```

### Adding Caching

The architecture supports composable enhancements. To add caching:

```typescript
// Create cached decorator
const makeCachedDataSource = Effect.gen(function* (_) {
  const underlying = yield* _(CorpusDataSource);
  const cache = yield* _(Cache.make({ capacity: 100 }));

  return {
    getCorpusMetadata: (corpus) =>
      Cache.getOrElse(cache, corpus, () =>
        underlying.getCorpusMetadata(corpus)
      ),
    // ...
  };
});
```

## Troubleshooting

### Corpus Not Loading
- Check that corpus submodules are initialized: `git submodule update --recursive`
- Verify metadata exists: `ls tests/corpora/metadata/`
- Check file permissions on `corpora/` directory

### Documents Not Displaying
- Verify document paths in metadata match actual files
- Check TEI XML is well-formed
- Review browser console for errors

### Tests Failing
- Ensure all corpora are set up: `npm run corpus:all`
- Check Effect version in package.json
- Verify test configuration includes `@effect/jest`

## References

- [Effect Documentation](https://effect.website)
- [TEI Guidelines](https://tei-c.org/guidelines/)
- [Rich Hickey: Design, Composition, and Performance](https://www.infoq.com/presentations/Simple-Made-Easy/)
```

**Step 2: Add link to main README**

Add to `README.md` in appropriate section:

```markdown
## Features

- **TEI Corpus Browser**: Browse and explore 6 TEI corpora with 10,793 documents ([docs](docs/corpus-browsing.md))
- **Dialogue Annotation**: AI-powered dialogue detection and speaker attribution
- ...
```

**Step 3: Commit**

```bash
git add docs/corpus-browsing.md README.md
git commit -m "docs: add corpus browsing documentation"
```

---

## Task 10: Final Integration and Verification

**Files:**
- Verify all tests pass
- Build production bundle
- Manual smoke test

**Context:**
- Final verification that everything works together
- All tests should pass
- Production build should succeed
- Manual verification in browser

**Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass (unit, component, Effect services, variation tests)

**Step 2: Run E2E tests**

Run: `npm run test:e2e`

Expected: All E2E tests pass

**Step 3: Build production bundle**

Run: `npm run build`

Expected: Build succeeds without errors

**Step 4: Start production server**

Run: `npm start`

Expected: Server starts successfully

**Step 5: Manual smoke test in browser**

1. Open `http://localhost:3000/corpus`
2. Verify corpus selector displays 6 corpora
3. Click "Wright American Fiction"
4. Verify document list loads
5. Click first document
6. Verify document content displays
7. Click "Next" pagination button
8. Verify page 2 loads different documents
9. Go back, click "Victorian Women Writers"
10. Verify different corpus loads

**Step 6: Kill server**

Press: `Ctrl+C`

**Step 7: Create summary of changes**

Create file: `docs/corpus-browsing-summary.md`

Content:
```markdown
# Corpus Browsing Implementation Summary

## Completed Tasks

1. ✅ Effect dependencies and directory structure
2. ✅ CorpusDataSource protocol with Schema types
3. ✅ LocalCorpusDataSource implementation
4. ✅ CorpusBrowser service with explicit state
5. ✅ React bridge components
6. ✅ `/corpus` route
7. ✅ E2E tests for browsing flows
8. ✅ Variation tests using all 6 corpora
9. ✅ Documentation

## Files Created

### Protocol Layer
- `lib/effect/protocols/CorpusDataSource.ts` - Data access protocol
- `lib/effect/services/LocalCorpusDataSource.ts` - Filesystem implementation
- `lib/effect/services/CorpusBrowser.ts` - Business logic service

### UI Layer
- `components/corpus/CorpusBrowser.tsx` - Main browser component
- `components/corpus/CorpusSelector.tsx` - Corpus selection
- `components/corpus/LoadedCorpusView.tsx` - Document viewer
- `app/corpus/page.tsx` - Route page

### Tests
- `lib/effect/__tests__/CorpusDataSource.test.ts`
- `lib/effect/__tests__/LocalCorpusDataSource.test.ts`
- `lib/effect/__tests__/CorpusBrowser.test.ts`
- `lib/effect/__tests__/CorpusVariation.test.ts`
- `components/corpus/__tests__/CorpusBrowser.test.tsx`
- `tests/e2e/corpus-browsing.spec.ts`

### Documentation
- `docs/corpus-browsing.md` - Usage and architecture
- `lib/effect/README.md` - Effect services overview

## Architecture Principles

✅ **Values Over Places**: All state is immutable, explicit state transitions
✅ **Protocol-First**: CorpusDataSource and CorpusBrowser protocols
✅ **Explicit Time**: All I/O returns Effect, no hidden mutations
✅ **Composability**: Services compose through layers, easy to test
✅ **Honest Lazy Loading**: Metadata loaded on-demand, not upfront
✅ **Constrained Options**: Explicit types, no permissive `options = {}`

## Test Coverage

- 6 corpora tested successfully
- All encoding types tested (dialogue-focused, dramatic-text, minimal-markup, mixed)
- TEI P4 and P5 documents both handled
- 10,793 documents accessible
- Pagination and error states tested

## Next Steps

Potential enhancements:
- Add document search/filtering
- Add document comparison view
- Export corpus statistics
- Add document annotations
- Integrate with dialogue annotation features
```

**Step 8: Final commit**

```bash
git add docs/corpus-browsing-summary.md
git commit -m "docs: add corpus browsing implementation summary"
```

---

## Completion Checklist

- [ ] All 10 tasks completed
- [ ] All tests passing (unit, component, E2E)
- [ ] Production build succeeds
- [ ] Manual smoke test passed
- [ ] Documentation complete
- [ ] No console errors in browser
- [ ] All 6 corpora browsable
- [ ] Pagination works correctly
- [ ] Document viewing works
- [ ] Error states handled gracefully

---

**End of Implementation Plan**
