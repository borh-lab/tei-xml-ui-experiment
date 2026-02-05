// @ts-nocheck
/**
 * AIService Implementation
 *
 * Wraps existing AI providers with Effect for composability.
 */

import { Effect, Layer } from 'effect';
import { openaiProvider } from '@/lib/ai/providers';
import { AIService, AIError, AIRateLimitError, AIAuthenticationError } from '../protocols/AI';
import type { DialogueSpan, Issue } from '@/lib/ai/types';

// ============================================================================
// Browser Implementation (wraps existing providers)
// ============================================================================

export const OpenAIService: AIService = {
  detectDialogue: (text: string): Effect.Effect<readonly DialogueSpan[], AIError> =>
    Effect.tryPromise({
      try: () => openaiProvider.detectDialogue(text),
      catch: (error) => toAIError(error, 'detectDialogue'),
    }),

  attributeSpeaker: (
    text: string,
    dialogue: readonly DialogueSpan[]
  ): Effect.Effect<string, AIError> =>
    Effect.tryPromise({
      try: () => openaiProvider.attributeSpeaker(text, [...dialogue] as DialogueSpan[]),
      catch: (error) => toAIError(error, 'attributeSpeaker'),
    }),

  validateConsistency: (document: unknown): Effect.Effect<readonly Issue[], AIError> =>
    Effect.tryPromise({
      try: () => openaiProvider.validateConsistency(document),
      catch: (error) => toAIError(error, 'validateConsistency'),
    }),

  bulkDetectDialogue: (
    passages: readonly string[]
  ): Effect.Effect<readonly (readonly DialogueSpan[]), AIError> =>
    Effect.tryPromise({
      try: () => Promise.all(passages.map((p) => openaiProvider.detectDialogue(p))),
      catch: (error) => toAIError(error, 'bulkDetectDialogue'),
    }),
};

// ============================================================================
// Test Implementation
// ============================================================================

export class TestAIService {
  private dialogueSpans: DialogueSpan[] = [
    {
      start: 0,
      end: 50,
      text: 'Sample dialogue',
      confidence: 0.95,
    },
  ];
  private speakerId: string = 'speaker-1';
  private issues: Issue[] = [];

  setDialogueSpans(spans: DialogueSpan[]): void {
    this.dialogueSpans = spans;
  }

  setSpeakerAttribution(speakerId: string): void {
    this.speakerId = speakerId;
  }

  setIssues(issues: Issue[]): void {
    this.issues = issues;
  }

  detectDialogue(): Effect.Effect<readonly DialogueSpan[], never> {
    return Effect.sync(() => this.dialogueSpans);
  }

  attributeSpeaker(): Effect.Effect<string, never> {
    return Effect.sync(() => this.speakerId);
  }

  validateConsistency(): Effect.Effect<readonly Issue[], never> {
    return Effect.sync(() => this.issues);
  }

  bulkDetectDialogue(
    passages: readonly string[]
  ): Effect.Effect<readonly (readonly DialogueSpan[]), never> {
    return Effect.sync(() => passages.map(() => this.dialogueSpans));
  }
}

// ============================================================================
// Layers
// ============================================================================

export const AIServiceLive = Layer.succeed(AIService, OpenAIService);

export const TestAIServiceLive = Layer.effect(
  AIService,
  Effect.succeed(() => new TestAIService())
);

// ============================================================================
// Helper Functions
// ============================================================================

function toAIError(error: unknown, operation: string): AIError {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof Error && 'status' in error) {
    const status = (error as any).status;

    if (status === 429) {
      return new AIRateLimitError({
        message: `Rate limited during ${operation}`,
        provider: 'openai',
        cause: error,
      });
    }

    if (status === 401 || status === 403) {
      return new AIAuthenticationError({
        message: `Authentication failed during ${operation}`,
        provider: 'openai',
        cause: error,
      });
    }
  }

  return new AIError({
    message: `${operation} failed: ${message}`,
    provider: 'openai',
    cause: error,
  });
}
