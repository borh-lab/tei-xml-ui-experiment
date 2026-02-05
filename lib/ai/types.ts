/**
 * AI Detection Types
 *
 * Types for speaker attribution and dialogue detection using pattern matching.
 * Includes discriminated unions for detection states and validation results.
 */

// Re-export TextRange from TEI types to avoid duplication
export type { TextRange } from '../tei/types';

// ============================================================================
// Speaker Pattern Types
// ============================================================================

/**
 * Speaker pattern for regex-based detection
 */
export interface SpeakerPattern {
  readonly id: string;
  readonly name: string;
  readonly patterns: readonly string[]; // Regex patterns
  readonly confidence: number;
}

/**
 * Pattern match result with position information
 */
export interface PatternMatch {
  readonly pattern: string;
  readonly speaker: string;
  readonly confidence: number;
  readonly start: number;
  readonly end: number;
}

// ============================================================================
// Detection State Types (Discriminated Unions)
// ============================================================================

/**
 * Detection result for a single speaker attribution
 */
export interface DetectionResult {
  readonly speaker: string; // Character ID or pattern name
  readonly confidence: number;
  readonly reason: string;
}

/**
 * Detection state with discriminated union
 * Enables type-safe handling of different detection outcomes
 */
export type DetectionState =
  | { status: 'detected'; readonly result: DetectionResult }
  | { status: 'uncertain'; readonly candidates: readonly DetectionResult[]; readonly confidence: number }
  | { status: 'failed'; readonly error: string };

/**
 * Type guard for detected state
 */
export function isDetected(state: DetectionState): state is Extract<DetectionState, { status: 'detected' }> {
  return state.status === 'detected';
}

/**
 * Type guard for uncertain state
 */
export function isUncertain(state: DetectionState): state is Extract<DetectionState, { status: 'uncertain' }> {
  return state.status === 'uncertain';
}

/**
 * Type guard for failed state
 */
export function isFailed(state: DetectionState): state is Extract<DetectionState, { status: 'failed' }> {
  return state.status === 'failed';
}

// ============================================================================
// Dialogue Detection Types
// ============================================================================

/**
 * Dialogue detection with speaker attributions
 */
export interface DialogueDetection {
  readonly passageId: string;
  readonly range: TextRange;
  readonly text: string;
  readonly detectedSpeakers: readonly DetectionResult[];
  readonly detectionState: DetectionState; // New: discriminated union
}

/**
 * Validation result with conditional success/failure type
 */
export type ValidationResult<TValid extends boolean> = TValid extends true
  ? { valid: true; errors: readonly [] }
  : { valid: false; errors: readonly string[] };

/**
 * Create a successful validation result
 */
export function validationSuccess(): ValidationResult<true> {
  return { valid: true, errors: [] };
}

/**
 * Create a failed validation result
 */
export function validationFailure(errors: string[]): ValidationResult<false> {
  return { valid: false, errors };
}

// ============================================================================
// Pattern Database Types
// ============================================================================

/**
 * Pattern database as immutable value
 */
export interface PatternDatabase {
  readonly patterns: readonly SpeakerPattern[];
  readonly lastUpdated: Date;
}

/**
 * Pattern database update result
 */
export type PatternUpdateResult =
  | { status: 'success'; readonly database: PatternDatabase }
  | { status: 'error'; readonly error: string };

// ============================================================================
// Learning Types
// ============================================================================

/**
 * User correction for learning
 */
export interface SpeakerCorrection {
  readonly dialogue: string;
  readonly correctSpeaker: string;
  readonly previousDetection: DetectionResult;
}

/**
 * Learning outcome from user corrections
 */
export type LearningOutcome =
  | { status: 'learned'; readonly pattern: SpeakerPattern }
  | { status: 'updated'; readonly pattern: SpeakerPattern }
  | { status: 'skipped'; readonly reason: string };

// ============================================================================
// Batch Processing Types
// ============================================================================

/**
 * Batch detection result for multiple dialogues
 */
export interface BatchDetectionResult {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly detections: readonly DialogueDetection[];
  readonly errors: readonly {
    readonly passageId: string;
    readonly error: string;
  }[];
}

/**
 * Progress update for long-running detection
 */
export type DetectionProgress =
  | { stage: 'initializing'; readonly message: string }
  | { stage: 'processing'; readonly progress: number; readonly total: number }
  | { stage: 'completed'; readonly result: BatchDetectionResult }
  | { stage: 'error'; readonly error: string };
