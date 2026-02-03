/**
 * Entity Operations - Pure Functions for Character and Relationship CRUD
 *
 * All operations return new TEIDocument values instead of mutating.
 * This ensures immutability and enables undo/redo through event sourcing.
 */

import type {
  TEIDocument,
  CharacterID,
  Character,
  Relationship,
} from './types';

// ============================================================================
// Character Operations
// ============================================================================

/**
 * Pure function: Add character to document
 *
 * @throws Error if character with xml:id already exists
 */
export function addCharacter(
  doc: TEIDocument,
  character: Character
): TEIDocument {
  // Check for duplicate xml:id
  const existing = doc.state.characters.find((c) => c.xmlId === character.xmlId);
  if (existing) {
    throw new Error(`Character with xml:id "${character.xmlId}" already exists`);
  }

  const updatedCharacters = [...doc.state.characters, character];

  const state = {
    ...doc.state,
    characters: updatedCharacters,
    revision: doc.state.revision + 1,
  };

  const event = {
    type: 'characterAdded' as const,
    id: character.id,
    character,
    timestamp: Date.now(),
    revision: state.revision,
  };

  return { state, events: [...doc.events, event] };
}

/**
 * Pure function: Update character
 *
 * @throws Error if character not found
 */
export function updateCharacter(
  doc: TEIDocument,
  characterId: CharacterID,
  updates: Partial<Omit<Character, 'id' | 'xmlId'>>
): TEIDocument {
  const character = doc.state.characters.find((c) => c.id === characterId);
  if (!character) {
    throw new Error(`Character not found: ${characterId}`);
  }

  const updatedCharacter: Character = {
    ...character,
    ...updates,
  };

  const updatedCharacters = doc.state.characters.map((c) =>
    c.id === characterId ? updatedCharacter : c
  );

  const state = {
    ...doc.state,
    characters: updatedCharacters,
    revision: doc.state.revision + 1,
  };

  // Use generic event for character updates
  const event = {
    type: 'characterUpdated' as const,
    id: characterId,
    updates,
    timestamp: Date.now(),
    revision: state.revision,
  };

  return { state, events: [...doc.events, event] };
}

/**
 * Pure function: Remove character
 *
 * Also removes all relationships involving this character.
 *
 * @throws Error if character not found
 */
export function removeCharacter(
  doc: TEIDocument,
  characterId: CharacterID
): TEIDocument {
  const character = doc.state.characters.find((c) => c.id === characterId);
  if (!character) {
    throw new Error(`Character not found: ${characterId}`);
  }

  const state = doc.state;

  const updatedCharacters = state.characters.filter((c) => c.id !== characterId);
  const updatedRelationships = state.relationships.filter(
    (r) => r.from !== characterId && r.to !== characterId
  );

  const event = {
    type: 'characterRemoved' as const,
    id: characterId,
    timestamp: Date.now(),
    revision: state.revision + 1,
  };

  return {
    state: {
      ...state,
      characters: updatedCharacters,
      relationships: updatedRelationships,
      revision: state.revision + 1,
    },
    events: [...doc.events, event],
  };
}

// ============================================================================
// Relationship Operations
// ============================================================================

/**
 * Pure function: Add relationship
 *
 * Validates characters exist and checks for duplicate relationships.
 * Auto-adds reciprocal relationship if mutual.
 *
 * @throws Error if characters not found
 * @throws Error if relationship already exists
 */
export function addRelation(
  doc: TEIDocument,
  relation: Omit<Relationship, 'id'>
): TEIDocument {
  // Validate characters exist
  const charactersExist =
    doc.state.characters.some((c) => c.id === relation.from) &&
    doc.state.characters.some((c) => c.id === relation.to);

  if (!charactersExist) {
    throw new Error('One or both characters not found');
  }

  // Check for duplicate
  const existing = doc.state.relationships.find(
    (r) =>
      r.from === relation.from &&
      r.to === relation.to &&
      r.type === relation.type
  );
  if (existing) {
    throw new Error('Relationship already exists');
  }

  // Auto-add reciprocal relationship if mutual
  const relations: Relationship[] = [...doc.state.relationships];
  const newRelation: Relationship = {
    id: crypto.randomUUID(),
    mutual: false, // Will be set to true if mutual
    ...relation,
  };

  relations.push(newRelation);

  if (relation.mutual) {
    relations.push({
      id: crypto.randomUUID(),
      from: relation.to,
      to: relation.from,
      type: relation.type,
      subtype: relation.subtype,
      mutual: true,
    });
  }

  const state = {
    ...doc.state,
    relationships: relations,
    revision: doc.state.revision + 1,
  };

  const event = {
    type: 'relationAdded' as const,
    id: newRelation.id,
    relation: newRelation,
    timestamp: Date.now(),
    revision: state.revision,
  };

  return { state, events: [...doc.events, event] };
}

/**
 * Pure function: Remove relationship
 *
 * If relationship is mutual, also removes the reciprocal relationship.
 *
 * @throws Error if relationship not found
 */
export function removeRelation(
  doc: TEIDocument,
  relationId: string
): TEIDocument {
  const relation = doc.state.relationships.find((r) => r.id === relationId);
  if (!relation) {
    throw new Error(`Relationship not found: ${relationId}`);
  }

  // If mutual, also remove reciprocal
  let updatedRelationships = doc.state.relationships.filter(
    (r) => r.id !== relationId
  );

  if (relation.mutual) {
    const reciprocal = updatedRelationships.find(
      (r) =>
        r.from === relation.to && r.to === relation.from && r.type === relation.type
    );
    if (reciprocal) {
      updatedRelationships = updatedRelationships.filter(
        (r) => r.id !== reciprocal.id
      );
    }
  }

  const state = {
    ...doc.state,
    relationships: updatedRelationships,
    revision: doc.state.revision + 1,
  };

  const event = {
    type: 'relationRemoved' as const,
    id: relationId,
    timestamp: Date.now(),
    revision: state.revision,
  };

  return { state, events: [...doc.events, event] };
}
