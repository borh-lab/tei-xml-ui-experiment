/**
 * Tests for PassageValidationCache
 */

import { PassageValidationCache, resetGlobalCache, getGlobalCache } from '@/lib/protocols/cache';
import type { ValidationResult } from '@/lib/validation/types';

describe('PassageValidationCache', () => {
  let cache: PassageValidationCache;

  // Mock validation results
  const mockResults: ValidationResult[] = [
    {
      valid: true,
      errors: [],
      warnings: [],
      fixes: [],
    },
  ];

  const mockResultsWithErrors: ValidationResult[] = [
    {
      valid: false,
      errors: [
        {
          type: 'MISSING_ATTR',
          message: 'Missing required attribute',
        },
      ],
      warnings: [],
      fixes: [],
    },
  ];

  beforeEach(() => {
    cache = new PassageValidationCache({ maxSize: 3, ttl: 1000 });
    resetGlobalCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve validation results', () => {
      const key = { passageId: 'passage-1', revision: 1 };

      cache.set(key, mockResults);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(mockResults);
    });

    it('should return null for non-existent keys', () => {
      const key = { passageId: 'passage-1', revision: 1 };

      const retrieved = cache.get(key);

      expect(retrieved).toBeNull();
    });

    it('should distinguish between different passageIds', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResultsWithErrors);

      expect(cache.get(key1)).toEqual(mockResults);
      expect(cache.get(key2)).toEqual(mockResultsWithErrors);
    });

    it('should distinguish between different revisions', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-1', revision: 2 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResultsWithErrors);

      expect(cache.get(key1)).toEqual(mockResults);
      expect(cache.get(key2)).toEqual(mockResultsWithErrors);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };
      const key3 = { passageId: 'passage-3', revision: 1 };
      const key4 = { passageId: 'passage-4', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);
      cache.set(key3, mockResults);

      // Cache is now at capacity (maxSize: 3)
      expect(cache.getStats().size).toBe(3);

      // Adding key4 should evict key1 (oldest)
      cache.set(key4, mockResults);

      expect(cache.getStats().size).toBe(3);
      expect(cache.get(key1)).toBeNull();
      expect(cache.get(key2)).toEqual(mockResults);
      expect(cache.get(key3)).toEqual(mockResults);
      expect(cache.get(key4)).toEqual(mockResults);
    });

    it('should update entry without evicting when key exists', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };
      const key3 = { passageId: 'passage-3', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);
      cache.set(key3, mockResults);

      // Update key1 (should not evict anything)
      cache.set(key1, mockResultsWithErrors);

      expect(cache.getStats().size).toBe(3);
      expect(cache.get(key1)).toEqual(mockResultsWithErrors);
    });
  });

  describe('TTL (time-to-live)', () => {
    it('should expire entries after TTL', () => {
      jest.useFakeTimers();
      const key = { passageId: 'passage-1', revision: 1 };

      cache.set(key, mockResults);

      // Before TTL expires
      expect(cache.get(key)).toEqual(mockResults);

      // Advance time past TTL
      jest.advanceTimersByTime(1100);

      // Entry should be expired and removed
      expect(cache.get(key)).toBeNull();
      expect(cache.getStats().size).toBe(0);

      jest.useRealTimers();
    });

    it('should cleanup expired entries', () => {
      jest.useFakeTimers();

      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);

      jest.advanceTimersByTime(1100);

      const removed = cache.cleanup();

      expect(removed).toBe(2);
      expect(cache.getStats().size).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('invalidation', () => {
    it('should invalidate all revisions of a passage', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-1', revision: 2 };
      const key3 = { passageId: 'passage-2', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);
      cache.set(key3, mockResults);

      cache.invalidatePassage('passage-1');

      expect(cache.get(key1)).toBeNull();
      expect(cache.get(key2)).toBeNull();
      expect(cache.get(key3)).toEqual(mockResults);
    });

    it('should invalidate all passages for a revision', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };
      const key3 = { passageId: 'passage-3', revision: 2 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);
      cache.set(key3, mockResults);

      cache.invalidateRevision(1);

      expect(cache.get(key1)).toBeNull();
      expect(cache.get(key2)).toBeNull();
      expect(cache.get(key3)).toEqual(mockResults);
    });

    it('should clear all entries', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get(key1)).toBeNull();
      expect(cache.get(key2)).toBeNull();
    });
  });

  describe('has method', () => {
    it('should return true for existing keys', () => {
      const key = { passageId: 'passage-1', revision: 1 };

      cache.set(key, mockResults);

      expect(cache.has(key)).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      const key = { passageId: 'passage-1', revision: 1 };

      expect(cache.has(key)).toBe(false);
    });

    it('should return true for expired entries', () => {
      jest.useFakeTimers();
      const key = { passageId: 'passage-1', revision: 1 };

      cache.set(key, mockResults);
      jest.advanceTimersByTime(1100);

      // has() doesn't check expiration
      expect(cache.has(key)).toBe(true);
      // but get() does
      expect(cache.get(key)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('statistics', () => {
    it('should return cache statistics', () => {
      const stats = cache.getStats();

      expect(stats).toEqual({
        size: 0,
        maxSize: 3,
        ttl: 1000,
      });
    });

    it('should update size after adding entries', () => {
      const key1 = { passageId: 'passage-1', revision: 1 };
      const key2 = { passageId: 'passage-2', revision: 1 };

      cache.set(key1, mockResults);
      cache.set(key2, mockResults);

      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('global cache', () => {
    it('should return same instance on multiple calls', () => {
      const cache1 = getGlobalCache();
      const cache2 = getGlobalCache();

      expect(cache1).toBe(cache2);
    });

    it('should allow custom config on first call', () => {
      resetGlobalCache();

      const cache = getGlobalCache({ maxSize: 50, ttl: 60000 });
      const stats = cache.getStats();

      expect(stats.maxSize).toBe(50);
      expect(stats.ttl).toBe(60000);
    });

    it('should reset global cache', () => {
      const cache1 = getGlobalCache();
      resetGlobalCache();
      const cache2 = getGlobalCache();

      expect(cache1).not.toBe(cache2);
    });
  });
});
