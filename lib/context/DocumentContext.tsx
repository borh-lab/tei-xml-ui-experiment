'use client';

/**
 * DocumentContext - Unified Document State Management (V2)
 *
 * Provides a single React Context for document operations using V2 state protocol.
 * V2 uses immutable state values and pure protocol functions.
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
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';

/**
 * DocumentContext Type (V2)
 *
 * Complete interface for document operations using V2 state protocol.
 * V2 provides state and operations as a clean separation.
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
  /** Last successfully saved revision (null if never saved) */
  lastSavedRevision: number | null;
  /** Timestamp of last save (null if never saved) */
  lastSavedAt: Date | null;
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
  /** Validate document */
  validate: (schemaPath?: string) => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export interface DocumentProviderProps {
  children: ReactNode;
  /** Optional initial state for testing (enables state injection) */
  initialState?: DocumentState;
}

/**
 * DocumentProvider - Unified Document State Management (V2)
 *
 * Wraps the V2 useDocumentV2 hook in a React Context.
 * V2 uses immutable state values and pure protocol functions.
 * This is the ONLY DocumentProvider in the app - all components should use it.
 *
 * @example
 * ```tsx
 * <DocumentProvider>
 *   <App />
 * </DocumentProvider>
 * ```
 *
 * @example
 * With state injection for testing:
 * ```tsx
 * const customState = { ...initialState(), status: 'loading' };
 * <DocumentProvider initialState={customState}>
 *   <App />
 * </DocumentProvider>
 * ```
 */
export function DocumentProvider({ children, initialState: injectedState }: DocumentProviderProps) {
  const { state, operations } = useDocumentV2(injectedState);

  // Memoize context value to prevent unnecessary re-renders
  // Map V2 state structure to V1-compatible interface
  const contextValue: DocumentContextType = useMemo(() => {
    // Map V2 status to V1 loading states
    const loading = state.status === 'loading';
    const loadingSample = state.status === 'loading'; // V2 doesn't track separately

    return {
      // State (mapped from V2)
      document: state.document,
      loading,
      loadingSample,
      loadingProgress: 0, // V2 doesn't track progress
      validationResults: (state.validation?.results || null) as ValidationResult | null, // Cast to V1 type
      isValidating: state.status === 'loading', // Approximation
      lastSavedRevision: state.document?.state.revision || null,
      lastSavedAt: null, // V2 doesn't track save time
      error: state.error,

      // Document operations
      loadDocument: async (xml: string) => {
        await operations.loadDocument(xml);
        return state.document!; // Return the loaded document
      },
      loadSample: async (sampleId: string) => {
        // V2 doesn't have loadSample, would need to implement
        throw new Error('loadSample not implemented in V2 yet');
      },
      updateDocument: async (xml: string) => {
        await operations.loadDocument(xml); // V2 uses loadDocument for updates
      },

      // State management
      setDocument: (doc: TEIDocument | null) => {
        // V2 manages state internally, use loadDocument instead
        if (doc === null) {
          console.warn('[DocumentContext] Clearing document through setDocument is not supported in V2. Use clearDocument operation.');
        } else {
          console.warn('[DocumentContext] setDocument with non-null is not supported in V2. Use loadDocument instead.');
        }
      },
      clearDocument: () => {
        console.warn('[DocumentContext] clearDocument not implemented in V2 yet');
      },

      // Tag operations
      addSaidTag: operations.addSaidTag,
      addQTag: operations.addQTag,
      addPersNameTag: operations.addPersNameTag,
      addTag: async (passageId: PassageID, range: TextRange, tagName: string, attrs?: Record<string, string>) => {
        // Route to appropriate operation
        switch (tagName) {
          case 'said':
            if (!attrs?.who) {
              throw new Error('said tag requires "who" attribute');
            }
            return await operations.addSaidTag(passageId, range, attrs.who as CharacterID);

          case 'q':
            return await operations.addQTag(passageId, range);

          case 'persName':
            if (!attrs?.ref) {
              throw new Error('persName tag requires "ref" attribute');
            }
            return await operations.addPersNameTag(passageId, range, attrs.ref);

          default:
            throw new Error(`Unsupported tag name: ${tagName}`);
        }
      },
      removeTag: operations.removeTag,

      // Character and relationship operations
      addCharacter: operations.addCharacter,
      updateCharacter: operations.updateCharacter,
      removeCharacter: operations.removeCharacter,
      addRelationship: operations.addRelationship,
      removeRelationship: operations.removeRelationship,

      // History operations (V2 doesn't have these yet)
      undo: () => {
        throw new Error('undo not implemented in V2 yet');
      },
      redo: () => {
        throw new Error('redo not implemented in V2 yet');
      },
      getHistoryState: () => {
        throw new Error('getHistoryState not implemented in V2 yet');
      },
      timeTravel: (targetRevision: number) => {
        throw new Error('timeTravel not implemented in V2 yet');
      },

      // Validation (V2 feature)
      validate: operations.validate,
    };
  }, [state, operations]);

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

/**
 * DocumentProviderV2 - Alias for DocumentProvider
 *
 * V2 is now the default implementation.
 * This export is provided for clarity in migration.
 */
export const DocumentProviderV2 = DocumentProvider;
