/**
 * Validation Module Public API
 *
 * Provides schema-driven validation for TEI XML documents.
 * Exports types, classes, and functions for validation operations.
 */

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flag for schema-driven validation system.
 *
 * When enabled (true), the new Validator class uses RelaxNG-parsed constraints.
 * When disabled (false), the system falls back to legacy hardcoded constraints.
 *
 * This flag allows for safe rollout and easy rollback if issues arise in production.
 *
 * To disable: Set to false
 * To enable via environment variable: Set NEXT_PUBLIC_ENABLE_SCHEMA_DRIVEN_VALIDATION='true'
 *
 * @default true - System is working well, defaults to enabled
 */
export const ENABLE_SCHEMA_DRIVEN_VALIDATION: boolean =
  (typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_ENABLE_SCHEMA_DRIVEN_VALIDATION === 'true') ||
  (typeof process !== 'undefined' && process.env?.ENABLE_SCHEMA_DRIVEN_VALIDATION === 'true') ||
  true; // Default to enabled

// ============================================================================
// Legacy Validation Service
// ============================================================================

export { ValidationService } from './ValidationService';
export type {
  ValidationResult as LegacyValidationResult,
  ValidationError as LegacyValidationError,
  ValidationWarning,
  FixSuggestion,
  ValidationServiceOptions,
} from './ValidationService';

// ============================================================================
// Schema-Driven Validation (New)
// ============================================================================

// Types
export type {
  // RelaxNG parser output
  ParsedConstraints,
  TagConstraint,
  AttributeConstraint,
  ContentModel,
  AttributeType,

  // Validation results
  ValidationResult,
  ValidationError,
  ValidationWarning as SchemaValidationWarning,
  Fix,
  TextRange,

  // Entity detection
  EntityType,
  EntityMapping,

  // Schema cache configuration
  SchemaCacheOptions,

  // Tag queue
  QueuedTag,
  TagQueueState,
} from './types';

// Classes
export { RelaxNGParser } from './RelaxNGParser';
export { SchemaCache } from './SchemaCache';
export { Validator } from './Validator';

// Functions
export { detectSchemaPath } from './schemaDetection';
export { detectEntityTypeFromAttribute, getEntities } from './EntityDetector';

// Tag Queue (from separate module)
export { TagQueue } from '../queue/TagQueue';
