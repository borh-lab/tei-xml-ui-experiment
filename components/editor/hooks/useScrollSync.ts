'use client';

import { useRef, useCallback } from 'react';

export interface MonacoEditor {
  getModel?: () => { getLineCount: () => number } | null;
  revealLine: (line: number) => void;
  getVisibleRanges: () => { startLineNumber: number }[];
  onDidScrollChange: (callback: () => void) => void;
}

export interface UseScrollSyncResult {
  renderedViewRef: React.RefObject<HTMLDivElement | null>;
  codeEditorRef: React.RefObject<MonacoEditor | null>;
  handleRenderedViewScroll: () => void;
  handleCodeEditorScroll: () => void;
  handleCodeEditorMount: (editor: MonacoEditor) => void;
}

/**
 * Manages scroll synchronization between rendered view and code editor.
 *
 * Used in split view mode to keep both views in sync when scrolling.
 */
export function useScrollSync(): UseScrollSyncResult {
  const renderedViewRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<MonacoEditor | null>(null);
  const isScrollingRef = useRef<{ rendered: boolean; code: boolean }>({
    rendered: false,
    code: false,
  });

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

  const handleCodeEditorMount = useCallback(
    (editor: MonacoEditor) => {
      codeEditorRef.current = editor;
      editor.onDidScrollChange(() => {
        handleCodeEditorScroll();
      });
    },
    [handleCodeEditorScroll]
  );

  return {
    renderedViewRef,
    codeEditorRef,
    handleRenderedViewScroll,
    handleCodeEditorScroll,
    handleCodeEditorMount,
  };
}
