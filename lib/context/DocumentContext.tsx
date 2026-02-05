// @ts-nocheck
/**
 * DocumentContext - Test helper using Effect services
 *
 * This file provides a DocumentProvider for tests that wraps the Effect-based
 * document services in a React Context interface for compatibility with existing tests.
 */

import { createContext, useContext, ReactNode } from 'react';
import type { TEIDocument } from '@/lib/tei/types';
import { useDocumentService } from '@/lib/effect/react/hooks';

export interface DocumentContextType {
  document: TEIDocument | null;
  setDocument: (doc: TEIDocument | null) => void;
  clearDocument: () => void;
  loadDocument: (xml: string) => Promise<TEIDocument | null>;
  loadSample: (sampleId: string) => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export interface DocumentProviderProps {
  children: ReactNode;
}

/**
 * DocumentProvider - Test helper using Effect services
 *
 * Wraps the Effect-based useDocumentService in a React Context for test compatibility.
 */
export function DocumentProvider({ children }: DocumentProviderProps) {
  const docService = useDocumentService();

  // Create a simple adapter to match the DocumentContextType interface
  const contextValue: DocumentContextType = {
    document: docService.document,
    setDocument: (doc: TEIDocument | null) => {
      // Effect uses immutable state, so this is a no-op for tests
      // Tests should use loadDocument instead
    },
    clearDocument: () => {
      // Effect manages state internally
    },
    loadDocument: docService.loadDocument,
    loadSample: docService.loadSample,
  };

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext(): DocumentContextType {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}

/**
 * useDocument Hook - Re-exports Effect useDocumentService
 *
 * This is now just a simple re-export of the Effect-based hook.
 * The feature flag logic has been removed since we're fully committed to Effect.
 */
export function useDocument() {
  const { useDocument: useDocumentEffect } = require('@/lib/effect/react/hooks');
  return useDocumentEffect();
}
