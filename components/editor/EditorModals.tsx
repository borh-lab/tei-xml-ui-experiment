'use client';

import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { KeyboardShortcutHelp } from '@/components/keyboard/KeyboardShortcutHelp';
import { EntityEditorPanel } from './EntityEditorPanel';
import { TagEditDialog } from './TagEditDialog';
import { BulkOperationsPanel } from './BulkOperationsPanel';
import type { TagInfo } from '@/lib/selection/types';

export interface EditorModalsProps {
  // Command Palette
  commandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  // Bulk Operations
  bulkPanelOpen: boolean;
  onCloseBulkPanel: () => void;
  selectedPassages: string[];
  onTagAll: (speakerId: string) => Promise<void>;
  onSelectAllUntagged: () => void;
  onSelectLowConfidence: () => void;
  onExportSelection: () => void;
  onValidate: () => Promise<any[]>;
  onConvert: () => void;
  // Keyboard Help
  shortcutHelpOpen: boolean;
  onCloseShortcutHelp: () => void;
  // Entity Panel
  entityPanelOpen: boolean;
  onCloseEntityPanel: () => void;
  // Tag Edit Dialog
  editDialogOpen: boolean;
  onCloseEditDialog: () => void;
  tagToEdit: TagInfo | null;
  onTagAttributeUpdate: (tagName: string, attributes: Record<string, string>) => Promise<void>;
}

/**
 * Container for all editor modals and dialogs.
 *
 * Groups command palette, panels, and dialogs for cleaner component structure.
 */
export function EditorModals({
  commandPaletteOpen,
  onCloseCommandPalette,
  bulkPanelOpen,
  onCloseBulkPanel,
  selectedPassages,
  onTagAll,
  onSelectAllUntagged,
  onSelectLowConfidence,
  onExportSelection,
  onValidate,
  onConvert,
  shortcutHelpOpen,
  onCloseShortcutHelp,
  entityPanelOpen,
  onCloseEntityPanel,
  editDialogOpen,
  onCloseEditDialog,
  tagToEdit,
  onTagAttributeUpdate,
}: EditorModalsProps) {
  return (
    <>
      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={onCloseCommandPalette} />

      {/* Bulk Operations Panel */}
      <BulkOperationsPanel
        isOpen={bulkPanelOpen}
        onClose={onCloseBulkPanel}
        selectedPassages={selectedPassages}
        onTagAll={onTagAll}
        onSelectAllUntagged={onSelectAllUntagged}
        onSelectLowConfidence={onSelectLowConfidence}
        onExportSelection={onExportSelection}
        onValidate={onValidate}
        onConvert={onConvert}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutHelp open={shortcutHelpOpen} onClose={onCloseShortcutHelp} />

      {/* Entity Editor Panel */}
      <EntityEditorPanel open={entityPanelOpen} onClose={onCloseEntityPanel} />

      {/* Tag Edit Dialog */}
      {tagToEdit && (
        <TagEditDialog
          isOpen={editDialogOpen}
          onClose={onCloseEditDialog}
          tagInfo={{
            tagName: tagToEdit.tagName || tagToEdit.type,
            attributes: { ...tagToEdit.attributes },
            element: tagToEdit.element || document.createElement('span'),
          }}
          onApply={onTagAttributeUpdate}
        />
      )}
    </>
  );
}
