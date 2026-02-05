// @ts-nocheck
/**
 * ValidationService Protocol
 *
 * Validates XML documents against RelaxNG schemas with detailed error reporting.
 */

import { Effect, Context } from 'effect';

// ============================================================================
// Error Types
// ============================================================================

export class ValidationError extends Error {
  readonly _tag = 'ValidationError';
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SchemaLoadError extends ValidationError {
  readonly _tag = 'SchemaLoadError';
  constructor(
    message: string,
    public readonly schemaPath: string
  ) {
    super(message);
    this.name = 'SchemaLoadError';
  }
}

export class ValidationExecutionError extends ValidationError {
  readonly _tag = 'ValidationExecutionError';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationExecutionError';
  }
}

// ============================================================================
// Result Types
// ============================================================================

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly suggestions?: readonly FixSuggestion[];
}

export interface ValidationWarning {
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly code?: string;
  readonly severity?: 'info' | 'warning';
}

export interface FixSuggestion {
  readonly type: 'add-element' | 'remove-element' | 'modify-attribute' | 'rename-element' | 'other';
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly suggestion?: string;
}

export interface TagDefinition {
  readonly name: string;
  readonly namespace?: string;
  readonly required: boolean;
  readonly repeatable: boolean;
}

export interface AttributeDefinition {
  readonly name: string;
  readonly namespace?: string;
  readonly required: boolean;
  readonly type?: string;
}

export type XmlPath = ReadonlyArray<{ readonly name: string; readonly namespace?: string }>;

// ============================================================================
// Protocol Interface
// ============================================================================

export interface ValidationService {
  /**
   * Validate XML document against schema
   */
  readonly validateDocument: (
    xmlContent: string,
    schemaPath: string
  ) => Effect.Effect<ValidationResult, ValidationError>;

  /**
   * Validate TEI document (parsed)
   */
  readonly validateTEIDocument: (
    document: unknown,
    schemaPath: string
  ) => Effect.Effect<ValidationResult, ValidationError>;

  /**
   * Preload schema for faster subsequent validations
   */
  readonly preloadSchema: (schemaPath: string) => Effect.Effect<void, SchemaLoadError>;

  /**
   * Get allowed tags for current XML context
   */
  readonly getAllowedTags: (
    schemaPath: string,
    context: XmlPath
  ) => Effect.Effect<readonly TagDefinition[], SchemaLoadError>;

  /**
   * Get attributes allowed for a tag
   */
  readonly getTagAttributes: (
    schemaPath: string,
    tagName: string
  ) => Effect.Effect<readonly AttributeDefinition[], SchemaLoadError>;

  /**
   * Clear schema cache
   */
  readonly clearCache: (schemaPath?: string) => Effect.Effect<void, never>;
}

// ============================================================================
// Context Tag
// ============================================================================

export const ValidationService = Context.GenericTag<ValidationService>('@app/ValidationService');
