'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDocumentService } from '@/lib/effect';
import { serializeDocument } from '@/lib/tei/operations';
import { Card } from '@/components/ui/card';
import { TagToolbar } from './TagToolbar';
import { ExportButton } from './ExportButton';
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { AIModeSwitcher } from '@/components/ai/AIModeSwitcher';
import { InlineSuggestions } from '@/components/ai/InlineSuggestions';
import { BulkOperationsPanel } from './BulkOperationsPanel';
import { RenderedView } from './RenderedView';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import type { AIMode } from '@/components/ai/AIModeSwitcher';
import { DialogueSpan } from '@/lib/ai/providers';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db/PatternDB';
import { KeyboardShortcutHelp } from '@/components/keyboard/KeyboardShortcutHelp';
import { EntityEditorPanel } from '@/components/editor/EntityEditorPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, X, Navigation, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';
import { SelectionManager } from '@/lib/selection/SelectionManager';
import type { TagInfo } from '@/lib/selection/types';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import { TagBreadcrumb } from './TagBreadcrumb';
import { TagEditDialog } from './TagEditDialog';
import { XMLCodeEditor } from './XMLCodeEditor';
import { StructuralTagPalette } from './StructuralTagPalette';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Issue {
  type: 'error' | 'warning';
  message: string;
  location: { index: number; dialogueIndex?: number };
}

type ViewMode = 'wysiwyg' | 'xml' | 'split';

export function EditorLayout() {
  const {
    document,
    updateDocument,
    loadingSample,
    loadingProgress,
    validationResults,
    isValidating,
  } = useDocumentService();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiMode, setAIMode] = useState<AIMode>('manual');
  const [suggestions, setSuggestions] = useState<DialogueSpan[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [vizPanelOpen, setVizPanelOpen] = useState(false);
  const [validationPanelOpen, setValidationPanelOpen] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [activePassageIndex, setActivePassageIndex] = useState<number>(-1);
  const [entityPanelOpen, setEntityPanelOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<TagInfo | null>(null);

  // Split view editing state
  const [viewMode, setViewMode] = useState<ViewMode>('wysiwyg');
  const [codeContent, setCodeContent] = useState<string>('');
  const [isCodeDirty, setIsCodeDirty] = useState(false);
  const [scrollSyncEnabled] = useState(true);

  // Refs for scroll synchronization
  const renderedViewRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<any>(null);
  const isScrollingRef = useRef<{ rendered: boolean; code: boolean }>({
    rendered: false,
    code: false,
  });

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('tei-editor-view-mode') as ViewMode | null;
    if (savedMode && ['wysiwyg', 'xml', 'split'].includes(savedMode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initializing from localStorage on mount
      setViewMode(savedMode);
    }
  }, []);

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('tei-editor-view-mode', viewMode);
  }, [viewMode]);

  // Sync code content with document
  useEffect(() => {
    if (document && !isCodeDirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing state with document prop
      setCodeContent(serializeDocument(document));
    }
  }, [document, isCodeDirty]);

  // Debounce code changes for validation
  const debouncedCodeContent = useDebounce(codeContent, 300);

  // Maintain a single SelectionManager instance to avoid inefficient re-instantiation
  const selectionManagerRef = useRef(new SelectionManager());

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    setBulkPanelOpen(!bulkPanelOpen);
  });

  // Helper function to show toast messages
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // AI suggestion handlers (must be defined before useHotkeys that use them)
  const handleAcceptSuggestion = (suggestion: DialogueSpan) => {
    console.log('Accept suggestion:', suggestion);
    // TODO: Apply TEI tag with suggestion data
    setSuggestions((prev) =>
      prev.filter((s) => !(s.start === suggestion.start && s.end === suggestion.end))
    );
  };

  const handleRejectSuggestion = (suggestion: DialogueSpan) => {
    console.log('Reject suggestion:', suggestion);
    setSuggestions((prev) =>
      prev.filter((s) => !(s.start === suggestion.start && s.end === suggestion.end))
    );
  };

  // Helper function to check if user is in an input field
  const isInputFocused = () => {
    const activeElement = window.document?.activeElement;
    if (!activeElement) return false;
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement.getAttribute('contenteditable') === 'true'
    );
  };

  // Helper function to get all passage IDs from the document
  const getPassageIds = () => {
    if (!document) return [];
    const p = document.parsed.TEI.text.body.p;
    const paragraphs = Array.isArray(p) ? p : p ? [p] : [];
    return paragraphs.map((_, idx) => `passage-${idx}`);
  };

  // Generic handler for applying tags to selected text
  const handleApplyTag = useCallback(
    (tag: string, attrs?: Record<string, string>) => {
      if (!document) return;

      const selectionManager = selectionManagerRef.current;
      const selectionRange = selectionManager.captureSelection();

      if (!selectionRange) {
        showToast('No text selected - Select text first, then click tag button', 'error');
        return;
      }

      // Extract passage index from passageId with validation
      const passageIndex = parseInt(selectionRange.passageId.split('-')[1], 10);
      if (isNaN(passageIndex)) {
        showToast('Invalid passage ID', 'error');
        return;
      }

      try {
        // Use the generic wrapTextInTag method
        document.wrapTextInTag(
          passageIndex,
          selectionRange.startOffset,
          selectionRange.endOffset,
          tag,
          attrs
        );

        // Update document in context
        const updatedXML = serializeDocument(document);
        updateDocument(updatedXML);

        // Success message
        const tagDisplay = attrs
          ? `<${tag} ${Object.entries(attrs)
              .map(([k, v]) => `${k}="${v}"`)
              .join(' ')}>`
          : `<${tag}>`;
        showToast(`Applied ${tagDisplay}`, 'success');

        // Wait for React to re-render the updated document before restoring selection
        // This delay ensures the DOM is updated with the new tag
        setTimeout(() => {
          selectionManager.restoreSelection({
            start: selectionRange.startOffset,
            end: selectionRange.endOffset,
            passageId: selectionRange.passageId,
          });
        }, 100);
      } catch (error) {
        console.error('Failed to apply tag:', error);
        showToast('Failed to apply tag - See console for details', 'error');
      }
    },
    [document, updateDocument]
  );

  // Keyboard shortcut: ? (Shift+/) - Show keyboard shortcuts help
  useHotkeys(
    'shift+/',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      setShortcutHelpOpen(true);
      showToast('Keyboard shortcuts help opened', 'info');
    },
    [isInputFocused]
  );

  // Keyboard shortcut: ⌘E - Toggle entity editor
  useHotkeys('cmd+e', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    setEntityPanelOpen(!entityPanelOpen);
  });
  useHotkeys(
    'shift+/',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      setShortcutHelpOpen(true);
      showToast('Keyboard shortcuts help opened', 'info');
    },
    [isInputFocused]
  );

  // Keyboard shortcut: J - Navigate to next passage
  useHotkeys(
    'j',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();

      const passages = getPassageIds();
      if (passages.length === 0) {
        showToast('No passages to navigate', 'error');
        return;
      }

      const nextIndex = Math.min(activePassageIndex + 1, passages.length - 1);
      const passageId = passages[nextIndex];

      setActivePassageIndex(nextIndex);
      setCurrentPassageId(passageId);
      setHighlightedPassageId(passageId);

      setTimeout(() => {
        const element = globalThis.document?.getElementById(passageId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => setHighlightedPassageId(null), 3000);
        }
      }, 100);

      showToast(`Passage ${nextIndex + 1}/${passages.length}`, 'info');
    },
    [isInputFocused, activePassageIndex, document]
  );

  // Keyboard shortcut: K - Navigate to previous passage
  useHotkeys(
    'k',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();

      const passages = getPassageIds();
      if (passages.length === 0) {
        showToast('No passages to navigate', 'error');
        return;
      }

      const prevIndex = Math.max(activePassageIndex - 1, 0);
      const passageId = passages[prevIndex];

      setActivePassageIndex(prevIndex);
      setCurrentPassageId(passageId);
      setHighlightedPassageId(passageId);

      setTimeout(() => {
        const element = globalThis.document?.getElementById(passageId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => setHighlightedPassageId(null), 3000);
        }
      }, 100);

      showToast(`Passage ${prevIndex + 1}/${passages.length}`, 'info');
    },
    [isInputFocused, activePassageIndex, document]
  );

  // Keyboard shortcuts: 1-9 - Quick tag as speaker 1-9
  // Unrolled loop to satisfy Rules of Hooks
  useHotkeys(
    '1',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 1', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker1' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '2',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 2', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker2' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '3',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 3', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker3' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '4',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 4', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker4' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '5',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 5', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker5' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '6',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 6', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker6' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '7',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 7', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker7' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '8',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 8', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker8' });
    },
    [isInputFocused, handleApplyTag]
  );
  useHotkeys(
    '9',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      if (!selectedText || selectedText.trim().length === 0) {
        showToast('No text selected - Select text first, then press 9', 'error');
        return;
      }
      handleApplyTag('said', { '@who': 'speaker9' });
    },
    [isInputFocused, handleApplyTag]
  );

  // Keyboard shortcut: A - Accept first AI suggestion
  useHotkeys(
    'a',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();

      if (suggestions.length === 0) {
        showToast('No AI suggestions to accept', 'error');
        return;
      }

      // Accept the first suggestion
      const suggestion = suggestions[0];
      handleAcceptSuggestion(suggestion);
      showToast('AI suggestion accepted', 'success');
    },
    [isInputFocused, suggestions]
  );

  // Keyboard shortcut: X - Reject first AI suggestion
  useHotkeys(
    'x',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();

      if (suggestions.length === 0) {
        showToast('No AI suggestions to reject', 'error');
        return;
      }

      // Reject the first suggestion
      const suggestion = suggestions[0];
      handleRejectSuggestion(suggestion);
      showToast('AI suggestion rejected', 'info');
    },
    [isInputFocused, suggestions]
  );

  const handleTagAll = async (speakerId: string) => {
    if (!document) return;

    const newDoc = { ...document };
    const paragraphs = newDoc.parsed.TEI.text.body.p;
    const passagesToTag = [...selectedPassages]; // Copy before clearing

    selectedPassages.forEach((index) => {
      if (paragraphs[index] && paragraphs[index].said) {
        paragraphs[index].said = paragraphs[index].said.map((s: any) => ({
          ...s,
          '@who': speakerId,
        }));
      }
    });

    // Serialize and update document
    const updatedXML = serializeDocument(document);
    updateDocument(updatedXML);
    setSelectedPassages([]);

    // Log to pattern database
    await db.logCorrection('bulk_tag', speakerId, passagesToTag, 1.0, 'middle');
  };

  const handleSelectAllUntagged = () => {
    if (!document) return;

    const untaggedIndices = new Set<number>();
    const paragraphs = document.parsed.TEI.text.body.p;

    paragraphs.forEach((para: any, index: number) => {
      const hasUntagged = para.said?.some((s: any) => !s['@who'] || s['@who'] === '');
      if (hasUntagged) {
        untaggedIndices.add(index);
      }
    });

    setSelectedPassages(Array.from(untaggedIndices).map(String));
  };

  const handleSelectLowConfidence = () => {
    console.log('Selecting low confidence passages');
    // TODO: Implement selection logic
  };

  const handleExportSelection = () => {
    if (!document || selectedPassages.length === 0) return;

    const selectedParagraphs = selectedPassages.map(
      (index) => document.parsed.TEI.text.body.p[Number(index)]
    );

    const data = JSON.stringify(selectedParagraphs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = `tei-export-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleValidateSelection = async () => {
    if (!document || selectedPassages.length === 0) return;

    const issues: Issue[] = [];
    const paragraphs = document.parsed.TEI.text.body.p;

    selectedPassages.forEach((indexStr) => {
      const index = Number(indexStr);
      const para = paragraphs[index];
      if (!para.said) {
        issues.push({
          type: 'warning',
          message: `Paragraph ${index + 1}: No dialogue found`,
          location: { index },
        });
      } else {
        para.said.forEach((s: any, i: number) => {
          if (!s['@who'] || s['@who'] === '') {
            issues.push({
              type: 'error',
              message: `Paragraph ${index + 1}, dialogue ${i + 1}: Untagged speaker`,
              location: { index, dialogueIndex: i },
            });
          }
        });
      }
    });

    // Show issues in UI
    console.log('Validation issues:', issues);
    return issues;
  };

  const handleConvert = () => {
    console.log('Converting selected passages to dialogue');
    // TODO: Implement conversion logic
  };

  const handleValidationErrorClick = (error: any) => {
    console.log('Validation error clicked:', error);
    // TODO: Navigate to error location in editor
    if (error.line) {
      showToast(`Error at line ${error.line}: ${error.message}`, 'error');
    }
  };

  const handleValidationFixClick = (suggestion: any) => {
    console.log('Fix suggestion clicked:', suggestion);
    // TODO: Apply fix to document
    showToast('Fix suggestions not yet implemented', 'info');
  };

  // Handle tag selection from RenderedView or Breadcrumb
  const handleTagSelect = useCallback(
    (tagInfo: TagInfo) => {
      setSelectedTag(tagInfo);
      showToast(`Selected tag: <${tagInfo.tagName}>`, 'info');

      // Add visual selection indicator to element
      if (tagInfo.element) {
        tagInfo.element.setAttribute('data-selected', 'true');
      }
    },
    [showToast]
  );

  // Handle tag double-click to open edit dialog
  const handleTagDoubleClick = useCallback(
    (tagInfo: TagInfo) => {
      setTagToEdit(tagInfo);
      setEditDialogOpen(true);
      showToast(`Editing tag: <${tagInfo.tagName}>`, 'info');
    },
    [showToast]
  );

  // Handle tag attribute updates from edit dialog
  const handleTagAttributeUpdate = useCallback(
    (tagName: string, attributes: Record<string, string>) => {
      if (!document || !tagToEdit) return;

      try {
        // Find the element and update its attributes
        const element = tagToEdit.element;
        if (!element) {
          showToast('Element not found', 'error');
          return;
        }

        // Update data attributes on the element
        Object.entries(attributes).forEach(([key, value]) => {
          element.setAttribute(`data-${key}`, value);
        });

        // Update the document structure
        // This is a simplified implementation - in production, you'd want to
        // update the underlying TEIDocument model and re-serialize
        const updatedXML = serializeDocument(document);
        updateDocument(updatedXML);

        showToast(`Updated <${tagName}> attributes`, 'success');
      } catch (error) {
        console.error('Failed to update tag attributes:', error);
        showToast('Failed to update tag attributes', 'error');
      }
    },
    [document, tagToEdit, updateDocument, showToast]
  );

  // Simulate AI detection when in suggest or auto mode
  useEffect(() => {
    let isMounted = true;

    async function detectDialogue() {
      if (!document || aiMode === 'manual') return;

      const text = document.parsed.TEI.text.body.p || '';

      // Simulate AI dialogue detection (placeholder until Task 13)
      const detectedSpans: DialogueSpan[] = [];
      const quoteRegex = /"([^"]+)"/g;
      let match;

      while ((match = quoteRegex.exec(text)) !== null) {
        detectedSpans.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          confidence: 0.7 + Math.random() * 0.25, // Random confidence between 0.7 and 0.95
        });
      }

      if (isMounted) {
        setSuggestions(detectedSpans);
      }
    }

    detectDialogue();

    return () => {
      isMounted = false;
    };
  }, [aiMode, document]); // Include document in dependencies

  // Track text selection for highlighting
  useEffect(() => {
    // Guard for SSR/test environment
    if (
      typeof window === 'undefined' ||
      typeof globalThis.document === 'undefined' ||
      !globalThis.document?.addEventListener
    ) {
      return;
    }

    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      setSelectedText(text);
    };

    globalThis.document.addEventListener('selectionchange', handleSelection);
    return () => {
      globalThis.document.removeEventListener('selectionchange', handleSelection);
    };
  }, []); // No dependencies needed

  // Handle code editor changes with debounced validation
  useEffect(() => {
    if (!debouncedCodeContent || debouncedCodeContent === codeContent) return;

    // Validate and update document from code changes
    const updateFromCode = async () => {
      try {
        await updateDocument(debouncedCodeContent);
        setIsCodeDirty(false);
      } catch (error) {
        console.error('Failed to update document from code:', error);
        // Document remains in previous state on validation error
        showToast('Validation failed - Please fix XML errors', 'error');
      }
    };

    updateFromCode();
  }, [debouncedCodeContent]);

  // Handle view mode switching
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      showToast(`Switched to ${mode.toUpperCase()} view`, 'info');
    },
    [showToast]
  );

  // Handle code editor content changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCodeContent(newCode);
    setIsCodeDirty(true);
  }, []);

  // Handle structural tag insertion
  const handleInsertStructuralTag = useCallback(
    (tagName: string) => {
      if (!document) return;

      // For now, just show a message
      // In a full implementation, you would:
      // 1. Get cursor position from Monaco editor
      // 2. Insert the tag at that position
      // 3. Validate the insertion
      showToast(`Insert <${tagName}> at cursor position`, 'info');
    },
    [document, showToast]
  );

  // Handle scroll synchronization
  const handleRenderedViewScroll = useCallback(() => {
    if (!scrollSyncEnabled || isScrollingRef.current.code) return;

    isScrollingRef.current.rendered = true;

    if (renderedViewRef.current && codeEditorRef.current) {
      const renderedScrollTop = renderedViewRef.current.scrollTop;
      const renderedScrollHeight =
        renderedViewRef.current.scrollHeight - renderedViewRef.current.clientHeight;
      const scrollPercentage = renderedScrollTop / renderedScrollHeight;

      // Sync to code editor (approximate line-based scroll)
      const editor = codeEditorRef.current;
      if (editor) {
        const lineCount = editor.getModel()?.getLineCount() || 1;
        const targetLine = Math.floor(lineCount * scrollPercentage);
        editor.revealLine(targetLine);
      }
    }

    setTimeout(() => {
      isScrollingRef.current.rendered = false;
    }, 100);
  }, [scrollSyncEnabled]);

  const handleCodeEditorScroll = useCallback(() => {
    if (!scrollSyncEnabled || isScrollingRef.current.rendered) return;

    isScrollingRef.current.code = true;

    if (codeEditorRef.current && renderedViewRef.current) {
      const editor = codeEditorRef.current;
      const visibleRanges = editor.getVisibleRanges();
      const lineCount = editor.getModel()?.getLineCount() || 1;

      if (visibleRanges.length > 0) {
        const firstVisibleLine = visibleRanges[0].startLineNumber;
        const scrollPercentage = firstVisibleLine / lineCount;

        // Sync to rendered view
        const renderedScrollHeight =
          renderedViewRef.current.scrollHeight - renderedViewRef.current.clientHeight;
        renderedViewRef.current.scrollTop = scrollPercentage * renderedScrollHeight;
      }
    }

    setTimeout(() => {
      isScrollingRef.current.code = false;
    }, 100);
  }, [scrollSyncEnabled]);

  // Handle code editor mounting
  const handleCodeEditorMount = useCallback(
    (editor: any) => {
      codeEditorRef.current = editor;

      // Add scroll listener for sync
      editor.onDidScrollChange(() => {
        handleCodeEditorScroll();
      });
    },
    [handleCodeEditorScroll]
  );

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <BulkOperationsPanel
        isOpen={bulkPanelOpen}
        onClose={() => setBulkPanelOpen(false)}
        selectedPassages={selectedPassages}
        onTagAll={handleTagAll}
        onSelectAllUntagged={handleSelectAllUntagged}
        onSelectLowConfidence={handleSelectLowConfidence}
        onExportSelection={handleExportSelection}
        onValidate={handleValidateSelection}
        onConvert={handleConvert}
      />
      <KeyboardShortcutHelp open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
      <EntityEditorPanel open={entityPanelOpen} onClose={() => setEntityPanelOpen(false)} />
      <TagEditDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        tagInfo={tagToEdit}
        onApply={handleTagAttributeUpdate}
      />
      <TagBreadcrumb onTagSelect={handleTagSelect} />
      <div className="flex items-center gap-2 p-2 border-b">
        <MobileNavigation />
        <AIModeSwitcher mode={aiMode} onModeChange={setAIMode} />

        {/* View Mode Toggles */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant={viewMode === 'wysiwyg' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewModeChange('wysiwyg')}
            title="WYSIWYG View"
          >
            WYSIWYG
          </Button>
          <Button
            variant={viewMode === 'xml' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewModeChange('xml')}
            title="XML Code View"
          >
            XML
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewModeChange('split')}
            title="Split View"
          >
            Split
          </Button>
        </div>

        {/* Structural Tag Palette (only visible in XML or Split mode) */}
        {(viewMode === 'xml' || viewMode === 'split') && (
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <StructuralTagPalette onInsertTag={handleInsertStructuralTag} disabled={false} />
          </div>
        )}

        <TagToolbar onApplyTag={handleApplyTag} />
        <Button
          variant={bulkPanelOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setBulkPanelOpen(!bulkPanelOpen);
            setIsBulkMode(!bulkPanelOpen);
          }}
        >
          Bulk Operations ({selectedPassages.length})
          <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘B</kbd>
        </Button>
        <Button
          variant={vizPanelOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setVizPanelOpen(!vizPanelOpen)}
        >
          Visualizations
        </Button>
        <Button
          variant={validationPanelOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setValidationPanelOpen(!validationPanelOpen)}
          className={
            validationResults && !validationResults.valid ? 'border-red-500 text-red-600' : ''
          }
        >
          Validation
          {isValidating && <span className="ml-2 text-xs">Validating...</span>}
          {validationResults && !validationResults.valid && (
            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
              {validationResults.errors.length} errors
            </span>
          )}
        </Button>
        <ExportButton />
        <Button
          variant={entityPanelOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEntityPanelOpen(!entityPanelOpen)}
        >
          Entities
          <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘E</kbd>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShortcutHelpOpen(true)}
          title="Keyboard shortcuts (Press ?)"
        >
          <HelpCircle className="h-4 w-4" />
          <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">?</kbd>
        </Button>
        {loadingSample && (
          <div className="flex-1 max-w-xs ml-4">
            <Progress value={loadingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Loading sample... {loadingProgress}%
            </p>
          </div>
        )}
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* WYSIWYG View (default) */}
        {viewMode === 'wysiwyg' && (
          <>
            {/* Rendered view with AI suggestions */}
            <Card className="flex-1 m-2 overflow-auto flex flex-col">
              <div className="p-4 flex-shrink-0">
                <h2 className="text-lg font-semibold mb-2">Rendered View</h2>
              </div>

              {/* AI Suggestions Panel */}
              {aiMode !== 'manual' && suggestions.length > 0 && (
                <div className="px-4 pb-2 flex-shrink-0">
                  <InlineSuggestions
                    suggestions={suggestions}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                    highlightedText={selectedText}
                  />
                </div>
              )}

              {/* Rendered content */}
              <div className="flex-1 overflow-auto">
                <RenderedView
                  isBulkMode={isBulkMode}
                  selectedPassages={selectedPassages}
                  onSelectionChange={setSelectedPassages}
                  onPassageClick={(passageId) => console.log('Passage clicked:', passageId)}
                  highlightedPassageId={highlightedPassageId}
                  onTagSelect={handleTagSelect}
                  onTagDoubleClick={handleTagDoubleClick}
                  selectedTag={selectedTag}
                />
              </div>
            </Card>

            {/* Old Source view (hidden in WYSIWYG mode, shown for backward compatibility) */}
            <div className="hidden">
              <Card className="flex-1 m-2 overflow-auto">
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2">TEI Source</h2>
                  <pre className="text-sm bg-muted p-2 rounded">{serializeDocument(document)}</pre>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* XML-only View */}
        {viewMode === 'xml' && (
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
                onChange={handleCodeChange}
                onMount={handleCodeEditorMount}
                errors={
                  validationResults?.errors.map((e) => ({
                    line: e.line || 1,
                    message: e.message,
                  })) || []
                }
                readOnly={false}
                height="100%"
              />
            </div>
          </Card>
        )}

        {/* Split View */}
        {viewMode === 'split' && (
          <>
            {/* Left pane - Rendered view */}
            <Card className="flex-1 m-2 overflow-auto flex flex-col">
              <div className="p-4 flex-shrink-0">
                <h2 className="text-lg font-semibold mb-2">Rendered View</h2>
              </div>

              {/* AI Suggestions Panel */}
              {aiMode !== 'manual' && suggestions.length > 0 && (
                <div className="px-4 pb-2 flex-shrink-0">
                  <InlineSuggestions
                    suggestions={suggestions}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                    highlightedText={selectedText}
                  />
                </div>
              )}

              {/* Rendered content */}
              <div
                ref={renderedViewRef}
                className="flex-1 overflow-auto"
                onScroll={handleRenderedViewScroll}
              >
                <RenderedView
                  isBulkMode={isBulkMode}
                  selectedPassages={selectedPassages}
                  onSelectionChange={setSelectedPassages}
                  onPassageClick={(passageId) => console.log('Passage clicked:', passageId)}
                  highlightedPassageId={highlightedPassageId}
                  onTagSelect={handleTagSelect}
                  onTagDoubleClick={handleTagDoubleClick}
                  selectedTag={selectedTag}
                />
              </div>
            </Card>

            {/* Resizer */}
            <div className="w-1 bg-border cursor-col-resize hover:bg-primary" />

            {/* Right pane - XML Code Editor */}
            <Card className="flex-1 m-2 overflow-auto flex flex-col">
              <div className="p-4 flex-shrink-0">
                <h2 className="text-lg font-semibold mb-2">XML Code</h2>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-auto">
                <XMLCodeEditor
                  value={codeContent}
                  onChange={handleCodeChange}
                  onMount={handleCodeEditorMount}
                  errors={
                    validationResults?.errors.map((e) => ({
                      line: e.line || 1,
                      message: e.message,
                    })) || []
                  }
                  readOnly={false}
                  height="100%"
                />
              </div>
            </Card>
          </>
        )}

        {/* Visualization Panel (toggleable sidebar) */}
        {vizPanelOpen && (
          <>
            <div className="w-1 bg-border" />
            <VisualizationPanel />
          </>
        )}

        {/* Validation Panel (toggleable sidebar) */}
        {validationPanelOpen && (
          <>
            <div className="w-1 bg-border" />
            <Card className="w-96 m-2 overflow-auto">
              <div className="p-4">
                <ValidationPanel
                  validationResults={validationResults}
                  onErrorClick={handleValidationErrorClick}
                  onFixClick={handleValidationFixClick}
                  visible={validationPanelOpen}
                />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <Alert
            className={`shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                : toast.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {toast.type === 'error' && <X className="h-4 w-4 text-red-600" />}
            {toast.type === 'info' && <Navigation className="h-4 w-4 text-blue-600" />}
            <AlertDescription className="text-sm ml-2">{toast.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
