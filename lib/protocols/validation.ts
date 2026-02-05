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

export function initValidationCache(schemaPath: string, customFileReader?: FileReader): void {
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
  document: TEIDocument
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

    if (!schemaCache) {
      initValidationCache(process.cwd());
    }

    const validator = new Validator(schemaCache!);
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
  document: TEIDocument
): boolean {
  const result = validateSelection(selection, tagType, providedAttrs, document);
  return isSuccess(result) && result.value.valid;
}
