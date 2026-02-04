/**
 * AIService Protocol
 *
 * Extends existing AI provider interface to use Effect for composability.
 */

import { Effect, Context, Schema } from 'effect';
import type { DialogueSpan, SpeakerAttribution, Issue } from '@/lib/ai/types';

// ============================================================================
// Error Types
// ============================================================================

export class AIError extends Schema.Class<'AIError'>({
  message: Schema.String,
  provider: Schema.String,
  cause: Schema.Unknown.orElse(Schema.Undefined),
}) {
  readonly _tag = 'AIError';
}

export class AIRateLimitError extends AIError {
  readonly _tag = 'AIRateLimitError';
  readonly retryAfter?: number;
}

export class AIAuthenticationError extends AIError {
  readonly _tag = 'AIAuthenticationError';
}

export class AIInvalidRequestError extends AIError {
  readonly _tag = 'AIInvalidRequestError';
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
  readonly detectDialogue: (
    text: string
  ) => Effect.Effect<readonly DialogueSpan[], AIError>;

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
  readonly validateConsistency: (
    document: any
  ) => Effect.Effect<readonly Issue[], AIError>;

  /**
   * Bulk detect dialogue in multiple passages
   *
   * Optimized for processing entire document at once
   */
  readonly bulkDetectDialogue: (
    passages: readonly string[]
  ) => Effect.Effect<readonly readonly DialogueSpan[], AIError>;
}

// ============================================================================
// Context Tag
// ============================================================================

export const AIService = Context.GenericTag<AIService>('@app/AIService');
