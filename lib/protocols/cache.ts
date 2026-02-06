/**
 * Passage Validation Cache
 *
 * LRU (Least Recently Used) cache for passage-level validation results.
 * Key: passageId + document revision
 * Value: ValidationResult[]
 *
 * This cache improves performance by avoiding re-validation of unchanged passages.
 */

import type { PassageID, TagID } from '@/lib/tei/types';
import type { ValidationResult } from '@/lib/validation/types';

/**
 * Generic Cache Protocol
 *
 * Defines the interface for caching operations with configurable key and value types.
 * This protocol enables dependency injection of cache implementations, supporting
 * testability and adherence to value-oriented design principles.
 *
 * @template K - The type of keys stored in the cache
 * @template V - The type of values stored in the cache
 *
 * Cache Semantics:
 * - TTL (Time To Live): Entries may expire after a configured time period
 * - Eviction: When cache reaches capacity, entries are evicted based on policy (e.g., LRU)
 * - Idempotency: Setting the same key multiple times is safe and replaces previous values
 * - Null Returns: `get()` returns `null` for missing or expired entries
 *
 * Thread Safety:
 * This interface does not guarantee thread safety. Implementations are responsible for
 * their own concurrency control. In JavaScript/TypeScript single-threaded environments,
 * thread safety is typically not a concern for in-memory caches.
 *
 * Usage Examples:
 * ```typescript
 * // Using with PassageValidationCache
 * const cache = createLRUCache<CacheKey, ValidationResult[]>({ maxSize: 100, ttl: 300000 });
 *
 * // Set a value
 * cache.set({ passageId: 'p1', revision: 1 }, [validationResult1, validationResult2]);
 *
 * // Get a value
 * const results = cache.get({ passageId: 'p1', revision: 1 });
 * if (results) {
 *   console.log('Cache hit:', results);
 * } else {
 *   console.log('Cache miss');
 * }
 *
 * // Clear all entries
 * cache.clear();
 * ```
 *
 * Testing Example:
 * ```typescript
 * // Create a mock cache for testing
 * class MockCache<K, V> implements ICache<K, V> {
 *   private store = new Map<K, V>();
 *   get(key: K): V | null { return this.store.get(key) ?? null; }
 *   set(key: K, value: V): void { this.store.set(key, value); }
 *   clear(): void { this.store.clear(); }
 * }
 *
 * // Inject mock cache into function under test
 * const mockCache = new MockCache<CacheKey, ValidationResult[]>();
 * const results = validateWithCache(document, mockCache);
 * ```
 */
export interface ICache<K, V> {
  /**
   * Retrieve a value from the cache by key
   *
   * @param key - The cache key to look up
   * @returns The cached value, or `null` if the key doesn't exist or the entry has expired
   */
  get(key: K): V | null;

  /**
   * Store a value in the cache
   *
   * @param key - The cache key to store the value under
   * @param value - The value to cache
   */
  set(key: K, value: V): void;

  /**
   * Remove all entries from the cache
   *
   * This is useful for:
   * - Testing: Resetting cache state between tests
   * - Configuration changes: When cache parameters change
   * - Memory management: Forcefully clearing all cached data
   */
  clear(): void;
}

export interface CacheKey {
  readonly passageId: PassageID;
  readonly revision: number;
}

export interface CacheEntry {
  readonly key: CacheKey;
  readonly results: readonly ValidationResult[];
  readonly timestamp: number;
}

/**
 * LRU Cache configuration
 */
export interface CacheConfig {
  readonly maxSize: number;
  readonly ttl: number; // Time to live in milliseconds
}

/**
 * Passage Validation Cache
 *
 * Implements LRU eviction policy with TTL (time-to-live) support.
 * This class implements the ICache protocol for dependency injection.
 */
export class PassageValidationCache implements ICache<CacheKey, readonly ValidationResult[]> {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      maxSize: config.maxSize ?? 100,
      ttl: config.ttl ?? 300000, // 5 minutes default
    };
  }

  /**
   * Generate cache key from passageId and revision
   */
  private makeKey(key: CacheKey): string {
    return `${key.passageId}:${key.revision}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp > this.config.ttl;
  }

  /**
   * Get cached validation results for a passage
   * Returns null if not found or expired
   */
  get(key: CacheKey): readonly ValidationResult[] | null {
    const cacheKey = this.makeKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, entry);

    return entry.results;
  }

  /**
   * Set validation results in cache
   * Implements LRU eviction when cache is full
   */
  set(key: CacheKey, results: readonly ValidationResult[]): void {
    const cacheKey = this.makeKey(key);
    const entry: CacheEntry = {
      key,
      results,
      timestamp: Date.now(),
    };

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(cacheKey)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, entry);
  }

  /**
   * Check if cache has entry for key (doesn't check expiration)
   */
  has(key: CacheKey): boolean {
    const cacheKey = this.makeKey(key);
    return this.cache.has(cacheKey);
  }

  /**
   * Invalidate all cache entries for a passage (all revisions)
   */
  invalidatePassage(passageId: PassageID): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${passageId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Invalidate all cache entries for a document revision
   * (Useful when document is modified)
   */
  invalidateRevision(revision: number): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      const [_, revStr] = key.split(':');
      const rev = parseInt(revStr, 10);
      if (rev === revision) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      removed++;
    }

    return removed;
  }
}

/**
 * @deprecated This function has been removed.
 * Use createLRUCache() to create cache instances explicitly.
 * @see createLRUCache
 */

/**
 * Create a new LRU cache instance
 *
 * Factory function that creates a new cache instance with the specified configuration.
 * This is the preferred way to create cache instances for dependency injection,
 * as it avoids global mutable state and enables better testing.
 *
 * Usage Example:
 * ```typescript
 * // In production code
 * const cache = createLRUCache<CacheKey, ValidationResult[]>({
 *   maxSize: 100,
 *   ttl: 300000 // 5 minutes
 * });
 *
 * // Inject cache into function via parameter
 * function validatePassage(passage: Passage, cache: ICache<CacheKey, ValidationResult[]>) {
 *   const key = { passageId: passage.id, revision: passage.revision };
 *   const cached = cache.get(key);
 *   if (cached) return cached;
 *
 *   const results = performValidation(passage);
 *   cache.set(key, results);
 *   return results;
 * }
 *
 * // In tests
 * const mockCache = createMockCache<CacheKey, ValidationResult[]>();
 * const results = validatePassage(testPassage, mockCache);
 * ```
 *
 * @param config - Cache configuration including maxSize and TTL
 * @returns A new PassageValidationCache instance implementing ICache
 */
export function createLRUCache<K extends CacheKey, V extends readonly ValidationResult[]>(
  config: Partial<CacheConfig> = {}
): PassageValidationCache {
  return new PassageValidationCache(config);
}
