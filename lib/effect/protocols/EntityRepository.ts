// @ts-nocheck
/**
 * EntityRepository Protocol
 *
 * Abstracts entity data persistence (file system, memory, cloud).
 * All operations return Effects for composition.
 *
 * This service ONLY handles I/O operations for loading/saving entity data.
 * Business logic for entity CRUD operations is in lib/protocols/entities.ts
 *
 * Benefits:
 * - Testable (mock implementation without file system)
 * - Composable (add caching, logging, validation)
 * - Portable (swap implementations without changing code)
 */

import { Effect, Context } from 'effect';
import type { Entity } from '@/lib/tei/types';

// ============================================================================
// Error Types
// ============================================================================

export class EntityRepositoryError extends Error {
  readonly _tag:
    | 'EntityRepositoryError'
    | 'EntityNotFoundError'
    | 'EntityParseError'
    | 'EntityWriteError' = 'EntityRepositoryError';
  constructor(
    message: string,
    public readonly path?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EntityRepositoryError';
  }
}

export class EntityNotFoundError extends EntityRepositoryError {
  readonly _tag = 'EntityNotFoundError' as 'EntityNotFoundError';
  constructor(message: string, path: string) {
    super(message, path);
    this.name = 'EntityNotFoundError';
  }
}

export class EntityParseError extends EntityRepositoryError {
  readonly _tag = 'EntityParseError' as 'EntityParseError';
  constructor(
    message: string,
    path: string,
    public readonly cause?: unknown
  ) {
    super(message, path, cause);
    this.name = 'EntityParseError';
  }
}

export class EntityWriteError extends EntityRepositoryError {
  readonly _tag = 'EntityWriteError' as 'EntityWriteError';
  constructor(
    message: string,
    path: string,
    public readonly cause?: unknown
  ) {
    super(message, path, cause);
    this.name = 'EntityWriteError';
  }
}

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * EntityRepository Protocol
 *
 * Abstracts entity data persistence operations.
 * Methods handle loading/serving entity collections from storage.
 */
export interface EntityRepository {
  /**
   * Load entities from a file path
   *
   * @param path - File path to load entities from
   * @returns Effect that produces the entity array or throws EntityRepositoryError
   */
  readonly load: (path: string) => Effect.Effect<readonly Entity[], EntityParseError | EntityNotFoundError>;

  /**
   * Save entities to a file path
   *
   * @param path - File path to save entities to
   * @param entities - Entity array to save
   * @returns Effect that completes when saved or throws EntityWriteError
   */
  readonly save: (path: string, entities: readonly Entity[]) => Effect.Effect<void, EntityWriteError>;

  /**
   * List all entity file paths
   *
   * @param pattern - Optional glob pattern to filter files
   * @returns Effect that produces array of file paths
   */
  readonly list: (pattern?: string) => Effect.Effect<readonly string[], EntityRepositoryError>;

  /**
   * Delete entity file at path
   *
   * @param path - File path to delete
   * @returns Effect that completes when deleted or throws EntityRepositoryError
   */
  readonly delete: (path: string) => Effect.Effect<void, EntityRepositoryError>;
}

// ============================================================================
// Context Tag
// ============================================================================

export const EntityRepository = Context.GenericTag<EntityRepository>('@app/EntityRepository');
