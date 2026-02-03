/**
 * Selection Types for Tag Application
 *
 * Immutable types for text selection and tag application.
 * Selections capture text position and document state for validation.
 */

import type { PassageID, TagID, CharacterID } from '@/lib/tei/types';
import type { TEIDocument } from '@/lib/tei/types';

/**
 * Text range within a passage
 */
export interface TextRange {
  readonly start: number; /** Character offset within passage */
  readonly end: number;   /** Character offset within passage */
}

/**
 * Selection snapshot (immutable value)
 *
 * Captures the state of a text selection at a point in time.
 * Includes document revision to validate the document hasn't changed.
 */
export interface SelectionSnapshot {
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly documentRevision: number; /** Validates document hasn't changed */
  readonly text: string;
  readonly container: Node; /** DOM node reference (for restoration) */
}

/**
 * Tag application options
 */
export interface TagOptions {
  readonly type: 'said' | 'q' | 'persName' | 'placeName' | 'orgName';
  readonly attributes?: Readonly<Record<string, string>>;
}

/**
 * Result of tag application
 */
export interface TagApplicationResult {
  readonly document: TEIDocument;
  readonly tagId: TagID;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Tag information (for detecting containing tags)
 */
export interface TagInfo {
  readonly id: TagID;
  readonly type: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly range: TextRange;
}

// Re-export old types for backwards compatibility during migration
/** @deprecated Use SelectionSnapshot instead */
export interface SelectionRange {
  text: string;
  startOffset: number;
  endOffset: number;
  passageId: string;
  container: Node;
}
