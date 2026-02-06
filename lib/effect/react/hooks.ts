// @ts-nocheck
/**
 * React Integration Layer - Effect Hooks
 *
 * Bridges Effect services to React components via hooks.
 * Each hook provides a simple React interface to Effect services.
 *
 * All hooks handle:
 * - Running Effect programs with the configured runtime
 * - Managing loading states
 * - Error handling
 * - Automatic cleanup
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Effect } from 'effect';
import type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
} from '@/lib/tei/types';
import type { HistoryState } from '@/lib/effect/protocols/Document';
import { runEffectAsyncOrFail } from './runtime';
import type { ValidationResult } from '@/lib/validation';

// ============================================================================
// DocumentService Hook
// ============================================================================

/**
 * DocumentService Hook Result
 *
 * Provides access to document state and operations.
 */
export interface UseDocumentServiceResult {
  /** Current document (null if not loaded) */
  document: TEIDocument | null;
  /** Loading state for operations */
  loading: boolean;
  /** Loading sample state */
  loadingSample: boolean;
  /** Loading progress for sample loading (0-100) */
  loadingProgress: number;
  /** Validation results from last validation */
  validationResults: ValidationResult | null;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Error from last operation (null if no error) */
  error: Error | null;
  /** Load document from XML string */
  loadDocument: (xml: string) => Promise<TEIDocument>;
  /** Update document from XML string (reloads document) */
  updateDocument: (xml: string) => Promise<void>;
  /** Add <said> tag to passage */
  addSaidTag: (passageId: PassageID, range: TextRange, speaker: CharacterID) => Promise<void>;
  /** Add <q> tag to passage */
  addQTag: (passageId: PassageID, range: TextRange) => Promise<void>;
  /** Add <persName> tag to passage */
  addPersNameTag: (passageId: PassageID, range: TextRange, ref: string) => Promise<void>;
  /** Generic add tag method */
  addTag: (passageId: PassageID, range: TextRange, tagName: string, attrs?: Record<string, string>) => Promise<void>;
  /** Remove tag from document */
  removeTag: (tagId: string) => Promise<void>;
  /** Add character to document */
  addCharacter: (character: Character) => Promise<void>;
  /** Update character in document */
  updateCharacter: (characterId: CharacterID, updates: Partial<Omit<Character, 'id' | 'xmlId'>>) => Promise<void>;
  /** Remove character from document */
  removeCharacter: (characterId: CharacterID) => Promise<void>;
  /** Add relationship to document */
  addRelationship: (relation: Omit<Relationship, 'id'>) => Promise<void>;
  /** Remove relationship from document */
  removeRelationship: (relationId: string) => Promise<void>;
  /** Undo to previous revision */
  undo: (targetRevision?: number) => Promise<void>;
  /** Redo to next revision */
  redo: (fromRevision?: number) => Promise<void>;
  /** Get history state */
  getHistoryState: () => Promise<HistoryState>;
  /** Time travel to specific revision */
  timeTravel: (targetRevision: number) => Promise<void>;
  /** Clear document and reset state */
  clearDocument: () => void;
  /** Load sample document by ID */
  loadSample: (sampleId: string) => Promise<void>;
  /** Current document ID for URL synchronization */
  currentDocId: string | null;
}

/**
 * useDocumentService Hook
 *
 * Provides React hook interface to DocumentService.
 * Manages document state and provides methods for all document operations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { document, loadDocument, addSaidTag } = useDocumentService();
 *
 *   const handleLoad = async () => {
 *     await loadDocument(xmlString);
 *   };
 *
 *   return <div>{document && <DocumentView document={document} />}</div>;
 * }
 * ```
 */
export function useDocumentService(): UseDocumentServiceResult {
  const [document, setDocument] = useState<TEIDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Helper to update state safely
  const updateState = useCallback((
    updates: Partial<{
      document: TEIDocument | null;
      loading: boolean;
      loadingSample: boolean;
      loadingProgress: number;
      validationResults: ValidationResult;
      isValidating: boolean;
      error: Error | null;
    }>
  ) => {
    if (mountedRef.current) {
      if (updates.document !== undefined) {
        setDocument(updates.document);
      }
      if (updates.loading !== undefined) setLoading(updates.loading);
      if (updates.loadingSample !== undefined) setLoadingSample(updates.loadingSample);
      if (updates.loadingProgress !== undefined) setLoadingProgress(updates.loadingProgress);
      if (updates.validationResults !== undefined) setValidationResults(updates.validationResults);
      if (updates.isValidating !== undefined) setIsValidating(updates.isValidating);
      if (updates.error !== undefined) setError(updates.error);
    }
  }, []);

  // Helper to validate document after edits
  const validateDocument = useCallback(async (doc: TEIDocument): Promise<void> => {
    try {
      const { ValidationService } = await import('@/lib/effect/protocols/Validation');
      const { serializeDocument } = await import('@/lib/tei/operations');

      // Serialize document to XML
      const xml = serializeDocument(doc);

      // Validate against tei-novel schema
      const schemaPath = '/public/schemas/tei-novel.rng';

      const program = Effect.gen(function* (_) {
        const service = yield* _(ValidationService);
        return yield* _(service.validateDocument(xml, schemaPath));
      });

      const result = await runEffectAsyncOrFail(program);
      updateState({ validationResults: result });
    } catch (err) {
      // Don't fail the edit if validation fails - just log it
      console.warn('Validation failed:', err);
      // Set validation results to show the error
      updateState({
        validationResults: {
          valid: false,
          errors: [{
            message: err instanceof Error ? err.message : String(err),
            severity: 'error' as const,
          }],
          warnings: [],
          suggestions: [],
        }
      });
    }
  }, [updateState]);

  const loadDocument = useCallback(async (xml: string) => {
    updateState({ loading: true, error: null });

    try {
      // Import DocumentService (the tag) dynamically
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      // Create the program
      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.loadDocument(xml));
      });

      // Run the program
      const doc = await runEffectAsyncOrFail(program);
      updateState({ document: doc, loading: false });

      // Set document ID for uploaded files
      const uploadedDocId = `uploaded-${Date.now().toString(36)}`;
      setCurrentDocId(uploadedDocId);

      // Validate on load
      await validateDocument(doc);

      return doc;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const addSaidTag = useCallback(async (
    passageId: PassageID,
    range: TextRange,
    speaker: CharacterID
  ) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.addSaidTag(passageId, range, speaker));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const addQTag = useCallback(async (passageId: PassageID, range: TextRange) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.addQTag(passageId, range));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const addPersNameTag = useCallback(async (
    passageId: PassageID,
    range: TextRange,
    ref: string
  ) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.addPersNameTag(passageId, range, ref));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const removeTag = useCallback(async (tagId: string) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.removeTag(tagId));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const addCharacter = useCallback(async (character: Character) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.addCharacter(character));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const updateCharacter = useCallback(async (
    characterId: CharacterID,
    updates: Partial<Omit<Character, 'id' | 'xmlId'>>
  ) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.updateCharacter(characterId, updates));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const removeCharacter = useCallback(async (characterId: CharacterID) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.removeCharacter(characterId));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const addRelationship = useCallback(async (relation: Omit<Relationship, 'id'>) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.addRelationship(relation));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const removeRelationship = useCallback(async (relationId: string) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.removeRelationship(relationId));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const undo = useCallback(async (targetRevision?: number) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.undo(targetRevision));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const redo = useCallback(async (fromRevision?: number) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.redo(fromRevision));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const getHistoryState = useCallback(async (): Promise<HistoryState> => {
    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.getHistoryState());
      });

      return await runEffectAsyncOrFail(program);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ error });
      throw error;
    }
  }, [updateState]);

  const timeTravel = useCallback(async (targetRevision: number) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      const program = Effect.gen(function* (_) {
        const service = yield* _(DocumentService);
        return yield* _(service.timeTravel(targetRevision));
      });

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  const clearDocument = useCallback(() => {
    updateState({ document: null, error: null });
    setCurrentDocId(null);
  }, [updateState]);

  const loadSample = useCallback(async (sampleId: string) => {
    setLoadingSample(true);
    setLoadingProgress(0);
    updateState({ error: null });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Import sample loader
      const { loadSample: loadSampleOp } = await import('@/lib/samples/sampleLoader');

      // Fetch the sample XML content
      const xml = await loadSampleOp(sampleId);

      clearInterval(progressInterval);
      setLoadingProgress(100);

      // Load the document using the fetched XML
      await loadDocument(xml);

      // Set document ID for samples
      setCurrentDocId(`sample-${sampleId}`);

      setTimeout(() => {
        setLoadingSample(false);
        setLoadingProgress(0);
      }, 500);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      setLoadingSample(false);
      throw error;
    }
  }, [loadDocument, updateState]);

  const updateDocument = useCallback(async (xml: string) => {
    updateState({ loading: true, error: null });

    try {
      // For now, just reload the document
      // In a full implementation, this would update the document state
      // without triggering a full reload
      const updated = await loadDocument(xml);
      // Validation is already done in loadDocument
      updateState({ document: updated, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [loadDocument, updateState]);

  // Generic addTag wrapper that routes to specific methods
  const addTag = useCallback(async (
    passageId: PassageID,
    range: TextRange,
    tagName: string,
    attrs?: Record<string, string>
  ) => {
    updateState({ loading: true, error: null });

    try {
      const { DocumentService } = await import('@/lib/effect/protocols/Document');

      // Route to appropriate method based on tag name
      let program;
      switch (tagName) {
        case 'said':
          if (!attrs?.who) {
            throw new Error('said tag requires "who" attribute');
          }
          program = Effect.gen(function* (_) {
            const service = yield* _(DocumentService);
            return yield* _(service.addSaidTag(passageId, range, attrs.who as CharacterID));
          });
          break;

        case 'q':
          program = Effect.gen(function* (_) {
            const service = yield* _(DocumentService);
            return yield* _(service.addQTag(passageId, range));
          });
          break;

        case 'persName':
          if (!attrs?.ref) {
            throw new Error('persName tag requires "ref" attribute');
          }
          program = Effect.gen(function* (_) {
            const service = yield* _(DocumentService);
            return yield* _(service.addPersNameTag(passageId, range, attrs.ref));
          });
          break;

        default:
          throw new Error(`Unsupported tag name: ${tagName}`);
      }

      const updated = await runEffectAsyncOrFail(program);
      updateState({ document: updated, loading: false });

      // Validate after edit
      await validateDocument(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState, validateDocument]);

  // Memoize return value to prevent infinite re-renders
  // Functions are stable due to useCallback, so we only need to depend on state values
  return useMemo(() => ({
    document,
    loading,
    loadingSample,
    loadingProgress,
    validationResults,
    isValidating,
    error,
    loadDocument,
    loadSample,
    updateDocument,
    addSaidTag,
    addQTag,
    addPersNameTag,
    addTag,
    removeTag,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addRelationship,
    removeRelationship,
    undo,
    redo,
    getHistoryState,
    timeTravel,
    clearDocument,
    currentDocId,
  }), [
    document,
    loading,
    loadingSample,
    loadingProgress,
    validationResults,
    isValidating,
    error,
    currentDocId,
  ]);
}

// ============================================================================
// StorageService Hook
// ============================================================================

/**
 * StorageService Hook Result
 *
 * Provides access to storage operations.
 */
export interface UseStorageServiceResult {
  /** Loading state for operations */
  loading: boolean;
  /** Error from last operation (null if no error) */
  error: Error | null;
  /** Get value from storage */
  get: <T>(key: string) => Promise<T | null>;
  /** Set value in storage */
  set: <T>(key: string, value: T) => Promise<void>;
  /** Check if key exists in storage */
  has: (key: string) => Promise<boolean>;
  /** Remove value from storage */
  remove: (key: string) => Promise<void>;
  /** List all keys in storage (optional prefix filter) */
  list: (prefix?: string) => Promise<string[]>;
  /** Clear all storage */
  clear: () => Promise<void>;
}

/**
 * useStorageService Hook
 *
 * Provides React hook interface to StorageService.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { get, set } = useStorageService();
 *
 *   const savePreference = async () => {
 *     await set('view-mode', 'side-by-side');
 *   };
 *
 *   return <button onClick={savePreference}>Save</button>;
 * }
 * ```
 */
export function useStorageService(): UseStorageServiceResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((
    updates: Partial<{ loading: boolean; error: Error | null }>
  ) => {
    if (mountedRef.current) {
      if (updates.loading !== undefined) setLoading(updates.loading);
      if (updates.error !== undefined) setError(updates.error);
    }
  }, []);

  const get = useCallback(async <T,>(key: string): Promise<T | null> => {
    updateState({ loading: true, error: null });

    try {
      const { StorageService } = await import('@/lib/effect/protocols/Storage');

      const program = Effect.gen(function* (_) {
        const service = yield* _(StorageService);
        const hasValue = yield* _(service.has(key));
        if (!hasValue) {
          return null;
        }
        return yield* _(service.get<T>(key));
      });

      const result = await runEffectAsyncOrFail(program);
      updateState({ loading: false });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      return null;
    }
  }, [updateState]);

  const set = useCallback(async <T,>(key: string, value: T) => {
    updateState({ loading: true, error: null });

    try {
      const { StorageService } = await import('@/lib/effect/protocols/Storage');

      const program = Effect.gen(function* (_) {
        const service = yield* _(StorageService);
        return yield* _(service.set(key, value));
      });

      await runEffectAsyncOrFail(program);
      updateState({ loading: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState]);

  const has = useCallback(async (key: string): Promise<boolean> => {
    try {
      const { StorageService } = await import('@/lib/effect/protocols/Storage');

      const program = Effect.gen(function* (_) {
        const service = yield* _(StorageService);
        return yield* _(service.has(key));
      });

      return await runEffectAsyncOrFail(program);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ error });
      return false;
    }
  }, [updateState]);

  const remove = useCallback(async (key: string) => {
    updateState({ loading: true, error: null });

    try {
      const { StorageService } = await import('@/lib/effect/protocols/Storage');

      const program = Effect.gen(function* (_) {
        const service = yield* _(StorageService);
        return yield* _(service.remove(key));
      });

      await runEffectAsyncOrFail(program);
      updateState({ loading: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState]);

  const list = useCallback(async (prefix?: string): Promise<string[]> => {
    try {
      const { StorageService } = await import('@/lib/effect/protocols/Storage');

      const program = Effect.gen(function* (_) {
        const service = yield* _(StorageService);
        return yield* _(service.list(prefix));
      });

      return await runEffectAsyncOrFail(program);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ error });
      return [];
    }
  }, [updateState]);

  const clear = useCallback(async () => {
    updateState({ loading: true, error: null });

    try {
      const { StorageService } = await import('@/lib/effect/protocols/Storage');

      const program = Effect.gen(function* (_) {
        const service = yield* _(StorageService);
        return yield* _(service.clear());
      });

      await runEffectAsyncOrFail(program);
      updateState({ loading: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      updateState({ loading: false, error });
      throw error;
    }
  }, [updateState]);

  return {
    loading,
    error,
    get,
    set,
    has,
    remove,
    list,
    clear,
  };
}

// ============================================================================
// ValidationService Hook (Stub - Not Yet Implemented)
// ============================================================================

export function useValidationService() {
  throw new Error('useValidationService is not yet fully implemented');
}

// ============================================================================
// AIService Hook (Stub - Not Yet Implemented)
// ============================================================================

export function useAIService() {
  throw new Error('useAIService is not yet fully implemented');
}

// ============================================================================
// Convenience Export: useDocument
// ============================================================================

/**
 * useDocument Hook
 *
 * Alias for useDocumentService for compatibility with existing code.
 * Provides the same interface but using Effect services under the hood.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { document, loadSample, loadDocument } = useDocument();
 *
 *   const handleLoadSample = async () => {
 *     await loadSample('yellow-wallpaper');
 *   };
 *
 *   return <div>{document && <DocumentView document={document} />}</div>;
 * }
 * ```
 */
export const useDocument = useDocumentService;
