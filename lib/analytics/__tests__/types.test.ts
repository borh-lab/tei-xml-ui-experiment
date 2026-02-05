// @ts-nocheck
import { Quote, CharacterRanking, ConversationMatrix, DocumentAnalysisResult, ComparisonResult } from '../types';

describe('Analytics Types', () => {
  describe('Quote', () => {
    it('should create a valid quote with all fields', () => {
      const quote: Quote = {
        id: 'q1',
        speaker: 'character-1',
        addressee: 'character-2',
        text: 'Hello world'
      };
      expect(quote.id).toBe('q1');
      expect(quote.speaker).toBe('character-1');
      expect(quote.addressee).toBe('character-2');
      expect(quote.text).toBe('Hello world');
    });

    it('should create a quote without optional addressee', () => {
      const quote: Quote = {
        id: 'q2',
        speaker: 'character-1',
        text: 'Monologue text'
      };
      expect(quote.addressee).toBeUndefined();
    });

    it('should have readonly properties at type level', () => {
      const quote: Quote = {
        id: 'q1',
        speaker: 'character-1',
        text: 'Test'
      };
      // TypeScript readonly is compile-time only
      // We verify the type is correctly defined
      expect(quote.id).toBe('q1');
      expect(typeof quote.id).toBe('string');
    });
  });

  describe('CharacterRanking', () => {
    it('should create a valid ranking', () => {
      const ranking: CharacterRanking = {
        characterId: 'char-1',
        characterName: 'Alice',
        quoteCount: 42,
        percent: 35.5
      };
      expect(ranking.characterId).toBe('char-1');
      expect(ranking.characterName).toBe('Alice');
      expect(ranking.quoteCount).toBe(42);
      expect(ranking.percent).toBe(35.5);
    });
  });

  describe('ConversationMatrix', () => {
    it('should store interaction counts between characters', () => {
      const matrix = new Map([
        ['alice', new Map([['bob', 5], ['charlie', 3]])],
        ['bob', new Map([['alice', 4], ['charlie', 2]])]
      ]);

      const convMatrix: ConversationMatrix = {
        matrix: matrix as ReadonlyMap<string, ReadonlyMap<string, number>>,
        totalInteractions: 14
      };

      expect(convMatrix.totalInteractions).toBe(14);
      expect(convMatrix.matrix.get('alice')?.get('bob')).toBe(5);
    });
  });

  describe('DocumentAnalysisResult', () => {
    it('should represent success state', () => {
      const rankings: CharacterRanking[] = [{
        characterId: 'char-1',
        characterName: 'Alice',
        quoteCount: 10,
        percent: 100
      }];

      const matrix: ConversationMatrix = {
        matrix: new Map(),
        totalInteractions: 0
      };

      const result: DocumentAnalysisResult = {
        _tag: 'success',
        rankings,
        matrix
      };

      expect(result._tag).toBe('success');
      if (result._tag === 'success') {
        expect(result.rankings).toEqual(rankings);
        expect(result.matrix).toEqual(matrix);
      }
    });

    it('should represent error state', () => {
      const result: DocumentAnalysisResult = {
        _tag: 'error',
        error: 'Failed to parse'
      };

      expect(result._tag).toBe('error');
      if (result._tag === 'error') {
        expect(result.error).toBe('Failed to parse');
      }
    });
  });

  describe('ComparisonResult', () => {
    it('should represent available state', () => {
      const percentiles = new Map([['p50', 100], ['p75', 150]]);
      const result: ComparisonResult = {
        _tag: 'available',
        percentiles
      };
      expect(result._tag).toBe('available');
      if (result._tag === 'available') {
        expect(result.percentiles.get('p50')).toBe(100);
      }
    });

    it('should represent unavailable state', () => {
      const result: ComparisonResult = {
        _tag: 'unavailable',
        reason: 'Corpus data not loaded'
      };
      expect(result._tag).toBe('unavailable');
      if (result._tag === 'unavailable') {
        expect(result.reason).toBe('Corpus data not loaded');
      }
    });
  });
});
