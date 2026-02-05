// @ts-nocheck
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * DialogueStats - Effect-based version
 *
 * Already uses useDocumentService internally, so this is just a wrapper
 * for feature flag consistency.
 */
export function EffectDialogueStats() {
  const { useDocumentService } = require('@/lib/effect/react/hooks');
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

/**
 * DialogueStats with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on feature-useEffectVisualization feature flag.
 *
 * For now, we default to React version until Effect is fully tested.
 */
export default function DialogueStats() {
  // Check if Effect version should be used
  const useEffect = typeof window !== 'undefined'
    ? localStorage.getItem('feature-useEffectVisualization') === 'true'
    : false;

  if (useEffect) {
    return <EffectDialogueStats />;
  }

  // Fall back to React version (which also uses Effect services internally)
  const ReactDialogueStats = require('./DialogueStats').DialogueStats;
  return <ReactDialogueStats />;
}
