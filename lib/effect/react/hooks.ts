/**
 * React Integration Layer
 *
 * Bridges Effect services to React components via hooks.
 * Each hook provides a simple React interface to Effect services.
 */

import { useState, useCallback, useEffect } from 'react';
import { Effect, Runtime } from 'effect';
import { DocumentService } from '../protocols/Document';
import { StorageService } from '../protocols/Storage';
import { ValidationService } from '../protocols/Validation';
import { AIService } from '../protocols/AI';
import type { TEIDocument } from '@/lib/tei/types';
import type { DialogueSpan } from '@/lib/ai/types';

// ============================================================================
// DocumentService Hook
// ============================================================================

/**
 * useDocumentService
 *
 * Provides React hook interface to DocumentService.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { document, loadDocument, addTag } = useDocumentService();
 *
 *   return <button onClick={() => loadDocument(xml)}>Load</button>;
 * }
 * ```
 */
export function useDocumentService() {
  const [document, setDocument] = useState<TEIDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDocument = useCallback(async (xml: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.loadDocument(xml));
      });

      const doc = await Effect.runPromise(program);
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTag = useCallback(async (passageId: string, range: any, tagName: string, attrs?: any) => {
    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);

        // Route to appropriate addTag method
        if (tagName === 'said') {
          return yield* _(service.addSaidTag(passageId, range, attrs?.who?.substring(1)));
        } else if (tagName === 'q') {
          return yield* _(service.addQTag(passageId, range));
        } else if (tagName === 'persName') {
          return yield* _(service.addPersNameTag(passageId, range, attrs?.ref));
        }

        // Generic addTag
        return yield* _(service.addQTag(passageId, range));
      });

      const updated = await Effect.runPromise(program);
      setDocument(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.removeTag(tagId));
      });

      const updated = await Effect.runPromise(program);
      setDocument(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const undo = useCallback(async () => {
    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.undo());
      });

      const updated = await Effect.runPromise(program);
      setDocument(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const redo = useCallback(async () => {
    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.redo());
      });

      const updated = await Effect.runPromise(program);
      setDocument(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  return {
    document,
    isLoading,
    error,
    loadDocument,
    addTag,
    removeTag,
    undo,
    redo,
  };
}

// ============================================================================
// StorageService Hook
// ============================================================================

/**
 * useStorageService
 *
 * Provides React hook interface to StorageService.
 */
export function useStorageService() {
  const get = useCallback(async <T,>(key: string): Promise<T | null> => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(StorageService);
      return yield* _(service.get<T>(key));
    });

    return Effect.runPromise(program);
  }, []);

  const set = useCallback(async <T,>(key: string, value: T): Promise<void> => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(StorageService);
      return yield* _(service.set(key, value));
    });

    return Effect.runPromise(program);
  }, []);

  const remove = useCallback(async (key: string): Promise<void> => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(StorageService);
      return yield* _(service.remove(key));
    });

    return Effect.runPromise(program);
  }, []);

  const has = useCallback(async (key: string): Promise<boolean> => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(StorageService);
      return yield* _(service.has(key));
    });

    return Effect.runPromise(program);
  }, []);

  return { get, set, remove, has };
}

// ============================================================================
// ValidationService Hook
// ============================================================================

/**
 * useValidationService
 *
 * Provides React hook interface to ValidationService.
 */
export function useValidationService() {
  const validate = useCallback(async (xml: string, schemaPath: string) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(ValidationService);
      return yield* _(service.validateDocument(xml, schemaPath));
    });

    return Effect.runPromise(program);
  }, []);

  return { validate };
}

// ============================================================================
// AIService Hook
// ============================================================================

/**
 * useAIService
 *
 * Provides React hook interface to AIService.
 */
export function useAIService() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectDialogue = useCallback(async (text: string): Promise<DialogueSpan[]> => {
    setIsDetecting(true);
    setError(null);

    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(AIService);
        return yield* _(service.detectDialogue(text));
      });

      const spans = await Effect.runPromise(program);
      return spans as DialogueSpan[];
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const attributeSpeaker = useCallback(async (text: string, dialogue: DialogueSpan[]): Promise<string> => {
    try {
      const program = Effect.gen(function* (_) {
        const service = yield* _(AIService);
        return yield* _(service.attributeSpeaker(text, dialogue));
      });

      return await Effect.runPromise(program);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return '';
    }
  }, []);

  return {
    isDetecting,
    error,
    detectDialogue,
    attributeSpeaker,
  };
}
