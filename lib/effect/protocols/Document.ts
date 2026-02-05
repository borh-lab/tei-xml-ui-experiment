// @ts-nocheck
/**
 * DocumentService Protocol
 *
 * Defines the interface for document operations using Effect.
 * This protocol enables event sourcing, undo/redo, and composable operations.
 *
 * All operations return Effect programs that can be:
 * - Composed (chained together)
 * - Retried (on failure)
 * - Logged (for debugging)
 * - Cached (for performance)
 */

import { Effect, Context } from 'effect';

// ============================================================================
// Type Imports (reuse existing types)
// ============================================================================

import type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
} from '@/lib/tei/types';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error for document operations
 */
export class DocumentError extends Error {
  readonly _tag: 'DocumentError' | 'DocumentNotFoundError' | 'DocumentParseError' | 'InvalidOperationError' = 'DocumentError';
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DocumentError';
  }
}

/**
 * Document not found error
 */
export class DocumentNotFoundError extends DocumentError {
  readonly _tag = 'DocumentNotFoundError' as 'DocumentNotFoundError';
  constructor(message: string) {
    super(message);
    this.name = 'DocumentNotFoundError';
  }
}

/**
 * Document parse error
 */
export class DocumentParseError extends DocumentError {
  readonly _tag = 'DocumentParseError' as 'DocumentParseError';
  constructor(
    message: string,
    public readonly xml: string
  ) {
    super(message);
    this.name = 'DocumentParseError';
  }
}

/**
 * Invalid operation error
 */
export class InvalidOperationError extends DocumentError {
  readonly _tag = 'InvalidOperationError' as 'InvalidOperationError';
  constructor(
    message: string,
    public readonly reason: string
  ) {
    super(message);
    this.name = 'InvalidOperationError';
  }
}

// ============================================================================
// Event Types (Event Sourcing)
// ============================================================================

/**
 * Document event (append-only log)
 *
 * All state changes are represented as events.
 * Events are never modified, only appended.
 */
export type DocumentEvent =
  // Document lifecycle
  | {
      readonly type: 'loaded';
      readonly xml: string;
      readonly timestamp: number;
      readonly revision: number;
    }
  // Tag operations
  | {
      readonly type: 'saidTagAdded';
      readonly id: string;
      readonly passageId: PassageID;
      readonly range: TextRange;
      readonly speaker: CharacterID;
      readonly timestamp: number;
      readonly revision: number;
    }
  | {
      readonly type: 'qTagAdded';
      readonly id: string;
      readonly passageId: PassageID;
      readonly range: TextRange;
      readonly timestamp: number;
      readonly revision: number;
    }
  | {
      readonly type: 'persNameTagAdded';
      readonly id: string;
      readonly passageId: PassageID;
      readonly range: TextRange;
      readonly ref: string;
      readonly timestamp: number;
      readonly revision: number;
    }
  | {
      readonly type: 'tagRemoved';
      readonly id: string;
      readonly timestamp: number;
      readonly revision: number;
    }
  // Character operations
  | {
      readonly type: 'characterAdded';
      readonly id: CharacterID;
      readonly character: Character;
      readonly timestamp: number;
      readonly revision: number;
    }
  | {
      readonly type: 'characterUpdated';
      readonly id: CharacterID;
      readonly updates: Partial<Omit<Character, 'id' | 'xmlId'>>;
      readonly timestamp: number;
      readonly revision: number;
    }
  | {
      readonly type: 'characterRemoved';
      readonly id: CharacterID;
      readonly timestamp: number;
      readonly revision: number;
    }
  // Relationship operations
  | {
      readonly type: 'relationAdded';
      readonly id: string;
      readonly relation: Omit<Relationship, 'id'>;
      readonly timestamp: number;
      readonly revision: number;
    }
  | {
      readonly type: 'relationRemoved';
      readonly id: string;
      readonly timestamp: number;
      readonly revision: number;
    };

// ============================================================================
// History State
// ============================================================================

/**
 * History state for undo/redo
 */
export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly currentRevision: number;
  readonly totalRevisions: number;
}

// ============================================================================
// Protocol Interface
// ============================================================================

/**
 * DocumentService Protocol
 *
 * Defines all document operations as Effect programs.
 * This enables composability, error handling, and testing.
 */
export interface DocumentService {
  /**
   * Load document from XML string
   *
   * Creates a new document with initial event log.
   *
   * @returns Effect that produces TEIDocument
   */
  readonly loadDocument: (xml: string) => Effect.Effect<TEIDocument, DocumentParseError>;

  /**
   * Get current document
   *
   * @returns Effect that produces the current document
   */
  readonly getDocument: () => Effect.Effect<TEIDocument, DocumentNotFoundError>;

  // ========================================================================
  // Tag Operations
  // ========================================================================

  /**
   * Add <said> tag to passage
   *
   * @param passageId - Passage to tag
   * @param range - Text range to tag
   * @param speaker - Character ID who is speaking
   * @returns Effect that produces updated document
   */
  readonly addSaidTag: (
    passageId: PassageID,
    range: TextRange,
    speaker: CharacterID
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Add <q> tag to passage
   *
   * @param passageId - Passage to tag
   * @param range - Text range to tag
   * @returns Effect that produces updated document
   */
  readonly addQTag: (
    passageId: PassageID,
    range: TextRange
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Add <persName> tag to passage
   *
   * @param passageId - Passage to tag
   * @param range - Text range to tag
   * @param ref - Reference to character/entity
   * @returns Effect that produces updated document
   */
  readonly addPersNameTag: (
    passageId: PassageID,
    range: TextRange,
    ref: string
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Remove tag from document
   *
   * @param tagId - Tag to remove
   * @returns Effect that produces updated document
   */
  readonly removeTag: (tagId: string) => Effect.Effect<TEIDocument, InvalidOperationError>;

  // ========================================================================
  // Character Operations
  // ========================================================================

  /**
   * Add character to document
   *
   * @param character - Character to add
   * @returns Effect that produces updated document
   */
  readonly addCharacter: (
    character: Character
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Update character in document
   *
   * @param characterId - Character to update
   * @param updates - Partial updates to apply
   * @returns Effect that produces updated document
   */
  readonly updateCharacter: (
    characterId: CharacterID,
    updates: Partial<Omit<Character, 'id' | 'xmlId'>>
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Remove character from document
   *
   * @param characterId - Character to remove
   * @returns Effect that produces updated document
   */
  readonly removeCharacter: (
    characterId: CharacterID
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  // ========================================================================
  // Relationship Operations
  // ========================================================================

  /**
   * Add relationship to document
   *
   * @param relation - Relationship to add (without id)
   * @returns Effect that produces updated document
   */
  readonly addRelationship: (
    relation: Omit<Relationship, 'id'>
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Remove relationship from document
   *
   * @param relationId - Relationship to remove
   * @returns Effect that produces updated document
   */
  readonly removeRelationship: (
    relationId: string
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;

  // ========================================================================
  // History Operations
  // ========================================================================

  /**
   * Undo to previous revision
   *
   * @param targetRevision - Revision to undo to (optional, defaults to current-1)
   * @returns Effect that produces document at target revision
   */
  readonly undo: (targetRevision?: number) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Redo to next revision
   *
   * @param fromRevision - Revision to redo from (optional, defaults to current+1)
   * @returns Effect that produces document at target revision
   */
  readonly redo: (fromRevision?: number) => Effect.Effect<TEIDocument, InvalidOperationError>;

  /**
   * Get history state
   *
   * @returns Effect that produces history state (canUndo, canRedo, etc.)
   */
  readonly getHistoryState: () => Effect.Effect<HistoryState, never>;

  /**
   * Time travel to specific revision
   *
   * @param targetRevision - Revision to travel to
   * @returns Effect that produces document at target revision
   */
  readonly timeTravel: (
    targetRevision: number
  ) => Effect.Effect<TEIDocument, InvalidOperationError>;
}

// ============================================================================
// Context Tag (Dependency Injection)
// ============================================================================

/**
 * DocumentService context tag
 *
 * Used for dependency injection with Effect layers.
 */
export const DocumentService = Context.GenericTag<DocumentService>('@app/DocumentService');
