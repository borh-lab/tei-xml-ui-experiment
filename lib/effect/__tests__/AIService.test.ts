// @ts-nocheck
// @ts-nocheck
/**
 * AIService Tests
 */

import { describe, it, expect } from '@jest/globals';
import { Effect } from 'effect';
import { AIService } from '@/lib/effect/protocols/AI';
import { TestAIService } from '@/lib/effect/services/AIService';

describe('AIService', () => {
  it('should detect dialogue', async () => {
    const ai = new TestAIService();

    const program = Effect.gen(function* (_) {
      const spans = yield* _(ai.detectDialogue('This is dialogue text.'));

      expect(spans).toHaveLength(1);
      expect(spans[0].text).toBe('Sample dialogue');
    });

    await Effect.runPromise(program);
  });

  it('should attribute speaker', async () => {
    const ai = new TestAIService();
    ai.setSpeakerAttribution('speaker-1');

    const program = Effect.gen(function* (_) {
      const speaker = yield* _(ai.attributeSpeaker('text', []));

      expect(speaker).toBe('speaker-1');
    });

    await Effect.runPromise(program);
  });

  it('should validate consistency', async () => {
    const ai = new TestAIService();

    const program = Effect.gen(function* (_) {
      const issues = yield* _(ai.validateConsistency({}));

      expect(issues).toHaveLength(0);
    });

    await Effect.runPromise(program);
  });

  it('should bulk detect dialogue', async () => {
    const ai = new TestAIService();

    const program = Effect.gen(function* (_) {
      const results = yield* _(ai.bulkDetectDialogue(['text1', 'text2']));

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(1);
    });

    await Effect.runPromise(program);
  });
});
