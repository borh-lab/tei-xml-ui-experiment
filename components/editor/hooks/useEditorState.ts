'use client';

import { useState, useCallback, useRef } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { SelectionManager } from '@/lib/selection/SelectionManager';
import type { TagInfo } from '@/lib/selection/types';
import type { TEINode } from '@/lib/tei/types';

export interface UseEditorStateResult {
  // Document state (from useDocumentService)
  document: any;
  updateDocument: (xml: string) => Promise<void>;
  loadingSample: boolean;
  loadingProgress: number;
  validationResults: any;
  isValidating: boolean;
  addSaidTag: (passageId: string, range: { start: number; end: number }, speakerId: string) => Promise<void>;
  addTag: (passageId: string, range: { start: number; end: number }, tagName: string, attrs?: Record<string, string>) => Promise<void>;
  // Passage navigation
  activePassageIndex: number;
  setActivePassageIndex: (index: number) => void;
  currentPassageId: string;
  setCurrentPassageId: (id: string) => void;
  highlightedPassageId: string | null;
  setHighlightedPassageId: (id: string | null) => void;
  // Tag operations
  handleApplyTag: (tag: string, attrs?: Record<string, string>) => Promise<void>;
  // Selection manager
  selectionManager: SelectionManager;
  // Helper functions
  getPassageIds: () => string[];
  handleTagAttributeUpdate: (tagName: string, attributes: Record<string, string>) => Promise<void>;
}

export interface UseEditorStateOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  tagToEdit: TagInfo | null;
}

/**
 * Manages core editor state including document operations and passage navigation.
 *
 * This hook wraps useDocumentService and adds editor-specific operations.
 */
export function useEditorState(options: UseEditorStateOptions): UseEditorStateResult {
  const { showToast, tagToEdit } = options;

  // Get document state from Effect service
  const {
    document,
    updateDocument,
    loadingSample,
    loadingProgress,
    validationResults,
    isValidating,
    addSaidTag,
    addTag,
  } = useDocumentService();

  // Passage navigation state
  const [activePassageIndex, setActivePassageIndex] = useState<number>(-1);
  const [currentPassageId, setCurrentPassageId] = useState<string>('');
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);

  // Maintain a single SelectionManager instance
  const selectionManager = useRef(new SelectionManager());

  // Helper function to get all passage IDs from the document
  const getPassageIds = useCallback(() => {
    if (!document) return [];
    const p = (document as any).parsed.TEI.text.body.p;
    const paragraphs = Array.isArray(p) ? p : p ? [p] : [];
    return paragraphs.map((_, idx) => 'passage-' + idx);
  }, [document]);

  // Generic handler for applying tags to selected text
  const handleApplyTag = useCallback(
    async (tag: string, attrs?: Record<string, string>) => {
      if (!document) return;

      const selectionManagerInstance = selectionManager.current;
      const selectionRange = selectionManagerInstance.captureSelection();

      if (!selectionRange) {
        showToast('No text selected - Select text first, then click tag button', 'error');
        return;
      }

      // Extract passage ID (using the passageId directly from selection)
      const passageId = selectionRange.passageId;
      const range: { start: number; end: number } = {
        start: (selectionRange as any).startOffset,
        end: (selectionRange as any).endOffset,
      };

      try {
        // Use value-oriented service methods based on tag type
        if (tag === 'said') {
          const speakerId = attrs?.who?.substring(1) || attrs?.speaker || 'unknown';
          await addSaidTag(passageId, range, speakerId);
        } else if (tag === 'q') {
          await addTag(passageId, range, 'q', attrs);
        } else if (tag === 'persName') {
          await addTag(passageId, range, 'persName', attrs);
        } else {
          // Generic tag fallback
          await addTag(passageId, range, tag, attrs);
        }

        // Success message
        const tagDisplay = attrs
          ? '<' + tag + ' ' + Object.entries(attrs)
              .map(([k, v]) => k + '="' + v + '"')
              .join(' ') + '>'
          : '<' + tag + '>';
        showToast('Applied ' + tagDisplay, 'success');

        // Wait for React to re-render the updated document before restoring selection
        setTimeout(() => {
          (selectionManagerInstance.restoreSelection as any)({
            start: (selectionRange as any).startOffset,
            end: (selectionRange as any).endOffset,
            passageId: selectionRange.passageId,
          });
        }, 100);
      } catch (error) {
        console.error('Failed to apply tag:', error);
        showToast('Failed to apply tag - See console for details', 'error');
      }
    },
    [document, addSaidTag, addTag, showToast]
  );

  // Handle tag attribute updates from edit dialog
  const handleTagAttributeUpdate = useCallback(
    async (tagName: string, attributes: Record<string, string>) => {
      if (!document || !tagToEdit) return;

      try {
        // Find the element and update its attributes
        const element = (tagToEdit as any).element;
        if (!element) {
          showToast('Element not found', 'error');
          return;
        }

        // Update data attributes on the element
        Object.entries(attributes).forEach(([key, value]) => {
          element.setAttribute('data-' + key, value);
        });

        // Update the document structure
        const { serializeDocument } = await import('@/lib/tei/operations');
        const updatedXML = serializeDocument(document);
        await updateDocument(updatedXML);

        showToast('Updated <' + tagName + '> attributes', 'success');
      } catch (error) {
        console.error('Failed to update tag attributes:', error);
        showToast('Failed to update tag attributes', 'error');
      }
    },
    [document, tagToEdit, updateDocument, showToast]
  );

  return {
    // Document state
    document,
    updateDocument,
    loadingSample,
    loadingProgress,
    validationResults,
    isValidating,
    addSaidTag,
    addTag,
    // Passage navigation
    activePassageIndex,
    setActivePassageIndex,
    currentPassageId,
    setCurrentPassageId,
    highlightedPassageId,
    setHighlightedPassageId,
    // Tag operations
    handleApplyTag,
    // Selection manager
    selectionManager: selectionManager.current,
    // Helper functions
    getPassageIds,
    handleTagAttributeUpdate,
  };
}
