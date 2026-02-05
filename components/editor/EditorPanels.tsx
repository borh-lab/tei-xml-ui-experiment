'use client';

import { Card } from '@/components/ui/card';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import { DocumentValidationSummary } from '@/components/doc-validation/DocumentValidationSummary';
import { TagQueuePanel } from '@/components/queue/TagQueuePanel';
import { TagSuggestionsPanel } from '@/components/suggestions/TagSuggestionsPanel';
import type { ValidationResult, ValidationError, FixSuggestion } from '@/lib/validation';
import type { TagQueueState } from '@/lib/queue/TagQueue';
import type { Suggestion } from '@/lib/values/Suggestion';
import type { Selection } from '@/lib/values/Selection';
import type { ValidationSummary } from '@/lib/values/ValidationSummary';
import type { ValidationIssue } from '@/lib/values/ValidationSummary';

export interface EditorPanelsProps {
  vizPanelOpen: boolean;
  validationPanelOpen: boolean;
  validationResults: ValidationResult | null;
  validationSummary?: ValidationSummary | null;
  onValidationErrorClick?: (issue: ValidationIssue) => void;
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
  // Tag suggestions
  suggestionsPanelOpen?: boolean;
  suggestions?: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

/**
 * Side panels for visualization, validation, tag queue, and suggestions.
 *
 * Toggleable panels that appear on the right side of the editor.
 */
export function EditorPanels({
  vizPanelOpen,
  validationPanelOpen,
  validationResults,
  validationSummary,
  onValidationErrorClick,
  onErrorClick,
  onFixClick,
  queue,
  suggestionsPanelOpen = false,
  suggestions = [],
  onSuggestionClick,
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
              {validationSummary ? (
                <DocumentValidationSummary
                  summary={validationSummary}
                  onNavigate={onValidationErrorClick}
                />
              ) : (
                <ValidationPanel
                  validationResults={validationResults}
                  onErrorClick={onErrorClick}
                  onFixClick={onFixClick}
                  visible={validationPanelOpen}
                />
              )}
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

      {/* Tag Suggestions Panel */}
      {suggestionsPanelOpen && onSuggestionClick && (
        <>
          <div className="w-1 bg-border" />
          <Card className="w-96 m-2 overflow-auto">
            <div className="p-4">
              <TagSuggestionsPanel
                suggestions={suggestions}
                onSuggestionClick={onSuggestionClick}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
