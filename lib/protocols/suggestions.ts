/**
 * Suggestions Protocol
 *
 * Generates smart tag suggestions based on text patterns.
 * Runs all heuristics, filters by confidence, sorts, and returns top N.
 * Supports optional memoization via dependency injection.
 */

import type { Selection } from '@/lib/values/Selection';
import type { Suggestion } from '@/lib/values/Suggestion';
import { runAllHeuristics } from '@/lib/heuristics/index';
import { sortByConfidence, filterByConfidence } from '@/lib/values/Suggestion';
import type { ICache } from '@/lib/protocols/cache';

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
 * Generate smart tag suggestions for a selection
 *
 * Process:
 * 1. Check cache for existing results (if cache provided)
 * 2. If cached, return cached results
 * 3. Otherwise, run all heuristics
 * 4. Filter suggestions by minimum confidence
 * 5. Sort by confidence (descending)
 * 6. Return top N suggestions
 * 7. Cache results for future calls (if cache provided)
 *
 * @param selection - The selection to analyze
 * @param options - Optional configuration
 * @param cache - Optional cache for memoization (defaults to null = no caching)
 * @returns Array of suggestions sorted by confidence
 *
 * @example
 * ```typescript
 * // Without caching (suitable for one-off calls)
 * const suggestions = generateSuggestions(selection);
 *
 * // With caching (recommended for repeated calls)
 * import { LRUCache } from 'lru-cache';
 *
 * // Wrap LRUCache to conform to ICache interface
 * const lru = new LRUCache<string, Suggestion[]>({ max: 100, ttl: 5000 });
 * const cache: ICache<string, Suggestion[]> = {
 *   get: (key) => lru.get(key) ?? null,
 *   set: (key, value) => lru.set(key, value),
 *   clear: () => lru.clear(),
 * };
 * const suggestions = generateSuggestions(selection, {}, cache);
 *
 * // In tests, use a simple mock:
 * class MockCache<K, V> implements ICache<K, V> {
 *   private store = new Map<K, V>();
 *   get(key: K): V | null { return this.store.get(key) ?? null; }
 *   set(key: K, value: V): void { this.store.set(key, value); }
 *   clear(): void { this.store.clear(); }
 * }
 * const mockCache = new MockCache<string, Suggestion[]>();
 * const suggestions = generateSuggestions(selection, {}, mockCache);
 * ```
 */
export function generateSuggestions(
  selection: Selection,
  options: GenerateSuggestionsOptions = {},
  cache: ICache<string, Suggestion[]> | null = null
): Suggestion[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check cache (if provided)
  const cacheKey = createCacheKey(selection, opts);
  const cached = cache?.get(cacheKey);
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

  // Cache the result (if cache provided)
  cache?.set(cacheKey, result);

  return result;
}

/**
 * @deprecated This function has been removed.
 * Use cache.clear() on your injected cache instance instead.
 * This function is kept for backward compatibility but does nothing.
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * clearSuggestionCache();
 *
 * // New way
 * const cache = createLRUCache<string, Suggestion[]>();
 * // ... use cache ...
 * cache.clear(); // Clear the cache when needed
 * ```
 */
export function clearSuggestionCache(): void {
  // No-op - global cache has been removed
  // Users should manage their own cache instances
}

/**
 * @deprecated This function has been removed.
 * Use cache.getStats() on your injected cache instance instead.
 * This function is kept for backward compatibility but always returns size 0.
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * const stats = getSuggestionCacheStats();
 *
 * // New way
 * const cache = createLRUCache<string, Suggestion[]>();
 * // ... use cache ...
 * const stats = cache.getStats();
 * ```
 */
export function getSuggestionCacheStats(): { size: number } {
  // Return empty stats - global cache has been removed
  return {
    size: 0,
  };
}
