'use client';

import { useState } from 'react';
import type { TEIDocument } from '@/lib/tei';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Info } from 'lucide-react';

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
  const dialogue = document.state.dialogue;
  const passages = document.state.passages;

  // Group dialogue by passage
  const byPassage = new Map<string, typeof dialogue>();
  dialogue.forEach((d) => {
    const passageId = d.passageId;
    const existing = byPassage.get(passageId);
    byPassage.set(passageId, [...(existing || []), d]);
  });

  // State for collapsible passages
  const [collapsedPassages, setCollapsedPassages] = useState<Set<string>>(new Set());

  const togglePassage = (passageId: string) => {
    const newCollapsed = new Set(collapsedPassages);
    if (newCollapsed.has(passageId)) {
      newCollapsed.delete(passageId);
    } else {
      newCollapsed.add(passageId);
    }
    setCollapsedPassages(newCollapsed);
  };

  if (dialogue.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No dialogue in document</div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Dialogue Passages ({dialogue.length} in {byPassage.size} passages)
            </h4>
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <Info className="h-3 w-3" />
              feature-useEffectCorpus
            </Badge>
          </div>
          {Array.from(byPassage.entries()).map(([passageId, passageDialogues]) => {
            const passage = passages.find((p) => p.id === passageId);
            const passageIndex = passage?.index ?? 0;
            const isCollapsed = collapsedPassages.has(passageId);

            return (
              <div key={passageId} className="mb-2">
                <div
                  className="flex items-center gap-1 mb-1 cursor-pointer hover:bg-muted rounded p-1"
                  onClick={() => togglePassage(passageId)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    Passage {passageIndex + 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {passageDialogues.length} dialogue
                  </span>
                </div>

                {!isCollapsed && (
                  <div className="space-y-1 ml-4">
                    {passageDialogues.map((d) => {
                      const isActive = d.id === currentPassageId;
                      const preview = d.content.substring(0, 50) + (d.content.length > 50 ? '...' : '');

                      return (
                        <div
                          key={d.id}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                            isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => onPassageClick(d.id)}
                        >
                          <div className="flex items-center gap-2">
                            {d.speaker && (
                              <Badge variant="secondary" className="text-[10px]">
                                {d.speaker}
                              </Badge>
                            )}
                            <span className="flex-1">{preview}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
