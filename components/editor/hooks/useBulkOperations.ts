'use client';

import { useState, useCallback } from 'react';

export interface UseBulkOperationsResult {
  isBulkMode: boolean;
  setIsBulkMode: (mode: boolean) => void;
  selectedPassages: string[];
  setSelectedPassages: (passages: string[]) => void;
  clearSelection: () => void;
  togglePassage: (passageId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export interface UseBulkOperationsOptions {
  totalPassages?: number;
}

/**
 * Manages bulk operations state for multi-passage selection.
 *
 * This hook handles:
 * - Bulk mode toggle
 * - Passage selection state
 * - Selection operations (select all, clear, toggle)
 */
export function useBulkOperations(
  options: UseBulkOperationsOptions = {}
): UseBulkOperationsResult {
  const { totalPassages = 0 } = options;

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState<string[]>([]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPassages([]);
  }, []);

  // Toggle passage selection
  const togglePassage = useCallback((passageId: string) => {
    setSelectedPassages((prev) => {
      if (prev.includes(passageId)) {
        return prev.filter((id) => id !== passageId);
      } else {
        return [...prev, passageId];
      }
    });
  }, []);

  // Select all passages
  const selectAll = useCallback(() => {
    if (totalPassages > 0) {
      setSelectedPassages(Array.from({ length: totalPassages }, (_, i) => `passage-${i}`));
    }
  }, [totalPassages]);

  // Deselect all passages
  const deselectAll = useCallback(() => {
    setSelectedPassages([]);
  }, []);

  return {
    isBulkMode,
    setIsBulkMode,
    selectedPassages,
    setSelectedPassages,
    clearSelection,
    togglePassage,
    selectAll,
    deselectAll,
  };
}
