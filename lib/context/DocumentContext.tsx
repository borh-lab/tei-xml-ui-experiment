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
