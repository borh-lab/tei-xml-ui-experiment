import type { Quote, CharacterRanking, ConversationMatrix } from './types';
import type { TEIDocument } from '@/lib/tei/types';

/**
 * Extract quotes from TEI document state.
 * Pure function - no side effects.
 */
export function extractQuotes(document: TEIDocument): Quote[] {
  return document.state.dialogue.map((d) => ({
    id: d.id,
    speaker: d.speaker || 'Unknown',
    addressee: undefined, // Not tracked in current document model
    text: d.content
  }));
}

/**
 * Calculate character rankings from quotes.
 * Returns array sorted by quote count descending.
 * Pure function - no side effects.
 */
export function calculateRankings(
  quotes: readonly Quote[],
  totalQuotes: number
): CharacterRanking[] {
  const counts = new Map<string, number>();

  for (const quote of quotes) {
    counts.set(quote.speaker, (counts.get(quote.speaker) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([characterId, quoteCount]) => ({
      characterId,
      characterName: characterId,  // TODO: Look up actual name from character index
      quoteCount,
      percent: totalQuotes > 0 ? (quoteCount / totalQuotes) * 100 : 0
    }))
    .sort((a, b) => b.quoteCount - a.quoteCount);
}

/**
 * Build conversation matrix showing who speaks to whom.
 * Pure function - no side effects.
 */
export function buildConversationMatrix(quotes: readonly Quote[]): ConversationMatrix {
  const matrix = new Map<string, Map<string, number>>();

  for (const quote of quotes) {
    if (!quote.addressee) continue;

    let speakerRow = matrix.get(quote.speaker);
    if (!speakerRow) {
      speakerRow = new Map();
      matrix.set(quote.speaker, speakerRow);
    }

    speakerRow.set(quote.addressee, (speakerRow.get(quote.addressee) || 0) + 1);
  }

  const totalInteractions = Array.from(matrix.values())
    .reduce((sum, row) => sum + Array.from(row.values()).reduce((s, c) => s + c, 0), 0);

  return {
    matrix: matrix as ReadonlyMap<string, ReadonlyMap<string, number>>,
    totalInteractions
  };
}
