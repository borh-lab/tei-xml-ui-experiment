// @ts-nocheck
// @ts-nocheck
/**
 * StorageService Implementations
 *
 * Provides browser and test implementations of StorageService protocol.
 */

import { Effect, Layer } from 'effect';
import {
  StorageService,
  StorageError,
  StorageKeyNotFoundError,
  StorageQuotaExceededError,
  StorageMetadata,
} from '../protocols/Storage';

// ============================================================================
// Browser Implementation (localStorage)
// ============================================================================

/**
 * BrowserStorageService
 *
 * Wraps browser localStorage in Effect for error handling and composition.
 */
export const BrowserStorageService: StorageService = {
  get: <T>(key: string): Effect.Effect<T, StorageKeyNotFoundError> =>
    Effect.try({
      try: () => {
        const value = localStorage.getItem(key);
        if (value === null) {
          throw new StorageKeyNotFoundError({
            message: `Key not found: ${key}`,
            key,
          });
        }
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      },
      catch: (error) =>
        new StorageError({
          message: `Failed to get ${key}: ${error instanceof Error ? error.message : String(error)}`,
          key,
          cause: error,
        }),
    }),

  set: <T>(key: string, value: T, metadata?: StorageMetadata): Effect.Effect<void, StorageError> =>
    Effect.try({
      try: () => {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        if (metadata) {
          localStorage.setItem(`${key}-metadata`, JSON.stringify(metadata));
        }
      },
      catch: (error) => {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          return new StorageQuotaExceededError({
            message: 'Storage quota exceeded',
            key,
            quota: 5 * 1024 * 1024, // 5MB typical localStorage limit
            attempted: JSON.stringify(value).length,
          });
        }
        return new StorageError({
          message: `Failed to set ${key}: ${error instanceof Error ? error.message : String(error)}`,
          key,
          cause: error,
        });
      },
    }),

  has: (key: string): Effect.Effect<boolean, never> =>
    Effect.sync(() => localStorage.getItem(key) !== null),

  remove: (key: string): Effect.Effect<void, StorageError> =>
    Effect.try({
      try: () => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}-metadata`);
      },
      catch: (error) =>
        new StorageError({
          message: `Failed to remove ${key}: ${error instanceof Error ? error.message : String(error)}`,
          key,
          cause: error,
        }),
    }),

  list: (prefix?: string): Effect.Effect<readonly string[], StorageError> =>
    Effect.sync(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (!prefix || key.startsWith(prefix)) && !key.endsWith('-metadata')) {
          keys.push(key);
        }
      }
      return keys;
    }),

  getMetadata: (key: string): Effect.Effect<StorageMetadata, StorageKeyNotFoundError> =>
    Effect.try({
      try: () => {
        const metadataJson = localStorage.getItem(`${key}-metadata`);
        if (!metadataJson) {
          throw new StorageKeyNotFoundError({
            message: `Metadata not found for ${key}`,
            key,
          });
        }
        return JSON.parse(metadataJson) as StorageMetadata;
      },
      catch: (error) =>
        new StorageError({
          message: `Failed to get metadata for ${key}: ${error instanceof Error ? error.message : String(error)}`,
          key,
          cause: error,
        }),
    }),

  clear: (prefix?: string): Effect.Effect<void, StorageError> =>
    Effect.try({
      try: () => {
        if (prefix) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        } else {
          localStorage.clear();
        }
      },
      catch: (error) =>
        new StorageError({
          message: `Failed to clear: ${error instanceof Error ? error.message : String(error)}`,
          cause: error,
        }),
    }),
};

// ============================================================================
// Test Implementation (In-Memory)
// ============================================================================

/**
 * TestStorageService
 *
 * In-memory storage for tests. Each instance is isolated.
 */
export class TestStorageService implements StorageService {
  private store = new Map<string, { value: string; metadata?: StorageMetadata }>();

  get<T>(key: string): Effect.Effect<T, StorageKeyNotFoundError> {
    return Effect.sync(() => {
      const entry = this.store.get(key);
      if (!entry) {
        throw new StorageKeyNotFoundError({
          message: `Key not found: ${key}`,
          key,
        });
      }
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return entry.value as T;
      }
    });
  }

  set<T>(key: string, value: T, metadata?: StorageMetadata): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.store.set(key, {
        value: JSON.stringify(value),
        metadata,
      });
    });
  }

  has(key: string): Effect.Effect<boolean, never> {
    return Effect.sync(() => this.store.has(key));
  }

  remove(key: string): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.store.delete(key);
    });
  }

  list(prefix?: string): Effect.Effect<readonly string[], never> {
    return Effect.sync(() => {
      const keys = Array.from(this.store.keys());
      return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
    });
  }

  getMetadata(key: string): Effect.Effect<StorageMetadata, StorageKeyNotFoundError> {
    return Effect.sync(() => {
      const entry = this.store.get(key);
      if (!entry?.metadata) {
        throw new StorageKeyNotFoundError({
          message: `Metadata not found: ${key}`,
          key,
        });
      }
      return entry.metadata;
    });
  }

  clear(prefix?: string): Effect.Effect<void, never> {
    return Effect.sync(() => {
      if (prefix) {
        const keysToRemove = Array.from(this.store.keys()).filter((k) => k.startsWith(prefix));
        keysToRemove.forEach((k) => this.store.delete(k));
      } else {
        this.store.clear();
      }
    });
  }

  // Test helpers
  clearAll(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// ============================================================================
// Layers
// ============================================================================

/**
 * StorageServiceLive Layer
 *
 * Provides the browser localStorage implementation.
 */
export const StorageServiceLive = Layer.succeed(StorageService, BrowserStorageService);

/**
 * TestStorageServiceLive Layer
 *
 * Provides the test implementation.
 */
export const TestStorageServiceLive = Layer.effect(
  StorageService,
  Effect.succeed(() => new TestStorageService())
);
