/**
 * Tests for dialoguePattern heuristic
 */

import { dialoguePattern } from '@/lib/heuristics/dialoguePattern';
import type { Selection } from '@/lib/values/Selection';

describe('dialoguePattern', () => {
  it('should detect dialogue with quotes', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: '"Hello," she said.',
      context: '"Hello," she said.',
      timestamp: Date.now()
    };

    const result = dialoguePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('said');
    expect(result?.confidence).toBeGreaterThan(0.7);
    expect(result?.reason).toContain('quote');
  });

  it('should detect dialogue with "said" pattern', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: 'He said that he would come.',
      context: 'He said that he would come.',
      timestamp: Date.now()
    };

    const result = dialoguePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('said');
    expect(result?.confidence).toBeGreaterThan(0.6);
    expect(result?.reason).toContain('said');
  });

  it('should detect dialogue with "asked" pattern', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 25 },
      text: 'She asked him a question.',
      context: 'She asked him a question.',
      timestamp: Date.now()
    };

    const result = dialoguePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('said');
    expect(result?.confidence).toBeGreaterThan(0.6);
    expect(result?.reason).toContain('asked');
  });

  it('should return null for non-dialogue text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'The quick brown fox.',
      context: 'The quick brown fox.',
      timestamp: Date.now()
    };

    const result = dialoguePattern(selection);

    expect(result).toBeNull();
  });

  it('should give higher confidence for quotes + speech verb', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello," John said excitedly.',
      context: '"Hello," John said excitedly.',
      timestamp: Date.now()
    };

    const result = dialoguePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThan(0.8);
  });

  it('should handle empty text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 0 },
      text: '',
      context: '',
      timestamp: Date.now()
    };

    const result = dialoguePattern(selection);

    expect(result).toBeNull();
  });
});
