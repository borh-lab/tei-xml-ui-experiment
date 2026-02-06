'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Badge } from '@/components/ui/badge';
import { EntityTooltip } from './EntityTooltip';
import { useSelection } from '@/hooks/useSelection';
import type { Tag } from '@/lib/tei/types';
import type { TagInfo } from '@/lib/selection/types';
import type { Selection } from '@/lib/values/Selection';

interface Passage {
  id: string;
  content: string;
  speaker?: string;
  confidence?: number;
  tags?: readonly Tag[];
}

interface EntityInfo {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

interface RenderedViewProps {
  isBulkMode?: boolean;
  selectedPassages: string[];
  onSelectionChange: (passageIds: string[]) => void;
  onPassageClick?: (passageId: string) => void;
  highlightedPassageId?: string | null;
  onTagSelect?: (tagInfo: TagInfo) => void;
  onTagDoubleClick?: (tagInfo: TagInfo) => void;
  selectedTag?: TagInfo | null;
  onTextSelectionChange?: (selection: Selection | null) => void;
}

export const RenderedView = React.memo(
  ({
    isBulkMode = false,
    selectedPassages,
    onSelectionChange,
    onPassageClick,
    highlightedPassageId,
    onTagSelect,
    onTagDoubleClick,
    selectedTag: _selectedTag,
    onTextSelectionChange,
  }: RenderedViewProps) => {
    const { document } = useDocumentContext();
    const [passages, setPassages] = useState<Passage[]>([]);
    const [activePassageId, setActivePassageId] = useState<string | null>(null);
    const [hoveredEntity, setHoveredEntity] = useState<{
      entity: EntityInfo;
      position: { x: number; y: number };
    } | null>(null);
    const lastSelectedIndex = useRef<number | null>(null);
    const passageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track text selection for real-time hints
    const textSelection = useSelection();

    // DOMPurify configuration to allow only safe tags and attributes for TEI markup
    const purifyConfig = {
      ALLOWED_TAGS: ['span', 'p', 'div', 'br', 'strong', 'em', 'i', 'b', 'u', 'a', 'sub', 'sup', 'span'],
      ALLOWED_ATTR: ['data-tag', 'data-tag-id', 'data-who', 'data-speaker', 'data-confidence', 'class', 'id', 'href', 'title'],
      ALLOW_DATA_ATTR: true,
      SAFE_FOR_JQUERY: true,
    };

    const sanitizeHtml = (html: string): string => {
      return DOMPurify.sanitize(html, purifyConfig);
    };

    /**
     * Render passage content with tags as styled spans
     */
    const renderPassageContent = useCallback((passage: Passage) => {
      if (!passage.tags || passage.tags.length === 0) {
        return passage.content;
      }

      let html = passage.content;
      const tags = [...passage.tags].sort((a, b) => b.range.start - a.range.start); // Process in reverse order to maintain offsets

      tags.forEach((tag) => {
        const before = html.substring(0, tag.range.start);
        const selected = html.substring(tag.range.start, tag.range.end);
        const after = html.substring(tag.range.end);

        // Build data attributes
        const dataAttrs = [`data-tag="${tag.type}"`, `data-tag-id="${tag.id}"`];

        if (tag.type === 'said' && tag.attributes.who) {
          dataAttrs.push(`data-who="${tag.attributes.who}"`);
        }

        // Style classes based on tag type
        const tagType = tag.type || 'q';
        const tagClass = `tei-tag tei-tag-${tagType} ${
          tagType === 'said'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            : tagType === 'q'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : tagType === 'persName'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
        }`;

        html = `${before}<span ${dataAttrs.join(' ')} class="${tagClass}">${selected}</span>${after}`;
      });

      return html;
    }, []);

    // Extract passages from immutable document state
    useEffect(() => {
      if (!document || !document.state) return;

      const extractedPassages: Passage[] = document.state.passages.map((passage) => {
        // Check for dialogue/speaker information
        const dialogue = document.state.dialogue.find((d) => d.passageId === passage.id);
        const speaker = dialogue?.speaker || undefined;

        // Render content with tags
        const content = renderPassageContent({ ...passage, speaker: undefined, confidence: undefined });

        return {
          id: passage.id,
          content: content.trim(),
          speaker,
          confidence: undefined,
        };
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing derived state from document prop
      setPassages(extractedPassages);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing derived state from document prop
      setActivePassageId(null); // Reset active passage when passages change
    }, [document, renderPassageContent]);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Responding to external prop change
        setActivePassageId(highlightedPassageId);

        // Scroll to the highlighted passage
        setTimeout(() => {
          const passageElement = passageRefs.current.get(highlightedPassageId);
          if (passageElement) {
            passageElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
        }, 100);
      }
    }, [highlightedPassageId]);

    // Notify parent of text selection changes
    useEffect(() => {
      if (onTextSelectionChange) {
        onTextSelectionChange(textSelection);
      }
    }, [textSelection, onTextSelectionChange, highlightedPassageId]);

    // Handle tag click
    const handleTagClick = useCallback(
      (event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        const tagElement = target.closest('[data-tag]') as HTMLElement;

        if (tagElement) {
          const tagName = tagElement.getAttribute('data-tag');
          if (tagName) {
            const attributes: Record<string, string> = {};
            for (let i = 0; i < tagElement.attributes.length; i++) {
              const attr = tagElement.attributes[i];
              if (
                attr.name.startsWith('data-') &&
                attr.name !== 'data-tag' &&
                attr.name !== 'data-tag-id'
              ) {
                const attrName = attr.name.replace('data-', '');
                attributes[attrName] = attr.value;
              }
            }

            const tagInfo: TagInfo = {
              id: tagElement.getAttribute('data-tag-id') || '',
              type: tagName,
              tagName,
              attributes,
              range: { start: 0, end: 0 },
              element: tagElement,
            };

            if (event.detail === 2) {
              // Double click
              onTagDoubleClick?.(tagInfo);
            } else {
              // Single click
              onTagSelect?.(tagInfo);
            }
          }
        }
      },
      [onTagSelect, onTagDoubleClick]
    );

    // Handle passage click with multi-select support
    const handlePassageClick = useCallback(
      (passageId: string, index: number, event: React.MouseEvent) => {
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
              inline: 'nearest',
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

          const rangeIds = passages.slice(start, end + 1).map((p) => p.id);

          const newSelection = [...new Set([...selectedPassages, ...rangeIds])];
          onSelectionChange(newSelection);
        } else {
          // Regular click: Toggle selection
          const isSelected = selectedPassages.includes(passageId);
          let newSelection: string[];

          if (isSelected) {
            newSelection = selectedPassages.filter((id) => id !== passageId);
            // Update last selected to the next closest if available
            if (newSelection.length > 0) {
              const remainingIndexes = newSelection
                .map((id) => passages.findIndex((p) => p.id === id))
                .filter((idx) => idx !== -1);
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
      },
      [isBulkMode, selectedPassages, passages, onPassageClick, onSelectionChange]
    );

    // Select all passages
    const handleSelectAll = () => {
      onSelectionChange(passages.map((p) => p.id));
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
      <div data-test-page="editor" className="flex flex-col h-full">
        {/* Bulk mode controls */}
        {isBulkMode && (
          <div className="flex items-center justify-between p-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedPassages.length} selected</Badge>
              <span className="text-sm text-muted-foreground">
                {passages.length} total passages
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSelectAll} className="text-xs text-primary hover:underline">
                Select All
              </button>
              <button onClick={handleDeselectAll} className="text-xs text-primary hover:underline">
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
                  data-test-passage={index}
                  data-test-state={isActive ? 'highlighted' : 'normal'}
                  data-passage-id={passage.id}
                  data-document-revision={document.state.revision}
                  ref={(el) => {
                    if (el) passageRefs.current.set(passage.id, el);
                  }}
                  onClick={(e) => handlePassageClick(passage.id, index, e)}
                  onMouseEnter={(e) => {
                    if (passage.speaker) {
                      const character = document?.state.characters.find(
                        (c) => c.xmlId === passage.speaker
                      );
                      if (character) {
                        setHoveredEntity({
                          entity: { ...character, type: 'character' },
                          position: { x: e.clientX, y: e.clientY },
                        });
                      }
                    }
                  }}
                  onMouseLeave={() => setHoveredEntity(null)}
                  className={`
                  relative p-3 rounded-lg border transition-all cursor-pointer
                  ${
                    isActive
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
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(passage.content) }}
                      onClick={handleTagClick}
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
                      <span className="text-xs text-muted-foreground">ID: {passage.id}</span>
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isBulkMode === nextProps.isBulkMode &&
      prevProps.selectedPassages.length === nextProps.selectedPassages.length &&
      prevProps.selectedPassages.every((id, index) => id === nextProps.selectedPassages[index])
    );
  }
);

RenderedView.displayName = 'RenderedView';
