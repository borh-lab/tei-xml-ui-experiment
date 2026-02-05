'use client';

import { Card } from '@/components/ui/card';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import type { ValidationResult, ValidationError, FixSuggestion } from '@/lib/validation';

export interface EditorPanelsProps {
  vizPanelOpen: boolean;
  validationPanelOpen: boolean;
  validationResults: ValidationResult | null;
  onErrorClick?: (error: ValidationError) => void;
  onFixClick?: (suggestion: FixSuggestion) => void;
}

/**
 * Side panels for visualization and validation.
 *
 * Toggleable panels that appear on the right side of the editor.
 */
export function EditorPanels({
  vizPanelOpen,
  validationPanelOpen,
  validationResults,
  onErrorClick,
  onFixClick,
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
    </>
  );
}
