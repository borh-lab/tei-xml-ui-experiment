'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TEIDocument } from '@/lib/tei/TEIDocument';
import { loadSample as loadSampleContent } from '@/lib/samples/sampleLoader';

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => void;
  loadSample: (sampleId: string) => Promise<void>;
  updateDocument: (xml: string) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);

  const loadDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  const loadSample = async (sampleId: string) => {
    try {
      const content = await loadSampleContent(sampleId);
      setDocument(new TEIDocument(content));
    } catch (error) {
      console.error('Failed to load sample:', error);
      throw error;
    }
  };

  const updateDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  return (
    <DocumentContext.Provider value={{ document, loadDocument, loadSample, updateDocument }}>
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
