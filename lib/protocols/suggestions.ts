/**
 * Suggestions Protocol
 *
 * Generates smart tag suggestions based on text patterns.
 * Runs all heuristics, filters by confidence, sorts, and returns top N.
 * Includes memoization for performance.
 */

import type { Selection } from '@/lib/values/Selection';
import type { Suggestion } from '@/lib/values/Suggestion';
import { runAllHeuristics } from '@/lib/heuristics/index';
import { sortByConfidence, filterByConfidence } from '@/lib/values/Suggestion';
import { LRUCache } from 'lru-cache';

/**
 * Options for generating suggestions
 */
export interface GenerateSuggestionsOptions {
  /** Minimum confidence threshold (default: 0.3) */
  minConfidence?: number;
  /** Maximum number of suggestions to return (default: 5) */
  maxSuggestions?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<GenerateSuggestionsOptions> = {
  minConfidence: 0.3,
  maxSuggestions: 5,
};

/**
 * Cache key for memoization
 */
interface CacheKey {
  text: string;
  documentRevision: number;
  minConfidence: number;
  maxSuggestions: number;
}

/**
 * Create cache key from selection and options
 */
function createCacheKey(
  selection: Selection,
  options: Required<GenerateSuggestionsOptions>
): string {
  return JSON.stringify({
    text: selection.text,
    documentRevision: selection.timestamp, // Use timestamp as revision proxy
    minConfidence: options.minConfidence,
    maxSuggestions: options.maxSuggestions,
  });
}

/**
 * Memoization cache for suggestions
 * - 100 cache size
 * - 5 second TTL
 */
const suggestionCache = new LRUCache<string, Suggestion[]>({
  max: 100,
  ttl: 5000, // 5 seconds
});

/**
 * Generate smart tag suggestions for a selection
 *
 * Process:
 * 1. Check cache for existing results
 * 2. If cached, return cached results
 * 3. Otherwise, run all heuristics
 * 4. Filter suggestions by minimum confidence
 * 5. Sort by confidence (descending)
 * 6. Return top N suggestions
 * 7. Cache results for future calls
 *
 * Memoization:
 * - Cache key: selection text + timestamp (as revision proxy) + options
 * - Cache size: 100 entries
 * - TTL: 5 seconds
 *
 * @param selection - The selection to analyze
 * @param options - Optional configuration
 * @returns Array of suggestions sorted by confidence
 */
export function generateSuggestions(
  selection: Selection,
  options: GenerateSuggestionsOptions = {}
): Suggestion[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check cache
  const cacheKey = createCacheKey(selection, opts);
  const cached = suggestionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Step 1: Run all heuristics
  const allSuggestions = runAllHeuristics(selection);

  // Step 2: Filter by minimum confidence
  const filtered = filterByConfidence(allSuggestions, opts.minConfidence);

  // Step 3: Sort by confidence (descending)
  const sorted = sortByConfidence(filtered);

  // Step 4: Return top N suggestions
  const result = sorted.slice(0, opts.maxSuggestions);

  // Cache the result
  suggestionCache.set(cacheKey, result);

  return result;
}

/**
 * Clear the suggestion cache
 * Useful for testing or forcing re-computation
 */
export function clearSuggestionCache(): void {
  suggestionCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getSuggestionCacheStats(): { size: number } {
  return {
    size: suggestionCache.size,
  };
}
