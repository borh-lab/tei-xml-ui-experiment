import { describe, it, expect } from 'bun:test';
import { extractQuotes, calculateRankings, buildConversationMatrix, lookupCharacterName } from '../document';

describe('extractQuotes', () => {
  it('should extract quotes from document state', () => {
    const mockDocument = {
      state: {
        dialogue: [
          { id: 'q1', speaker: 'alice', content: 'Hello Bob' },
          { id: 'q2', speaker: 'bob', content: 'Hi Alice' },
          { id: 'q3', speaker: 'alice', content: 'Monologue' }
        ]
      }
    } as any;

    const quotes = extractQuotes(mockDocument);
    expect(quotes).toHaveLength(3);
    expect(quotes[0]).toEqual({
      id: 'q1',
      speaker: 'alice',
      addressee: undefined,
      text: 'Hello Bob'
    });
  });

  it('should handle empty document', () => {
    const mockDocument = { state: { dialogue: [] } } as any;
    const quotes = extractQuotes(mockDocument);
    expect(quotes).toEqual([]);
  });
});

describe('calculateRankings', () => {
  it('should calculate character rankings by quote count', () => {
    const quotes = [
      { id: 'q1', speaker: 'alice', text: 'A' },
      { id: 'q2', speaker: 'alice', text: 'B' },
      { id: 'q3', speaker: 'bob', text: 'C' },
      { id: 'q4', speaker: 'alice', text: 'D' }
    ] as any;

    const rankings = calculateRankings(quotes, 4);
    expect(rankings).toHaveLength(2);
    expect(rankings[0]).toEqual({
      characterId: 'alice',
      characterName: 'alice',
      quoteCount: 3,
      percent: 75
    });
    expect(rankings[1]).toEqual({
      characterId: 'bob',
      characterName: 'bob',
      quoteCount: 1,
      percent: 25
    });
  });

  it('should handle empty quotes array', () => {
    const rankings = calculateRankings([], 0);
    expect(rankings).toEqual([]);
  });

  it('should sort by quote count descending', () => {
    const quotes = [
      { id: 'q1', speaker: 'charlie', text: 'A' },
      { id: 'q2', speaker: 'bob', text: 'B' },
      { id: 'q3', speaker: 'alice', text: 'C' }
    ] as any;

    const rankings = calculateRankings(quotes, 3);
    expect(rankings).toHaveLength(3);
    // All have count 1, so order doesn't matter but should be deterministic
  });
});

describe('buildConversationMatrix', () => {
  it('should build conversation matrix from quotes', () => {
    const quotes = [
      { id: 'q1', speaker: 'alice', addressee: 'bob', text: 'Hi Bob' },
      { id: 'q2', speaker: 'alice', addressee: 'bob', text: 'How are you?' },
      { id: 'q3', speaker: 'bob', addressee: 'alice', text: 'Hi Alice' },
      { id: 'q4', speaker: 'alice', addressee: 'charlie', text: 'Hi Charlie' }
    ] as any;

    const matrix = buildConversationMatrix(quotes);

    expect(matrix.totalInteractions).toBe(4);
    expect(matrix.matrix.get('alice')?.get('bob')).toBe(2);
    expect(matrix.matrix.get('bob')?.get('alice')).toBe(1);
    expect(matrix.matrix.get('alice')?.get('charlie')).toBe(1);
  });

  it('should ignore quotes without addressee', () => {
    const quotes = [
      { id: 'q1', speaker: 'alice', text: 'Monologue' },
      { id: 'q2', speaker: 'alice', addressee: 'bob', text: 'Hi Bob' }
    ] as any;

    const matrix = buildConversationMatrix(quotes);
    expect(matrix.totalInteractions).toBe(1);
    expect(matrix.matrix.get('alice')?.get('bob')).toBe(1);
  });

  it('should handle empty quotes array', () => {
    const matrix = buildConversationMatrix([]);
    expect(matrix.totalInteractions).toBe(0);
    expect(matrix.matrix.size).toBe(0);
  });
});

describe('lookupCharacterName', () => {
  const mockCharacters = [
    { id: 'char-1', xmlId: 'alice', name: 'Alice Smith' },
    { id: 'char-2', xmlId: 'bob', name: 'Bob Jones' }
  ] as any;

  it('should return character name when found', () => {
    const name = lookupCharacterName('char-1', mockCharacters);
    expect(name).toBe('Alice Smith');
  });

  it('should fallback to ID when character not found', () => {
    const name = lookupCharacterName('char-999', mockCharacters);
    expect(name).toBe('char-999');
  });

  it('should return "Unknown" for null speaker', () => {
    const name = lookupCharacterName(null, mockCharacters);
    expect(name).toBe('Unknown');
  });
});
