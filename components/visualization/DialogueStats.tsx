'use client';

import React, { useMemo } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DialogueStats() {
  const { document } = useDocumentContext();

  const stats = useMemo(() => {
    if (!document) return null;

    const dialogue = document.getDialogue();
    const divisions = document.getDivisions();

    return {
      totalDialogue: dialogue.length,
      totalChapters: divisions.filter(d => d.type === 'chapter').length,
      dialoguePerChapter: divisions.map(div => {
        return { name: `${div.type} ${div.n}`, count: 0 }; // Placeholder
      })
    };
  }, [document]);

  if (!stats) {
    return <Card><CardContent className="p-6">No document loaded</CardContent></Card>;
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
