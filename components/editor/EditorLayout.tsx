'use client';

import React, { useState } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { TagToolbar } from './TagToolbar';
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { useHotkeys } from 'react-hotkeys-hook';

export function EditorLayout() {
  const { document } = useDocumentContext();
  const [splitPosition, setSplitPosition] = useState(50);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  const handleApplyTag = (tag: string, attrs?: Record<string, string>) => {
    console.log('Apply tag:', tag, attrs);
    // TODO: Implement actual TEI tagging in future task
  };

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
      <TagToolbar onApplyTag={handleApplyTag} />
      <div className="flex-1 flex">
        {/* Left pane - Rendered view */}
        <Card className="flex-1 m-2 overflow-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2">Rendered View</h2>
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
