/**
 * useSelection Hook
 *
 * Tracks text selection changes in the RenderedView component.
 * Returns a Selection value object or null when no selection exists.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Selection } from '@/lib/values/Selection';
import { createSelection, extractContext } from '@/lib/values/Selection';
import type { TextRange } from '@/lib/validation/types';

/**
 * Find the closest passage ID from a DOM node
 */
function findPassageId(node: Node): string | null {
  let current: Node | null = node;

  while (current) {
    if (current instanceof HTMLElement) {
      const passageId = current.getAttribute('data-passage-id');
      if (passageId) {
        return passageId;
      }
    }
    current = current.parentNode;
  }

  return null;
}

/**
 * Extract text range from a DOM Range
 */
function extractRange(range: Range): TextRange | null {
  try {
    // Get the text content of the common ancestor
    const container = range.commonAncestorContainer;
    let fullText = '';

    if (container.nodeType === Node.TEXT_NODE) {
      fullText = container.textContent || '';
    } else if (container instanceof HTMLElement) {
      fullText = container.textContent || '';
    }

    // Calculate offsets relative to the passage text
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;

    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const end = preCaretRange.toString().length;

    return {
      start,
      end,
    };
  } catch (error) {
    console.warn('Error extracting range:', error);
    return null;
  }
}

/**
 * Hook to track selection changes
 */
export function useSelection(): Selection | null {
  const [selection, setSelection] = useState<Selection | null>(null);

  const handleSelectionChange = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const text = domSelection.toString();

    // Don't capture empty selections
    if (!text || text.trim().length === 0) {
      setSelection(null);
      return;
    }

    // Find passage ID - check both start and end containers
    let passageId = findPassageId(range.startContainer);
    if (!passageId) {
      passageId = findPassageId(range.endContainer);
    }

    if (!passageId) {
      // No passage ID found, can't create selection
      setSelection(null);
      return;
    }

    // Extract range (simplified - use actual offsets)
    const textRange: TextRange = {
      start: range.startOffset,
      end: range.endOffset,
    };

    // Extract context (surrounding text)
    const context = extractContext(text, textRange);

    // Create Selection value
    const newSelection = createSelection(
      passageId,
      textRange,
      text,
      context
    );

    setSelection(newSelection);
  }, []);

  useEffect(() => {
    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return selection;
}
