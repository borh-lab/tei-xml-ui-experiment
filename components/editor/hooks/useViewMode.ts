'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

export type ViewMode = 'wysiwyg' | 'xml' | 'split';

export interface UseViewModeResult {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  codeContent: string;
  setCodeContent: (content: string) => void;
  isCodeDirty: boolean;
}

export interface UseViewModeOptions {
  document: any;
  updateDocument: (xml: string) => Promise<void>;
  onCodeChange?: (code: string) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Manages view mode switching and code editor state.
 *
 * This hook handles:
 * - View mode (WYSIWYG/XML/Split)
 * - Code content synchronization
 * - Scroll sync enablement
 */
export function useViewMode(options: UseViewModeOptions): UseViewModeResult {
  const { document, updateDocument, onCodeChange, showToast } = options;

  const [viewMode, setViewMode] = useState<ViewMode>('wysiwyg');
  const [codeContent, setCodeContent] = useState<string>('');
  const [isCodeDirty, setIsCodeDirty] = useState(false);

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('tei-editor-view-mode') as ViewMode | null;
    if (savedMode && ['wysiwyg', 'xml', 'split'].includes(savedMode)) {
      setViewMode(savedMode);
    }
  }, []);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('tei-editor-view-mode', viewMode);
  }, [viewMode]);

  // Sync code content with document
  useEffect(() => {
    if (document && !isCodeDirty) {
      // Import serializeDocument dynamically to avoid circular dependency
      import('@/lib/tei/operations').then(({ serializeDocument }) => {
        setCodeContent(serializeDocument(document));
      });
    }
  }, [document, isCodeDirty]);

  // Debounce code changes for validation
  const debouncedCodeContent = useDebounce(codeContent, 300);

  // Handle code editor changes with debounced validation
  useEffect(() => {
    if (!debouncedCodeContent || debouncedCodeContent === codeContent) return;

    // Validate and update document from code changes
    const updateFromCode = async () => {
      try {
        await updateDocument(debouncedCodeContent);
        setIsCodeDirty(false);
      } catch (error) {
        console.error('Failed to update document from code:', error);
        // Document remains in previous state on validation error
        if (showToast) {
          showToast('Validation failed - Please fix XML errors', 'error');
        }
      }
    };

    updateFromCode();
  }, [debouncedCodeContent, updateDocument, showToast, codeContent]);

  // Handle code editor content changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCodeContent(newCode);
    setIsCodeDirty(true);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  return {
    viewMode,
    setViewMode,
    codeContent,
    setCodeContent: handleCodeChange,
    isCodeDirty,
  };
}
