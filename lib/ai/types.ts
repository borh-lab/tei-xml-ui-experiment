// @ts-nocheck
/**
 * AI Detection Types
 *
 * Types for speaker attribution and dialogue detection using pattern matching.
 */

import type { Character } from '@/lib/tei/types';

/**
 * Text range within a passage
 * Re-exported from TEI types for convenience
 */
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

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
 * Detection result for a single speaker attribution
 */
export interface DetectionResult {
  readonly speaker: string; // Character ID or pattern name
  readonly confidence: number;
  readonly reason: string;
}

/**
 * Dialogue detection with speaker attributions
 */
export interface DialogueDetection {
  readonly passageId: string;
  readonly range: TextRange;
  readonly text: string;
  readonly detectedSpeakers: readonly DetectionResult[];
}

/**
 * Pattern database as immutable value
 */
export interface PatternDatabase {
  readonly patterns: readonly SpeakerPattern[];
  readonly lastUpdated: Date;
}

/**
 * User correction for learning
 */
export interface SpeakerCorrection {
  readonly dialogue: string;
  readonly correctSpeaker: string;
  readonly previousDetection: DetectionResult;
}
