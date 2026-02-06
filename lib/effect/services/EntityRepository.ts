// @ts-nocheck
/**
 * EntityRepository Service Implementation
 *
 * Provides file system and test implementations for entity persistence.
 * All operations wrapped in Effect for error handling and composition.
 */

import { Effect, Layer, Context } from 'effect';
import { FileSystem } from 'effect';
import {
  EntityRepository,
  EntityRepositoryError,
  EntityNotFoundError,
  EntityParseError,
  EntityWriteError,
} from '../protocols/EntityRepository';
import type { Entity } from '@/lib/tei/types';

// ============================================================================
// File System Implementation
// ============================================================================

/**
 * EntityRepositoryLive
 *
 * File system-based implementation using Effect's FileSystem.
 * Reads and writes JSON files containing entity arrays.
 */
const makeEntityRepositoryLive = Effect.succeed(() => {
  const load = (path: string): Effect.Effect<readonly Entity[], EntityParseError | EntityNotFoundError> =>
    Effect.gen(function* (_) {
      const fileSystem = yield* _(FileSystem.FileSystem);

      // Check if file exists
      const exists = yield* _(fileSystem.exists(path));
      if (!exists) {
        return yield* _(
          Effect.fail(
            new EntityNotFoundError(`Entity file not found: ${path}`, path)
          )
        );
      }

      // Read file content
      const content = yield* _(
        Effect.try({
          try: () => fileSystem.readTextFile(path),
          catch: (error) =>
            new EntityParseError(
              `Failed to read entity file: ${error instanceof Error ? error.message : String(error)}`,
              path,
              error
            ),
        })
      );

      // Parse JSON
      const entities = yield* _(
        Effect.try({
          try: () => JSON.parse(content) as Entity[],
          catch: (error) =>
            new EntityParseError(
              `Failed to parse entity JSON: ${error instanceof Error ? error.message : String(error)}`,
              path,
              error
            ),
        })
      );

      return entities;
    });

  const save = (
    path: string,
    entities: readonly Entity[]
  ): Effect.Effect<void, EntityWriteError> =>
    Effect.gen(function* (_) {
      const fileSystem = yield* _(FileSystem.FileSystem);

      // Ensure directory exists
      const dir = path.split('/').slice(0, -1).join('/');
      if (dir) {
        const dirExists = yield* _(fileSystem.exists(dir));
        if (!dirExists) {
          yield* _(
            Effect.try({
              try: () => fileSystem.makeDirectory(dir, { recursive: true }),
              catch: (error) =>
                new EntityWriteError(
                  `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
                  dir,
                  error
                ),
            })
          );
        }
      }

      // Serialize and write
      const content = JSON.stringify(entities, null, 2);
      yield* _(
        Effect.try({
          try: () => fileSystem.writeTextFile(path, content),
          catch: (error) =>
            new EntityWriteError(
              `Failed to write entity file: ${error instanceof Error ? error.message : String(error)}`,
              path,
              error
            ),
        })
      );
    });

  const list = (pattern?: string): Effect.Effect<readonly string[], EntityRepositoryError> =>
    Effect.gen(function* (_) {
      const fileSystem = yield* _(FileSystem.FileSystem);

      // Use pattern or default to entity files
      const searchPattern = pattern || '**/*.entities.json';

      yield* _(
        Effect.try({
          try: () => fileSystem.readDirectoryWithSpec(
            '.',
            { recursive: true }
          ),
          catch: (error) =>
            new EntityRepositoryError(
              `Failed to list entity files: ${error instanceof Error ? error.message : String(error)}`,
              undefined,
              error
            ),
        })
      );

      // For now, return empty array - full glob implementation requires more Effect utilities
      // TODO: Implement proper glob filtering when Effect provides better utilities
      return [];
    });

  const deletePath = (path: string): Effect.Effect<void, EntityRepositoryError> =>
    Effect.gen(function* (_) {
      const fileSystem = yield* _(FileSystem.FileSystem);

      // Check if file exists
      const exists = yield* _(fileSystem.exists(path));
      if (!exists) {
        return yield* _(
          Effect.fail(
            new EntityNotFoundError(`Entity file not found: ${path}`, path)
          )
        );
      }

      // Delete file
      yield* _(
        Effect.try({
          try: () => fileSystem.remove(path),
          catch: (error) =>
            new EntityRepositoryError(
              `Failed to delete entity file: ${error instanceof Error ? error.message : String(error)}`,
              path,
              error
            ),
        })
      );
    });

  return {
    load,
    save,
    list,
    delete: deletePath,
  } as const;
});

/**
 * EntityRepositoryLive Layer
 *
 * Provides the file system implementation.
 */
export const EntityRepositoryLive = Layer.effect(
  EntityRepository,
  makeEntityRepositoryLive
);

// ============================================================================
// Test Implementation (In-Memory)
// ============================================================================

/**
 * TestEntityRepository
 *
 * In-memory entity storage for tests. Each instance is isolated.
 * Uses a Map to simulate file system storage.
 */
export class TestEntityRepository implements EntityRepository {
  private store = new Map<string, string>();

  load(path: string): Effect.Effect<readonly Entity[], EntityParseError | EntityNotFoundError> {
    return Effect.sync(() => {
      const content = this.store.get(path);
      if (!content) {
        throw new EntityNotFoundError(`Entity file not found: ${path}`, path);
      }
      try {
        return JSON.parse(content) as Entity[];
      } catch (error) {
        throw new EntityParseError(
          `Failed to parse entity JSON: ${error instanceof Error ? error.message : String(error)}`,
          path,
          error
        );
      }
    });
  }

  save(path: string, entities: readonly Entity[]): Effect.Effect<void, never> {
    return Effect.sync(() => {
      const content = JSON.stringify(entities, null, 2);
      this.store.set(path, content);
    });
  }

  list(pattern?: string): Effect.Effect<readonly string[], never> {
    return Effect.sync(() => {
      const paths = Array.from(this.store.keys());
      if (!pattern) {
        return paths;
      }
      // Simple glob pattern matching (supports * and ? wildcards)
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(regexPattern);
      return paths.filter(p => regex.test(p));
    });
  }

  delete(path: string): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.store.delete(path);
    });
  }

  // Test helpers
  clearAll(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  has(path: string): boolean {
    return this.store.has(path);
  }
}

/**
 * TestEntityRepositoryLive Layer
 *
 * Provides the test implementation.
 */
export const TestEntityRepositoryLive = Layer.effect(
  EntityRepository,
  Effect.succeed(() => new TestEntityRepository())
);

// ============================================================================
// Convenience Factory
// ============================================================================

/**
 * Create a new test repository instance
 *
 * Use this in tests to create isolated repositories.
 */
export const createTestRepository = (): TestEntityRepository => {
  return new TestEntityRepository();
};
