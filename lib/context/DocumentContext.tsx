'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TEIDocument } from '@/lib/tei/TEIDocument';
import { loadSample as loadSampleContent } from '@/lib/samples/sampleLoader';
import { useErrorContext } from '@/lib/context/ErrorContext';
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => void;
  loadSample: (sampleId: string) => Promise<void>;
  updateDocument: (xml: string) => void;
  clearDocument: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);
  const { logError } = useErrorContext();

  const loadDocument = (xml: string) => {
    try {
      setDocument(new TEIDocument(xml));
    } catch (error) {
      console.error('Failed to load document:', error);
      logError(error as Error, 'DocumentContext', {
        action: 'loadDocument',
      });
      const errorInfo = categorizeError(error as Error, () => loadDocument(xml));
      toast.error(errorInfo.message, {
        description: errorInfo.description,
        action: errorInfo.action,
      });
      throw error;
    }
  };

  const loadSample = async (sampleId: string) => {
    try {
      const content = await loadSampleContent(sampleId);
      setDocument(new TEIDocument(content));
    } catch (error) {
      console.error('Failed to load sample:', error);
      logError(error as Error, 'DocumentContext', {
        action: 'loadSample',
        sampleId,
      });
      const errorInfo = categorizeError(error as Error, () => loadSample(sampleId));
      toast.error('Failed to load sample', {
        description: errorInfo.description,
        action: errorInfo.action,
      });
      throw error;
    }
  };

  const updateDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  const clearDocument = () => {
    setDocument(null);
  };

  return (
    <DocumentContext.Provider value={{ document, loadDocument, loadSample, updateDocument, clearDocument }}>
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
