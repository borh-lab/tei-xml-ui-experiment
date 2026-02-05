/**
 * Type Guards for TEI Dialogue Editor
 *
 * Type guard functions provide runtime type checking while enabling
 * TypeScript's type narrowing in conditional blocks.
 *
 * Usage:
 * ```typescript
 * if (isTEINode(value)) {
 *   // TypeScript knows `value` is TEINode here
 *   console.log(value['#name']);
 * }
 * ```
 */

import type { TEINode, Tag, Character, Dialogue } from '@/lib/tei/types';
import type { SpeakerPattern, DetectionResult, PatternDatabase } from '@/lib/ai/types';
import type { DocumentMetadata, Passage, TextRange } from '@/lib/tei/types';

// ============================================================================
// TEI Node Guards
// ============================================================================

/**
 * Type guard for TEINode objects
 */
export function isTEINode(value: unknown): value is TEINode {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Type guard for text nodes (has #text property)
 */
export function isTextNode(value: unknown): value is TEINode & { '#text': string } {
  return (
    isTEINode(value) &&
    '#text' in value &&
    typeof value['#text'] === 'string'
  );
}

/**
 * Type guard for element nodes (has #name property)
 */
export function isElementNode(value: unknown): value is TEINode & { '#name': string } {
  return (
    isTEINode(value) &&
    '#name' in value &&
    typeof value['#name'] === 'string'
  );
}

/**
 * Type guard for specific TEI element by name
 */
export function isElementWithName(
  value: unknown,
  name: string
): value is TEINode & { '#name': string } {
  return (
    isElementNode(value) &&
    value['#name'] === name
  );
}

// ============================================================================
// Tag Type Guards
// ============================================================================

/**
 * Type guard for Tag objects
 */
export function isTag(value: unknown): value is Tag {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    'range' in value &&
    'attributes' in value
  );
}

/**
 * Type guard for specific tag types
 */
export function isTagType(value: unknown, tagType: Tag['type']): value is Tag {
  return (
    isTag(value) &&
    value.type === tagType
  );
}

/**
 * Type guard for 'said' tags
 */
export function isSaidTag(value: unknown): value is Tag & { type: 'said' } {
  return isTagType(value, 'said');
}

/**
 * Type guard for 'q' (quotation) tags
 */
export function isQTag(value: unknown): value is Tag & { type: 'q' } {
  return isTagType(value, 'q');
}

/**
 * Type guard for entity tags (persName, placeName, orgName)
 */
export function isEntityTag(value: unknown): value is Tag & { type: 'persName' | 'placeName' | 'orgName' } {
  if (!isTag(value)) return false;
  return ['persName', 'placeName', 'orgName'].includes(value.type);
}

// ============================================================================
// Entity Guards
// ============================================================================

/**
 * Type guard for Character objects
 */
export function isCharacter(value: unknown): value is Character {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'xmlId' in value &&
    'name' in value
  );
}

/**
 * Check if a value is a valid CharacterID format
 */
export function isCharacterID(value: unknown): value is string & { readonly __brand: unique symbol } {
  return (
    typeof value === 'string' &&
    value.startsWith('char-')
  );
}

/**
 * Type guard for Character ID strings
 */
export function isValidCharacterId(value: unknown): value is string {
  return typeof value === 'string' && /^char-/.test(value);
}

/**
 * Check if a value is a valid PassageID format
 */
export function isPassageID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('passage-')
  );
}

/**
 * Check if a value is a valid TagID format
 */
export function isTagID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('tag-')
  );
}

// ============================================================================
// Structure Guards
// ============================================================================

/**
 * Type guard for Passage objects
 */
export function isPassage(value: unknown): value is Passage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'content' in value &&
    'tags' in value &&
    'index' in value
  );
}

/**
 * Type guard for Dialogue objects
 */
export function isDialogue(value: unknown): value is Dialogue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'range' in value &&
    'speaker' in value &&
    'content' in value
  );
}

/**
 * Type guard for TextRange objects
 */
export function isTextRange(value: unknown): value is TextRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    'start' in value &&
    'end' in value &&
    typeof value.start === 'number' &&
    typeof value.end === 'number'
  );
}

/**
 * Validate that a TextRange is well-formed
 */
export function isValidTextRange(range: TextRange): boolean {
  return (
    typeof range.start === 'number' &&
    typeof range.end === 'number' &&
    range.start >= 0 &&
    range.end >= range.start
  );
}

/**
 * Type guard for DocumentMetadata
 */
export function isDocumentMetadata(value: unknown): value is DocumentMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    'author' in value &&
    'created' in value
  );
}

// ============================================================================
// AI/Prediction Guards
// ============================================================================

/**
 * Type guard for SpeakerPattern objects
 */
export function isSpeakerPattern(value: unknown): value is SpeakerPattern {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'patterns' in value &&
    'confidence' in value &&
    Array.isArray((value as SpeakerPattern).patterns)
  );
}

/**
 * Type guard for DetectionResult objects
 */
export function isDetectionResult(value: unknown): value is DetectionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'speaker' in value &&
    'confidence' in value &&
    'reason' in value &&
    typeof value.speaker === 'string' &&
    typeof value.confidence === 'number' &&
    typeof value.reason === 'string'
  );
}

/**
 * Type guard for DialogueDetection objects
 */
export function isDialogueDetection(value: unknown): value is {
  passageId: string;
  range: TextRange;
  text: string;
  detectedSpeakers: readonly DetectionResult[];
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'passageId' in value &&
    'range' in value &&
    'text' in value &&
    'detectedSpeakers' in value &&
    Array.isArray((value as any).detectedSpeakers)
  );
}

/**
 * Type guard for PatternDatabase
 */
export function isPatternDatabase(value: unknown): value is PatternDatabase {
  return (
    typeof value === 'object' &&
    value !== null &&
    'patterns' in value &&
    'lastUpdated' in value &&
    Array.isArray((value as PatternDatabase).patterns)
  );
}

// ============================================================================
// Validation State Guards
// ============================================================================

/**
 * Type guard for successful validation result
 */
export function isValidationSuccess<T>(
  result: { valid: boolean } & T
): result is { valid: true } & T {
  return result.valid === true;
}

/**
 * Type guard for failed validation result
 */
export function isValidationFailure<T>(
  result: { valid: boolean; errors?: any } & T
): result is { valid: false; errors: any } & T {
  return result.valid === false;
}

// ============================================================================
// Array and Collection Guards
// ============================================================================

/**
 * Type guard for non-empty arrays
 */
export function isNonEmpty<T>(arr: readonly T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

/**
 * Type guard to check if array contains only items of a specific type
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

/**
 * Type guard for Record/object types
 */
export function isRecord<T = unknown>(
  value: unknown,
  valueGuard?: (val: unknown) => val is T
): value is Record<string, T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  if (valueGuard) {
    return Object.values(value).every(v => valueGuard(v));
  }

  return true;
}

// ============================================================================
// String Guards
// ============================================================================

/**
 * Check if string is non-empty after trimming
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if string is a valid XML ID (NCName)
 */
export function isValidXmlId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // NCName pattern (simplified)
  return /^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(value);
}

/**
 * Type guard for well-formed URLs
 */
export function isUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Error Guards
// ============================================================================

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return (
    value instanceof Error ||
    (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      'message' in value
    )
  );
}

/**
 * Type guard for error-like objects with a message property
 */
export function isErrorLike(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

// ============================================================================
// Option/Maybe Type Guards
// ============================================================================

/**
 * Type guard for defined (non-null, non-undefined) values
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for nullable values
 */
export function isNullable<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard for promise objects
 */
export function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

// ============================================================================
// Composite Guards
// ============================================================================

/**
 * Type guard for arrays of Tags
 */
export function isTagArray(value: unknown): value is Tag[] {
  return isArrayOf(value, isTag);
}

/**
 * Type guard for arrays of Characters
 */
export function isCharacterArray(value: unknown): value is Character[] {
  return isArrayOf(value, isCharacter);
}

/**
 * Type guard for arrays of Passages
 */
export function isPassageArray(value: unknown): value is Passage[] {
  return isArrayOf(value, isPassage);
}

/**
 * Type guard for TEI document state (has state and events properties)
 */
export function isTEIDocument(value: unknown): value is {
  state: unknown;
  events: readonly unknown[];
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'state' in value &&
    'events' in value &&
    Array.isArray((value as any).events)
  );
}
