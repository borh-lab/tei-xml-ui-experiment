'use client';

import React, { useState } from 'react';
import { TEIDocument } from '@/lib/tei';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DialogueOutlineProps {
  document: TEIDocument;
  onPassageClick: (passageId: string) => void;
  currentPassageId?: string;
}

export function DialogueOutline({
  document,
  onPassageClick,
  currentPassageId,
}: DialogueOutlineProps) {
  const dialogue = document.getDialogue();
  const divisions = document.getDivisions();

  // Group dialogue by chapter/division
  const byChapter = new Map<string, any[]>();
  dialogue.forEach((d, idx) => {
    // Try to find the chapter/division for this dialogue
    let chapter = 'unknown';

    // Check if the dialogue element has a parent division
    if (d.element && typeof d.element === 'object') {
      // Find closest division with @n attribute
      const findChapter = (obj: any): string => {
        if (!obj || typeof obj !== 'object') return '';

        if (obj['@_n']) {
          return obj['@_n'];
        }

        // Check parent references if available
        return '';
      };

      chapter = findChapter(d.element) || `section-${idx}`;
    }

    if (!byChapter.has(chapter)) {
      byChapter.set(chapter, []);
    }
    byChapter.get(chapter)!.push({ ...d, id: `passage-${idx}` });
  });

  // State for collapsible chapters
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  const toggleChapter = (chapter: string) => {
    const newCollapsed = new Set(collapsedChapters);
    if (newCollapsed.has(chapter)) {
      newCollapsed.delete(chapter);
    } else {
      newCollapsed.add(chapter);
    }
    setCollapsedChapters(newCollapsed);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <h3 className="font-semibold mb-4 text-sm">Dialogue Outline</h3>

        {divisions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Document Structure</h4>
            <div className="space-y-1">
              {divisions.map((div, idx) => (
                <div
                  key={`div-${idx}`}
                  className="text-xs p-2 text-muted-foreground"
                  style={{ paddingLeft: `${div.depth * 12}px` }}
                >
                  {div.type && (
                    <Badge variant="outline" className="mr-2 text-[10px]">
                      {div.type}
                    </Badge>
                  )}
                  {div.n && <span>Section {div.n}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {byChapter.size > 0 ? (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Dialogue Passages ({dialogue.length})
            </h4>
            {Array.from(byChapter.entries()).map(([chapter, passages]) => {
              const isCollapsed = collapsedChapters.has(chapter);
              return (
                <div key={chapter} className="mb-2">
                  <div
                    className="flex items-center gap-1 mb-1 cursor-pointer hover:bg-muted rounded p-1"
                    onClick={() => toggleChapter(chapter)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {chapter}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {passages.length} passages
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-1 ml-4">
                      {passages.map((p) => {
                        const isActive = p.id === currentPassageId;
                        const preview =
                          typeof p.content === 'string' ? p.content.substring(0, 50) : ' passages';

                        return (
                          <div
                            key={p.id}
                            className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            }`}
                            onClick={() => onPassageClick(p.id)}
                          >
                            {preview}
                            {typeof p.content === 'string' && p.content.length > 50 && '...'}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No dialogue passages found in document
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
