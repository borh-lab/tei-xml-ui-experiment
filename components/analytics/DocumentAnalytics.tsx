'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { extractQuotes, calculateRankings, buildConversationMatrix, lookupCharacterName } from '@/lib/analytics/document';
import { groupDialogueBySections, calculateSectionStats, ByPassage } from '@/lib/analytics/sectional';
import { CharacterRankings } from './CharacterRankings';
import { ConversationMatrix } from './ConversationMatrix';
import { SectionalBreakdown } from './SectionalBreakdown';
import type { CharacterRanking, ConversationMatrix as MatrixType, SectionGroupingStrategy, SectionalBreakdown as SectionalBreakdownData } from '@/lib/analytics/types';

type State =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'analyzed';
      rankings: readonly CharacterRanking[];
      matrix: MatrixType;
      sectionalStats: SectionalBreakdownData;
      groupingStrategy: SectionGroupingStrategy;
    }
  | { status: 'error'; error: string };

export function DocumentAnalytics() {
  const [state, setState] = useState<State>({ status: 'analyzing' });
  const { document } = useDocumentService();

  const analyze = useCallback(() => {
    if (!document) {
      setState({ status: 'error', error: 'No document loaded' });
      return;
    }

    setState({ status: 'analyzing' });

    try {
      const quotes = extractQuotes(document);
      const rankings = calculateRankings(
        quotes,
        quotes.length,
        (id) => lookupCharacterName(id, document.state.characters)
      );
      const matrix = buildConversationMatrix(quotes);

      // Calculate sectional breakdown
      const groups = groupDialogueBySections(
        document.state.dialogue,
        document.state.passages,
        ByPassage
      );
      const sectionalStats = calculateSectionStats(groups);

      setState({
        status: 'analyzed',
        rankings,
        matrix,
        sectionalStats,
        groupingStrategy: ByPassage
      });
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [document]);

  useEffect(() => {
    if (document) {
      analyze();
    }
  }, [document, analyze]);

  if (state.status === 'idle') {
    return <div className="p-4 text-sm text-muted">Load a document to see analytics</div>;
  }

  if (state.status === 'analyzing') {
    return <div className="p-4 text-sm text-muted">Analyzing document...</div>;
  }

  if (state.status === 'error') {
    return <div className="p-4 text-sm text-red-500">Error: {state.error}</div>;
  }

  return (
    <div className="space-y-6">
      <CharacterRankings rankings={state.rankings} />
      <ConversationMatrix matrix={state.matrix} />
      <SectionalBreakdown
        breakdown={state.sectionalStats}
        currentStrategy={state.groupingStrategy}
        onStrategyChange={(strategy) => {
          if (!document) return;

          const groups = groupDialogueBySections(
            document.state.dialogue,
            document.state.passages,
            strategy
          );
          const newStats = calculateSectionStats(groups);

          setState(prev => prev.status === 'analyzed'
            ? { ...prev, sectionalStats: newStats, groupingStrategy: strategy }
            : prev
          );
        }}
      />
    </div>
  );
}
