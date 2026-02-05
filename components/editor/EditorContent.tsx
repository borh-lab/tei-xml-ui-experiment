'use client';

import React, { useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { InlineSuggestions } from '@/components/ai/InlineSuggestions';
import { RenderedView } from './RenderedView';
import { XMLCodeEditor } from './XMLCodeEditor';
import { TagBreadcrumb } from './TagBreadcrumb';
import type { AIMode } from '@/components/ai/AIModeSwitcher';
import { DialogueSpan } from '@/lib/ai/providers';
import type { TagInfo } from '@/lib/selection/types';
import type { ViewMode } from './hooks/useViewMode';

export interface EditorContentProps {
  // View mode
  viewMode: ViewMode;
  // AI
  aiMode: AIMode;
  suggestions: DialogueSpan[];
  selectedText: string;
  onAcceptSuggestion: (suggestion: DialogueSpan) => void;
  onRejectSuggestion: (suggestion: DialogueSpan) => void;
  // Rendered view
  isBulkMode: boolean;
  selectedPassages: string[];
  onSelectionChange: (passages: string[]) => void;
  onPassageClick: (passageId: string) => void;
  highlightedPassageId: string | null;
  onTagSelect: (tagInfo: TagInfo) => void;
  onTagDoubleClick: (tagInfo: TagInfo) => void;
  selectedTag: TagInfo | null;
  // Code editor
  codeContent: string;
  onCodeChange: (code: string) => void;
  onCodeEditorMount: (editor: any) => void;
  validationResults: any;
  // Scroll sync
  onRenderedViewScroll?: () => void;
  renderedViewRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Main content area with WYSIWYG and/or XML views.
 *
 * Handles three view modes:
 * - wysiwyg: Rendered view only
 * - xml: Code editor only
 * - split: Both views side-by-side with scroll sync
 */
export function EditorContent({
  viewMode,
  aiMode,
  suggestions,
  selectedText,
  onAcceptSuggestion,
  onRejectSuggestion,
  isBulkMode,
  selectedPassages,
  onSelectionChange,
  onPassageClick,
  highlightedPassageId,
  onTagSelect,
  onTagDoubleClick,
  selectedTag,
  codeContent,
  onCodeChange,
  onCodeEditorMount,
  validationResults,
  onRenderedViewScroll,
  renderedViewRef,
}: EditorContentProps) {
  const renderRenderedView = (showScrollSync = false) => (
    <Card className="flex-1 m-2 overflow-auto flex flex-col">
      <div className="p-4 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">Rendered View</h2>
      </div>

      {/* AI Suggestions Panel */}
      {aiMode !== 'manual' && suggestions.length > 0 && (
        <div className="px-4 pb-2 flex-shrink-0">
          <InlineSuggestions
            suggestions={suggestions}
            onAccept={onAcceptSuggestion}
            onReject={onRejectSuggestion}
            highlightedText={selectedText}
          />
        </div>
      )}

      {/* Rendered content */}
      <div
        ref={showScrollSync ? renderedViewRef : undefined}
        className="flex-1 overflow-auto"
        onScroll={showScrollSync ? onRenderedViewScroll : undefined}
      >
        <RenderedView
          isBulkMode={isBulkMode}
          selectedPassages={selectedPassages}
          onSelectionChange={onSelectionChange}
          onPassageClick={onPassageClick}
          highlightedPassageId={highlightedPassageId}
          onTagSelect={onTagSelect as any}
          onTagDoubleClick={onTagDoubleClick as any}
          selectedTag={selectedTag as any}
        />
      </div>
    </Card>
  );

  const renderCodeEditor = () => (
    <Card className="flex-1 m-2 overflow-auto flex flex-col">
      <div className="p-4 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">XML Code</h2>
        <p className="text-sm text-muted-foreground">
          Edit the XML directly. Validation errors will be shown inline.
        </p>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-auto">
        <XMLCodeEditor
          value={codeContent}
          onChange={onCodeChange}
          onMount={onCodeEditorMount}
          errors={
            validationResults?.errors.map((e: any) => ({
              line: e.line || 1,
              message: e.message,
            })) || []
          }
          readOnly={false}
        />
      </div>
    </Card>
  );

  return (
    <>
      <TagBreadcrumb />

      {/* WYSIWYG View */}
      {viewMode === 'wysiwyg' && renderRenderedView(false)}

      {/* XML-only View */}
      {viewMode === 'xml' && renderCodeEditor()}

      {/* Split View */}
      {viewMode === 'split' && (
        <>
          {/* Left pane - Rendered view */}
          {renderRenderedView(true)}

          {/* Resizer */}
          <div className="w-1 bg-border cursor-col-resize hover:bg-primary" />

          {/* Right pane - XML Code Editor */}
          {renderCodeEditor()}
        </>
      )}
    </>
  );
}
