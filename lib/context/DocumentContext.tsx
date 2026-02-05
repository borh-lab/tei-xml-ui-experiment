'use client';

/**
 * DocumentContext - Unified Document State Management
 *
 * Provides a single React Context for document operations using Effect services.
 * All components should use this context to access document state and operations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { document, loadDocument, loadSample } = useDocumentContext();
 *   ...
 * }
 * ```
 */

import { createContext, useContext, ReactNode, useMemo } from 'react';
import type { TEIDocument } from '@/lib/tei/types';
import type { PassageID, CharacterID, TextRange } from '@/lib/tei/types';
import type { ValidationResult } from '@/lib/validation';
import { useDocumentService } from '@/lib/effect/react/hooks';

/**
 * DocumentContext Type
 *
 * Complete interface for document operations.
 * All methods are provided by the Effect-based DocumentService.
 */
export interface DocumentContextType {
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
  /** Load sample document by ID */
  loadSample: (sampleId: string) => Promise<void>;
  /** Update document from XML string (reloads document) */
  updateDocument: (xml: string) => Promise<void>;
  /** Set document directly (not recommended - use loadDocument instead) */
  setDocument: (doc: TEIDocument | null) => void;
  /** Clear document and reset state */
  clearDocument: () => void;
  /** Add <said> tag to passage */
  addSaidTag: (passageId: PassageID, range: TextRange, speaker: CharacterID) => Promise<void>;
  /** Add <q> tag to passage */
  addQTag: (passageId: PassageID, range: TextRange) => Promise<void>;
  /** Add <persName> tag to passage */
  addPersNameTag: (passageId: PassageID, range: TextRange, ref: string) => Promise<void>;
  /** Generic add tag method */
  addTag: (
    passageId: PassageID,
    range: TextRange,
    tagName: string,
    attrs?: Record<string, string>
  ) => Promise<void>;
  /** Remove tag from document */
  removeTag: (tagId: string) => Promise<void>;
  /** Add character to document */
  addCharacter: (character: any) => Promise<void>;
  /** Update character in document */
  updateCharacter: (characterId: CharacterID, updates: any) => Promise<void>;
  /** Remove character from document */
  removeCharacter: (characterId: CharacterID) => Promise<void>;
  /** Add relationship to document */
  addRelationship: (relation: Omit<any, 'id'>) => Promise<void>;
  /** Remove relationship from document */
  removeRelationship: (relationId: string) => Promise<void>;
  /** Undo to previous revision */
  undo: () => Promise<void>;
  /** Redo to next revision */
  redo: () => Promise<void>;
  /** Get history state */
  getHistoryState: () => Promise<any>;
  /** Time travel to specific revision */
  timeTravel: (targetRevision: number) => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export interface DocumentProviderProps {
  children: ReactNode;
}

/**
 * DocumentProvider - Unified Document State Management
 *
 * Wraps the Effect-based useDocumentService in a React Context.
 * This is the ONLY DocumentProvider in the app - all components should use it.
 *
 * @example
 * ```tsx
 * <DocumentProvider>
 *   <App />
 * </DocumentProvider>
 * ```
 */
export function DocumentProvider({ children }: DocumentProviderProps) {
  const docService = useDocumentService();

  // Memoize context value to prevent infinite re-renders
  // Only depend on state values, assuming functions are stable
  const contextValue: DocumentContextType = useMemo(() => ({
    // State
    document: docService.document,
    loading: docService.loading,
    loadingSample: docService.loadingSample,
    loadingProgress: docService.loadingProgress,
    validationResults: docService.validationResults,
    isValidating: docService.isValidating,
    error: docService.error,

    // Document operations (assumed to be stable)
    loadDocument: docService.loadDocument,
    loadSample: docService.loadSample,
    updateDocument: docService.updateDocument,

    // State management
    setDocument: (doc: TEIDocument | null) => {
      // For Effect, we delegate to the service
      // This is a no-op since Effect manages state internally
      // Use loadDocument to change the document
      if (doc === null) {
        docService.clearDocument();
      } else {
        console.warn('[DocumentContext] setDocument with non-null is not supported. Use loadDocument instead.');
      }
    },
    clearDocument: docService.clearDocument,

    // Tag operations (assumed to be stable)
    addSaidTag: docService.addSaidTag,
    addQTag: docService.addQTag,
    addPersNameTag: docService.addPersNameTag,
    addTag: docService.addTag,
    removeTag: docService.removeTag,

    // Character and relationship operations (assumed to be stable)
    addCharacter: docService.addCharacter,
    updateCharacter: docService.updateCharacter,
    removeCharacter: docService.removeCharacter,
    addRelationship: docService.addRelationship,
    removeRelationship: docService.removeRelationship,

    // History operations (assumed to be stable)
    undo: docService.undo,
    redo: docService.redo,
    getHistoryState: docService.getHistoryState,
    timeTravel: docService.timeTravel,
  }), [
    docService.document,
    docService.loading,
    docService.loadingSample,
    docService.loadingProgress,
    docService.validationResults,
    docService.isValidating,
    docService.error,
  ]);

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
}

/**
 * useDocumentContext Hook
 *
 * Access the document context from any component.
 * Must be used within a DocumentProvider.
 *
 * @throws {Error} If used outside of DocumentProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { document, loadSample } = useDocumentContext();
 *   ...
 * }
 * ```
 */
export function useDocumentContext(): DocumentContextType {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}

/**
 * useDocument Hook - Alias for useDocumentContext
 *
 * Provided for convenience and backward compatibility.
 * This is now just an alias for useDocumentContext.
 */
export function useDocument() {
  return useDocumentContext();
}
