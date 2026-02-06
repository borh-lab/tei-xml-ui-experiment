// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
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

interface DocumentAnalyticsProps {
  initialState?: DocumentState;
}

export function DocumentAnalytics({ initialState }: DocumentAnalyticsProps) {
  const [localState, setState] = useState<State>({ status: 'analyzing' });
  const { state } = useDocumentV2(initialState);

  const analyze = useCallback(() => {
    if (!state.document) {
      setState({ status: 'error', error: 'No document loaded' });
      return;
    }

    setState({ status: 'analyzing' });

    try {
      const quotes = extractQuotes(state.document);
      const rankings = calculateRankings(
        quotes,
        quotes.length,
        (id) => lookupCharacterName(id, state.document.state.characters)
      );
      const matrix = buildConversationMatrix(quotes);

      // Calculate sectional breakdown
      const groups = groupDialogueBySections(
        state.document.state.dialogue,
        state.document.state.passages,
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
  }, [state.document]);

  useEffect(() => {
    if (state.document) {
      analyze();
    }
  }, [state.document, analyze]);

  if (localState.status === 'idle') {
    return <div className="p-4 text-sm text-muted">Load a document to see analytics</div>;
  }

  if (localState.status === 'analyzing') {
    return <div className="p-4 text-sm text-muted">Analyzing document...</div>;
  }

  if (localState.status === 'error') {
    return <div className="p-4 text-sm text-red-500">Error: {localState.error}</div>;
  }

  return (
    <div className="space-y-6">
      <CharacterRankings rankings={localState.rankings} />
      <ConversationMatrix matrix={localState.matrix} />
      <SectionalBreakdown
        breakdown={localState.sectionalStats}
        currentStrategy={localState.groupingStrategy}
        onStrategyChange={(strategy) => {
          if (!state.document) return;

          const groups = groupDialogueBySections(
            state.document.state.dialogue,
            state.document.state.passages,
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
