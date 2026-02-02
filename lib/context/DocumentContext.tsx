'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { TEIDocument } from '@/lib/tei/TEIDocument';
import { loadSample as loadSampleContent } from '@/lib/samples/sampleLoader';
import { useErrorContext } from '@/lib/context/ErrorContext';
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';
import { ValidationResult } from '@/lib/validation/ValidationService';

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => void;
  loadSample: (sampleId: string) => Promise<void>;
  updateDocument: (xml: string) => void;
  clearDocument: () => void;
  clearDocumentAndSkipAutoLoad: () => void;
  loadingSample: boolean;
  loadingProgress: number;
  skipAutoLoad: boolean;
  validationResults: ValidationResult | null;
  isValidating: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [skipAutoLoad, setSkipAutoLoad] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const autoLoadAttemptedRef = useRef(false);
  const { logError } = useErrorContext();

  // Auto-load gift-of-the-magi sample on first visit if document is null
  useEffect(() => {
    if (!document && !skipAutoLoad && !autoLoadAttemptedRef.current) {
      autoLoadAttemptedRef.current = true;
      const hasVisitedBefore = localStorage.getItem('tei-editor-visited');
      if (!hasVisitedBefore) {
        // First visit - auto-load the sample using the existing loadSample function
        loadSample('gift-of-the-magi').catch(err => {
          console.error('Failed to auto-load sample:', err);
        });
        localStorage.setItem('tei-editor-visited', 'true');
      }
    }
  }, [document, skipAutoLoad]);

  const loadDocument = (xml: string) => {
    try {
      const newDoc = new TEIDocument(xml);
      setDocument(newDoc);
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
      // Don't set document if loading failed - keep current state or clear it
      // Don't re-throw to allow app to continue
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

  const updateDocument = async (xml: string) => {
    // Validate the document first via API
    setIsValidating(true);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xml }),
      });

      if (!response.ok) {
        throw new Error(`Validation API error: ${response.statusText}`);
      }

      const validationResult: ValidationResult = await response.json();

      // Store validation results
      setValidationResults(validationResult);

      // If document is invalid, block the update and show error
      if (!validationResult.valid) {
        const errorCount = validationResult.errors.length;
        const firstError = validationResult.errors[0];

        toast.error(
          'Validation Failed',
          {
            description: `Document has ${errorCount} validation error${errorCount > 1 ? 's' : ''}. ${firstError?.message || 'Please fix the errors before saving.'}`,
          }
        );

        logError(
          new Error(`Validation failed with ${errorCount} errors`),
          'DocumentContext.updateDocument',
          {
            action: 'updateDocument',
            errorCount,
            firstError: firstError?.message,
          }
        );

        // Don't update the document if validation failed
        setIsValidating(false);
        return;
      }

      // Document is valid, proceed with update
      setDocument(new TEIDocument(xml));
    } catch (error) {
      console.error('Validation error:', error);
      logError(error as Error, 'DocumentContext', {
        action: 'updateDocument',
      });

      // Set empty validation results on error
      setValidationResults({
        valid: false,
        errors: [
          {
            message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
          },
        ],
        warnings: [],
      });

      toast.error(
        'Validation Error',
        {
          description: 'An error occurred while validating the document. See console for details.',
        }
      );
    } finally {
      setIsValidating(false);
    }
  };

  const clearDocument = () => {
    setDocument(null);
  };

  const clearDocumentAndSkipAutoLoad = () => {
    setSkipAutoLoad(true);
    setDocument(null);
  };

  return (
    <DocumentContext.Provider value={{ document, loadDocument, loadSample, updateDocument, clearDocument, clearDocumentAndSkipAutoLoad, loadingSample, loadingProgress, skipAutoLoad, validationResults, isValidating }}>
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
