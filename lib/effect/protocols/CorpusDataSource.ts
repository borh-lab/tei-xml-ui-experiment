// @ts-nocheck
// @ts-nocheck
import { Context, Effect, Schema } from 'effect';

// ============================================================================
// Domain Types (Values, Not Places)
// ============================================================================

export const CorpusId = Schema.Union(
  Schema.Literal('wright-american-fiction'),
  Schema.Literal('victorian-women-writers'),
  Schema.Literal('indiana-magazine-history'),
  Schema.Literal('indiana-authors-books'),
  Schema.Literal('brevier-legislative'),
  Schema.Literal('tei-texts'),
  Schema.Literal('novel-dialogism')
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
export class DocumentId extends Schema.Class<DocumentId>('DocumentId')({
  corpus: CorpusId,
  path: Schema.String,
}) {}

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
  getCorpusMetadata(corpus: CorpusId): Effect.Effect<CorpusMetadata, DataSourceErrorType>;

  /**
   * Get document metadata - loaded on demand.
   */
  getDocumentMetadata(docId: DocumentId): Effect.Effect<DocumentMetadata, DataSourceErrorType>;

  /**
   * Get document content - loaded on demand.
   */
  getDocumentContent(docId: DocumentId): Effect.Effect<string, DataSourceErrorType>;

  /**
   * List all documents in a corpus - paginated to avoid memory issues.
   */
  listDocuments(
    corpus: CorpusId,
    options: { readonly page: number; readonly pageSize: number }
  ): Effect.Effect<readonly DocumentId[], DataSourceErrorType>;

  /**
   * Query documents by encoding type - paginated.
   */
  queryByEncoding(
    corpus: CorpusId,
    encoding: EncodingType,
    options: { readonly page: number; readonly pageSize: number }
  ): Effect.Effect<readonly DocumentId[], DataSourceErrorType>;
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
export type DataSourceErrorType = typeof DataSourceError.Type;

// ============================================================================
// Context Tag for Dependency Injection
// ============================================================================

export const CorpusDataSource = Context.GenericTag<CorpusDataSource>('@app/CorpusDataSource');
