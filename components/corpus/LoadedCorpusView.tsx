'use client';

import React, { useState, useEffect } from 'react';
import { Effect, Layer, pipe } from 'effect';
import { CorpusBrowser as CorpusBrowserService } from '@/lib/effect/services/CorpusBrowser';
import { CorpusBrowserLive } from '@/lib/effect/services/CorpusBrowser';
import { FetchCorpusDataSourceLive } from '@/lib/effect/services/FetchCorpusDataSource';
import type { CorpusMetadata, DocumentId } from '@/lib/effect/protocols/CorpusDataSource';
import type { DocumentViewState } from '@/lib/effect/services/CorpusBrowser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Use browser-compatible fetch data source
const layers = Layer.mergeAll(FetchCorpusDataSourceLive, CorpusBrowserLive);

const runEffect = <A, E>(effect: Effect.Effect<A, E, unknown>): Promise<A> => {
  return Effect.runPromise(pipe(effect, Effect.provide(layers)) as Effect.Effect<A, never, never>);
};

interface LoadedCorpusViewProps {
  metadata: CorpusMetadata;
  page: number;
  documentState: DocumentViewState;
  onLoadDocument: (docId: DocumentId) => void;
  onChangePage: (page: number) => void;
  onGoBack: () => void;
}

const PAGE_SIZE = 20;

export function LoadedCorpusView({
  metadata,
  page,
  documentState,
  onLoadDocument,
  onChangePage,
  onGoBack,
}: LoadedCorpusViewProps) {
  const [documents, setDocuments] = useState<readonly DocumentId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      const program = Effect.gen(function* (_) {
        const service = yield* _(CorpusBrowserService);
        const docs = yield* _(service.listDocuments());
        return docs;
      });

      try {
        const docs = await runEffect(program);
        setDocuments(docs);
      } catch (err) {
        setError('Failed to load documents');
        console.error('Error loading documents:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [metadata.id, page]);

  if (documentState._tag === 'loaded') {
    return (
      <div className="max-w-6xl mx-auto">
        <Button onClick={onGoBack} variant="outline" className="mb-6">
          ← Back to Documents
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{documentState.metadata.title}</CardTitle>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="secondary">{documentState.metadata.encodingType}</Badge>
              <Badge variant="outline">TEI {documentState.metadata.teiVersion}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{documentState.content}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button onClick={onGoBack} variant="outline" className="mb-4">
            ← Back to Corpora
          </Button>
          <h1 className="text-3xl font-bold">{metadata.name}</h1>
          <p className="text-muted-foreground mt-1">{metadata.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Corpus Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Total Documents</div>
                <div className="text-2xl font-bold">
                  {metadata.totalDocuments?.toLocaleString() || 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Encoding Types</div>
                <div className="flex flex-wrap gap-1">
                  {metadata.encodingTypes?.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">N/A</span>}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Current Page</div>
                <div className="text-lg">{page + 1}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-destructive p-4 border border-destructive rounded">
                  {error}
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3">Loading documents...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No documents found in this corpus
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {documents.map((docId) => (
                      <div
                        key={`${docId.corpus}/${docId.path}`}
                        className="flex items-center justify-between p-3 border rounded hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {docId.path.split('/').pop()}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{docId.path}</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onLoadDocument(docId)}
                          disabled={documentState._tag === 'loading'}
                        >
                          {documentState._tag === 'loading' &&
                          documentState.docId?.path === docId.path
                            ? 'Loading...'
                            : 'View'}
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => onChangePage(page - 1)}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {page + 1}
                      {documents.length < PAGE_SIZE && ' (last page)'}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => onChangePage(page + 1)}
                      disabled={documents.length < PAGE_SIZE}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
