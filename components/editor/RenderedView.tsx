'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Badge } from '@/components/ui/badge';

interface Passage {
  id: string;
  content: string;
  speaker?: string;
  confidence?: number;
}

interface RenderedViewProps {
  isBulkMode?: boolean;
  selectedPassages: string[];
  onSelectionChange: (passageIds: string[]) => void;
  onPassageClick?: (passageId: string) => void;
}

export const RenderedView = React.memo(({
  isBulkMode = false,
  selectedPassages,
  onSelectionChange,
  onPassageClick
}: RenderedViewProps) => {
  const { document } = useDocumentContext();
  const [passages, setPassages] = useState<Passage[]>([]);
  const lastSelectedIndex = useRef<number | null>(null);

  // Extract passages from document
  useEffect(() => {
    if (!document) return;

    const text = document.parsed.TEI.text.body.p || '';

    // For now, split by sentences to create passages
    // In a real implementation, this would parse actual <said> tags
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const matches = text.match(sentenceRegex) || [];

    const extractedPassages: Passage[] = matches.map((content, idx) => ({
      id: `passage-${idx}`,
      content: content.trim(),
      speaker: undefined, // Would be populated from <said> who attribute
      confidence: undefined // Would be populated from AI detection
    }));

    setPassages(extractedPassages);
  }, [document]);

  // Handle passage click with multi-select support
  const handlePassageClick = useCallback((passageId: string, index: number, event: React.MouseEvent) => {
    if (!isBulkMode) {
      // Single selection mode
      onPassageClick?.(passageId);
      return;
    }

    // Multi-select mode
    if (event.shiftKey && lastSelectedIndex.current !== null) {
      // Shift+click: Select range from last selected to current
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);

      const rangeIds = passages
        .slice(start, end + 1)
        .map(p => p.id);

      const newSelection = [...new Set([...selectedPassages, ...rangeIds])];
      onSelectionChange(newSelection);
    } else {
      // Regular click: Toggle selection
      const isSelected = selectedPassages.includes(passageId);
      let newSelection: string[];

      if (isSelected) {
        newSelection = selectedPassages.filter(id => id !== passageId);
        // Update last selected to the next closest if available
        if (newSelection.length > 0) {
          const remainingIndexes = newSelection
            .map(id => passages.findIndex(p => p.id === id))
            .filter(idx => idx !== -1);
          lastSelectedIndex.current = remainingIndexes[remainingIndexes.length - 1];
        } else {
          lastSelectedIndex.current = null;
        }
      } else {
        newSelection = [...selectedPassages, passageId];
        lastSelectedIndex.current = index;
      }

      onSelectionChange(newSelection);
    }
  }, [isBulkMode, selectedPassages, passages, onPassageClick, onSelectionChange]);

  // Select all passages
  const handleSelectAll = () => {
    onSelectionChange(passages.map(p => p.id));
  };

  // Deselect all passages
  const handleDeselectAll = () => {
    onSelectionChange([]);
    lastSelectedIndex.current = null;
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Bulk mode controls */}
      {isBulkMode && (
        <div className="flex items-center justify-between p-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedPassages.length} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              {passages.length} total passages
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-primary hover:underline"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-primary hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Passages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {passages.map((passage, index) => {
            const isSelected = selectedPassages.includes(passage.id);

            return (
              <div
                key={passage.id}
                onClick={(e) => handlePassageClick(passage.id, index, e)}
                className={`
                  relative p-3 rounded-lg border transition-all cursor-pointer
                  ${isSelected
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-background border-border hover:bg-muted/50 hover:border-muted-foreground/50'
                  }
                  ${isBulkMode ? 'cursor-pointer' : ''}
                `}
              >
                {/* Selection checkbox in bulk mode */}
                {isBulkMode && (
                  <div className="absolute top-3 left-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* Passage content */}
                <div className={isBulkMode ? 'pl-8' : ''}>
                  <p className="text-sm leading-relaxed">
                    {passage.content}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 mt-2">
                    {passage.speaker && (
                      <Badge variant="outline" className="text-xs">
                        {passage.speaker}
                      </Badge>
                    )}
                    {passage.confidence !== undefined && (
                      <Badge
                        variant={passage.confidence >= 0.7 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {Math.round(passage.confidence * 100)}% confidence
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      ID: {passage.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {passages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No passages found in document
          </div>
        )}
      </div>

      {/* Instructions */}
      {isBulkMode && (
        <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <strong>Multi-Select:</strong> Click to select, Shift+click for range selection
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isBulkMode === nextProps.isBulkMode &&
    prevProps.selectedPassages.length === nextProps.selectedPassages.length &&
    prevProps.selectedPassages.every((id, index) => id === nextProps.selectedPassages[index])
  );
});

RenderedView.displayName = 'RenderedView';
