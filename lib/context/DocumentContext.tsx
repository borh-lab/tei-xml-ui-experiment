'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, ReactNode } from 'react';
import {
  TEIDocument,
  loadDocument,
  addSaidTag,
  removeTag,
  undoTo,
  redoFrom,
  addCharacter,
  removeCharacter,
  addRelationship,
  removeRelationship,
  serializeDocument,
} from '@/lib/tei/operations';
import { getHistoryState } from '@/lib/history/HistoryManager';
import { loadSample as loadSampleContent } from '@/lib/samples/sampleLoader';
import { useErrorContext } from '@/lib/context/ErrorContext';
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';
import { ValidationResult } from '@/lib/validation/ValidationService';
import type { PassageID, CharacterID, TextRange } from '@/lib/tei/types';

// ============================================================================
// Action Types
// ============================================================================

type DocumentAction =
  | { type: 'LOAD'; xml: string }
  | { type: 'ADD_SAID_TAG'; passageId: PassageID; range: TextRange; speaker: CharacterID }
  | { type: 'REMOVE_TAG'; tagId: string }
  | { type: 'UNDO'; targetRevision: number }
  | { type: 'REDO'; fromRevision: number }
  | { type: 'SET_DOCUMENT'; document: TEIDocument }
  | { type: 'CLEAR' };

// ============================================================================
// Reducer
// ============================================================================

function documentReducer(doc: TEIDocument | null, action: DocumentAction): TEIDocument | null {
  switch (action.type) {
    case 'LOAD':
      return loadDocument(action.xml);

    case 'ADD_SAID_TAG':
      if (!doc) return null;
      return addSaidTag(doc, action.passageId, action.range, action.speaker);

    case 'REMOVE_TAG':
      if (!doc) return null;
      return removeTag(doc, action.tagId);

    case 'UNDO':
      if (!doc) return null;
      return undoTo(doc, action.targetRevision);

    case 'REDO':
      if (!doc) return null;
      return redoFrom(doc, action.fromRevision);

    case 'SET_DOCUMENT':
      return action.document;

    case 'CLEAR':
      return null;

    default:
      return doc;
  }
}

// ============================================================================
// Context Interface
// ============================================================================

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => void;
  loadSample: (sampleId: string) => Promise<void>;
  updateDocument: (xml: string) => void;
  clearDocument: () => void;
  clearDocumentAndSkipAutoLoad: () => void;

  // Tag operations
  addSaidTag: (passageId: PassageID, range: TextRange, speaker: CharacterID) => void;
  removeTag: (tagId: string) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Legacy state
  loadingSample: boolean;
  loadingProgress: number;
  skipAutoLoad: boolean;
  validationResults: ValidationResult | null;
  isValidating: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, dispatch] = useReducer(documentReducer, null);
  const [loadingSample, setLoadingSample] = React.useState(false);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [skipAutoLoad, setSkipAutoLoad] = React.useState(false);
  const [validationResults, setValidationResults] = React.useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);
  const autoLoadAttemptedRef = useRef(false);
  const { logError } = useErrorContext();

  // Calculate undo/redo state from document
  const historyState = getHistoryState(document);

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

  const loadDocumentHandler = useCallback((xml: string) => {
    try {
      dispatch({ type: 'LOAD', xml });
      setValidationResults(null);
    } catch (error) {
      console.error('Failed to load document:', error);
      logError(error as Error, 'DocumentContext', {
        action: 'loadDocument',
      });
      const errorInfo = categorizeError(error as Error, () => loadDocumentHandler(xml));
      toast.error(errorInfo.message, {
        description: errorInfo.description,
        action: errorInfo.action,
      });
    }
  }, [logError]);

  const loadSample = useCallback(async (sampleId: string) => {
    try {
      setLoadingSample(true);
      setLoadingProgress(0);

      // Simulate loading progress (0 -> 50 -> 100%)
      setLoadingProgress(10);
      await new Promise(resolve => setTimeout(resolve, 100));

      const content = await loadSampleContent(sampleId);
      setLoadingProgress(50);

      await new Promise(resolve => setTimeout(resolve, 100));
      dispatch({ type: 'LOAD', xml: content });

      setLoadingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      setLoadingSample(false);
      setLoadingProgress(0);
      setValidationResults(null);
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
  }, [logError]);

  const updateDocument = useCallback(async (xml: string) => {
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
      dispatch({ type: 'LOAD', xml });
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
  }, [logError]);

  const clearDocument = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    setValidationResults(null);
  }, []);

  const clearDocumentAndSkipAutoLoad = useCallback(() => {
    setSkipAutoLoad(true);
    dispatch({ type: 'CLEAR' });
    setValidationResults(null);
  }, []);

  const addSaidTagHandler = useCallback((passageId: PassageID, range: TextRange, speaker: CharacterID) => {
    dispatch({ type: 'ADD_SAID_TAG', passageId, range, speaker });
  }, []);

  const removeTagHandler = useCallback((tagId: string) => {
    dispatch({ type: 'REMOVE_TAG', tagId });
  }, []);

  const undo = useCallback(() => {
    if (!document || !historyState.canUndo) return;
    dispatch({ type: 'UNDO', targetRevision: Math.max(0, historyState.currentRevision - 1) });
  }, [document, historyState.canUndo, historyState.currentRevision]);

  const redo = useCallback(() => {
    if (!document || !historyState.canRedo) return;
    dispatch({ type: 'REDO', fromRevision: historyState.currentRevision });
  }, [document, historyState.canRedo, historyState.currentRevision]);

  return (
    <DocumentContext.Provider value={{
      document,
      loadDocument: loadDocumentHandler,
      loadSample,
      updateDocument,
      clearDocument,
      clearDocumentAndSkipAutoLoad,
      addSaidTag: addSaidTagHandler,
      removeTag: removeTagHandler,
      undo,
      redo,
      canUndo: historyState.canUndo,
      canRedo: historyState.canRedo,
      loadingSample,
      loadingProgress,
      skipAutoLoad,
      validationResults,
      isValidating,
    }}>
      {children}
    </DocumentContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}
