/**
 * Validation Module Public API
 *
 * Provides schema-driven validation for TEI XML documents.
 * Exports types, classes, and functions for validation operations.
 */

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
} from './types'

// Classes
export { RelaxNGParser } from './RelaxNGParser'
export { SchemaCache } from './SchemaCache'
export { Validator } from './Validator'

// Functions
export { detectSchemaPath } from './schemaDetection'
export { detectEntityTypeFromAttribute, getEntities } from './EntityDetector'

// Tag Queue (from separate module)
export { TagQueue } from '../queue/TagQueue'
