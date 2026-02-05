'use client';

import { useState, useCallback } from 'react';
import type { TagInfo } from '@/lib/selection/types';

export interface UseTagSelectionResult {
  selectedText: string;
  setSelectedText: (text: string) => void;
  selectedTag: TagInfo | null;
  setSelectedTag: (tag: TagInfo | null) => void;
  tagToEdit: TagInfo | null;
  setTagToEdit: (tag: TagInfo | null) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  handleTagSelect: (tagInfo: TagInfo) => void;
  handleTagDoubleClick: (tagInfo: TagInfo) => void;
}

/**
 * Manages tag selection state and operations.
 *
 * This hook handles:
 * - Currently selected text
 * - Selected tag for viewing
 * - Tag editing dialog state
 * - Tag selection handlers
 */
export function useTagSelection(
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
): UseTagSelectionResult {
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [tagToEdit, setTagToEdit] = useState<TagInfo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Handle tag selection
  const handleTagSelect = useCallback(
    (tagInfo: TagInfo) => {
      setSelectedTag(tagInfo);
      showToast('Selected tag: <' + ((tagInfo as any).tagName) + '>', 'info');

      // Add visual selection indicator to element
      if ((tagInfo as any).element) {
        (tagInfo as any).element.setAttribute('data-selected', 'true');
      }
    },
    [showToast]
  );

  // Handle tag double-click to open edit dialog
  const handleTagDoubleClick = useCallback(
    (tagInfo: TagInfo) => {
      setTagToEdit(tagInfo);
      setEditDialogOpen(true);
      showToast('Editing tag: <' + ((tagInfo as any).tagName) + '>', 'info');
    },
    [showToast]
  );

  return {
    selectedText,
    setSelectedText,
    selectedTag,
    setSelectedTag,
    tagToEdit,
    setTagToEdit,
    editDialogOpen,
    setEditDialogOpen,
    handleTagSelect,
    handleTagDoubleClick,
  };
}
