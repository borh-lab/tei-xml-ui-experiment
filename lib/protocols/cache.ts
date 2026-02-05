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
 */
export class PassageValidationCache {
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
 * Global cache instance
 */
let globalCache: PassageValidationCache | null = null;

/**
 * Get or create global cache instance
 */
export function getGlobalCache(config?: Partial<CacheConfig>): PassageValidationCache {
  if (!globalCache) {
    globalCache = new PassageValidationCache(config);
  }
  return globalCache;
}

/**
 * Reset global cache (useful for testing)
 */
export function resetGlobalCache(): void {
  globalCache = null;
}
