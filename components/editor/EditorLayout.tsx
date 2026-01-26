'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { TagToolbar } from './TagToolbar';
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { AIModeSwitcher } from '@/components/ai/AIModeSwitcher';
import { InlineSuggestions } from '@/components/ai/InlineSuggestions';
import type { AIMode } from '@/components/ai/AIModeSwitcher';
import { DialogueSpan } from '@/lib/ai/providers';
import { useHotkeys } from 'react-hotkeys-hook';

export function EditorLayout() {
  const { document } = useDocumentContext();
  const [splitPosition, setSplitPosition] = useState(50);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiMode, setAIMode] = useState<AIMode>('manual');
  const [suggestions, setSuggestions] = useState<DialogueSpan[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

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
      <FileUpload />
      <div className="flex items-center gap-2 p-2 border-b">
        <AIModeSwitcher mode={aiMode} onModeChange={setAIMode} />
        <TagToolbar onApplyTag={handleApplyTag} />
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
          <div className="flex-1 px-4 pb-4 overflow-auto">
            <div id="rendered-view" className="prose">
              <p>{document.parsed.TEI.text.body.p}</p>
            </div>
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
      </div>
    </div>
  );
}
