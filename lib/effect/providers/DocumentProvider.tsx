'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Effect, Runtime } from 'effect';
import type { TEIDocument } from '@/lib/tei/types';
import { DocumentService } from '@/lib/effect/protocols/Document';
import { effectRuntime } from '@/lib/effect/layers/Main';
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';

/**
 * EffectDocumentProvider
 *
 * React context provider that uses Effect for document operations.
 * Replaces the React-based DocumentContext.
 *
 * @example
 * ```tsx
 * <EffectDocumentProvider>
 *   <App />
 * </EffectDocumentProvider>
 * ```
 */
export function EffectDocumentProvider({ children }: { children: React.ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);

  // Load document on mount (if there's a saved document)
  useEffect(() => {
    const loadSavedDocument = async () => {
      try {
        const storage = effectRuntime.provideService(
          StorageService,
          BrowserStorageService
        );

        const savedXml = await Effect.runPromise(
          Effect.gen(function* (_) {
            const svc = yield* _(StorageService);
            return yield* _(svc.get<string>('tei-editor-document'));
          })
        );

        if (savedXml) {
          await loadDocument(savedXml);
        }
      } catch (error) {
        console.error('Failed to load saved document:', error);
      }
    };

    loadSavedDocument();
  }, []);

  const loadDocument = useCallback(async (xml: string) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.loadDocument(xml));
    });

    try {
      const doc = await Effect.runPromise(program, {
        runtime: effectRuntime,
      });

      setDocument(doc);

      // Save to storage
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(
            effectRuntime.provideService(
              StorageService,
              BrowserStorageService
            )
          );
          return yield* _(storage.set('tei-editor-document', xml));
        })
      );
    } catch (error) {
      console.error('Failed to load document:', error);
      throw error;
    }
  }, []);

  const addTag = useCallback(
    async (passageId: string, range: any, tagName: string, attrs?: any) => {
      if (!document) return;

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);

        if (tagName === 'said') {
          return yield* _(service.addSaidTag(passageId, range, attrs?.who?.substring(1)));
        } else if (tagName === 'q') {
          return yield* _(service.addQTag(passageId, range));
        } else if (tagName === 'persName') {
          return yield* _(service.addPersNameTag(passageId, range, attrs?.ref));
        }

        return yield* _(service.addQTag(passageId, range));
      });

      try {
        const updated = await Effect.runPromise(program, {
          runtime: effectRuntime,
        });

        setDocument(updated);
      } catch (error) {
        console.error('Failed to add tag:', error);
        throw error;
      }
    },
    [document]
  );

  const removeTag = useCallback(async (tagId: string) => {
    if (!document) return;

    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.removeTag(tagId));
    });

    try {
      const updated = await Effect.runPromise(program, {
        runtime: effectRuntime,
      });

      setDocument(updated);
    } catch (error) {
      console.error('Failed to remove tag:', error);
      throw error;
    }
  }, [document]);

  const undo = useCallback(async () => {
    if (!document) return;

    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.undo());
    });

    try {
      const updated = await Effect.runPromise(program, {
        runtime: effectRuntime,
      });

      setDocument(updated);
    } catch (error) {
      console.error('Failed to undo:', error);
      throw error;
    }
  }, [document]);

  const redo = useCallback(async () => {
    if (!document) return;

    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.redo());
    });

    try {
      const updated = await Effect.runPromise(program, {
        runtime: effectRuntime,
      });

      setDocument(updated);
    } catch (error) {
      console.error('Failed to redo:', error);
      throw error;
    }
  }, [document]);

  // Context value
  const contextValue = {
    document,
    loadDocument,
    addTag,
    removeTag,
    undo,
    redo,
  };

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
}

// Import DocumentContext for compatibility
import { DocumentContext } from '@/lib/context/DocumentContext';
import { BrowserStorageService } from '@/lib/effect/services/StorageService';

/**
 * EffectDocumentProvider with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on useEffectDocument feature flag.
 */
export default function DocumentProvider({ children }: { children: React.ReactNode }) {
  if (isFeatureEnabled('useEffectDocument')) {
    return <EffectDocumentProvider>{children}</EffectDocumentProvider>;
  }

  // Fall back to React version
  const ReactDocumentProvider = require('@/lib/context/DocumentContext').DocumentProvider;
  return <ReactDocumentProvider>{children}</ReactDocumentProvider>;
}
