// @ts-nocheck
// @ts-nocheck
import { Effect, Layer, Context } from 'effect';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  CorpusDataSource,
  CorpusMetadata,
  DocumentMetadata,
  DocumentId,
  type CorpusId,
  type DataSourceErrorType,
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
          `${corpus}.json`
        );
        const corpusData: any = await readJsonFile(metadataPath);

        return new CorpusMetadata({
          id: corpus,
          name: corpusData.name,
          description: corpusData.description || corpusData.sourceUrl || '',
          totalDocuments: corpusData.documentCount || 0,
          encodingTypes: [corpusData.encodingType || 'minimal-markup'],
        });
      },
      catch: (error): DataSourceErrorType => ({
        _tag: 'CorpusNotFound',
        corpus,
        cause: error,
      }),
    }),

  getDocumentMetadata: (docId: DocumentId) =>
    Effect.tryPromise({
      try: async () => {
        // Read corpus metadata to get document list
        const metadataPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          `${docId.corpus}.json`
        );
        const corpusData: any = await readJsonFile(metadataPath);

        // Find document in sampleDocuments or scan the corpus directory
        let docInfo: any = null;

        // First try sampleDocuments
        if (corpusData.sampleDocuments) {
          const relativePath = docId.path.startsWith('corpora/')
            ? docId.path
            : `corpora/${docId.corpus}/${docId.path}`;

          docInfo = corpusData.sampleDocuments.find(
            (d: string) => d.endsWith(docId.path) || d === relativePath
          );
        }

        // If not found, create minimal metadata
        return new DocumentMetadata({
          id: docId,
          title: docId.path.split('/').pop() || docId.path,
          encodingType: corpusData.encodingType || 'mixed',
          teiVersion: (corpusData.teiVersion && corpusData.teiVersion[0]) || 'P5',
        });
      },
      catch: (error): DataSourceErrorType => ({
        _tag: 'DocumentNotFound',
        docId,
        cause: error,
      }),
    }),

  getDocumentContent: (docId: DocumentId) =>
    Effect.tryPromise({
      try: async () => {
        // Handle different path formats:
        // - If path starts with 'corpora/', use it as-is
        // - Otherwise, prepend 'corpora/{corpus}/'
        let contentPath: string;
        if (docId.path.startsWith('corpora/')) {
          contentPath = path.join(process.cwd(), docId.path);
        } else if (docId.path.startsWith(docId.corpus + '/')) {
          // Path is "tei-texts/french/..." -> need to add corpora/ prefix
          contentPath = path.join(process.cwd(), 'corpora', docId.path);
        } else {
          // Path is relative to corpus: "french/..." -> add both prefixes
          contentPath = path.join(process.cwd(), 'corpora', docId.corpus, docId.path);
        }

        // console.log('Getting content for:', docId.path, '->', contentPath);

        return await fs.readFile(contentPath, 'utf-8');
      },
      catch: (error) => ({
        _tag: 'DocumentNotFound' as const,
        docId,
        cause: error,
      }),
    }),

  listDocuments: (corpus: CorpusId, options) =>
    Effect.tryPromise({
      try: async () => {
        const metadataPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          `${corpus}.json`
        );
        const corpusData: any = await readJsonFile(metadataPath);

        // Use sampleDocuments if available, otherwise scan the directory
        let docPaths: string[] = [];

        if (corpusData.sampleDocuments && corpusData.sampleDocuments.length > 0) {
          // Convert full paths to relative paths (remove 'corpora/{corpus}/' prefix)
          docPaths = corpusData.sampleDocuments.map((fullPath: string) => {
            const prefix = `corpora/${corpus}/`;
            if (fullPath.startsWith(prefix)) {
              return fullPath.slice(prefix.length);
            }
            return fullPath;
          });
        } else {
          // Scan the corpus directory for XML files
          const corpusDir = path.join(process.cwd(), 'corpora', corpus);
          const { findXMLFiles } = require('../../../scripts/corpus-utils');
          const allFiles = findXMLFiles(corpusDir);

          // Convert to relative paths
          docPaths = allFiles.map((fullPath: string) =>
            fullPath.slice(path.join(process.cwd(), 'corpora', corpus).length + 1)
          );
        }

        // Paginate honestly
        const start = options.page * options.pageSize;
        const end = start + options.pageSize;
        const pagePaths = docPaths.slice(start, end);

        return pagePaths.map((docPath) => new DocumentId({ corpus, path: docPath }));
      },
      catch: (error): DataSourceErrorType => ({
        _tag: 'CorpusNotFound',
        corpus,
        cause: error,
      }),
    }),

  queryByEncoding: (corpus: CorpusId, encoding, options) =>
    Effect.tryPromise({
      try: async () => {
        const metadataPath = path.join(
          process.cwd(),
          'tests',
          'corpora',
          'metadata',
          `${corpus}.json`
        );
        const corpusData: any = await readJsonFile(metadataPath);

        // Check if corpus matches the encoding type
        if (corpusData.encodingType !== encoding) {
          return []; // No documents match
        }

        // Return all documents (already filtered by encoding type)
        let docPaths: string[] = [];

        if (corpusData.sampleDocuments && corpusData.sampleDocuments.length > 0) {
          docPaths = corpusData.sampleDocuments.map((fullPath: string) => {
            const prefix = `corpora/${corpus}/`;
            if (fullPath.startsWith(prefix)) {
              return fullPath.slice(prefix.length);
            }
            return fullPath;
          });
        } else {
          const corpusDir = path.join(process.cwd(), 'corpora', corpus);
          const { findXMLFiles } = require('../../../scripts/corpus-utils');
          const allFiles = findXMLFiles(corpusDir);
          docPaths = allFiles.map((fullPath: string) =>
            fullPath.slice(path.join(process.cwd(), 'corpora', corpus).length + 1)
          );
        }

        // Paginate
        const start = options.page * options.pageSize;
        const end = start + options.pageSize;
        const pagePaths = docPaths.slice(start, end);

        return pagePaths.map((docPath) => new DocumentId({ corpus, path: docPath }));
      },
      catch: (error): DataSourceErrorType => ({
        _tag: 'CorpusNotFound',
        corpus,
        cause: error,
      }),
    }),
});

// ============================================================================
// Layer
// ============================================================================

export const LocalCorpusDataSourceLive = Layer.effect(CorpusDataSource, makeLocalCorpusDataSource);
