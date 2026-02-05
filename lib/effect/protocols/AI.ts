// @ts-nocheck
/**
 * AIService Protocol
 *
 * Extends existing AI provider interface to use Effect for composability.
 */

import { Effect, Context } from 'effect';
import type { DialogueSpan, SpeakerAttribution, Issue } from '@/lib/ai/types';

// ============================================================================
// Error Types
// ============================================================================

export class AIError extends Error {
  readonly _tag = 'AIError';
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIRateLimitError extends AIError {
  readonly _tag = 'AIRateLimitError';
  constructor(
    message: string,
    provider: string,
    public readonly retryAfter?: number
  ) {
    super(message, provider);
    this.name = 'AIRateLimitError';
  }
}

export class AIAuthenticationError extends AIError {
  readonly _tag = 'AIAuthenticationError';
  constructor(message: string, provider: string) {
    super(message, provider);
    this.name = 'AIAuthenticationError';
  }
}

export class AIInvalidRequestError extends AIError {
  readonly _tag = 'AIInvalidRequestError';
  constructor(message: string, provider: string) {
    super(message, provider);
    this.name = 'AIInvalidRequestError';
  }
}

// ============================================================================
// Protocol Interface
// ============================================================================

export interface AIService {
  /**
   * Detect dialogue passages in text
   *
   * @returns Effect that produces dialogue spans with confidence scores
   */
  readonly detectDialogue: (text: string) => Effect.Effect<readonly DialogueSpan[], AIError>;

  /**
   * Attribute speaker to dialogue passage
   *
   * @returns Effect that produces character ID who is speaking
   */
  readonly attributeSpeaker: (
    text: string,
    dialogue: readonly DialogueSpan[]
  ) => Effect.Effect<string, AIError>;

  /**
   * Validate document for consistency issues
   *
   * Checks for character inconsistencies, timeline contradictions, plot holes
   */
  readonly validateConsistency: (document: any) => Effect.Effect<readonly Issue[], AIError>;

  /**
   * Bulk detect dialogue in multiple passages
   *
   * Optimized for processing entire document at once
   */
  readonly bulkDetectDialogue: (
    passages: readonly string[]
  ) => Effect.Effect<readonly (readonly DialogueSpan[]), AIError>;
}

// ============================================================================
// Context Tag
// ============================================================================

export const AIService = Context.GenericTag<AIService>('@app/AIService');
