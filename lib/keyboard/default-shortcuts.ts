// @ts-nocheck
/**
 * Default Keyboard Shortcuts
 *
 * Creates the default shortcut registry for the TEI Dialogue Editor.
 */

import { createShortcutRegistry, type Shortcut } from './shortcut-manager';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if text is currently selected in the document
 */
function isTextSelected(): boolean {
  const selection = window.getSelection();
  return selection ? selection.toString().trim().length > 0 : false;
}

/**
 * Check if there's an active document
 */
function hasDocument(): boolean {
  // This will be called through DocumentContext
  // The actual check will be done via the condition callback
  return true;
}

// ============================================================================
// Default Shortcuts Factory
// ============================================================================

/**
 * Create default shortcuts for the TEI Dialogue Editor
 *
 * @param callbacks - Action callbacks for each shortcut
 * @returns Shortcut registry with default shortcuts
 */
export function createDefaultShortcuts(callbacks: {
  // Document operations
  onSave?: () => void;
  onToggleEntities?: () => void;
  onCommandPalette?: () => void;
  onClose?: () => void;

  // Tag operations (1-9 for speakers)
  onTagSpeaker1?: () => void;
  onTagSpeaker2?: () => void;
  onTagSpeaker3?: () => void;
  onTagSpeaker4?: () => void;
  onTagSpeaker5?: () => void;
  onTagSpeaker6?: () => void;
  onTagSpeaker7?: () => void;
  onTagSpeaker8?: () => void;
  onTagSpeaker9?: () => void;

  // Generic tag operations
  onTagQ?: () => void;
  onTagPersName?: () => void;
  onTagPlaceName?: () => void;
  onTagOrgName?: () => void;

  // Undo/Redo
  onUndo?: () => void;
  onRedo?: () => void;
}): ReturnType<typeof createShortcutRegistry> {
  const shortcuts: Shortcut[] = [];

  // Document operations
  if (callbacks.onSave) {
    shortcuts.push({
      key: 'cmd+s',
      description: 'Save document',
      action: callbacks.onSave,
    });
  }

  if (callbacks.onToggleEntities) {
    shortcuts.push({
      key: 'cmd+e',
      description: 'Toggle entity editor',
      action: callbacks.onToggleEntities,
    });
  }

  if (callbacks.onCommandPalette) {
    shortcuts.push({
      key: 'cmd+k',
      description: 'Command palette',
      action: callbacks.onCommandPalette,
    });
  }

  if (callbacks.onClose) {
    shortcuts.push({
      key: 'Escape',
      description: 'Close dialog/palette',
      action: callbacks.onClose,
    });
  }

  // Tag shortcuts (1-9 for speakers)
  // These only work when text is selected
  const speakerCallbacks = [
    callbacks.onTagSpeaker1,
    callbacks.onTagSpeaker2,
    callbacks.onTagSpeaker3,
    callbacks.onTagSpeaker4,
    callbacks.onTagSpeaker5,
    callbacks.onTagSpeaker6,
    callbacks.onTagSpeaker7,
    callbacks.onTagSpeaker8,
    callbacks.onTagSpeaker9,
  ];

  speakerCallbacks.forEach((callback, index) => {
    if (callback) {
      shortcuts.push({
        key: `${index + 1}`,
        description: `Tag as speaker${index + 1}`,
        action: callback,
        condition: isTextSelected,
      });
    }
  });

  // Generic tag shortcuts (also require text selection)
  if (callbacks.onTagQ) {
    shortcuts.push({
      key: 'ctrl+q',
      description: 'Tag as q (quotation)',
      action: callbacks.onTagQ,
      condition: isTextSelected,
    });
  }

  if (callbacks.onTagPersName) {
    shortcuts.push({
      key: 'ctrl+p',
      description: 'Tag as persName (person name)',
      action: callbacks.onTagPersName,
      condition: isTextSelected,
    });
  }

  if (callbacks.onTagPlaceName) {
    shortcuts.push({
      key: 'ctrl+shift+p',
      description: 'Tag as placeName (place name)',
      action: callbacks.onTagPlaceName,
      condition: isTextSelected,
    });
  }

  if (callbacks.onTagOrgName) {
    shortcuts.push({
      key: 'ctrl+o',
      description: 'Tag as orgName (organization name)',
      action: callbacks.onTagOrgName,
      condition: isTextSelected,
    });
  }

  // Undo/Redo
  if (callbacks.onUndo) {
    shortcuts.push({
      key: 'cmd+z',
      description: 'Undo',
      action: callbacks.onUndo,
    });
  }

  if (callbacks.onRedo) {
    shortcuts.push({
      key: 'cmd+shift+z',
      description: 'Redo',
      action: callbacks.onRedo,
    });
  }

  return createShortcutRegistry(shortcuts);
}

// ============================================================================
// Shortcut Documentation
// ============================================================================

/**
 * Get a list of all default shortcuts for documentation
 *
 * Returns an array of shortcut descriptions that can be displayed
 * in a help dialog or keyboard shortcut reference.
 */
export function getShortcutDocumentation(): Array<{
  key: string;
  description: string;
  category: string;
}> {
  return [
    // Document operations
    { key: '⌘S / Ctrl+S', description: 'Save document', category: 'Document' },
    { key: '⌘E / Ctrl+E', description: 'Toggle entity editor', category: 'Document' },
    { key: '⌘K / Ctrl+K', description: 'Command palette', category: 'Document' },
    { key: 'Escape', description: 'Close dialog/palette', category: 'Document' },

    // Tag operations
    { key: '1-9', description: 'Tag as speaker 1-9 (when text selected)', category: 'Tagging' },
    { key: 'Ctrl+Q', description: 'Tag as q (quotation)', category: 'Tagging' },
    { key: 'Ctrl+P', description: 'Tag as persName (person name)', category: 'Tagging' },
    { key: 'Ctrl+Shift+P', description: 'Tag as placeName (place name)', category: 'Tagging' },
    { key: 'Ctrl+O', description: 'Tag as orgName (organization)', category: 'Tagging' },

    // Undo/Redo
    { key: '⌘Z / Ctrl+Z', description: 'Undo', category: 'Edit' },
    { key: '⌘Shift+Z / Ctrl+Shift+Z', description: 'Redo', category: 'Edit' },
  ];
}
