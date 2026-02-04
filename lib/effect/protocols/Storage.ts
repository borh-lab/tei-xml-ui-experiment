/**
 * StorageService Protocol
 *
 * Abstracts storage backend (localStorage, file system, cloud).
 * All operations return Effects for composition.
 *
 * Benefits:
 * - Testable (mock implementation without browser)
 * - Composable (add caching, encryption, logging)
 * - Portable (swap implementations without changing code)
 */

import { Effect, Context, Schema } from 'effect';

// ============================================================================
// Error Types
// ============================================================================

export class StorageError extends Schema.Class<'StorageError'>({
  message: Schema.String,
  key: Schema.String.orElse(Schema.Undefined),
  cause: Schema.Unknown.orElse(Schema.Undefined),
}) {
  readonly _tag = 'StorageError';
}

export class StorageKeyNotFoundError extends StorageError {
  readonly _tag = 'StorageKeyNotFoundError';
  readonly key: string;
}

export class StorageQuotaExceededError extends StorageError {
  readonly _tag = 'StorageQuotaExceededError';
  readonly quota: number;
  readonly attempted: number;
}

// ============================================================================
// Metadata Types
// ============================================================================

export interface StorageMetadata {
  readonly storedAt: Date;
  readonly size: number;
  readonly contentType: string;
  readonly checksum?: string;
  readonly tags?: readonly string[];
}

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * StorageService Protocol
 *
 * Abstracts key-value storage operations.
 */
export interface StorageService {
  /**
   * Store a value by key
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON serialized)
   * @param metadata - Optional metadata
   */
  readonly set: <T>(
    key: string,
    value: T,
    metadata?: StorageMetadata
  ) => Effect.Effect<void, StorageError>;

  /**
   * Retrieve a value by key
   *
   * @param key - Storage key
   * @returns Effect that produces the stored value or throws StorageKeyNotFoundError
   */
  readonly get: <T>(
    key: string
  ) => Effect.Effect<T, StorageKeyNotFoundError>;

  /**
   * Check if a key exists
   *
   * @param key - Storage key to check
   */
  readonly has: (
    key: string
  ) => Effect.Effect<boolean, never>;

  /**
   * Delete a key
   *
   * @param key - Storage key to delete
   */
  readonly remove: (
    key: string
  ) => Effect.Effect<void, StorageError>;

  /**
   * List all stored keys
   *
   * @param prefix - Optional prefix filter (e.g., 'autosave-')
   */
  readonly list: (
    prefix?: string
  ) => Effect.Effect<readonly string[], StorageError>;

  /**
   * Get metadata for a key
   *
   * @param key - Storage key
   */
  readonly getMetadata: (
    key: string
  ) => Effect.Effect<StorageMetadata, StorageKeyNotFoundError>;

  /**
   * Clear all keys
   *
   * @param prefix - Optional prefix filter
   */
  readonly clear: (
    prefix?: string
  ) => Effect.Effect<void, StorageError>;
}

// ============================================================================
// Context Tag
// ============================================================================

export const StorageService = Context.GenericTag<StorageService>('@app/StorageService');
