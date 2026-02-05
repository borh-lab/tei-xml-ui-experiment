// @ts-nocheck
/**
 * Entity Repository Protocol
 *
 * Defines the contract for entity operations. Different implementations
 * can provide different storage strategies (TEI document, REST API, local storage).
 *
 * This is a protocol-based design that decouples UI from TEIDocument implementation.
 */

import type { TEIDocument, CharacterID, Character, Relationship } from '@/lib/tei/types';
import {
  addCharacter as addCharacterOp,
  updateCharacter as updateCharacterOp,
  removeCharacter as removeCharacterOp,
  addRelation as addRelationOp,
  removeRelation as removeRelationOp,
} from '@/lib/tei/entity-operations';

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: readonly string[];
}

/**
 * Entity Repository Protocol
 *
 * Defines the contract for entity CRUD operations.
 * All command operations return new repository instances (immutable).
 */
export interface EntityRepository {
  // Query operations (read-only)
  getCharacters(): readonly Character[];
  getCharacter(id: CharacterID): Character | null;
  getRelationships(): readonly Relationship[];
  getRelationshipsForCharacter(characterId: CharacterID): readonly Relationship[];

  // Command operations (return new repository state)
  addCharacter(character: Character): EntityRepository;
  updateCharacter(
    id: CharacterID,
    updates: Partial<Omit<Character, 'id' | 'xmlId'>>
  ): EntityRepository;
  removeCharacter(id: CharacterID): EntityRepository;

  addRelation(relation: Omit<Relationship, 'id'>): EntityRepository;
  removeRelation(id: string): EntityRepository;

  // Validation
  validateCharacter(character: Character): ValidationResult;
  validateRelation(relation: Relationship): ValidationResult;

  // Get current document (for context integration)
  getDocument(): TEIDocument;
}

// ============================================================================
// TEIDocument Implementation
// ============================================================================

/**
 * TEIDocument implementation of EntityRepository
 *
 * Wraps a TEIDocument and provides entity operations through the repository interface.
 */
export class TEIDocumentRepository implements EntityRepository {
  constructor(private doc: TEIDocument) {}

  getCharacters(): readonly Character[] {
    return this.doc.state.characters;
  }

  getCharacter(id: CharacterID): Character | null {
    return this.doc.state.characters.find((c) => c.id === id) || null;
  }

  getRelationships(): readonly Relationship[] {
    return this.doc.state.relationships;
  }

  getRelationshipsForCharacter(characterId: CharacterID): readonly Relationship[] {
    return this.doc.state.relationships.filter(
      (r) => r.from === characterId || r.to === characterId
    );
  }

  addCharacter(character: Character): EntityRepository {
    const newDoc = addCharacterOp(this.doc, character);
    return new TEIDocumentRepository(newDoc);
  }

  updateCharacter(
    id: CharacterID,
    updates: Partial<Omit<Character, 'id' | 'xmlId'>>
  ): EntityRepository {
    const newDoc = updateCharacterOp(this.doc, id, updates);
    return new TEIDocumentRepository(newDoc);
  }

  removeCharacter(id: CharacterID): EntityRepository {
    const newDoc = removeCharacterOp(this.doc, id);
    return new TEIDocumentRepository(newDoc);
  }

  addRelation(relation: Omit<Relationship, 'id'>): EntityRepository {
    const newDoc = addRelationOp(this.doc, relation);
    return new TEIDocumentRepository(newDoc);
  }

  removeRelation(id: string): EntityRepository {
    const newDoc = removeRelationOp(this.doc, id);
    return new TEIDocumentRepository(newDoc);
  }

  validateCharacter(character: Character): ValidationResult {
    const errors: string[] = [];

    if (!character.name || character.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!character.xmlId || character.xmlId.trim().length === 0) {
      errors.push('xml:id is required');
    }

    // Check for valid xml:id format (must start with letter or underscore)
    if (character.xmlId && !/^[a-zA-Z_]/.test(character.xmlId)) {
      errors.push('xml:id must start with a letter or underscore');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateRelation(relation: Relationship): ValidationResult {
    const errors: string[] = [];

    if (relation.from === relation.to) {
      errors.push('Character cannot have relationship with itself');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDocument(): TEIDocument {
    return this.doc;
  }
}
