// @ts-nocheck
'use client';

import { useMemo } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DialogueStats() {
  const { document } = useDocumentService();

  const stats = useMemo(() => {
    if (!document) return null;

    const dialogue = document.state.dialogue;

    return {
      totalDialogue: dialogue.length,
      totalChapters: 0, // TODO: Implement divisions extraction
      dialoguePerChapter: [], // TODO: Implement per-chapter dialogue count
    };
  }, [document]);

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">No document loaded</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dialogue Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Dialogue Passages</p>
            <p className="text-2xl font-bold">{stats.totalDialogue}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Chapters</p>
            <p className="text-2xl font-bold">{stats.totalChapters}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
