'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkOperationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPassages: string[];
  onTagAll: (speakerId: string) => void;
  onSelectAllUntagged?: () => void;
  onSelectLowConfidence?: () => void;
  onExportSelection?: () => void;
  onValidate?: () => void;
  onConvert?: () => void;
  speakers?: { id: string; name: string }[];
}

export function BulkOperationsPanel({
  isOpen,
  onClose,
  selectedPassages,
  onTagAll,
  onSelectAllUntagged,
  onSelectLowConfidence,
  onExportSelection,
  onValidate,
  onConvert,
  speakers = [],
}: BulkOperationsPanelProps) {
  const [speakerId, setSpeakerId] = useState('');
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTagAll = async () => {
    if (!speakerId) return;
    setOperationInProgress('tagging');
    try {
      await onTagAll(speakerId);
      setSpeakerId('');
    } finally {
      setOperationInProgress(null);
    }
  };

  const handleOperation = async (operation: string, callback?: () => void) => {
    setOperationInProgress(operation);
    try {
      await callback?.();
    } finally {
      setOperationInProgress(null);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Bulk Operations</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Selection count */}
          <div>
            <Badge variant="secondary" className="mb-2">
              {selectedPassages.length} passages selected
            </Badge>
            <p className="text-sm text-muted-foreground">Perform operations on selected passages</p>
          </div>

          {/* Tag all as */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tag all as:</label>
            <select
              value={speakerId}
              onChange={(e) => setSpeakerId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
              disabled={operationInProgress !== null}
            >
              <option value="">Select speaker...</option>
              {speakers.map((speaker) => (
                <option key={speaker.id} value={speaker.id}>
                  {speaker.name}
                </option>
              ))}
              <option value="speaker1">Speaker 1</option>
              <option value="speaker2">Speaker 2</option>
              <option value="speaker3">Speaker 3</option>
              <option value="narrator">Narrator</option>
            </select>
            <Button
              onClick={handleTagAll}
              disabled={!speakerId || operationInProgress !== null}
              className="w-full"
            >
              {operationInProgress === 'tagging' ? 'Tagging...' : 'Tag Selected Passages'}
            </Button>
          </div>

          {/* Selection operations */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Quick Selection</h3>
            <Button
              variant="outline"
              onClick={() => handleOperation('selectAllUntagged', onSelectAllUntagged)}
              disabled={operationInProgress !== null}
              className="w-full justify-start"
            >
              Select All Untagged
              <kbd className="ml-auto text-xs bg-muted px-2 py-1 rounded">⇧⌘U</kbd>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOperation('selectLowConfidence', onSelectLowConfidence)}
              disabled={operationInProgress !== null}
              className="w-full justify-start"
            >
              Select Low Confidence (&lt;70%)
              <kbd className="ml-auto text-xs bg-muted px-2 py-1 rounded">⇧⌘L</kbd>
            </Button>
          </div>

          {/* Bulk operations */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Operations</h3>
            <Button
              variant="outline"
              onClick={() => handleOperation('validate', onValidate)}
              disabled={operationInProgress !== null || selectedPassages.length === 0}
              className="w-full justify-start"
            >
              Validate Selection
              <kbd className="ml-auto text-xs bg-muted px-2 py-1 rounded">⇧⌘V</kbd>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOperation('export', onExportSelection)}
              disabled={operationInProgress !== null || selectedPassages.length === 0}
              className="w-full justify-start"
            >
              Export Selection
              <kbd className="ml-auto text-xs bg-muted px-2 py-1 rounded">⇧⌘E</kbd>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOperation('convert', onConvert)}
              disabled={operationInProgress !== null || selectedPassages.length === 0}
              className="w-full justify-start"
            >
              Convert to Dialogue
              <kbd className="ml-auto text-xs bg-muted px-2 py-1 rounded">⇧⌘D</kbd>
            </Button>
          </div>

          {/* Progress indicator */}
          {operationInProgress && (
            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">
                  {operationInProgress === 'tagging' && 'Tagging passages...'}
                  {operationInProgress === 'validate' && 'Validating...'}
                  {operationInProgress === 'export' && 'Exporting...'}
                  {operationInProgress === 'convert' && 'Converting...'}
                  {operationInProgress === 'selectAllUntagged' && 'Selecting...'}
                  {operationInProgress === 'selectLowConfidence' && 'Selecting...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer with shortcuts help */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Use <kbd className="bg-background px-1 rounded">Shift</kbd> +
            click to select multiple passages
          </p>
        </div>
      </div>
    </div>
  );
}
