# TEI Corpus Browsing

This document describes the TEI corpus browsing feature, which allows users to explore and view TEI documents from 6 integrated corpora using an Effect-based architecture.

## Overview

The corpus browser provides access to a comprehensive collection of TEI-encoded documents:

- **6 TEI Corpora**: American fiction, Victorian literature, historical magazines, legislative reports, and more
- **10,793 Documents**: Full corpus integration with complete metadata and content access
- **Train/Val/Test Splits**: 70/15/15 split with seeded randomness for reproducibility
- **Effect-Based Architecture**: Built with Effect for robust state management and composability

### Available Corpora

| Corpus                          | Documents | Encoding Types   | TEI Version | Description                               |
| ------------------------------- | --------- | ---------------- | ----------- | ----------------------------------------- |
| Wright American Fiction         | 2,876     | dramatic-text    | P5          | American fiction from 1851-1875           |
| Victorian Women Writers Project | 199       | dramatic-text    | P5          | Literature by British women writers       |
| Indiana Magazine of History     | 7,289     | dialogue-focused | P4          | Scholarly articles on Indiana history     |
| Indiana Authors and Their Books | 394       | dramatic-text    | P4          | Bibliographic database of Indiana authors |
| Brevier Legislative Reports     | 19        | dialogue-focused | P5          | Indiana legislative reports               |
| Novel Dialogism Corpus        | 28        | dialogue-focused | P5          | Novels with rich quotation annotations |
| TEI Texts (French Novels)       | 14        | mixed            | P5          | Sample French novels in TEI format        |

## Using the Corpus Browser

### Accessing the Browser

Navigate to `/corpus` in the application to access the corpus browser.

### Browsing Corpora

1. **Select a Corpus**: Choose from 6 available corpus cards displaying name and description
2. **View Documents**: Browse documents with pagination (20 documents per page)
3. **Read Content**: Click any document to view its full TEI XML content with metadata
4. **Navigate Pages**: Use Previous/Next buttons to paginate through large document sets

### User Interface Features

- **Corpus Selector Grid**: Visual cards for each corpus with descriptions
- **Document List**: Paginated list showing document paths
- **Document Viewer**: Display TEI content with syntax highlighting
- **Loading States**: Clear feedback during data loading
- **Error Handling**: Graceful error display with recovery options

## Architecture

The corpus browser follows Rich Hickey's design principles for simplicity, composability, and explicit state management.

### Effect-Based Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI Layer                          │
│  (CorpusBrowser.tsx, CorpusSelector.tsx, LoadedCorpusView)  │
│  - Pure rendering based on Effect state                      │
│  - No business logic in components                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CorpusBrowser Service                       │
│  - State management with Effect.Ref                         │
│  - Business logic and orchestration                         │
│  - Explicit state transitions                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               CorpusDataSource Protocol                      │
│  - File I/O operations wrapped in Effect                    │
│  - Honest about I/O - all methods return Effect             │
│  - No upfront loading, load on demand                       │
└─────────────────────────────────────────────────────────────┘
```

### 1. Protocol-First Design

**CorpusDataSource Protocol**: Low-level data access interface

```typescript
interface CorpusDataSource {
  getCorpusMetadata(corpus: CorpusId): Effect<CorpusMetadata, DataSourceError>;
  getDocumentMetadata(docId: DocumentId): Effect<DocumentMetadata, DataSourceError>;
  getDocumentContent(docId: DocumentId): Effect<string, DataSourceError>;
  listDocuments(corpus: CorpusId, options: { page; pageSize }): Effect<DocumentId[]>;
  queryByEncoding(corpus, encoding, options): Effect<DocumentId[]>;
}
```

**CorpusBrowser Service**: Business logic and state management

```typescript
interface CorpusBrowser {
  getState(): Effect<BrowserState>;
  loadCorpus(corpus: CorpusId): Effect<void>;
  listDocuments(): Effect<DocumentId[]>;
  loadDocument(docId: DocumentId): Effect<void>;
}
```

### 2. Values Over Places

All state is immutable with explicit transitions:

```typescript
// Browser state as discriminated union
type BrowserState =
  | { readonly _tag: 'initial' }
  | { readonly _tag: 'loading'; readonly corpus: CorpusId }
  | { readonly _tag: 'loaded'; readonly metadata: CorpusMetadata; readonly page: number }
  | { readonly _tag: 'error'; readonly error: DataSourceError };

// Document view state
type DocumentViewState =
  | { readonly _tag: 'no-selection' }
  | { readonly _tag: 'loading'; readonly docId: DocumentId }
  | { readonly _tag: 'loaded'; readonly metadata: DocumentMetadata; readonly content: string }
  | { readonly _tag: 'error'; readonly error: any };
```

### 3. Explicit Time Modeling

All I/O operations return Effect, making time and failure explicit:

```typescript
// State transitions are explicit
yield * _(Ref.set(browserState, { _tag: 'loading', corpus }));

const metadata = yield * _(dataSource.getCorpusMetadata(corpus));

yield * _(Ref.set(browserState, { _tag: 'loaded', metadata, page: 0 }));
```

### 4. Composability

Services compose through dependency injection using Effect layers:

```typescript
// Live implementation layers
export const LocalCorpusDataSourceLive = Layer.effect(CorpusDataSource, implementation);
export const CorpusBrowserLive = Layer.effect(CorpusBrowser, makeCorpusBrowser).pipe(
  Layer.provide(LocalCorpusDataSourceLive)
);

// Testing: swap implementations
const TestLayer = Layer.mergeAll(MockDataSource, CorpusBrowserLive);
```

### 5. Honest Lazy Loading

No upfront loading or dishonest lazy fields. All data loaded on demand:

```typescript
// Corpus metadata loaded when requested
getCorpusMetadata(corpus: CorpusId): Effect<CorpusMetadata, DataSourceError>

// Document content loaded only when viewed
getDocumentContent(docId: DocumentId): Effect<string, DataSourceError>
```

## Running Tests

### Unit Tests (Effect Services)

Test protocol definitions and service implementations:

```bash
# Run all Effect service tests
npm test -- lib/effect/__tests__/Corpus*.test.ts

# Individual test files
npm test -- lib/effect/__tests__/CorpusDataSource.test.ts
npm test -- lib/effect/__tests__/LocalCorpusDataSource.test.ts
npm test -- lib/effect/__tests__/CorpusBrowser.test.ts
```

### Variation Tests (All Corpora)

Test with real corpus data across all 6 corpora:

```bash
npm test -- lib/effect/__tests__/CorpusVariation.test.ts
```

This test suite verifies:

- All 6 corpora load successfully
- Different encoding types are handled (dialogue-focused, dramatic-text, minimal-markup, mixed)
- TEI P4 and P5 documents both work correctly
- Document content loads from all corpora

### Component Tests (React)

Test React bridge components:

```bash
npm test -- components/corpus/__tests__/CorpusBrowser.test.tsx
```

### E2E Tests (Playwright)

Test full user flows end-to-end:

```bash
# Run all E2E tests
npm run test:e2e tests/e2e/corpus-browsing.spec.ts

# Run in UI mode
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

E2E test coverage:

- Corpus selector displays all 6 corpora
- Corpus loading and document listing
- Pagination through documents
- Document content viewing
- Error handling

### All Tests

Run the complete test suite:

```bash
# Unit and integration tests
npm test

# E2E tests
npm run test:e2e
```

## Extending the Corpus Browser

### Adding a New Corpus

1. **Add as Git Submodule**:

```bash
git submodule add <repo-url> corpora/<corpus-id>
git submodule update --init --recursive
```

2. **Generate Metadata**:

```bash
# Analyze the new corpus
bun run corpus:analyze

# Generate train/val/test splits
bun run corpus:split
```

3. **Update Protocol Schema**:

Edit `/home/bor/Projects/tei-xml/lib/effect/protocols/CorpusDataSource.ts`:

```typescript
export const CorpusId = Schema.Union(
  Schema.Literal('wright-american-fiction'),
  Schema.Literal('victorian-women-writers'),
  // ... existing corpora
  Schema.Literal('your-new-corpus') // Add here
);
```

4. **Add to UI Selector**:

Edit `/home/bor/Projects/tei-xml/components/corpus/CorpusSelector.tsx`:

```typescript
const CORPORA = [
  // ... existing corpora
  {
    id: 'your-new-corpus',
    name: 'Your Corpus Name',
    description: 'Brief description of the corpus',
  },
] as const;
```

5. **Verify Tests Pass**:

```bash
npm test -- lib/effect/__tests__/CorpusVariation.test.ts
```

### Adding Caching

The architecture supports composable enhancements. To add caching:

```typescript
import { Cache } from 'effect';

// Create cached data source decorator
const makeCachedDataSource = Effect.gen(function* (_) {
  const underlying = yield* _(CorpusDataSource);
  const cache = yield* _(
    Cache.make({
      capacity: 100,
      timeToLive: '5 minutes',
    })
  );

  return {
    getCorpusMetadata: (corpus: CorpusId) =>
      Cache.getOrElse(cache, corpus, () => underlying.getCorpusMetadata(corpus)),

    getDocumentContent: (docId: DocumentId) =>
      Cache.getOrElse(cache, docId, () => underlying.getDocumentContent(docId)),

    // Delegate other methods
    getDocumentMetadata: underlying.getDocumentMetadata,
    listDocuments: underlying.listDocuments,
    queryByEncoding: underlying.queryByEncoding,
  };
});
```

### Adding Search/Filtering

Extend the CorpusBrowser service with search capabilities:

```typescript
interface CorpusBrowser {
  // ... existing methods

  /**
   * Search documents by query string
   */
  searchDocuments(query: string): Effect<readonly DocumentId[], DataSourceError>;
}
```

Implementation would query document metadata and return matching IDs.

## Troubleshooting

### Corpus Not Loading

**Symptoms**: Corpus selector shows, but clicking a corpus doesn't load documents

**Solutions**:

1. Check corpus submodules are initialized:

   ```bash
   git submodule update --init --recursive
   ```

2. Verify metadata exists:

   ```bash
   ls tests/corpora/metadata/summary.json
   ls tests/corpora/metadata/documents/<corpus-id>.json
   ```

3. Check file permissions:

   ```bash
   ls -la corpora/
   ```

4. Verify corpus data directory exists:
   ```bash
   ls corpora/<corpus-id>/
   ```

### Documents Not Displaying

**Symptoms**: Document list loads, but clicking a document shows error

**Solutions**:

1. Verify document paths in metadata match actual files:

   ```bash
   # Check path in metadata
   cat tests/corpora/metadata/documents/<corpus>.json | grep '"path"'

   # Verify file exists
   ls -la corpora/<corpus-id>/<document-path>
   ```

2. Check TEI XML is well-formed:

   ```bash
   xmllint --noout corpora/<corpus-id>/<document-path>
   ```

3. Review browser console for JavaScript errors

4. Check Effect runtime logs for detailed error information

### Tests Failing

**Symptoms**: Unit or integration tests fail

**Solutions**:

1. Ensure all corpora are set up:

   ```bash
   bun run corpus:all
   ```

2. Check Effect version in package.json matches installed version:

   ```bash
   grep '"effect"' package.json
   npm list effect
   ```

3. Verify test configuration includes `@effect/jest`:

   ```bash
   grep -A5 '@effect/jest' package.json
   ```

4. Clear Jest cache and rerun:
   ```bash
   npm test -- --clearCache
   npm test
   ```

### Performance Issues

**Symptoms**: Slow loading, high memory usage

**Solutions**:

1. **Pagination**: Already implemented - 20 documents per page
2. **Lazy Loading**: Content only loaded when viewing
3. **Add Caching**: See "Adding Caching" section above
4. **Virtual Scrolling**: For large document lists, consider virtual scrolling
5. **Database Indexing**: If using a database backend, add indexes on frequently queried fields

## Data Format

### Metadata Files

Corpus metadata is stored in `/tests/corpora/metadata/`:

- `summary.json`: Overall corpus statistics and information
- `documents/<corpus-id>.json`: Per-document metadata keyed by path

Example structure:

```json
{
  "wright-american-fiction": {
    "name": "Wright American Fiction",
    "sourceUrl": "https://github.com/iulibdcs/Wright-American-Fiction.git",
    "documentCount": 2876,
    "teiVersion": ["P5"],
    "encodingType": "dramatic-text"
  }
}
```

### Document Metadata

Each document has metadata including:

- `title`: Document title
- `encodingType`: Type of TEI encoding used
- `teiVersion`: P4 or P5
- `path`: Relative path to document file

### TEI Document Structure

Documents follow standard TEI structure:

```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <!-- Metadata -->
  </teiHeader>
  <text>
    <front><!-- Front matter --></front>
    <body><!-- Main content --></body>
    <back><!-- Back matter --></back>
  </text>
</TEI>
```

## Architecture Patterns

### Effect Ref for State

State managed using `Effect.Ref` for explicit time modeling:

```typescript
// Create state
const browserState = yield * _(Ref.make<BrowserState>({ _tag: 'initial' }));

// Get state
const current = yield * _(Ref.get(browserState));

// Set state
yield * _(Ref.set(browserState, { _tag: 'loaded', metadata, page: 0 }));
```

### Error Handling

Explicit error types using discriminated unions:

```typescript
export const DataSourceError = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal('CorpusNotFound'),
    corpus: CorpusId,
    cause: Schema.Unknown,
  }),
  Schema.Struct({
    _tag: Schema.Literal('DocumentNotFound'),
    docId: DocumentId,
    cause: Schema.Unknown,
  }),
  Schema.Struct({
    _tag: Schema.Literal('IOError'),
    cause: Schema.Unknown,
  })
);
```

### Dependency Injection

Services compose through Effect's Layer system:

```typescript
// Define layers
const LocalCorpusDataSourceLive = Layer.effect(CorpusDataSource, impl);
const CorpusBrowserLive = Layer.effect(CorpusBrowser, makeBrowser).pipe(
  Layer.provide(LocalCorpusDataSourceLive)
);

// Provide to runtime
const runtime = Runtime.defaultRuntime.pipe(
  Runtime.provideLayers(Layer.mergeAll(LocalCorpusDataSourceLive, CorpusBrowserLive))
);
```

### React Integration

React components are a thin view layer over Effect services:

```typescript
const loadCorpus = async (corpus: CorpusId) => {
  const program = Effect.gen(function* (_) {
    const browser = yield* _(CorpusBrowser);
    yield* _(browser.loadCorpus(corpus));
    return yield* _(browser.getState());
  });

  const newState = await Effect.runPromise(program);
  setBrowserState(newState);
};
```

## References

### External Resources

- [Effect Documentation](https://effect.website) - Functional effect system for TypeScript
- [Effect Schema](https://effect.website/docs/schema) - Runtime type validation and schema definitions
- [TEI Guidelines](https://tei-c.org/guidelines/) - Text Encoding Initiative guidelines
- [Rich Hickey: Design, Composition, and Performance](https://www.infoq.com/presentations/Simple-Made-Easy/) - Design principles

### Internal Documentation

- `/home/bor/Projects/tei-xml/docs/plans/2026-02-04-corpus-browsing-effect.md` - Implementation plan with full architecture details
- `/home/bor/Projects/tei-xml/lib/effect/README.md` - Effect-based services overview
- `/home/bor/Projects/tei-xml/scripts/README.md` - Corpus setup and analysis scripts

### Code Files

Key implementation files:

- `/home/bor/Projects/tei-xml/lib/effect/protocols/CorpusDataSource.ts` - Data access protocol
- `/home/bor/Projects/tei-xml/lib/effect/services/LocalCorpusDataSource.ts` - Filesystem implementation
- `/home/bor/Projects/tei-xml/lib/effect/services/CorpusBrowser.ts` - Business logic service
- `/home/bor/Projects/tei-xml/components/corpus/CorpusBrowser.tsx` - Main React component
- `/home/bor/Projects/tei-xml/app/corpus/page.tsx` - Next.js route

## Future Enhancements

Potential improvements to the corpus browser:

1. **Search and Filtering**: Full-text search across documents, filter by metadata
2. **Document Comparison**: Side-by-side comparison of multiple documents
3. **Export Features**: Export corpus statistics, document lists, or individual documents
4. **Annotations**: Add and view annotations on documents
5. **Integration**: Connect with dialogue annotation features for direct editing
6. **Advanced Queries**: Complex queries by TEI structure, encoding patterns, etc.
7. **Visualization**: Corpus statistics, tag frequency charts, encoding type distributions
8. **Batch Operations**: Bulk download, batch validation, bulk conversion

## Contributing

When contributing to the corpus browser:

1. **Follow Effect Patterns**: Use Effect for all I/O and state management
2. **Maintain Protocol-First Design**: Define protocols before implementations
3. **Write Tests**: Unit tests for services, E2E tests for UI flows
4. **Update Documentation**: Keep this file and code comments in sync
5. **Respect State Immutability**: Never mutate state directly, use explicit transitions
