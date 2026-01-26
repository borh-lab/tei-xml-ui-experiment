'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { TagToolbar } from './TagToolbar';
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

interface Issue {
  type: 'error' | 'warning';
  message: string;
  location: { index: number; dialogueIndex?: number };
}

export function EditorLayout() {
  const { document, updateDocument } = useDocumentContext();
  const [splitPosition, setSplitPosition] = useState(50);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiMode, setAIMode] = useState<AIMode>('manual');
  const [suggestions, setSuggestions] = useState<DialogueSpan[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [vizPanelOpen, setVizPanelOpen] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    setBulkPanelOpen(!bulkPanelOpen);
  });

  const handleTagAll = async (speakerId: string) => {
    if (!document) return;

    const newDoc = { ...document };
    const paragraphs = newDoc.parsed.TEI.text.body.p;
    const passagesToTag = [...selectedPassages]; // Copy before clearing

    selectedPassages.forEach(index => {
      if (paragraphs[index] && paragraphs[index].said) {
        paragraphs[index].said = paragraphs[index].said.map(s => ({
          ...s,
          '@who': speakerId
        }));
      }
    });

    // Serialize and update document
    const updatedXML = newDoc.serialize();
    updateDocument(updatedXML);
    setSelectedPassages([]);

    // Log to pattern database
    await db.logCorrection(
      'bulk_tag',
      speakerId,
      passagesToTag,
      1.0,
      'bulk'
    );
  };

  const handleSelectAllUntagged = () => {
    if (!document) return;

    const untaggedIndices = new Set<number>();
    const paragraphs = document.parsed.TEI.text.body.p;

    paragraphs.forEach((para, index) => {
      const hasUntagged = para.said?.some(s => !s['@who'] || s['@who'] === '');
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

    const a = document.createElement('a');
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
        para.said.forEach((s, i) => {
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
    if (document && (aiMode === 'suggest' || aiMode === 'auto')) {
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

      setSuggestions(detectedSpans);
    } else {
      setSuggestions([]);
    }
  }, [document, aiMode]);

  // Track text selection for highlighting
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      setSelectedText(text);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

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
      <FileUpload />
      <div className="flex items-center gap-2 p-2 border-b">
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
            />
          </div>
        </Card>

        {/* Resizer */}
        <div
          className="w-1 bg-border cursor-col-resize hover:bg-primary"
          style={{ left: `${splitPosition}%` }}
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
    </div>
  );
}
