'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Badge } from '@/components/ui/badge';
import { EntityTooltip } from './EntityTooltip';

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
  highlightedPassageId?: string | null;
}

export const RenderedView = React.memo(({
  isBulkMode = false,
  selectedPassages,
  onSelectionChange,
  onPassageClick,
  highlightedPassageId
}: RenderedViewProps) => {
  const { document } = useDocumentContext();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [activePassageId, setActivePassageId] = useState<string | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{ entity: any; position: { x: number; y: number } } | null>(null);
  const lastSelectedIndex = useRef<number | null>(null);
  const passageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // HTML escape utility to prevent XSS
  const escapeHtml = (str: string): string => {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
  };

  // Extract passages from document
  useEffect(() => {
    if (!document) return;

    const p = document.parsed.TEI.text.body.p;

    // Handle both array and single paragraph cases
    const paragraphs = Array.isArray(p) ? p : (p ? [p] : []);

    const extractedPassages: Passage[] = paragraphs.map((para, idx) => {
      let content = '';
      let speaker: string | undefined;

      if (typeof para === 'string') {
        content = para;
      } else {
        // Extract text content from paragraph with <said> tags
        content = para['#text'] || '';

        if (para['said']) {
          const saidElements = Array.isArray(para['said']) ? para['said'] : [para['said']];

          saidElements.forEach((said: any) => {
            const saidText = said['#text'] || '';
            speaker = said['@_who']?.replace('#', '');
            // Escape HTML to prevent XSS
            const escapedSpeaker = escapeHtml(speaker || '');
            const escapedText = escapeHtml(saidText);
            content += `<span data-speaker="${escapedSpeaker}">${escapedText}</span>`;
          });

          if (para['#text_2']) {
            content += para['#text_2'];
          }
        }
      }

      return {
        id: `passage-${idx}`,
        content: content.trim(),
        speaker,
        confidence: undefined
      };
    });

    setPassages(extractedPassages);
    setActivePassageId(null); // Reset active passage when passages change
  }, [document]);

  // Cleanup passage refs when passages change
  useEffect(() => {
    return () => {
      passageRefs.current.clear();
      // Clear any pending highlight timeout
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [passages]);

  // Handle external highlight (from search result click)
  useEffect(() => {
    if (highlightedPassageId) {
      setActivePassageId(highlightedPassageId);

      // Scroll to the highlighted passage
      setTimeout(() => {
        const passageElement = passageRefs.current.get(highlightedPassageId);
        if (passageElement) {
          passageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [highlightedPassageId]);

  // Handle passage click with multi-select support
  const handlePassageClick = useCallback((passageId: string, index: number, event: React.MouseEvent) => {
    if (!isBulkMode) {
      // Single selection mode: scroll to and highlight passage
      setActivePassageId(passageId);
      onPassageClick?.(passageId);

      // Scroll the passage into view smoothly
      const passageElement = passageRefs.current.get(passageId);
      if (passageElement) {
        passageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }

      // Clear any existing timeout and set new one
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // Clear highlight after 3 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setActivePassageId(null);
        highlightTimeoutRef.current = null;
      }, 3000);

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
            const isActive = activePassageId === passage.id;

            return (
              <div
                key={passage.id}
                id={passage.id}
                ref={(el) => {
                  if (el) passageRefs.current.set(passage.id, el);
                }}
                onClick={(e) => handlePassageClick(passage.id, index, e)}
                onMouseEnter={(e) => {
                  if (passage.speaker) {
                    const character = document?.getCharacters().find((c: any) => c['xml:id'] === passage.speaker);
                    if (character) {
                      setHoveredEntity({
                        entity: character,
                        position: { x: e.clientX, y: e.clientY }
                      });
                    }
                  }
                }}
                onMouseLeave={() => setHoveredEntity(null)}
                className={`
                  relative p-3 rounded-lg border transition-all cursor-pointer
                  ${isActive
                    ? 'bg-primary/20 border-primary shadow-md ring-2 ring-primary/50 scale-[1.02]'
                    : isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-background border-border hover:bg-muted/50 hover:border-muted-foreground/50'
                  }
                  ${isBulkMode ? 'cursor-pointer' : ''}
                `}
                style={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
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
                  <p
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: passage.content }}
                  />

                  {/* Metadata */}
                  <div className="flex items-center gap-2 mt-2">
                    {passage.speaker && (
                      <Badge variant="outline" className="text-xs">
                        Speaker: {passage.speaker}
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

      {/* Entity Tooltip */}
      {hoveredEntity && (
        <EntityTooltip
          entity={hoveredEntity.entity}
          position={hoveredEntity.position}
          visible={true}
        />
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
