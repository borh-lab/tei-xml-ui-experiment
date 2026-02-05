/**
 * Integration Tests for Tag Suggestions
 *
 * Tests the complete flow from selection → heuristics → suggestions → display
 */

import { runAllHeuristics } from '@/lib/heuristics/index';
import { generateSuggestions, clearSuggestionCache } from '@/lib/protocols/suggestions';
import type { Selection } from '@/lib/values/Selection';

describe('Tag Suggestions Integration', () => {
  beforeEach(() => {
    clearSuggestionCache();
  });

  it('should detect dialogue patterns and return suggestions', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now(),
    };

    const results = runAllHeuristics(selection);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.tagType === 'said')).toBe(true);
  });

  it('should detect multiple patterns in complex text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello!" asked Dr. Smith.',
      context: '"Hello!" asked Dr. Smith.',
      timestamp: Date.now(),
    };

    const results = generateSuggestions(selection);

    expect(results.length).toBeGreaterThanOrEqual(2);

    // Should detect dialogue/quote patterns
    const tagTypes = results.map(r => r.tagType);
    expect(tagTypes).toContain('said');
    expect(tagTypes).toContain('q');
  });

  it('should filter suggestions by confidence threshold', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello!" asked Dr. Smith.',
      context: '"Hello!" asked Dr. Smith.',
      timestamp: Date.now(),
    };

    const results = generateSuggestions(selection, { minConfidence: 0.7 });

    // All results should have confidence >= 0.7
    results.forEach(result => {
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  it('should sort suggestions by confidence', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello!" asked Dr. Smith.',
      context: '"Hello!" asked Dr. Smith.',
      timestamp: Date.now(),
    };

    const results = generateSuggestions(selection);

    if (results.length > 1) {
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
      }
    }
  });

  it('should return empty array for non-matching text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'The quick brown fox.',
      context: 'The quick brown fox.',
      timestamp: Date.now(),
    };

    const results = generateSuggestions(selection);

    expect(results).toEqual([]);
  });

  it('should update suggestions when selection changes', () => {
    const selection1: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello!" asked Dr. Smith.',
      context: '"Hello!" asked Dr. Smith.',
      timestamp: Date.now(),
    };

    const results1 = generateSuggestions(selection1);

    const selection2: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 15 },
      text: 'Just a name.',
      context: 'Just a name.',
      timestamp: Date.now() + 1000,
    };

    const results2 = generateSuggestions(selection2);

    // Results should be different
    expect(results1).not.toEqual(results2);
  });

  it('should handle empty selection', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 0 },
      text: '',
      context: '',
      timestamp: Date.now(),
    };

    const results = generateSuggestions(selection);

    expect(results).toEqual([]);
  });

  it('should verify confidence scoring for dialogue patterns', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now(),
    };

    const results = runAllHeuristics(selection);

    results.forEach(result => {
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  it('should provide appropriate tag types for different patterns', () => {
    // Test dialogue pattern
    const dialogueSelection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 25 },
      text: 'She asked him a question.',
      context: 'She asked him a question.',
      timestamp: Date.now(),
    };

    const dialogueResults = runAllHeuristics(dialogueSelection);
    expect(dialogueResults.some(r => r.tagType === 'said')).toBe(true);

    // Test name pattern
    const nameSelection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 10 },
      text: 'John Smith',
      context: 'John Smith walked in.',
      timestamp: Date.now(),
    };

    const nameResults = runAllHeuristics(nameSelection);
    expect(nameResults.some(r => r.tagType === 'persName')).toBe(true);

    // Test quote pattern
    const quoteSelection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 15 },
      text: '"Really?"',
      context: 'She asked, "Really?"',
      timestamp: Date.now(),
    };

    const quoteResults = runAllHeuristics(quoteSelection);
    expect(quoteResults.some(r => r.tagType === 'q')).toBe(true);
  });
});
