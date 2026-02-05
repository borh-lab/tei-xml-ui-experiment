'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useEditorState, useEditorUI, useAISuggestions, useTagSelection, useViewMode, useBulkOperations, useKeyboardShortcuts } from './hooks';
import { EditorToolbar, EditorContent, EditorModals, EditorPanels, EditorToast } from './EditorComponents';
import { SelectionManager } from '@/lib/selection/SelectionManager';
import type { TEINode } from '@/lib/tei/types';
export interface MonacoEditor {
  getModel?: () => { getLineCount: () => number } | null;
  revealLine: (line: number) => void;
  getVisibleRanges: () => { startLineNumber: number }[];
  onDidScrollChange: (callback: () => void) => void;
}

interface ValidationError {
  line?: number;
  message?: string;
  [key: string]: unknown;
}

interface FixSuggestion {
  [key: string]: unknown;
}

/**
 * Main editor layout component.
 *
 * Orchestrates all editor functionality using custom hooks and sub-components.
 * Reduced from 1,195 lines to ~200 lines through extraction of hooks and components.
 */
export function EditorLayout() {
  // Core editor state
  const editorUI = useEditorUI();

  const editorState = useEditorState({
    showToast: editorUI.showToast,
    tagToEdit: null,
  });

  // Helper to get paragraphs from document
  const getParagraphs = useCallback((): TEINode[] => {
    if (!editorState.document) return [];
    const tei = editorState.document.state.parsed.TEI as TEINode | undefined;
    const text = tei?.text as TEINode | undefined;
    const body = text?.body as TEINode | undefined;
    const p = body?.p;
    return Array.isArray(p) ? p : p ? [p] : [];
  }, [editorState.document]);

  // AI suggestions
  const aiState = useAISuggestions({
    document: editorState.document,
  });

  // Tag selection
  const tagSelection = useTagSelection(editorUI.showToast);

  // View mode
  const viewMode = useViewMode({
    document: editorState.document,
    updateDocument: editorState.updateDocument,
    showToast: editorUI.showToast,
  });

  // Bulk operations
  const bulkOps = useBulkOperations();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: editorUI.openCommandPalette,
    onBulkPanel: editorUI.toggleBulkPanel,
    onShortcutHelp: editorUI.openShortcutHelp,
    onEntityPanel: editorUI.toggleEntityPanel,
    onNextPassage: () => {
      const passages = editorState.getPassageIds();
      if (passages.length === 0) {
        editorUI.showToast('No passages to navigate', 'error');
        return;
      }
      const nextIndex = Math.min(editorState.activePassageIndex + 1, passages.length - 1);
      const passageId = passages[nextIndex];
      editorState.setActivePassageIndex(nextIndex);
      editorState.setCurrentPassageId(passageId);
      editorState.setHighlightedPassageId(passageId);
      setTimeout(() => {
        const element = globalThis.document?.getElementById(passageId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => editorState.setHighlightedPassageId(null), 3000);
        }
      }, 100);
      editorUI.showToast('Passage ' + (nextIndex + 1) + '/' + passages.length, 'info');
    },
    onPrevPassage: () => {
      const passages = editorState.getPassageIds();
      if (passages.length === 0) {
        editorUI.showToast('No passages to navigate', 'error');
        return;
      }
      const prevIndex = Math.max(editorState.activePassageIndex - 1, 0);
      const passageId = passages[prevIndex];
      editorState.setActivePassageIndex(prevIndex);
      editorState.setCurrentPassageId(passageId);
      editorState.setHighlightedPassageId(passageId);
      setTimeout(() => {
        const element = globalThis.document?.getElementById(passageId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => editorState.setHighlightedPassageId(null), 3000);
        }
      }, 100);
      editorUI.showToast('Passage ' + (prevIndex + 1) + '/' + passages.length, 'info');
    },
  });

  // Refs for scroll synchronization
  const renderedViewRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<MonacoEditor | null>(null);
  const isScrollingRef = useRef<{ rendered: boolean; code: boolean }>({
    rendered: false,
    code: false,
  });

  // Track text selection for highlighting
  useEffect(() => {
    if (typeof window === 'undefined' || typeof globalThis.document === 'undefined') {
      return;
    }

    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      tagSelection.setSelectedText(text);
    };

    globalThis.document.addEventListener('selectionchange', handleSelection);
    return () => {
      globalThis.document.removeEventListener('selectionchange', handleSelection);
    };
  }, [tagSelection]);

  // Handle scroll synchronization
  const handleRenderedViewScroll = useCallback(() => {
    if (isScrollingRef.current.code) return;

    isScrollingRef.current.rendered = true;

    if (renderedViewRef.current && codeEditorRef.current) {
      const renderedScrollTop = renderedViewRef.current.scrollTop;
      const renderedScrollHeight =
        renderedViewRef.current.scrollHeight - renderedViewRef.current.clientHeight;
      const scrollPercentage = renderedScrollTop / renderedScrollHeight;

      // Sync to code editor (approximate line-based scroll)
      const editor = codeEditorRef.current;
      if (editor && editor.getModel) {
        const model = editor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          const targetLine = Math.floor(lineCount * scrollPercentage);
          editor.revealLine(targetLine);
        }
      }
    }

    setTimeout(() => {
      isScrollingRef.current.rendered = false;
    }, 100);
  }, []);

  const handleCodeEditorScroll = useCallback(() => {
    if (isScrollingRef.current.rendered) return;

    isScrollingRef.current.code = true;

    if (codeEditorRef.current && renderedViewRef.current) {
      const editor = codeEditorRef.current;
      if (editor.getVisibleRanges && editor.getModel) {
        const visibleRanges = editor.getVisibleRanges();
        const model = editor.getModel();
        const lineCount = model ? model.getLineCount() : 1;

        if (visibleRanges.length > 0) {
          const firstVisibleLine = visibleRanges[0].startLineNumber;
          const scrollPercentage = firstVisibleLine / lineCount;

          // Sync to rendered view
          const renderedScrollHeight =
            renderedViewRef.current.scrollHeight - renderedViewRef.current.clientHeight;
          renderedViewRef.current.scrollTop = scrollPercentage * renderedScrollHeight;
        }
      }
    }

    setTimeout(() => {
      isScrollingRef.current.code = false;
    }, 100);
  }, []);

  // Handle code editor mounting
  const handleCodeEditorMount = useCallback(
    (editor: MonacoEditor) => {
      codeEditorRef.current = editor;
      editor.onDidScrollChange(() => {
        handleCodeEditorScroll();
      });
    },
    [handleCodeEditorScroll]
  );

  // Handle structural tag insertion
  const handleInsertStructuralTag = useCallback(
    (tagName: string) => {
      editorUI.showToast('Insert <' + tagName + '> at cursor position', 'info');
    },
    [editorUI]
  );

  // Handle view mode switching
  const handleViewModeChange = useCallback(
    (mode: 'wysiwyg' | 'xml' | 'split') => {
      viewMode.setViewMode(mode);
      editorUI.showToast('Switched to ' + mode.toUpperCase() + ' view', 'info');
    },
    [viewMode, editorUI]
  );

  // Bulk operation handlers
  const handleTagAll = async (speakerId: string) => {
    if (!editorState.document) return;

    const paragraphs = getParagraphs();
    const passagesToTag = [...bulkOps.selectedPassages];

    bulkOps.selectedPassages.forEach((index) => {
      const idx = Number(index);
      if (paragraphs[idx] && paragraphs[idx].said) {
        const said = paragraphs[idx].said as TEINode[];
        if (Array.isArray(said)) {
          paragraphs[idx].said = said.map((s: TEINode) => ({
            ...s,
            '@who': speakerId,
          }));
        }
      }
    });

    const { serializeDocument } = await import('@/lib/tei/operations');
    const updatedXML = serializeDocument(editorState.document);
    await editorState.updateDocument(updatedXML);
    bulkOps.setSelectedPassages([]);

    // Log to pattern database
    const { db } = await import('@/lib/db/PatternDB');
    await db.logCorrection('bulk_tag', speakerId, passagesToTag, 1.0, 'middle');
  };

  const handleSelectAllUntagged = () => {
    if (!editorState.document) return;

    const untaggedIndices = new Set<number>();
    const paragraphs = getParagraphs();

    paragraphs.forEach((para: TEINode, index: number) => {
      const said = para.said as TEINode[];
      if (Array.isArray(said)) {
        const hasUntagged = said.some((s: TEINode) => !s['@who'] || s['@who'] === '');
        if (hasUntagged) {
          untaggedIndices.add(index);
        }
      }
    });

    bulkOps.setSelectedPassages(Array.from(untaggedIndices).map(String));
  };

  const handleSelectLowConfidence = () => {
    console.log('Selecting low confidence passages');
  };

  const handleExportSelection = () => {
    if (!editorState.document || bulkOps.selectedPassages.length === 0) return;

    const paragraphs = getParagraphs();
    const selectedParagraphs = bulkOps.selectedPassages.map(
      (index) => paragraphs[Number(index)]
    );

    const data = JSON.stringify(selectedParagraphs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = 'tei-export-' + Date.now() + '.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleValidateSelection = async (): Promise<any[]> => {
    if (!editorState.document || bulkOps.selectedPassages.length === 0) return [];

    const issues: any[] = [];
    const paragraphs = getParagraphs();

    bulkOps.selectedPassages.forEach((indexStr) => {
      const index = Number(indexStr);
      const para = paragraphs[index];
      const said = para.said as TEINode[];

      if (!Array.isArray(said)) {
        issues.push({
          type: 'warning',
          message: 'Paragraph ' + (index + 1) + ': No dialogue found',
          location: { index },
        });
      } else {
        said.forEach((s: TEINode, i: number) => {
          if (!s['@who'] || s['@who'] === '') {
            issues.push({
              type: 'error',
              message: 'Paragraph ' + (index + 1) + ', dialogue ' + (i + 1) + ': Untagged speaker',
              location: { index, dialogueIndex: i },
            });
          }
        });
      }
    });

    console.log('Validation issues:', issues);
    return issues;
  };

  const handleConvert = () => {
    console.log('Converting selected passages to dialogue');
  };

  const handleValidationErrorClick = (error: ValidationError) => {
    console.log('Validation error clicked:', error);
    if (error.line) {
      editorUI.showToast('Error at line ' + error.line + ': ' + error.message, 'error');
    }
  };

  const handleValidationFixClick = (suggestion: FixSuggestion) => {
    console.log('Fix suggestion clicked:', suggestion);
    editorUI.showToast('Fix suggestions not yet implemented', 'info');
  };

  if (!editorState.document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Modals and Dialogs */}
      <EditorModals
        commandPaletteOpen={editorUI.panelStates.commandPaletteOpen}
        onCloseCommandPalette={editorUI.closeCommandPalette}
        bulkPanelOpen={editorUI.panelStates.bulkPanelOpen}
        onCloseBulkPanel={editorUI.closeBulkPanel}
        selectedPassages={bulkOps.selectedPassages}
        onTagAll={handleTagAll}
        onSelectAllUntagged={handleSelectAllUntagged}
        onSelectLowConfidence={handleSelectLowConfidence}
        onExportSelection={handleExportSelection}
        onValidate={handleValidateSelection}
        onConvert={handleConvert}
        shortcutHelpOpen={editorUI.panelStates.shortcutHelpOpen}
        onCloseShortcutHelp={editorUI.closeShortcutHelp}
        entityPanelOpen={editorUI.panelStates.entityPanelOpen}
        onCloseEntityPanel={editorUI.closeEntityPanel}
        editDialogOpen={editorUI.panelStates.editDialogOpen}
        onCloseEditDialog={editorUI.closeEditDialog}
        tagToEdit={tagSelection.tagToEdit}
        onTagAttributeUpdate={editorState.handleTagAttributeUpdate}
      />

      {/* Toolbar */}
      <EditorToolbar
        aiMode={aiState.aiMode}
        onAIModeChange={aiState.setAIMode}
        viewMode={viewMode.viewMode}
        onViewModeChange={handleViewModeChange}
        bulkPanelOpen={editorUI.panelStates.bulkPanelOpen}
        onToggleBulkPanel={editorUI.toggleBulkPanel}
        isBulkMode={bulkOps.isBulkMode}
        setIsBulkMode={bulkOps.setIsBulkMode}
        selectedPassages={bulkOps.selectedPassages}
        vizPanelOpen={editorUI.panelStates.vizPanelOpen}
        onToggleVizPanel={editorUI.toggleVizPanel}
        validationPanelOpen={editorUI.panelStates.validationPanelOpen}
        onToggleValidationPanel={editorUI.toggleValidationPanel}
        validationResults={editorState.validationResults}
        isValidating={editorState.isValidating}
        entityPanelOpen={editorUI.panelStates.entityPanelOpen}
        onToggleEntityPanel={editorUI.toggleEntityPanel}
        shortcutHelpOpen={editorUI.panelStates.shortcutHelpOpen}
        onToggleShortcutHelp={editorUI.toggleShortcutHelp}
        onInsertStructuralTag={handleInsertStructuralTag}
        loadingSample={editorState.loadingSample}
        loadingProgress={editorState.loadingProgress}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <EditorContent
          viewMode={viewMode.viewMode}
          aiMode={aiState.aiMode}
          suggestions={aiState.suggestions}
          selectedText={tagSelection.selectedText}
          onAcceptSuggestion={aiState.acceptSuggestion}
          onRejectSuggestion={aiState.rejectSuggestion}
          isBulkMode={bulkOps.isBulkMode}
          selectedPassages={bulkOps.selectedPassages}
          onSelectionChange={bulkOps.setSelectedPassages}
          onPassageClick={(passageId) => console.log('Passage clicked:', passageId)}
          highlightedPassageId={editorState.highlightedPassageId}
          onTagSelect={tagSelection.handleTagSelect}
          onTagDoubleClick={tagSelection.handleTagDoubleClick}
          selectedTag={tagSelection.selectedTag}
          codeContent={viewMode.codeContent}
          onCodeChange={viewMode.setCodeContent}
          onCodeEditorMount={handleCodeEditorMount}
          validationResults={editorState.validationResults}
          onRenderedViewScroll={handleRenderedViewScroll}
          renderedViewRef={renderedViewRef}
        />

        {/* Side Panels */}
        <EditorPanels
          vizPanelOpen={editorUI.panelStates.vizPanelOpen}
          validationPanelOpen={editorUI.panelStates.validationPanelOpen}
          validationResults={editorState.validationResults}
          onErrorClick={handleValidationErrorClick}
          onFixClick={handleValidationFixClick}
        />
      </div>

      {/* Toast Notifications */}
      <EditorToast toast={editorUI.toast} />
    </div>
  );
}

// Export types for backward compatibility
