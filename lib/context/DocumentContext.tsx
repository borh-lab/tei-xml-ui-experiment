'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TEIDocument } from '@/lib/tei/TEIDocument';

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => void;
  updateDocument: (xml: string) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);

  const loadDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  const updateDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  return (
    <DocumentContext.Provider value={{ document, loadDocument, updateDocument }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}
