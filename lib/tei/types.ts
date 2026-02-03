/**
 * Immutable TEI Document Types
 *
 * This module defines the core immutable data structures for TEI document handling.
 * All types use readonly modifiers to enforce immutability at the type level.
 *
 * Architecture: Materialized current state + append-only event log
 * - Document state is an immutable value (O(1) reads)
 * - Events preserve complete history (enables undo/redo)
 * - Updates return new values instead of mutating
 */

import { XMLParser } from 'fast-xml-parser';

/**
 * Existing TEINode type from parser
 * Re-exported for compatibility
 */
export interface TEINode {
  [key: string]: any;
}

/**
 * Stable content-addressable identifiers
 *
 * These IDs are derived from content hash or UUID and remain stable
 * across document mutations, unlike positional indices.
 */

/** Passage identifier: format "passage-{hash}" */
export type PassageID = string;

/** Tag identifier: format "tag-{uuid}" */
export type TagID = string;

/** Character identifier: format "char-{xml-id}" */
export type CharacterID = string;

/**
 * Text range within a passage
 */
export interface TextRange {
  readonly start: number; /** Character offset within passage */
  readonly end: number;   /** Character offset within passage */
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  readonly title: string;
  readonly author: string;
  readonly created: Date;
}

/**
 * Tag within a passage (said, q, persName, etc.)
 */
export interface Tag {
  readonly id: TagID;
  readonly type: 'said' | 'q' | 'persName' | 'placeName' | 'orgName';
  readonly range: TextRange;
  readonly attributes: Readonly<Record<string, string>>;
}

/**
 * Passage (paragraph/section) with tags
 */
export interface Passage {
  readonly id: PassageID;
  readonly index: number;  /** Display order, not identifier */
  readonly content: string;
  readonly tags: readonly Tag[];
}

/**
 * Character entity
 */
export interface Character {
  readonly id: CharacterID;
  readonly xmlId: string;
  readonly name: string;
  readonly sex?: 'M' | 'F' | 'Other';
  readonly age?: number;
}

/**
 * Relationship between characters
 */
export interface Relationship {
  readonly id: string;
  readonly from: CharacterID;
  readonly to: CharacterID;
  readonly type: string;
  readonly subtype?: string;
  readonly mutual?: boolean;
}

/**
 * Dialogue/speech instance
 */
export interface Dialogue {
  readonly id: TagID;              /** References the said tag */
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly speaker: CharacterID | null;
  readonly content: string;
}

/**
 * Document state (materialized current state)
 *
 * This is the current materialized view of the document.
 * All fields are readonly to prevent mutation.
 * Created by applying events in order.
 */
export interface DocumentState {
  readonly xml: string;
  readonly parsed: TEINode;
  readonly revision: number;
  readonly metadata: DocumentMetadata;

  /** Materialized views (cheap to copy via structural sharing) */
  readonly passages: readonly Passage[];
  readonly dialogue: readonly Dialogue[];
  readonly characters: readonly Character[];
  readonly relationships: readonly Relationship[];
}

/**
 * Document event (append-only log)
 *
 * Events represent state transitions. Each event has a timestamp
 * and revision number. Events are append-only - never modified.
 */
export type DocumentEvent =
  | { type: 'loaded'; xml: string; timestamp: number; revision: number }
  | { type: 'saidTagAdded'; id: TagID; passageId: PassageID; range: TextRange; speaker: CharacterID; timestamp: number; revision: number }
  | { type: 'tagRemoved'; id: TagID; timestamp: number; revision: number }
  | { type: 'characterAdded'; id: CharacterID; character: Character; timestamp: number; revision: number }
  | { type: 'characterRemoved'; id: CharacterID; timestamp: number; revision: number }
  | { type: 'relationAdded'; id: string; relation: Relationship; timestamp: number; revision: number }
  | { type: 'relationRemoved'; id: string; timestamp: number; revision: number };

/**
 * TEI Document (immutable value)
 *
 * A TEI document consists of:
 * - state: Current materialized state (O(1) access)
 * - events: Complete history of changes (enables undo/redo)
 *
 * All operations return a new TEIDocument value instead of
 * mutating the existing one.
 */
export interface TEIDocument {
  readonly state: DocumentState;
  readonly events: readonly DocumentEvent[];
}

/**
 * Null document sentinel
 *
 * Used to represent the absence of a document.
 * Distinct from null/undefined for type safety.
 */
export type NullDocument = {
  readonly state: null;
  readonly events: readonly [];
};

/**
 * Document type (nullable)
 */
export type MaybeTEIDocument = TEIDocument | NullDocument;
