'use client';

import { Card } from '@/components/ui/card';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import { TagQueuePanel } from '@/components/queue/TagQueuePanel';
import type { ValidationResult, ValidationError, FixSuggestion } from '@/lib/validation';
import type { TagQueueState } from '@/lib/queue/TagQueue';

export interface EditorPanelsProps {
  vizPanelOpen: boolean;
  validationPanelOpen: boolean;
  validationResults: ValidationResult | null;
  onErrorClick?: (error: ValidationError) => void;
  onFixClick?: (suggestion: FixSuggestion) => void;
  // Tag queue
  queue?: {
    state: TagQueueState;
    onApplyAll: () => Promise<void>;
    onRemoveTag: (id: string) => void;
    onClearAll: () => void;
    isApplying: boolean;
  };
}

/**
 * Side panels for visualization, validation, and tag queue.
 *
 * Toggleable panels that appear on the right side of the editor.
 */
export function EditorPanels({
  vizPanelOpen,
  validationPanelOpen,
  validationResults,
  onErrorClick,
  onFixClick,
  queue,
}: EditorPanelsProps) {
  return (
    <>
      {/* Visualization Panel */}
      {vizPanelOpen && (
        <>
          <div className="w-1 bg-border" />
          <VisualizationPanel />
        </>
      )}

      {/* Validation Panel */}
      {validationPanelOpen && (
        <>
          <div className="w-1 bg-border" />
          <Card className="w-96 m-2 overflow-auto">
            <div className="p-4">
              <ValidationPanel
                validationResults={validationResults}
                onErrorClick={onErrorClick}
                onFixClick={onFixClick}
                visible={validationPanelOpen}
              />
            </div>
          </Card>
        </>
      )}

      {/* Tag Queue Panel */}
      {queue && (queue.state.pending.length > 0) && (
        <>
          <div className="w-1 bg-border" />
          <Card className="w-96 m-2 overflow-auto">
            <div className="p-4">
              <TagQueuePanel
                queue={queue.state}
                onApplyAll={queue.onApplyAll}
                onRemoveTag={queue.onRemoveTag}
                onClearAll={queue.onClearAll}
                isApplying={queue.isApplying}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
