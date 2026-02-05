/**
 * Test that validation module exports are accessible
 */
import {
  // Types
  ParsedConstraints,
  TagConstraint,
  AttributeConstraint,
  ContentModel,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Fix,
  TextRange,
  EntityType,
  EntityMapping,
  SchemaCacheOptions,
  QueuedTag,
  TagQueueState,
  
  // Classes
  RelaxNGParser,
  SchemaCache,
  Validator,
  TagQueue,
  
  // Functions
  detectSchemaPath,
  detectEntityTypeFromAttribute,
  getEntities,
  
  // Legacy
  ValidationService,
} from '@/lib/validation'

describe('Validation Module Exports', () => {
  it('should export all types', () => {
    // This test just verifies that imports compile
    expect(typeof ParsedConstraints).toBe('undefined') // Type-only export
    expect(typeof TagConstraint).toBe('undefined') // Type-only export
  })

  it('should export RelaxNGParser class', () => {
    expect(typeof RelaxNGParser).toBe('function')
  })

  it('should export SchemaCache class', () => {
    expect(typeof SchemaCache).toBe('function')
  })

  it('should export Validator class', () => {
    expect(typeof Validator).toBe('function')
  })

  it('should export TagQueue class', () => {
    expect(typeof TagQueue).toBe('function')
  })

  it('should export detectSchemaPath function', () => {
    expect(typeof detectSchemaPath).toBe('function')
  })

  it('should export detectEntityTypeFromAttribute function', () => {
    expect(typeof detectEntityTypeFromAttribute).toBe('function')
  })

  it('should export getEntities function', () => {
    expect(typeof getEntities).toBe('function')
  })

  it('should export ValidationService class', () => {
    expect(typeof ValidationService).toBe('function')
  })
})
