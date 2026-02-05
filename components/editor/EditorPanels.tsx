'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import { ValidationPanel } from '@/components/validation/ValidationPanel';

interface ValidationError {
  line?: number;
  message?: string;
  [key: string]: unknown;
}

interface FixSuggestion {
  [key: string]: unknown;
}

export interface EditorPanelsProps {
  vizPanelOpen: boolean;
  validationPanelOpen: boolean;
  validationResults: any;
  onErrorClick: (error: ValidationError) => void;
  onFixClick: (suggestion: FixSuggestion) => void;
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
                validationResults={validationResults as any}
                onErrorClick={onErrorClick as any}
                onFixClick={onFixClick as any}
                visible={validationPanelOpen}
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
