'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileText, Brain } from 'lucide-react';
import type { AIMode } from '@/components/ai/AIModeSwitcher';

export interface StatusBarProps {
  // Document info
  documentName?: string;
  hasUnsavedChanges: boolean;

  // AI mode
  aiMode: AIMode;

  // Selection info
  selectedPassagesCount: number;
  totalPassages: number;

  // Validation status
  validationErrors?: number;
  validationWarnings?: number;
  isValidating: boolean;

  // Entity count
  entityCount?: number;

  // Save status
  lastSaved?: Date;
}

/**
 * StatusBar - Displays application status information
 *
 * Shows document info, AI mode, selection count, validation status,
 * and save status in a compact bar at the bottom of the screen.
 */
export function StatusBar({
  documentName,
  hasUnsavedChanges,
  aiMode,
  selectedPassagesCount,
  totalPassages,
  validationErrors,
  validationWarnings,
  isValidating,
  entityCount,
  lastSaved,
}: StatusBarProps) {
  // Format last saved time
  const formatLastSaved = (date?: Date) => {
    if (!date) return 'Not saved';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Saved just now';
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Saved ${Math.floor(diff / 3600)}h ago`;
    return `Saved ${date.toLocaleDateString()}`;
  };

  // Get AI mode display
  const getAIModeDisplay = () => {
    switch (aiMode) {
      case 'manual':
        return 'Manual';
      case 'suggest':
        return 'AI Suggest';
      case 'auto':
        return 'AI Auto';
      default:
        return 'Manual';
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground select-none">
      {/* Left side: Document info and AI mode */}
      <div className="flex items-center gap-4">
        {/* Document name */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-xs">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate font-medium">
            {documentName || 'Untitled'}
          </span>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
              Unsaved
            </Badge>
          )}
        </div>

        {/* AI mode */}
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{getAIModeDisplay()}</span>
        </div>

        {/* Selection count */}
        {selectedPassagesCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span>{selectedPassagesCount} of {totalPassages} passages selected</span>
          </div>
        )}
      </div>

      {/* Right side: Validation, entities, save status */}
      <div className="flex items-center gap-4">
        {/* Entity count */}
        {entityCount !== undefined && entityCount > 0 && (
          <div className="flex items-center gap-1">
            <span>{entityCount} entities</span>
          </div>
        )}

        {/* Validation status */}
        {(isValidating || (validationErrors !== undefined && validationErrors > 0) || (validationWarnings !== undefined && validationWarnings > 0)) && (
          <div className="flex items-center gap-1.5">
            {isValidating ? (
              <span className="text-blue-600">Validating...</span>
            ) : (validationErrors !== undefined && validationErrors > 0) ? (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{validationErrors} error{validationErrors !== 1 ? 's' : ''}</span>
                {(validationWarnings !== undefined && validationWarnings > 0) && (
                  <span className="text-yellow-600">• {validationWarnings} warning{validationWarnings !== 1 ? 's' : ''}</span>
                )}
              </div>
            ) : (validationWarnings !== undefined && validationWarnings > 0) ? (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{validationWarnings} warning{validationWarnings !== 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Valid</span>
              </div>
            )}
          </div>
        )}

        {/* Save status */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-xs">
          {hasUnsavedChanges ? (
            <span className="text-orange-600">Unsaved changes</span>
          ) : (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="truncate">{formatLastSaved(lastSaved)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
