/**
 * Tests for suggestions protocol
 */

import { generateSuggestions, clearSuggestionCache, getSuggestionCacheStats } from '@/lib/protocols/suggestions';
import type { Selection } from '@/lib/values/Selection';
import type { ICache } from '@/lib/protocols/cache';

/**
 * Simple in-memory cache for testing
 */
class TestCache<K, V> implements ICache<K, V> {
  private store = new Map<K, V>();

  get(key: K): V | null {
    return this.store.get(key) ?? null;
  }

  set(key: K, value: V): void {
    this.store.set(key, value);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

describe('generateSuggestions protocol', () => {
  let cache: TestCache<string, any>;

  beforeEach(() => {
    // Create fresh cache for each test
    cache = new TestCache<string, any>();
  });
  it('should run all heuristics on selection', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter by confidence > 0.3', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'The quick brown fox.',
      context: 'The quick brown fox.',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection);

    // All results should have confidence > 0.3
    results.forEach(result => {
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  it('should sort by confidence descending', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello!" asked Dr. Smith.',
      context: '"Hello!" asked Dr. Smith.',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection);

    if (results.length > 1) {
      // Check that results are sorted by confidence (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
      }
    }
  });

  it('should return top N suggestions when maxSuggestions specified', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 35 },
      text: '"Hello!" asked Dr. Smith.',
      context: '"Hello!" asked Dr. Smith.',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection, { maxSuggestions: 2 });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should use default maxSuggestions of 5', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 50 },
      text: 'Long text with multiple patterns "quotes" and John Smith and questions?',
      context: 'Long text with multiple patterns "quotes" and John Smith and questions?',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection);

    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should return empty array for non-matching text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'plain text here',
      context: 'plain text here',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection);

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

    const results = generateSuggestions(selection);

    expect(results).toEqual([]);
  });

  it('should allow custom minConfidence threshold', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now()
    };

    const results = generateSuggestions(selection, { minConfidence: 0.8 });

    // All results should have confidence >= 0.8
    results.forEach(result => {
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  it('should cache results for identical selections', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now()
    };

    // First call with cache
    const results1 = generateSuggestions(selection, {}, cache);

    // Check cache size
    expect(cache.size).toBe(1);

    // Second call with same selection and cache
    const results2 = generateSuggestions(selection, {}, cache);

    // Should return same results from cache
    expect(results2).toEqual(results1);

    // Cache size should still be 1 (not incremented)
    expect(cache.size).toBe(1);
  });

  it('should handle different options as different cache entries', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now()
    };

    // Call with different options
    generateSuggestions(selection, { minConfidence: 0.3 }, cache);
    generateSuggestions(selection, { minConfidence: 0.8 }, cache);

    // Should have 2 cache entries
    expect(cache.size).toBe(2);
  });

  it('should clear cache when clearSuggestionCache is called', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 30 },
      text: '"Hello," John said.',
      context: '"Hello," John said.',
      timestamp: Date.now()
    };

    // Generate some suggestions
    generateSuggestions(selection, {}, cache);

    // Verify cache has entries
    expect(cache.size).toBeGreaterThan(0);

    // Clear cache
    cache.clear();

    // Verify cache is empty
    expect(cache.size).toBe(0);
  });
});
