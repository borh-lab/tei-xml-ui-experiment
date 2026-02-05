// @ts-nocheck
/**
 * FetchCorpusDataSource - Browser-compatible corpus data source
 *
 * Uses fetch API to load corpus data from HTTP endpoints.
 * This is the browser-compatible alternative to LocalCorpusDataSource.
 */

import { Effect, Layer } from 'effect';
import {
  CorpusDataSource,
  type DataSourceErrorType,
  CorpusMetadata,
  DocumentMetadata,
  DocumentId,
  type CorpusId,
  EncodingType,
} from '../protocols/CorpusDataSource';
import { loadDocument as parseTEIDocument } from '@/lib/tei/operations';

/**
 * Base URL for corpus API
 */
const CORPORA_API_BASE = '/api/corpora';

/**
 * Helper to create DataSourceError from any error
 */
const toDataSourceError = (error: unknown): DataSourceErrorType => {
  return {
    _tag: 'IOError',
    cause: error,
  } as const;
};

/**
 * Simple list of corpora metadata - in production this would come from an API
 */
const CORPORA_INFO: Record<CorpusId, { name: string; description: string; totalDocuments: number }> = {
  'wright-american-fiction': {
    name: 'Wright American Fiction',
    description: 'American fiction from 1851-1875',
    totalDocuments: 100,
  },
  'victorian-women-writers': {
    name: 'Victorian Women Writers',
    description: 'Victorian women writers project',
    totalDocuments: 100,
  },
  'indiana-magazine-history': {
    name: 'Indiana Magazine of History',
    description: 'Indiana historical magazine articles',
    totalDocuments: 100,
  },
  'indiana-authors-books': {
    name: 'Indiana Authors Books',
    description: 'Books by Indiana authors',
    totalDocuments: 100,
  },
  'brevier-legislative': {
    name: 'Brevier Legislative',
    description: 'Legislative documents',
    totalDocuments: 100,
  },
  'tei-texts': {
    name: 'TEI Texts',
    description: 'TEI encoded text collection',
    totalDocuments: 100,
  },
  'novel-dialogism': {
    name: 'Novel Dialogism Corpus',
    description: 'Novels with rich quotation and character annotations',
    totalDocuments: 28,
  },
};

/**
 * Fetch-based corpus data source
 */
export const FetchCorpusDataSource: CorpusDataSource = {
  /**
   * Get corpus metadata
   */
  getCorpusMetadata: (corpus: CorpusId): Effect.Effect<CorpusMetadata, DataSourceErrorType> =>
    Effect.tryPromise({
      try: async () => {
        const info = CORPORA_INFO[corpus];
        return new CorpusMetadata({
          id: corpus,
          name: info.name,
          description: info.description,
          totalDocuments: info.totalDocuments,
          encodingTypes: ['dialogue-focused', 'dramatic-text', 'minimal-markup', 'mixed'],
        });
      },
      catch: toDataSourceError,
    }),

  /**
   * Get document metadata
   */
  getDocumentMetadata: (docId: DocumentId): Effect.Effect<DocumentMetadata, DataSourceErrorType> =>
    Effect.tryPromise({
      try: async () => {
        // Fetch document to extract metadata
        const response = await fetch(`${CORPORA_API_BASE}/${docId.corpus}/${docId.path}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        const xmlContent = await response.text();
        const doc = parseTEIDocument(xmlContent);

        return new DocumentMetadata({
          id: docId,
          title: doc.state.metadata.title || 'Untitled',
          encodingType: 'mixed', // TODO: Determine from actual content
          teiVersion: 'P5',
        });
      },
      catch: toDataSourceError,
    }),

  /**
   * Get document content
   */
  getDocumentContent: (docId: DocumentId): Effect.Effect<string, DataSourceErrorType> =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${CORPORA_API_BASE}/${docId.corpus}/${docId.path}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        return await response.text();
      },
      catch: toDataSourceError,
    }),

  /**
   * List documents in a corpus
   */
  listDocuments: (
    corpus: CorpusId,
    options: { readonly page: number; readonly pageSize: number }
  ): Effect.Effect<readonly DocumentId[], DataSourceErrorType> =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${CORPORA_API_BASE}/${corpus}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch document list: ${response.statusText}`);
        }
        const data = await response.json();
        const allDocs = data.documents as string[];

        // Apply pagination
        const start = options.page * options.pageSize;
        const end = start + options.pageSize;
        const paginatedDocs = allDocs.slice(start, end);

        return paginatedDocs.map((docPath) =>
          new DocumentId({
            corpus,
            path: docPath,
          })
        );
      },
      catch: toDataSourceError,
    }),

  /**
   * Query documents by encoding type
   */
  queryByEncoding: (
    corpus: CorpusId,
    _encoding: EncodingType,
    options: { readonly page: number; readonly pageSize: number }
  ): Effect.Effect<readonly DocumentId[], DataSourceErrorType> =>
    // For now, just return all documents (encoding filtering not implemented)
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${CORPORA_API_BASE}/${corpus}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch document list: ${response.statusText}`);
        }
        const data = await response.json();
        const allDocs = data.documents as string[];

        const start = options.page * options.pageSize;
        const end = start + options.pageSize;
        const paginatedDocs = allDocs.slice(start, end);

        return paginatedDocs.map((docPath) =>
          new DocumentId({
            corpus,
            path: docPath,
          })
        );
      },
      catch: toDataSourceError,
    }),
};

/**
 * Live layer for FetchCorpusDataSource
 */
export const FetchCorpusDataSourceLive = Layer.succeed(
  CorpusDataSource,
  FetchCorpusDataSource
);
