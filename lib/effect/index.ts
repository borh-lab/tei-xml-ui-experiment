// @ts-nocheck
/**
 * Effect Library - Main Export
 *
 * Central export point for all Effect-based services and utilities.
 * This file provides a clean import interface for the application.
 */

// ============================================================================
// Protocols (Interfaces)
// ============================================================================

export * from './protocols/Document';
export * from './protocols/Storage';
// TODO: ValidationService uses server-only SchemaLoader, needs server action wrapper
// export * from './protocols/Validation';
// TODO: Fix AIService provider implementation
// export * from './protocols/AI';

// ============================================================================
// Services (Implementations)
// ============================================================================

export * from './services/DocumentService';
export * from './services/StorageService';
// TODO: ValidationService uses server-only SchemaLoader, needs server action wrapper
// export * from './services/ValidationService';
// TODO: Fix AIService provider implementation
// export * from './services/AIService';

// ============================================================================
// Layers (Dependency Injection)
// ============================================================================

export * from './layers/Main';

// ============================================================================
// React Integration
// ============================================================================

export * from './react/hooks';

// ============================================================================
// Utilities
// ============================================================================

export * from './utils/featureFlags';
export * from './utils/test-helpers';

// ============================================================================
// Re-exports from Original TEI Operations
// ============================================================================

// Export pure functions that work with Effect
export {
  loadDocument,
  addSaidTag,
  addTag,
  addPersNameTag,
  removeTag as removeTagOp,
  addCharacter as addCharacterOp,
  updateCharacter as updateCharacterOp,
  removeCharacter as removeCharacterOp,
  addRelationship as addRelationshipOp,
  removeRelationship as removeRelationshipOp,
} from '@/lib/tei/operations';

// Export types
export type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
  TagInfo,
  SelectionSnapshot,
} from '@/lib/tei/types';
