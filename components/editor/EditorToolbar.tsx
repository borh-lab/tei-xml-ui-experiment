'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AIModeSwitcher } from '@/components/ai/AIModeSwitcher';
import { TagToolbar } from './TagToolbar';
import { ExportButton } from './ExportButton';
import { StructuralTagPalette } from './StructuralTagPalette';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { HelpCircle } from 'lucide-react';
import type { AIMode } from '@/components/ai/AIModeSwitcher';
import type { ViewMode } from './hooks/useViewMode';

export interface EditorToolbarProps {
  // AI
  aiMode: AIMode;
  onAIModeChange: (mode: AIMode) => void;
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Panels
  bulkPanelOpen: boolean;
  onToggleBulkPanel: () => void;
  isBulkMode: boolean;
  setIsBulkMode: (mode: boolean) => void;
  selectedPassages: string[];
  vizPanelOpen: boolean;
  onToggleVizPanel: () => void;
  validationPanelOpen: boolean;
  onToggleValidationPanel: () => void;
  validationResults: any;
  isValidating: boolean;
  entityPanelOpen: boolean;
  onToggleEntityPanel: () => void;
  shortcutHelpOpen: boolean;
  onToggleShortcutHelp: () => void;
  onInsertStructuralTag: (tagName: string) => void;
  // Loading state
  loadingSample: boolean;
  loadingProgress: number;
}

/**
 * Main editor toolbar with all primary actions.
 *
 * Contains AI mode switcher, view toggles, tag tools, and panel buttons.
 */
export function EditorToolbar({
  aiMode,
  onAIModeChange,
  viewMode,
  onViewModeChange,
  bulkPanelOpen,
  onToggleBulkPanel,
  isBulkMode,
  setIsBulkMode,
  selectedPassages,
  vizPanelOpen,
  onToggleVizPanel,
  validationPanelOpen,
  onToggleValidationPanel,
  validationResults,
  isValidating,
  entityPanelOpen,
  onToggleEntityPanel,
  shortcutHelpOpen,
  onToggleShortcutHelp,
  onInsertStructuralTag,
  loadingSample,
  loadingProgress,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <MobileNavigation />
      <AIModeSwitcher mode={aiMode} onModeChange={onAIModeChange} />

      {/* View Mode Toggles */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Button
          variant={viewMode === 'wysiwyg' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('wysiwyg')}
          title="WYSIWYG View"
        >
          WYSIWYG
        </Button>
        <Button
          variant={viewMode === 'xml' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('xml')}
          title="XML Code View"
        >
          XML
        </Button>
        <Button
          variant={viewMode === 'split' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('split')}
          title="Split View"
        >
          Split
        </Button>
      </div>

      {/* Structural Tag Palette (only visible in XML or Split mode) */}
      {(viewMode === 'xml' || viewMode === 'split') && (
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <StructuralTagPalette onInsertTag={onInsertStructuralTag} disabled={false} />
        </div>
      )}

      <TagToolbar />
      <Button
        variant={bulkPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={() => {
          onToggleBulkPanel();
          setIsBulkMode(!bulkPanelOpen);
        }}
      >
        Bulk Operations ({selectedPassages.length})
        <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘B</kbd>
      </Button>
      <Button
        variant={vizPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleVizPanel}
      >
        Visualizations
      </Button>
      <Button
        variant={validationPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleValidationPanel}
        className={
          validationResults && !validationResults.valid ? 'border-red-500 text-red-600' : ''
        }
      >
        Validation
        {isValidating && <span className="ml-2 text-xs">Validating...</span>}
        {validationResults && !validationResults.valid && (
          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            {validationResults.errors.length} errors
          </span>
        )}
      </Button>
      <ExportButton />
      <Button
        variant={entityPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleEntityPanel}
      >
        Entities
        <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘E</kbd>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleShortcutHelp}
        title="Keyboard shortcuts (Press ?)"
      >
        <HelpCircle className="h-4 w-4" />
        <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">?</kbd>
      </Button>
      {loadingSample && (
        <div className="flex-1 max-w-xs ml-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: loadingProgress + '%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Loading sample... {loadingProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
