'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDocumentService } from '@/lib/effect';
import { extractQuotes, calculateRankings, buildConversationMatrix, lookupCharacterName } from '@/lib/analytics/document';
import { CharacterRankings } from './CharacterRankings';
import { ConversationMatrix } from './ConversationMatrix';
import type { CharacterRanking, ConversationMatrix as MatrixType } from '@/lib/analytics/types';

type State =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'analyzed'; rankings: readonly CharacterRanking[]; matrix: MatrixType }
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

      setState({
        status: 'analyzed',
        rankings,
        matrix
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
    </div>
  );
}
