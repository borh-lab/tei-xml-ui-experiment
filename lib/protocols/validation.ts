import type { Result } from './Result';
import { success, failure, isSuccess } from './Result';
import type { Selection } from '@/lib/values/Selection';
import type { ValidationResult } from '@/lib/validation/types';
import type { TEIDocument } from '@/lib/tei/types';
import { Validator } from '@/lib/validation/Validator';
import { SchemaCache } from '@/lib/validation/SchemaCache';

type FileReader = (path: string, encoding: string) => string;
let schemaCache: SchemaCache | null = null;
let fileReader: FileReader | null = null;

/**
 * @deprecated This function has been removed.
 * Pass schema cache directly to validateSelection instead.
 * This function is kept for backward compatibility but does nothing.
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * initValidationCache(process.cwd());
 *
 * // New way - pass cache directly
 * const cache = new SchemaCache({ maxSize: 10, ttl: 60000 }, fileReader);
 * const result = validateSelection(selection, tagType, attrs, document, cache);
 * ```
 */
export function initValidationCache(schemaPath: string, customFileReader?: FileReader): void {
  // Deprecated - users should create cache instances themselves
  // Kept for backward compatibility
  if (!schemaCache) {
    // Use custom file reader for testing, or fs.readFileSync for production
    if (customFileReader) {
      fileReader = customFileReader;
    } else if (typeof window === 'undefined') {
      // Node.js environment
      const fs = require('fs');
      fileReader = fs.readFileSync;
    }

    schemaCache = new SchemaCache({ maxSize: 10, ttl: 60000 }, fileReader || undefined);
  }
}

export function validateSelection(
  selection: Selection,
  tagType: string,
  providedAttrs: Record<string, string>,
  document: TEIDocument,
  cache?: SchemaCache | null
): Result<ValidationResult> {
  try {
    const passage = document.state.passages.find((p) => p.id === selection.passageId);
    if (!passage) {
      return failure(
        'PASSAGE_NOT_FOUND',
        `Passage ${selection.passageId} not found`,
        true,
        { passageId: selection.passageId }
      );
    }

    // Use provided cache or fall back to global cache for backward compatibility
    const validatorCache = cache ?? schemaCache;
    if (!validatorCache) {
      return failure(
        'CACHE_NOT_INITIALIZED',
        'Schema cache not provided. Please provide a SchemaCache instance or call initValidationCache() for backward compatibility.',
        false,
        { tagType }
      );
    }

    const validator = new Validator(validatorCache);
    const result = validator.validate(passage, selection.range, tagType, providedAttrs, document);

    return success(result);
  } catch (error) {
    return failure(
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Unknown validation error',
      false,
      { tagType, selection: selection.text }
    );
  }
}

export function isValidSelection(
  selection: Selection,
  tagType: string,
  providedAttrs: Record<string, string>,
  document: TEIDocument,
  cache?: SchemaCache | null
): boolean {
  const result = validateSelection(selection, tagType, providedAttrs, document, cache);
  return isSuccess(result) && result.value.valid;
}
