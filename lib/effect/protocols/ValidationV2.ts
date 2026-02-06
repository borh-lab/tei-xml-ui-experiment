/**
 * ValidationProtocol V2 - Cache as explicit dependency
 *
 * Unlike V1 (where cache is implementation detail), V2 accepts
 * cache as a protocol parameter. This enables:
 * - Easy testing (inject mock cache)
 * - Different cache strategies (LRU, no-op, in-memory)
 * - Cache reuse across services (validation, AI, parsing)
 */

import { Effect } from 'effect';
import type { ValidationResult, ValidationError } from '@/lib/effect/protocols/Validation';
import type { DocumentState, ValidationSnapshot } from '@/lib/values/DocumentState';
import type { ICache } from '@/lib/protocols/cache';

// ============================================================================
// Error Types
// ============================================================================

export class ValidationError extends Error {
  readonly _tag = 'ValidationError';
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SchemaLoadError extends Error {
  readonly _tag = 'SchemaLoadError';
  constructor(message: string, public readonly schemaPath: string) {
    super(message);
    this.name = 'SchemaLoadError';
  }
}

// ============================================================================
// Cache Key Types
// ============================================================================

/**
 * Cache key for validation results
 */
export interface ValidationCacheKey {
  readonly passageId: string;
  readonly revision: number;
  readonly schemaPath: string;
}

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * ValidationProtocol V2 Interface
 *
 * Cache is explicit parameter, not hidden dependency.
 */
export interface ValidationProtocol {
  /**
   * Validate document state
   *
   * Uses cache if provided, performs full validation otherwise.
   * Returns ValidationSnapshot with temporal context.
   */
  readonly validateState: (
    state: DocumentState,
    schemaPath: string,
    cache?: ICache<ValidationCacheKey, readonly ValidationResult[]>
  ) => Effect.Effect<ValidationSnapshot, ValidationError>;

  /**
   * Validate single passage
   *
   * Cache is optional (pass no-cache for testing)
   */
  readonly validatePassage: (
    state: DocumentState,
    passageId: string,
    schemaPath: string,
    cache?: ICache<ValidationCacheKey, readonly ValidationResult[]>
  ) => Effect.Effect<readonly ValidationResult[], ValidationError>;

  /**
   * Clear validation cache
   */
  readonly clearCache: (
    cache: ICache<ValidationCacheKey, readonly ValidationResult[]>
  ) => Effect.Effect<void, never>;
}

// ============================================================================
// Live Implementation
// ============================================================================

/**
 * ValidationProtocolLive V2
 *
 * Uses browser/schema loader from existing V1 implementation.
 * Cache is injected, not created internally.
 */
export const ValidationProtocolLive: ValidationProtocol = {
  validateState: (
    state: DocumentState,
    schemaPath: string,
    cache?: ICache<ValidationCacheKey, readonly ValidationResult[]>
  ) =>
    Effect.gen(function* () {
      if (!state.document) {
        throw new Error('No document to validate');
      }

      const revision = state.document.state.revision;

      // Check cache if provided
      if (cache) {
        const cacheKey: ValidationCacheKey = {
          passageId: 'document',
          revision,
          schemaPath,
        };
        const cached = cache.get(cacheKey);
        if (cached) {
          return {
            results: {
              valid: cached.every((r) => (r as ValidationError).severity !== 'error'),
              errors: cached.filter((r) => (r as ValidationError).severity === 'error') as ValidationError[],
              warnings: cached.filter((r) => (r as ValidationError).severity === 'warning') as ValidationError[],
            },
            revision,
            validatedAt: new Date(),
          };
        }
      }

      // Perform validation (reuse existing service)
      const { BrowserValidationService } = yield* _(
        Effect.promise(() => import('@/lib/effect/services/ValidationService'))
      );
      const xml = state.document.state.xml;
      const program = BrowserValidationService.validateDocument(xml, schemaPath);
      const result = yield* _(program);

      // Cache result if cache provided
      if (cache) {
        const allResults = [...result.errors, ...result.warnings];
        cache.set({ passageId: 'document', revision, schemaPath }, allResults);
      }

      return {
        results: result,
        revision,
        validatedAt: new Date(),
      };
    }).pipe(
      Effect.catchAll(
        (error) => Effect.fail(new ValidationError(
          `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          error
        ))
      )
    ),

  validatePassage: (
    state: DocumentState,
    passageId: string,
    schemaPath: string,
    cache?: ICache<ValidationCacheKey, readonly ValidationResult[]>
  ) =>
    Effect.gen(function* () {
      if (!state.document) {
        throw new Error('No document to validate');
      }

      const revision = state.document.state.revision;

      // Check cache
      if (cache) {
        const cacheKey: ValidationCacheKey = { passageId, revision, schemaPath };
        const cached = cache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Perform passage-level validation
      // (Implementation depends on your validation service capabilities)
      const results: ValidationResult[] = [];
      // TODO: Implement passage-level validation
      // const results = yield* _(validatePassageInternal(...));

      // Cache result
      if (cache) {
        cache.set({ passageId, revision, schemaPath }, results);
      }

      return results;
    }).pipe(
      Effect.catchAll(
        (error) => Effect.fail(new ValidationError(
          `Passage validation failed: ${error instanceof Error ? error.message : String(error)}`,
          error
        ))
      )
    ),

  clearCache: (
    cache: ICache<ValidationCacheKey, readonly ValidationResult[]>
  ) =>
    Effect.sync(() => {
      cache.clear();
    }),
};

// ============================================================================
// Test Double (No-op Cache)
// ============================================================================

/**
 * NoOpCache for testing
 *
 * Doesn't cache anything, always returns null.
 */
export class NoOpCache<K, V> implements ICache<K, V> {
  get(): V | null {
    return null;
  }

  set(): void {
    // No-op
  }

  clear(): void {
    // No-op
  }
}
