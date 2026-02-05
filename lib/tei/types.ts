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

/**
 * TEINode represents parsed XML elements
 *
 * Supports common XML node properties:
 * - #text: Text content
 * - @_value: Attribute value
 * - @attrName: XML attributes
 * - elementName: Child elements
 */
export interface TEINode {
  '#text'?: string;
  '#name'?: string;
  '@_value'?: string;
  [key: string]: unknown;
}

// ============================================================================
// Type Guards for TEI Node (enable isTEINode() usage)
// ============================================================================

/**
 * Type predicate for text nodes
 */
export type TextNode = TEINode & { '#text': string };

/**
 * Type predicate for element nodes
 */
export type ElementNode = TEINode & { '#name': string };

/**
 * Check if node is a text node
 */
export function isTextNode(node: TEINode): node is TextNode {
  return '#text' in node && typeof node['#text'] === 'string';
}

/**
 * Check if node is an element node
 */
export function isElementNode(node: TEINode): node is ElementNode {
  return '#name' in node && typeof node['#name'] === 'string';
}

/**
 * ID Types with format validation
 *
 * These are type aliases for now with runtime validation helpers.
 * In the future, these could become branded types for true nominal typing.
 *
 * Format requirements:
 * - PassageID: "passage-{hash}"
 * - TagID: "tag-{uuid}"
 * - CharacterID: "char-{xml-id}"
 */

/** Passage identifier: format "passage-{hash}" */
export type PassageID = string;

/** Tag identifier: format "tag-{uuid}" */
export type TagID = string;

/** Character identifier: format "char-{xml-id}" */
export type CharacterID = string;

/** Helper to validate and create PassageID */
export function createPassageID(id: string): PassageID {
  if (!id.startsWith('passage-')) {
    throw new Error(`Invalid PassageID format: ${id}. Expected 'passage-{hash}'`);
  }
  return id;
}

/** Helper to validate and create TagID */
export function createTagID(id: string): TagID {
  if (!id.startsWith('tag-')) {
    throw new Error(`Invalid TagID format: ${id}. Expected 'tag-{uuid}'`);
  }
  return id;
}

/** Helper to validate and create CharacterID */
export function createCharacterID(id: string): CharacterID {
  if (!id.startsWith('char-')) {
    throw new Error(`Invalid CharacterID format: ${id}. Expected 'char-{xml-id}'`);
  }
  return id;
}

/**
 * Stable content-addressable identifiers
 *
 * These IDs are derived from content hash or UUID and remain stable
 * across document mutations, unlike positional indices.
 */

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
  readonly xmlId: string;           // TEI @xml:id
  readonly name: string;           // persName content
  readonly sex?: 'M' | 'F' | 'Other';
  readonly age?: number;
  readonly occupation?: string;
  readonly traits?: readonly string[];  // Personality traits
  readonly socialStatus?: string;
  readonly maritalStatus?: string;
}

/**
 * Relationship type union
 */
export type RelationshipType =
  | 'family'
  | 'romantic'
  | 'social'
  | 'professional'
  | 'antagonistic';

/**
 * Relationship between characters
 */
export interface Relationship {
  readonly id: string;
  readonly from: CharacterID;      // Subject
  readonly to: CharacterID;        // Object
  readonly type: RelationshipType;
  readonly subtype?: string;
  readonly mutual: boolean;
}

/**
 * Network node for visualization
 */
export interface NetworkNode {
  readonly id: CharacterID;
  readonly name: string;
  readonly sex: Character['sex'];
  readonly connections: number;  // Derived, not stored
}

/**
 * Network edge for visualization
 */
export interface NetworkEdge {
  readonly from: CharacterID;
  readonly to: CharacterID;
  readonly type: RelationshipType;
  readonly mutual: boolean;
  readonly weight: number;        // Derived from dialogue frequency
}

/**
 * Network layout for visualization
 */
export interface NetworkLayout {
  readonly nodes: readonly NetworkNode[];
  readonly edges: readonly NetworkEdge[];
  readonly layout: {
    readonly nodes: readonly { id: string; x: number; y: number }[];
    readonly edges: readonly { source: string; target: string }[];
  };
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

// ============================================================================
// Event Type Helpers
// ============================================================================

/** Base event fields */
interface BaseEvent {
  readonly timestamp: number;
  readonly revision: number;
}

/** Character update type (excludes id and xmlId) */
export type CharacterUpdates = Partial<Omit<Character, 'id' | 'xmlId'>>;

/** Relationship without id field */
export type RelationshipInput = Omit<Relationship, 'id'>;

// ============================================================================
// Document Event Types with Conditional Types
// ============================================================================

/**
 * Discriminated union of all document events
 * Each event type has a unique discriminator for type narrowing
 */
export type DocumentEvent =
  // Document lifecycle events
  | BaseEvent & { type: 'loaded'; readonly xml: string }
  // Tag operation events
  | BaseEvent & { type: 'saidTagAdded'; readonly id: TagID; readonly passageId: PassageID; readonly range: TextRange; readonly speaker: CharacterID }
  | BaseEvent & { type: 'qTagAdded'; readonly id: TagID; readonly passageId: PassageID; readonly range: TextRange }
  | BaseEvent & { type: 'persNameTagAdded'; readonly id: TagID; readonly passageId: PassageID; readonly range: TextRange; readonly ref: string }
  | BaseEvent & { type: 'tagRemoved'; readonly id: TagID }
  // Character operation events
  | BaseEvent & { type: 'characterAdded'; readonly id: CharacterID; readonly character: Character }
  | BaseEvent & { type: 'characterUpdated'; readonly id: CharacterID; readonly updates: CharacterUpdates }
  | BaseEvent & { type: 'characterRemoved'; readonly id: CharacterID }
  // Relationship operation events
  | BaseEvent & { type: 'relationAdded'; readonly id: string; readonly relation: RelationshipInput }
  | BaseEvent & { type: 'relationRemoved'; readonly id: string };

// ============================================================================
// Event Type Extractors (using conditional types)
// ============================================================================

/** Extract event type discriminator */
export type EventType = DocumentEvent['type'];

/** Extract all event types that have a payload */
export type EventsWithPayload<T extends DocumentEvent['type']> = Extract<DocumentEvent, { type: T }>;

/** Get event by type */
export type EventByType<T extends EventType> = Extract<DocumentEvent, { type: T }>;

/** Check if event has specific data */
export type HasEventField<T extends DocumentEvent, K extends string> = T extends { [P in K]: any } ? true : false;

// ============================================================================
// Event Type Guards
// ============================================================================

/** Type guard for loaded events */
export function isLoadedEvent(event: DocumentEvent): event is EventByType<'loaded'> {
  return event.type === 'loaded';
}

/** Type guard for character events */
export function isCharacterEvent(event: DocumentEvent): event is EventByType<'characterAdded'> | EventByType<'characterUpdated'> | EventByType<'characterRemoved'> {
  return ['characterAdded', 'characterUpdated', 'characterRemoved'].includes(event.type);
}

/** Type guard for tag events */
export function isTagEvent(event: DocumentEvent): event is EventByType<'saidTagAdded'> | EventByType<'qTagAdded'> | EventByType<'persNameTagAdded'> | EventByType<'tagRemoved'> {
  return ['saidTagAdded', 'qTagAdded', 'persNameTagAdded', 'tagRemoved'].includes(event.type);
}

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
  readonly serialize?: () => string;
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
