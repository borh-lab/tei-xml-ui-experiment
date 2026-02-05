'use client';

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export interface UseKeyboardShortcutsOptions {
  onCommandPalette?: () => void;
  onBulkPanel?: () => void;
  onShortcutHelp?: () => void;
  onNextPassage?: () => void;
  onPrevPassage?: () => void;
  onEntityPanel?: () => void;
}

/**
 * Manages global keyboard shortcuts for the editor.
 *
 * This hook sets up hotkeys for common editor actions.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    onCommandPalette,
    onBulkPanel,
    onShortcutHelp,
    onNextPassage,
    onPrevPassage,
    onEntityPanel,
  } = options;

  // Helper function to check if user is in an input field
  const isInputFocused = useCallback(() => {
    const activeElement = window.document?.activeElement;
    if (!activeElement) return false;
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement.getAttribute('contenteditable') === 'true'
    );
  }, []);

  // Command palette: ⌘K
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    onCommandPalette?.();
  });

  // Bulk panel: ⌘B
  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    onBulkPanel?.();
  });

  // Keyboard shortcut help: Shift+/
  useHotkeys(
    'shift+/',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      onShortcutHelp?.();
    },
    [isInputFocused]
  );

  // Entity panel: ⌘E
  useHotkeys('cmd+e', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    onEntityPanel?.();
  });

  // Navigate to next passage: J
  useHotkeys(
    'j',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      onNextPassage?.();
    },
    [isInputFocused]
  );

  // Navigate to previous passage: K
  useHotkeys(
    'k',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      onPrevPassage?.();
    },
    [isInputFocused]
  );

  return {
    isInputFocused,
  };
}
