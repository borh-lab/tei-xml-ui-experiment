/**
 * StorageService Tests
 */

import { describe, it, expect } from '@jest/globals';
import { Effect } from 'effect';
import { StorageService } from '@/lib/effect/protocols/Storage';
import { TestStorageService } from '@/lib/effect/services/StorageService';

describe('StorageService', () => {
  it('should store and retrieve value', async () => {
    const storage = new TestStorageService();

    const program = Effect.gen(function* (_) {
      yield* _(storage.set('test-key', { value: 'test' }));
      const result = yield* _(storage.get<{ value: string }>('test-key'));

      expect(result.value).toBe('test');
    });

    await Effect.runPromise(program);
  });

  it('should check if key exists', async () => {
    const storage = new TestStorageService();

    const program = Effect.gen(function* (_) {
      const existsBefore = yield* _(storage.has('test-key'));
      yield* _(storage.set('test-key', 'value'));
      const existsAfter = yield* _(storage.has('test-key'));

      expect(existsBefore).toBe(false);
      expect(existsAfter).toBe(true);
    });

    await Effect.runPromise(program);
  });

  it('should remove key', async () => {
    const storage = new TestStorageService();

    const program = Effect.gen(function* (_) {
      yield* _(storage.set('test-key', 'value'));
      const existsBefore = yield* _(storage.has('test-key'));
      yield* _(storage.remove('test-key'));
      const existsAfter = yield* _(storage.has('test-key'));

      expect(existsBefore).toBe(true);
      expect(existsAfter).toBe(false);
    });

    await Effect.runPromise(program);
  });

  it('should list keys with prefix', async () => {
    const storage = new TestStorageService();

    const program = Effect.gen(function* (_) {
      yield* _(storage.set('autosave-1', 'value1'));
      yield* _(storage.set('autosave-2', 'value2'));
      yield* _(storage.set('other-key', 'value3'));

      const autosaveKeys = yield* _(storage.list('autosave-'));
      const allKeys = yield* _(storage.list());

      expect(autosaveKeys).toHaveLength(2);
      expect(allKeys.length).toBeGreaterThanOrEqual(3);
    });

    await Effect.runPromise(program);
  });

  it('should clear keys with prefix', async () => {
    const storage = new TestStorageService();

    const program = Effect.gen(function* (_) {
      yield* _(storage.set('autosave-1', 'value1'));
      yield* _(storage.set('autosave-2', 'value2'));
      yield* _(storage.set('other-key', 'value3'));

      yield* _(storage.clear('autosave-'));

      const autosaveKeys = yield* _(storage.list('autosave-'));
      const allKeys = yield* _(storage.list());

      expect(autosaveKeys).toHaveLength(0);
      expect(allKeys).toContain('other-key');
    });

    await Effect.runPromise(program);
  });
});
