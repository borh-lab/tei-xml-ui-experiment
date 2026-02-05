/**
 * TypeScript Assertion Functions
 *
 * Assertion functions validate values at runtime and narrow types
 * in subsequent code. They throw on validation failure.
 *
 * Usage:
 * ```typescript
 * function process(xml: string) {
 *   assertIsValidTEI(xml);
 *   // xml is now narrowed to valid TEI - no null checks needed
 *   console.log(xml.toUpperCase());
 * }
 * ```
 */

import type { TEINode, Tag, Character, TextRange } from '../tei/types';
import {
  isTEINode,
  isTag,
  isCharacter,
  isTextRange,
  isValidTextRange,
  isValidXmlId,
  isCharacterID,
  isPassageID,
  isTagID,
  isDefined,
  isNonEmptyString,
  isError,
} from './guards';

// ============================================================================
// TEI Element Assertions
// ============================================================================

/**
 * Assert that value is a valid TEINode
 * @throws {Error} If value is not a TEINode
 */
export function assertIsTEINode(value: unknown, message?: string): asserts value is TEINode {
  if (!isTEINode(value)) {
    throw new Error(
      message || `Expected TEINode, got ${typeof value}`
    );
  }
}

/**
 * Assert that value is an element node (has #name)
 * @throws {Error} If value is not an element node
 */
export function assertIsElementNode(
  value: unknown,
  message?: string
): asserts value is TEINode & { '#name': string } {
  if (!isTEINode(value) || !('#name' in value)) {
    throw new Error(
      message || `Expected element node, got ${typeof value}`
    );
  }
}

/**
 * Assert that value is a text node (has #text)
 * @throws {Error} If value is not a text node
 */
export function assertIsTextNode(
  value: unknown,
  message?: string
): asserts value is TEINode & { '#text': string } {
  if (!isTEINode(value) || !('#text' in value)) {
    throw new Error(
      message || `Expected text node, got ${typeof value}`
    );
  }
}

// ============================================================================
// Tag Assertions
// ============================================================================

/**
 * Assert that value is a Tag object
 * @throws {Error} If value is not a Tag
 */
export function assertIsTag(value: unknown, message?: string): asserts value is Tag {
  if (!isTag(value)) {
    throw new Error(
      message || `Expected Tag, got ${typeof value}`
    );
  }
}

/**
 * Assert that value is a Tag with specific type
 * @throws {Error} If value is not expected tag type
 */
export function assertIsTagType(
  value: unknown,
  tagType: Tag['type'],
  message?: string
): asserts value is Tag {
  if (!isTag(value) || value.type !== tagType) {
    throw new Error(
      message || `Expected ${tagType} tag, got ${value && typeof value === 'object' && 'type' in value ? value.type : typeof value}`
    );
  }
}

/**
 * Assert that value is an array of Tags
 * @throws {Error} If value is not a Tag array
 */
export function assertIsTagArray(
  value: unknown,
  message?: string
): asserts value is Tag[] {
  if (!Array.isArray(value) || !value.every(isTag)) {
    throw new Error(
      message || `Expected Tag array, got ${typeof value}`
    );
  }
}

// ============================================================================
// Entity Assertions
// ============================================================================

/**
 * Assert that value is a Character object
 * @throws {Error} If value is not a Character
 */
export function assertIsCharacter(
  value: unknown,
  message?: string
): asserts value is Character {
  if (!isCharacter(value)) {
    throw new Error(
      message || `Expected Character, got ${typeof value}`
    );
  }
}

/**
 * Assert that string is a valid CharacterID
 * @throws {Error} If string is not a valid CharacterID
 */
export function assertIsCharacterID(
  value: string,
  message?: string
): asserts value is string {
  if (!isCharacterID(value)) {
    throw new Error(
      message || `Expected CharacterID (char-*), got: ${value}`
    );
  }
}

/**
 * Assert that string is a valid PassageID
 * @throws {Error} If string is not a valid PassageID
 */
export function assertIsPassageID(
  value: string,
  message?: string
): asserts value is string {
  if (!isPassageID(value)) {
    throw new Error(
      message || `Expected PassageID (passage-*), got: ${value}`
    );
  }
}

/**
 * Assert that string is a valid TagID
 * @throws {Error} If string is not a valid TagID
 */
export function assertIsTagID(
  value: string,
  message?: string
): asserts value is string {
  if (!isTagID(value)) {
    throw new Error(
      message || `Expected TagID (tag-*), got: ${value}`
    );
  }
}

// ============================================================================
// Range Assertions
// ============================================================================

/**
 * Assert that value is a valid TextRange
 * @throws {Error} If value is not a TextRange
 */
export function assertIsTextRange(
  value: unknown,
  message?: string
): asserts value is TextRange {
  if (!isTextRange(value)) {
    throw new Error(
      message || `Expected TextRange, got ${typeof value}`
    );
  }
}

/**
 * Assert that TextRange is well-formed
 * @throws {Error} If range is invalid
 */
export function assertIsValidTextRange(
  range: TextRange,
  message?: string
): void {
  if (!isValidTextRange(range)) {
    throw new Error(
      message || `Invalid TextRange: start=${range.start}, end=${range.end}`
    );
  }
}

// ============================================================================
// String Assertions
// ============================================================================

/**
 * Assert that value is a non-empty string
 * @throws {Error} If value is not a non-empty string
 */
export function assertIsNonEmptyString(
  value: unknown,
  message?: string
): asserts value is string {
  if (!isNonEmptyString(value)) {
    throw new Error(
      message || `Expected non-empty string, got ${typeof value}`
    );
  }
}

/**
 * Assert that string is a valid XML ID (NCName)
 * @throws {Error} If string is not a valid XML ID
 */
export function assertIsValidXmlId(
  value: string,
  message?: string
): asserts value is string {
  if (!isValidXmlId(value)) {
    throw new Error(
      message || `Invalid XML ID: ${value}`
    );
  }
}

// ============================================================================
// Collection Assertions
// ============================================================================

/**
 * Assert that array is non-empty
 * @throws {Error} If array is empty
 */
export function assertIsNonEmpty<T>(
  arr: readonly T[],
  message?: string
): asserts arr is [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error(
      message || 'Expected non-empty array'
    );
  }
}

/**
 * Assert that value is defined (not null/undefined)
 * @throws {Error} If value is null or undefined
 */
export function assertIsDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(
      message || 'Expected defined value, got null/undefined'
    );
  }
}

/**
 * Assert that value is an object (not null, not array)
 * @throws {Error} If value is not an object
 */
export function assertIsObject(
  value: unknown,
  message?: string
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      message || `Expected object, got ${typeof value}`
    );
  }
}

// ============================================================================
// Error Assertions
// ============================================================================

/**
 * Assert that value is an Error
 * @throws {Error} If value is not an Error
 */
export function assertIsError(
  value: unknown,
  message?: string
): asserts value is Error {
  if (!isError(value)) {
    throw new Error(
      message || `Expected Error, got ${typeof value}`
    );
  }
}

/**
 * Assert that a condition is true
 * @throws {Error} If condition is false
 */
export function assert(
  condition: boolean,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Assert that a condition is true with custom error type
 * @throws {ErrorClass} If condition is false
 */
export function assertWithError<T extends new (...args: any[]) => Error>(
  ErrorClass: T,
  condition: boolean,
  message?: string
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message || 'Assertion failed');
  }
}

// ============================================================================
// Assertion Combinators
// ============================================================================

/**
 * Assert that all values in an array pass a guard function
 * @throws {Error} If any value fails the guard
 */
export function assertAll<T>(
  values: unknown[],
  guard: (value: unknown) => value is T,
  message?: string
): asserts values is T[] {
  const invalid = values.filter(v => !guard(v));
  if (invalid.length > 0) {
    throw new Error(
      message || `${invalid.length} values failed type check`
    );
  }
}

/**
 * Assert that value is one of the allowed values
 * @throws {Error} If value is not in allowed list
 */
export function assertOneOf<T>(
  value: unknown,
  allowed: readonly T[],
  message?: string
): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new Error(
      message || `Expected one of: ${allowed.join(', ')}, got: ${typeof value}`
    );
  }
}

/**
 * Assert that value is within a numeric range
 * @throws {Error} If value is outside range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): asserts value is number {
  if (value < min || value > max) {
    throw new Error(
      message || `Expected value between ${min} and ${max}, got: ${value}`
    );
  }
}

/**
 * Assert that value is a positive number
 * @throws {Error} If value is not positive
 */
export function assertPositive(
  value: number,
  message?: string
): asserts value is number {
  if (value <= 0) {
    throw new Error(
      message || `Expected positive number, got: ${value}`
    );
  }
}

/**
 * Assert that value is a non-negative number
 * @throws {Error} If value is negative
 */
export function assertNonNegative(
  value: number,
  message?: string
): asserts value is number {
  if (value < 0) {
    throw new Error(
      message || `Expected non-negative number, got: ${value}`
    );
  }
}

// ============================================================================
// Domain-Specific Assertions
// ============================================================================

/**
 * Assert that XML string is parseable
 * @throws {Error} If XML cannot be parsed
 */
export function assertParseableXML(
  xml: string,
  message?: string
): asserts xml is string {
  assertIsNonEmptyString(xml, message || 'XML string is empty');

  // Basic XML well-formedness check
  if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<')) {
    throw new Error(
      message || 'XML does not appear to be well-formed'
    );
  }
}

/**
 * Assert that TEI document has required elements
 * @throws {Error} If required elements are missing
 */
export function assertHasRequiredElements(
  tei: TEINode,
  required: string[],
  message?: string
): void {
  if (!('#name' in tei)) {
    throw new Error(message || 'Expected TEI element node');
  }

  const missing = required.filter(elem => {
    // Check if element exists (simplified check)
    return !Object.keys(tei).some(key => key.includes(elem));
  });

  if (missing.length > 0) {
    throw new Error(
      message || `Missing required elements: ${missing.join(', ')}`
    );
  }
}

/**
 * Assert that confidence value is in valid range [0, 1]
 * @throws {Error} If confidence is invalid
 */
export function assertIsValidConfidence(
  confidence: number,
  message?: string
): void {
  if (confidence < 0 || confidence > 1) {
    throw new Error(
      message || `Confidence must be between 0 and 1, got: ${confidence}`
    );
  }
}

/**
 * Assert that progress percentage is valid
 * @throws {Error} If progress is invalid
 */
export function assertIsValidProgress(
  progress: number,
  message?: string
): void {
  if (progress < 0 || progress > 100) {
    throw new Error(
      message || `Progress must be between 0 and 100, got: ${progress}`
    );
  }
}
