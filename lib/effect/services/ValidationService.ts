/**
 * ValidationService Implementation
 *
 * Wraps existing ValidationService with Effect for composability.
 */

import { Effect, Layer } from 'effect';
import { SchemaLoader } from '@/lib/validation/SchemaLoader';
import {
  ValidationService,
  ValidationError,
  SchemaLoadError,
  ValidationResult,
  TagDefinition,
  AttributeDefinition,
  XmlPath,
} from '../protocols/Validation';

// ============================================================================
// Browser Implementation
// ============================================================================

export const BrowserValidationService: ValidationService = {
  validateDocument: (xmlContent: string, schemaPath: string): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.tryPromise({
      try: async () => {
        const schemaLoader = new SchemaLoader();
        const result = await schemaLoader.validate(xmlContent, schemaPath);
        return {
          valid: result.valid,
          errors: result.errors.map(
            (e) =>
              new ValidationError({
                message: e.message || 'Unknown error',
                line: e.line,
                column: e.column,
                context: e.context,
              })
          ),
          warnings: [],
          suggestions: [],
        };
      },
      catch: (error) =>
        new ValidationError({
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        }),
    }),

  validateTEIDocument: (document: any, schemaPath: string): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* (_) {
      // Schema validation
      const schemaResult = yield* _(BrowserValidationService.validateDocument(document.state.xml, schemaPath));

      // Additional business rule validation
      const businessErrors: ValidationError[] = [];

      // Check that all speaker IDs exist
      for (const dialogue of document.state.dialogue || []) {
        if (dialogue.speaker) {
          const characterExists = (document.state.characters || []).some((c: any) => c.id === dialogue.speaker);
          if (!characterExists) {
            businessErrors.push(
              new ValidationError({
                message: `Speaker ${dialogue.speaker} not found in character list`,
                context: `Dialogue ${dialogue.id} in passage ${dialogue.passageId}`,
              })
            );
          }
        }
      }

      return {
        valid: schemaResult.valid && businessErrors.length === 0,
        errors: [...schemaResult.errors, ...businessErrors],
        warnings: schemaResult.warnings,
        suggestions: schemaResult.suggestions,
      };
    }),

  preloadSchema: (schemaPath: string): Effect.Effect<void, SchemaLoadError> =>
    Effect.tryPromise({
      try: async () => {
        const schemaLoader = new SchemaLoader();
        await schemaLoader.loadSchema(schemaPath);
      },
      catch: (error) =>
        new SchemaLoadError({
          message: `Failed to load schema: ${error instanceof Error ? error.message : String(error)}`,
          schemaPath,
          cause: error,
        }),
    }),

  getAllowedTags: (schemaPath: string, context: XmlPath): Effect.Effect<readonly TagDefinition[], SchemaLoadError> =>
    Effect.try({
      try: () => {
        const schemaLoader = new SchemaLoader();
        return schemaLoader.getAllowedTags(schemaPath, context);
      },
      catch: (error) =>
        new SchemaLoadError({
          message: `Failed to get allowed tags: ${error instanceof Error ? error.message : String(error)}`,
          schemaPath,
          cause: error,
        }),
    }),

  getTagAttributes: (schemaPath: string, tagName: string): Effect.Effect<readonly AttributeDefinition[], SchemaLoadError> =>
    Effect.try({
      try: () => {
        const schemaLoader = new SchemaLoader();
        return schemaLoader.getTagAttributes(schemaPath, tagName);
      },
      catch: (error) =>
        new SchemaLoadError({
          message: `Failed to get tag attributes: ${error instanceof Error ? error.message : String(error)}`,
          schemaPath,
          cause: error,
        }),
    }),

  clearCache: (schemaPath?: string): Effect.Effect<void, never> =>
    Effect.sync(() => {
      SchemaLoader.clearCache();
    }),
};

// ============================================================================
// Test Implementation
// ============================================================================

/**
 * TestValidationService
 *
 * Mock implementation for testing with configurable results.
 */
export class TestValidationService {
  private schemas = new Map<string, any>();
  private validationResults = new Map<string, ValidationResult>();
  private defaultResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  setValidationResult(xmlHash: string, result: ValidationResult): void {
    this.validationResults.set(xmlHash, result);
  }

  setDefaultResult(result: ValidationResult): void {
    this.defaultResult = result;
  }

  validateDocument(xml: string): Effect.Effect<ValidationResult, never> {
    return Effect.sync(() => {
      const hash = simpleHash(xml);
      return this.validationResults.get(hash) || this.defaultResult;
    });
  }

  validateTEIDocument(document: any): Effect.Effect<ValidationResult, never> {
    return Effect.sync(() => {
      const hash = simpleHash(document.state.xml);
      return this.validationResults.get(hash) || this.defaultResult;
    });
  }

  preloadSchema(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      // Pretend to load schema
    });
  }

  getAllowedTags(): Effect.Effect<readonly TagDefinition[], never> {
    return Effect.succeed([
      { name: 'said', required: false, repeatable: true },
      { name: 'q', required: false, repeatable: true },
      { name: 'persName', required: false, repeatable: true },
    ]);
  }

  getTagAttributes(): Effect.Effect<readonly AttributeDefinition[], never> {
    return Effect.succeed([
      { name: 'who', required: false, type: 'string' },
      { name: 'direct', required: false, type: 'boolean' },
    ]);
  }

  clearCache(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.schemas.clear();
      this.validationResults.clear();
    });
  }

  // Helper
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

// ============================================================================
// Layers
// ============================================================================

export const ValidationServiceLive = Layer.succeed(ValidationService, BrowserValidationService);

export const TestValidationServiceLive = Layer.effect(
  ValidationService,
  Effect.succeed(() => new TestValidationService())
);

// ============================================================================
// Helper
// ============================================================================

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
