'use client';

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
  selectedPassages: string[];
  vizPanelOpen: boolean;
  onToggleVizPanel: () => void;
  validationPanelOpen: boolean;
  onToggleValidationPanel: () => void;
  validationResults?: { errors: number; warnings: number };
  isValidating: boolean;
  entityPanelOpen: boolean;
  onToggleEntityPanel: () => void;
  onToggleShortcutHelp: () => void;
  onInsertStructuralTag: (tagName: string) => void;
  // Loading state
  loadingSample: boolean;
  loadingProgress: number;
  // Tag queue
  queue?: {
    multiTagMode: boolean;
    toggleMultiTagMode: () => void;
  };
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
  selectedPassages,
  vizPanelOpen,
  onToggleVizPanel,
  validationPanelOpen,
  onToggleValidationPanel,
  validationResults,
  isValidating,
  entityPanelOpen,
  onToggleEntityPanel,
  onToggleShortcutHelp,
  onInsertStructuralTag,
  loadingSample,
  loadingProgress,
  queue,
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
          title="WYSIWYG View - Rendered document view"
        >
          WYSIWYG
        </Button>
        <Button
          variant={viewMode === 'xml' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('xml')}
          title="XML Code View - Source code view"
        >
          XML
        </Button>
        <Button
          variant={viewMode === 'split' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('split')}
          title="Split View - Side-by-side rendered and source"
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
        variant={queue?.multiTagMode ? 'default' : 'outline'}
        size="sm"
        onClick={queue?.toggleMultiTagMode}
        title={queue?.multiTagMode ? 'Multi-tag mode ON - Tags queued for batch application' : 'Multi-tag mode OFF - Tags applied immediately'}
        className={queue?.multiTagMode ? 'bg-primary text-primary-foreground' : ''}
      >
        {queue?.multiTagMode ? '✓ Multi-Tag' : 'Multi-Tag'}
      </Button>
      <Button
        variant={bulkPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleBulkPanel}
        title="Bulk Operations - Tag multiple passages at once (⌘B)"
      >
        Bulk Operations ({selectedPassages.length})
        <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘B</kbd>
      </Button>
      <Button
        variant={vizPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleVizPanel}
        title="Visualizations - View character networks and dialogue statistics"
      >
        Visualizations
      </Button>
      <Button
        variant={validationPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleValidationPanel}
        title={
          validationResults && validationResults.errors > 0
            ? `Validation - ${validationResults.errors} errors found`
            : 'Validation - Check document for issues'
        }
        className={
          validationResults && validationResults.errors > 0 ? 'border-red-500 text-red-600' : ''
        }
      >
        Validation
        {isValidating && <span className="ml-2 text-xs">Validating...</span>}
        {validationResults && validationResults.errors > 0 && (
          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            {validationResults.errors} errors
          </span>
        )}
      </Button>
      <ExportButton />
      <Button
        variant={entityPanelOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleEntityPanel}
        title="Entities - Manage characters and relationships (⌘E)"
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
