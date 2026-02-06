/**
 * DocumentProtocol V2 - Pure function protocols with explicit state
 *
 * Unlike V1 (which uses hidden Ref state), V2 protocols accept state
 * as a parameter and return new state. This enables:
 * - Easy testing (pass in any state, inspect result)
 * - No hidden mutations (state transitions are explicit)
 * - Better composability (protocols can be wrapped, cached, retried)
 */

import { Effect, Context } from 'effect';
import type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
} from '@/lib/tei/types';
import type {
  DocumentState,
  ValidationSnapshot,
} from '@/lib/values/DocumentState';
import {
  loadDocument as loadDocumentOp,
  addSaidTag as addSaidTagOp,
  addTag as addQTagOp,
  addPersNameTag as addPersNameTagOp,
  removeTag as removeTagOp,
} from '@/lib/tei/operations';
import {
  addCharacter as addCharacterOp,
  updateCharacter as updateCharacterOp,
  removeCharacter as removeCharacterOp,
  addRelation as addRelationshipOp,
  removeRelation as removeRelationshipOp,
} from '@/lib/tei/entity-operations';

// ============================================================================
// Error Types
// ============================================================================

export class DocumentError extends Error {
  readonly _tag = 'DocumentError';
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class DocumentParseError extends DocumentError {
  readonly _tag = 'DocumentParseError';
  constructor(message: string, public readonly xml: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DocumentParseError';
  }
}

export class InvalidOperationError extends DocumentError {
  readonly _tag = 'InvalidOperationError';
  constructor(message: string, public readonly reason: string) {
    super(message);
    this.name = 'InvalidOperationError';
  }
}

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * DocumentProtocol V2 Interface
 *
 * All methods accept DocumentState as first parameter and return
 * Effect<DocumentState, Error>. No hidden state, no Refs.
 */
export interface DocumentProtocol {
  /**
   * Load document from XML
   * Returns new state with loaded document
   */
  readonly loadDocument: (
    state: DocumentState,
    xml: string
  ) => Effect.Effect<DocumentState, DocumentParseError>;

  /**
   * Add <said> tag to passage
   * Returns new state with updated document
   */
  readonly addSaidTag: (
    state: DocumentState,
    passageId: PassageID,
    range: TextRange,
    speaker: CharacterID
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Add <q> tag to passage
   */
  readonly addQTag: (
    state: DocumentState,
    passageId: PassageID,
    range: TextRange
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Add <persName> tag to passage
   */
  readonly addPersNameTag: (
    state: DocumentState,
    passageId: PassageID,
    range: TextRange,
    ref: string
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Remove tag from document
   */
  readonly removeTag: (
    state: DocumentState,
    tagId: string
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Add character to document
   */
  readonly addCharacter: (
    state: DocumentState,
    character: Character
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Update character in document
   */
  readonly updateCharacter: (
    state: DocumentState,
    characterId: CharacterID,
    updates: Partial<Omit<Character, 'id' | 'xmlId'>>
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Remove character from document
   */
  readonly removeCharacter: (
    state: DocumentState,
    characterId: CharacterID
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Add relationship to document
   */
  readonly addRelationship: (
    state: DocumentState,
    relation: Omit<Relationship, 'id'>
  ) => Effect.Effect<DocumentState, InvalidOperationError>;

  /**
   * Remove relationship from document
   */
  readonly removeRelationship: (
    state: DocumentState,
    relationId: string
  ) => Effect.Effect<DocumentState, InvalidOperationError>;
}

// ============================================================================
// Live Implementation
// ============================================================================

/**
 * DocumentProtocolLive V2
 *
 * Pure function implementation. No Ref, no hidden state.
 * All state transitions are explicit: old state → new state.
 */
export const DocumentProtocolLive: DocumentProtocol = {
  loadDocument: (state: DocumentState, xml: string) =>
    Effect.try({
      try: () => {
        const doc = loadDocumentOp(xml);
        return {
          ...state,
          document: doc,
          status: 'success' as const,
          error: null,
        };
      },
      catch: (error) =>
        new DocumentParseError(
          `Failed to parse document: ${error instanceof Error ? error.message : String(error)}`,
          xml,
          error
        ),
    }),

  addSaidTag: (state: DocumentState, passageId: PassageID, range: TextRange, speaker: CharacterID) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = addSaidTagOp(state.document, passageId, range, speaker);
        return {
          ...state,
          document: updated,
          validation: null, // Clear validation (document changed)
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to add said tag: ${error instanceof Error ? error.message : String(error)}`,
          'add-said-tag-failed'
        ),
    }),

  addQTag: (state: DocumentState, passageId: PassageID, range: TextRange) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = addQTagOp(state.document, passageId, range, 'q');
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to add q tag: ${error instanceof Error ? error.message : String(error)}`,
          'add-q-tag-failed'
        ),
    }),

  addPersNameTag: (state: DocumentState, passageId: PassageID, range: TextRange, ref: string) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = addPersNameTagOp(state.document, passageId, range);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to add persName tag: ${error instanceof Error ? error.message : String(error)}`,
          'add-persName-tag-failed'
        ),
    }),

  removeTag: (state: DocumentState, tagId: string) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = removeTagOp(state.document, tagId);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to remove tag: ${error instanceof Error ? error.message : String(error)}`,
          'remove-tag-failed'
        ),
    }),

  addCharacter: (state: DocumentState, character: Character) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = addCharacterOp(state.document, character);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to add character: ${error instanceof Error ? error.message : String(error)}`,
          'add-character-failed'
        ),
    }),

  updateCharacter: (state: DocumentState, characterId: CharacterID, updates: Partial<Omit<Character, 'id' | 'xmlId'>>) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = updateCharacterOp(state.document, characterId, updates);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to update character: ${error instanceof Error ? error.message : String(error)}`,
          'update-character-failed'
        ),
    }),

  removeCharacter: (state: DocumentState, characterId: CharacterID) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = removeCharacterOp(state.document, characterId);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to remove character: ${error instanceof Error ? error.message : String(error)}`,
          'remove-character-failed'
        ),
    }),

  addRelationship: (state: DocumentState, relation: Omit<Relationship, 'id'>) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = addRelationshipOp(state.document, relation);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to add relationship: ${error instanceof Error ? error.message : String(error)}`,
          'add-relationship-failed'
        ),
    }),

  removeRelationship: (state: DocumentState, relationId: string) =>
    Effect.try({
      try: () => {
        if (!state.document) {
          throw new Error('No document loaded');
        }
        const updated = removeRelationshipOp(state.document, relationId);
        return {
          ...state,
          document: updated,
          validation: null,
        };
      },
      catch: (error) =>
        new InvalidOperationError(
          `Failed to remove relationship: ${error instanceof Error ? error.message : String(error)}`,
          'remove-relationship-failed'
        ),
    }),
};

// ============================================================================
// Context Tag
// ============================================================================

export const DocumentProtocolV2 = Context.GenericTag<DocumentProtocol>('@app/DocumentProtocolV2');
