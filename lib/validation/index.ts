// TEI validation utilities
// This module contains TEI schema validation and error reporting

export { ValidationService } from './ValidationService';
export type {
  ValidationResult as LegacyValidationResult,
  ValidationError as LegacyValidationError,
  ValidationWarning,
  FixSuggestion,
  ValidationServiceOptions,
} from './ValidationService';

// Schema-driven validation (new)
export { SchemaCache } from './SchemaCache'
export { RelaxNGParser } from './RelaxNGParser'
export { Validator } from './Validator'
export { detectSchemaPath } from './schemaDetection'
export { detectEntityTypeFromAttribute, getEntities } from './EntityDetector'

export type {
  ParsedConstraints,
  TagConstraint,
  AttributeConstraint,
  AttributeType,
  ContentModel,
  ValidationResult,
  ValidationError,
  ValidationWarning as SchemaValidationWarning,
  Fix,
  TextRange,
  SchemaCacheOptions,
} from './types'
