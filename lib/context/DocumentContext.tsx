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
  loadingSample: boolean;
  loadingProgress: number;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
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
      setLoadingSample(true);
      setLoadingProgress(0);

      // Simulate loading progress (0 -> 50 -> 100%)
      setLoadingProgress(10);
      await new Promise(resolve => setTimeout(resolve, 100));

      const content = await loadSampleContent(sampleId);
      setLoadingProgress(50);

      await new Promise(resolve => setTimeout(resolve, 100));
      setDocument(new TEIDocument(content));

      setLoadingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      setLoadingSample(false);
      setLoadingProgress(0);
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
      setLoadingSample(false);
      setLoadingProgress(0);
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
    <DocumentContext.Provider value={{ document, loadDocument, loadSample, updateDocument, clearDocument, loadingSample, loadingProgress }}>
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
