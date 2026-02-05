/**
 * Tests for heuristics index
 */

import { runAllHeuristics } from '@/lib/heuristics/index';
import type { Selection } from '@/lib/values/Selection';

describe('heuristics index', () => {
  it('should export all heuristics', async () => {
    const heuristics = await import('@/lib/heuristics/index');

    expect(heuristics.dialoguePattern).toBeDefined();
    expect(heuristics.nameDetection).toBeDefined();
    expect(heuristics.quotePattern).toBeDefined();
    expect(heuristics.runAllHeuristics).toBeDefined();
  });

  it('should run all heuristics on selection', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now()
    };

    const results = runAllHeuristics(selection);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return multiple suggestions for text matching multiple patterns', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello," asked Dr. Smith.',
      context: '"Hello," asked Dr. Smith.',
      timestamp: Date.now()
    };

    const results = runAllHeuristics(selection);

    // Should detect both dialogue/quote patterns and name
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Should have different tag types
    const tagTypes = results.map(r => r.tagType);
    expect(tagTypes).toContain('said');
    expect(tagTypes).toContain('q');
  });

  it('should return empty array for non-matching text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'The quick brown fox.',
      context: 'The quick brown fox.',
      timestamp: Date.now()
    };

    const results = runAllHeuristics(selection);

    expect(results).toEqual([]);
  });

  it('should handle empty selection', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 0 },
      text: '',
      context: '',
      timestamp: Date.now()
    };

    const results = runAllHeuristics(selection);

    expect(results).toEqual([]);
  });

  it('should filter out null results from heuristics', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 15 },
      text: 'plain text here',
      context: 'plain text here',
      timestamp: Date.now()
    };

    const results = runAllHeuristics(selection);

    // All heuristics should return null, so results should be empty
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
});
