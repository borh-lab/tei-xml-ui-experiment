'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, X, Navigation, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';

interface Issue {
  type: 'error' | 'warning';
  message: string;
  location: { index: number; dialogueIndex?: number };
}

export function EditorLayout() {
  const { document, updateDocument, loadingSample, loadingProgress } = useDocumentContext();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiMode, setAIMode] = useState<AIMode>('manual');
  const [suggestions, setSuggestions] = useState<DialogueSpan[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [vizPanelOpen, setVizPanelOpen] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);
  const [currentPassageId, setCurrentPassageId] = useState<string | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activePassageIndex, setActivePassageIndex] = useState<number>(-1);

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    setBulkPanelOpen(!bulkPanelOpen);
  });

  // Helper function to show toast messages
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper function to check if user is in an input field
  const isInputFocused = () => {
    const activeElement = window.document?.activeElement;
    if (!activeElement) return false;
    return activeElement instanceof HTMLInputElement ||
           activeElement instanceof HTMLTextAreaElement ||
           activeElement.getAttribute('contenteditable') === 'true';
  };

  // Helper function to get all passage IDs from the document
  const getPassageIds = () => {
    if (!document) return [];
    const p = document.parsed.TEI.text.body.p;
    const paragraphs = Array.isArray(p) ? p : (p ? [p] : []);
    return paragraphs.map((_, idx) => `passage-${idx}`);
  };

  // Keyboard shortcut: ? (Shift+/) - Show keyboard shortcuts help
  useHotkeys('shift+/', (e) => {
    if (isInputFocused()) return;
    e.preventDefault();
    setShortcutHelpOpen(true);
    showToast('Keyboard shortcuts help opened', 'info');
  }, [isInputFocused]);

  // Keyboard shortcut: J - Navigate to next passage
  useHotkeys('j', (e) => {
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
  }, [isInputFocused, activePassageIndex, document]);

  // Keyboard shortcut: K - Navigate to previous passage
  useHotkeys('k', (e) => {
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
  }, [isInputFocused, activePassageIndex, document]);

  // Keyboard shortcuts: 1-9 - Quick tag as speaker 1-9
  for (let i = 1; i <= 9; i++) {
    useHotkeys(
      String(i),
      (e) => {
        if (isInputFocused()) return;
        e.preventDefault();

        const speakerId = `speaker${i}`;
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '';

        if (!selectedText || selectedText.trim().length === 0) {
          showToast(`No text selected - Select text first, then press ${i}`, 'error');
          return;
        }

        handleApplyTag('said', { '@who': speakerId });
        showToast(`Tagged as ${speakerId}`, 'success');
      },
      [isInputFocused]
    );
  }

  // Keyboard shortcut: A - Accept first AI suggestion
  useHotkeys('a', (e) => {
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
  }, [isInputFocused, suggestions]);

  // Keyboard shortcut: X - Reject first AI suggestion
  useHotkeys('x', (e) => {
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
  }, [isInputFocused, suggestions]);

  const handleTagAll = async (speakerId: string) => {
    if (!document) return;

    const newDoc = { ...document };
    const paragraphs = newDoc.parsed.TEI.text.body.p;
    const passagesToTag = [...selectedPassages]; // Copy before clearing

    selectedPassages.forEach(index => {
      if (paragraphs[index] && paragraphs[index].said) {
        paragraphs[index].said = paragraphs[index].said.map((s: any) => ({
          ...s,
          '@who': speakerId
        }));
      }
    });

    // Serialize and update document
    const updatedXML = document.serialize();
    updateDocument(updatedXML);
    setSelectedPassages([]);

    // Log to pattern database
    await db.logCorrection(
      'bulk_tag',
      speakerId,
      passagesToTag,
      1.0,
      'middle'
    );
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
      index => document.parsed.TEI.text.body.p[Number(index)]
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

    selectedPassages.forEach(indexStr => {
      const index = Number(indexStr);
      const para = paragraphs[index];
      if (!para.said) {
        issues.push({
          type: 'warning',
          message: `Paragraph ${index + 1}: No dialogue found`,
          location: { index }
        });
      } else {
        para.said.forEach((s: any, i: number) => {
          if (!s['@who'] || s['@who'] === '') {
            issues.push({
              type: 'error',
              message: `Paragraph ${index + 1}, dialogue ${i + 1}: Untagged speaker`,
              location: { index, dialogueIndex: i }
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

  const handleApplyTag = (tag: string, attrs?: Record<string, string>) => {
    console.log('Apply tag:', tag, attrs);
    // TODO: Implement actual TEI tagging in future task
  };

  const handleAcceptSuggestion = (suggestion: DialogueSpan) => {
    console.log('Accept suggestion:', suggestion);
    // TODO: Apply TEI tag with suggestion data
    setSuggestions(prev => prev.filter(s =>
      !(s.start === suggestion.start && s.end === suggestion.end)
    ));
  };

  const handleRejectSuggestion = (suggestion: DialogueSpan) => {
    console.log('Reject suggestion:', suggestion);
    setSuggestions(prev => prev.filter(s =>
      !(s.start === suggestion.start && s.end === suggestion.end)
    ));
  };

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
          confidence: 0.7 + Math.random() * 0.25 // Random confidence between 0.7 and 0.95
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
    if (typeof window === 'undefined' || typeof globalThis.document === 'undefined' || !globalThis.document?.addEventListener) {
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
      <KeyboardShortcutHelp
        open={shortcutHelpOpen}
        onClose={() => setShortcutHelpOpen(false)}
      />
      <div className="flex items-center gap-2 p-2 border-b">
        <MobileNavigation />
        <AIModeSwitcher mode={aiMode} onModeChange={setAIMode} />
        <TagToolbar onApplyTag={handleApplyTag} />
        <Button
          variant={bulkPanelOpen ? "default" : "outline"}
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
          variant={vizPanelOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setVizPanelOpen(!vizPanelOpen)}
        >
          Visualizations
        </Button>
        <ExportButton />
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
            <p className="text-xs text-muted-foreground mt-1">Loading sample... {loadingProgress}%</p>
          </div>
        )}
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane - Rendered view with AI suggestions */}
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
            />
          </div>
        </Card>

        {/* Resizer */}
        <div
          className="w-1 bg-border cursor-col-resize hover:bg-primary"
        />

        {/* Right pane - Source view */}
        <Card className="flex-1 m-2 overflow-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2">TEI Source</h2>
            <pre className="text-sm bg-muted p-2 rounded">
              {document.serialize()}
            </pre>
          </div>
        </Card>

        {/* Visualization Panel (toggleable sidebar) */}
        {vizPanelOpen && (
          <>
            <div className="w-1 bg-border" />
            <VisualizationPanel />
          </>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <Alert className={`shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' :
            toast.type === 'error' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' :
            'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {toast.type === 'error' && <X className="h-4 w-4 text-red-600" />}
            {toast.type === 'info' && <Navigation className="h-4 w-4 text-blue-600" />}
            <AlertDescription className="text-sm ml-2">
              {toast.message}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
