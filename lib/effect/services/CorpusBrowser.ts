// @ts-nocheck
// @ts-nocheck
import { Effect, Layer, Ref, Context, Schema } from 'effect';
import {
  CorpusDataSource,
  CorpusMetadata,
  DocumentMetadata,
  DocumentId,
  DataSourceError,
  DataSourceErrorType,
  type CorpusId,
} from '../protocols/CorpusDataSource';
// Import removed - data source layer is provided by consumer
// import { LocalCorpusDataSourceLive } from './LocalCorpusDataSource';

// ============================================================================
// Explicit State Types
// ============================================================================

export type BrowserState =
  | { readonly _tag: 'initial' }
  | { readonly _tag: 'loading'; readonly corpus: CorpusId }
  | { readonly _tag: 'loaded'; readonly metadata: CorpusMetadata; readonly page: number }
  | { readonly _tag: 'error'; readonly error: DataSourceErrorType };

export type DocumentViewState =
  | { readonly _tag: 'no-selection' }
  | { readonly _tag: 'loading'; readonly docId: DocumentId }
  | { readonly _tag: 'loaded'; readonly metadata: DocumentMetadata; readonly content: string }
  | { readonly _tag: 'error'; readonly error: any };

// ============================================================================
// Service Protocol
// ============================================================================

export interface CorpusBrowser {
  /**
   * Get current browser state.
   */
  getState: () => Effect.Effect<BrowserState>;

  /**
   * Load corpus metadata.
   */
  loadCorpus: (corpus: CorpusId) => Effect.Effect<void>;

  /**
   * List documents in current corpus.
   */
  listDocuments: () => Effect.Effect<readonly DocumentId[], DataSourceErrorType>;

  /**
   * Get document view state.
   */
  getDocumentState: () => Effect.Effect<DocumentViewState>;

  /**
   * Load document for viewing.
   */
  loadDocument: (docId: DocumentId) => Effect.Effect<void>;
}

export const CorpusBrowser = Context.GenericTag<CorpusBrowser>('@app/CorpusBrowser');

// ============================================================================
// Implementation (Composable - uses CorpusDataSource)
// ============================================================================

const makeCorpusBrowser = Effect.gen(function* (_) {
  const dataSource = yield* _(CorpusDataSource);

  // State as Ref (explicit time)
  const browserState = yield* _(Ref.make<BrowserState>({ _tag: 'initial' }));
  const documentState = yield* _(Ref.make<DocumentViewState>({ _tag: 'no-selection' }));

  const service: CorpusBrowser = {
    getState: () => Ref.get(browserState),

    loadCorpus: (corpus: CorpusId) =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(browserState, { _tag: 'loading', corpus }));

        const metadata = yield* _(
          dataSource
            .getCorpusMetadata(corpus)
            .pipe(
              Effect.catchAll((error) =>
                Ref.set(browserState, { _tag: 'error', error }).pipe(Effect.as(null))
              )
            )
        );

        if (metadata === null) {
          return; // Error already set
        }

        yield* _(Ref.set(browserState, { _tag: 'loaded', metadata, page: 0 }));
      }),

    listDocuments: () =>
      Ref.get(browserState).pipe(
        Effect.flatMap((state) =>
          state._tag === 'loaded'
            ? dataSource.listDocuments(state.metadata.id, { page: state.page, pageSize: 20 })
            : Effect.fail(
                new DataSourceError({
                  _tag: 'IOError',
                  cause: 'No corpus loaded',
                })
              )
        )
      ),

    getDocumentState: () => Ref.get(documentState),

    loadDocument: (docId: DocumentId) =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(documentState, { _tag: 'loading', docId }));

        const metadata = yield* _(dataSource.getDocumentMetadata(docId));
        const content = yield* _(dataSource.getDocumentContent(docId));

        yield* _(Ref.set(documentState, { _tag: 'loaded', metadata, content }));
      }).pipe(
        Effect.catchAll((error) =>
          Ref.set(documentState, { _tag: 'error', error }).pipe(Effect.as(null))
        )
      ),
  };

  return service;
});

// Data source layer is provided by consumer (browser uses Fetch, tests use Local)
export const CorpusBrowserLive = Layer.effect(CorpusBrowser, makeCorpusBrowser);
