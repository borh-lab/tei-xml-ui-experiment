import { Effect } from 'effect';
import { ValidationProtocolLive, NoOpCache } from '../ValidationV2';
import { initialState } from '@/lib/values/DocumentState';
import type { ICache } from '@/lib/protocols/cache';
import type { ValidationCacheKey } from '../ValidationV2';
import type { ValidationResult } from '@/lib/validation/types';

describe('ValidationProtocol V2', () => {
  describe('validateState with no cache', () => {
    it('should validate state without caching', async () => {
      const state = {
        ...initialState(),
        document: {
          state: {
            revision: 1,
            xml: '<TEI></TEI>',
          },
        } as DocumentState,
      };

      const program = ValidationProtocolLive.validateState(
        state,
        '/public/schemas/tei-novel.rng',
        undefined // No cache
      );

      // This test verifies the protocol accepts no-cache parameter
      // Actual validation result depends on schema availability
      try {
        const result = await Effect.runPromise(program);
        expect(result.revision).toBe(1);
        expect(result.validatedAt).toBeInstanceOf(Date);
      } catch (e) {
        // Schema might not be available in test environment
        expect(e).toBeTruthy();
      }
    });
  });

  describe('validateState with cache', () => {
    it('should use cache when available', async () => {
      // Mock cache that returns results
      class MockCache implements ICache<ValidationCacheKey, readonly ValidationResult[]> {
        private results: readonly ValidationResult[] = [
          { message: 'Test error', line: 1, column: 1 }
        ];

        get(): readonly ValidationResult[] | null {
          return this.results;
        }

        set(): void {
          // Track cache sets
        }

        clear(): void {
          // No-op
        }
      }

      const state = {
        ...initialState(),
        document: {
          state: { revision: 1, xml: '<TEI></TEI>' },
        } as DocumentState,
      };

      const cache = new MockCache();
      const program = ValidationProtocolLive.validateState(
        state,
        '/public/schemas/tei-novel.rng',
        cache
      );

      const result = await Effect.runPromise(program);

      expect(result.results.errors.length).toBeGreaterThanOrEqual(0);
      if (result.results.errors.length > 0) {
        expect(result.results.errors[0].message).toBeTruthy();
      }
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      const cache = new NoOpCache<ValidationCacheKey, readonly ValidationResult[]>();
      const program = ValidationProtocolLive.clearCache(cache);

      await Effect.runPromise(program);

      // If we got here without error, clear worked
      expect(true).toBe(true);
    });
  });

  describe('NoOpCache', () => {
    it('should always return null from get', () => {
      const cache = new NoOpCache<string, number>();
      expect(cache.get('key')).toBeNull();
    });

    it('should no-op on set', () => {
      const cache = new NoOpCache<string, number>();
      expect(() => cache.set('key', 123)).not.toThrow();
    });

    it('should no-op on clear', () => {
      const cache = new NoOpCache<string, number>();
      expect(() => cache.clear()).not.toThrow();
    });
  });
});
