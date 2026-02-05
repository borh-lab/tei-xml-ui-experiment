// @ts-nocheck
/**
 * DocumentContext - Minimal implementation for main branch tests
 *
 * This is a simplified version of DocumentContext to support tests in the main branch.
 * The full Effect-based implementation is in the .worktrees/foundation-immutable branch.
 */

import { createContext, useContext, ReactNode } from 'react';

export interface DocumentContextType {
  document: unknown;
  setDocument: (doc: unknown) => void;
  clearDocument: () => void;
  loadDocument?: (xml: string) => Promise<void>;
  loadSample?: (sampleId: string) => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
);

export interface DocumentProviderProps {
  children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  // Minimal mock implementation for tests
  const contextValue: DocumentContextType = {
    document: null,
    setDocument: () => {},
    clearDocument: () => {},
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
 * useDocument Hook
 *
 * Exports the Effect-based useDocumentService hook for compatibility.
 * This provides the full Effect-based functionality when the feature flag is enabled.
 *
 * For now, this is a simple re-export. The app/page.tsx component uses this.
 */
export function useDocument() {
  // Check if Effect version should be used via feature flag
  if (typeof window !== 'undefined' && localStorage.getItem('feature-useEffectDocument') === 'true') {
    // Use Effect version
    const { useDocument: useDocumentEffect } = require('@/lib/effect/react/hooks');
    return useDocumentEffect();
  }

  // Fall back to React version
  return useDocumentContext();
}
