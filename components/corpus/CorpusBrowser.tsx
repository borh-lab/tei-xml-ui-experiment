// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Effect, Layer, pipe } from 'effect';
import { CorpusBrowser as CorpusBrowserService } from '@/lib/effect/services/CorpusBrowser';
import { FetchCorpusDataSourceLive } from '@/lib/effect/services/FetchCorpusDataSource';
import { CorpusBrowserLive } from '@/lib/effect/services/CorpusBrowser';
import type { BrowserState, DocumentViewState } from '@/lib/effect/services/CorpusBrowser';
import { CorpusSelector } from './CorpusSelector';
import { LoadedCorpusView } from './LoadedCorpusView';

// Use browser-compatible fetch data source
const layers = Layer.mergeAll(FetchCorpusDataSourceLive, CorpusBrowserLive);

const runEffect = <A, E>(effect: Effect.Effect<A, E, unknown>): Promise<A> => {
  return Effect.runPromise(pipe(effect, Effect.provide(layers)) as Effect.Effect<A, never, never>);
};

export function CorpusBrowser() {
  const [browserState, setBrowserState] = useState<BrowserState>({ _tag: 'initial' });
  const [documentState, setDocumentState] = useState<DocumentViewState>({ _tag: 'no-selection' });

  // Load corpus on mount
  useEffect(() => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(CorpusBrowserService);
      const state = yield* _(service.getState());
      return state;
    });

    const promise = runEffect(program);
    promise.then(setBrowserState).catch(() => {
      setBrowserState({
        _tag: 'error',
        error: { _tag: 'IOError', cause: new Error('Failed to initialize') },
      });
    });
  }, []);

  const loadCorpus = async (corpus: string) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(CorpusBrowserService);
      yield* _(service.loadCorpus(corpus));
      const state = yield* _(service.getState());
      return state;
    });

    try {
      const state = await runEffect(program);
      setBrowserState(state);
    } catch (error) {
      setBrowserState({ _tag: 'error', error: { _tag: 'IOError', cause: error } });
    }
  };

  const loadDocument = async (docId: string) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(CorpusBrowserService);
      yield* _(service.loadDocument(docId));
      const state = yield* _(service.getDocumentState());
      return state;
    });

    try {
      const state = await runEffect(program);
      setDocumentState(state);
    } catch (error) {
      setDocumentState({ _tag: 'error', error });
    }
  };

  const changePage = async (newPage: number) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(CorpusBrowserService);
      const currentState = yield* _(service.getState());

      if (currentState._tag === 'loaded') {
        yield* _(service.loadCorpus(currentState.metadata.id));
        const newState = yield* _(service.getState());

        if (newState._tag === 'loaded') {
          return { ...newState, page: newPage };
        }
      }
      return currentState;
    });

    try {
      const state = await runEffect(program);
      if (state._tag === 'loaded') {
        setBrowserState({ ...state, page: newPage });
      }
    } catch (error) {
      setBrowserState({ _tag: 'error', error: { _tag: 'IOError', cause: error } });
    }
  };

  const goBack = () => {
    setBrowserState({ _tag: 'initial' });
    setDocumentState({ _tag: 'no-selection' });
  };

  return (
    <div className="container mx-auto p-6">
      {browserState._tag === 'initial' && <CorpusSelector onSelectCorpus={loadCorpus} />}

      {browserState._tag === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="ml-4 text-lg">Loading corpus...</span>
        </div>
      )}

      {browserState._tag === 'loaded' && (
        <LoadedCorpusView
          metadata={browserState.metadata}
          page={browserState.page}
          documentState={documentState}
          onLoadDocument={loadDocument}
          onChangePage={changePage}
          onGoBack={goBack}
        />
      )}

      {browserState._tag === 'error' && (
        <div className="max-w-md mx-auto">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Corpus</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {browserState.error._tag === 'CorpusNotFound' &&
                `Corpus not found: ${browserState.error.corpus}`}
              {browserState.error._tag === 'IOError' &&
                'An error occurred while loading the corpus'}
            </p>
            <button
              onClick={() => setBrowserState({ _tag: 'initial' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
