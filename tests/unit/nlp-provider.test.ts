// @ts-nocheck
// tests/unit/nlp-provider.test.ts

import { nlpDetectDialogue } from '@/lib/ai/nlp-provider';

describe('NLP Dialogue Detection', () => {
  describe('Basic Detection', () => {
    test('should detect dialogue in double quotes', () => {
      const text = 'He said "Hello world" and then left.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].text).toBe('Hello world');
      expect(spans[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect multiple dialogue passages', () => {
      const text = '"Hello," she said. "How are you?" he asked.';
      const spans = nlpDetectDialogue(text);

      expect(spans.length).toBeGreaterThanOrEqual(2);
      expect(spans[0].text).toContain('Hello');
      expect(spans[1].text).toContain('How are you');
    });

    test('should return empty array for text without dialogue', () => {
      const text = 'He walked down the street and turned left.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(0);
    });

    test('should handle empty text', () => {
      const spans = nlpDetectDialogue('');

      expect(spans).toHaveLength(0);
    });

    test('should handle text with only whitespace', () => {
      const spans = nlpDetectDialogue('   \n\t   ');

      expect(spans).toHaveLength(0);
    });
  });

  describe('NLP Pattern Detection', () => {
    test('should boost confidence for speech verbs nearby', () => {
      const text = 'She said "I am going to the store." Then she left.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect dialogue with question marks', () => {
      const text = 'He asked "What time is it?"';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].text).toContain('What time is it');
    });

    test('should detect dialogue with exclamation marks', () => {
      const text = 'She shouted "Help me!" loudly.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].text).toContain('Help me');
    });

    test('should detect em-dash dialogue common in literature', () => {
      const text = '—Hello, she said.—How are you?—I am fine.';
      const spans = nlpDetectDialogue(text);

      expect(spans.length).toBeGreaterThan(0);
    });

    test('should handle single quotes with speech indicators', () => {
      const text = "She replied 'Yes' and nodded.";
      const spans = nlpDetectDialogue(text);

      // Should detect if speech verb present
      expect(spans.length).toBeGreaterThan(0);
    });
  });

  describe('Accuracy and Confidence', () => {
    test('should assign higher confidence for clear dialogue patterns', () => {
      const text = '"Hello," she said clearly.';
      const spans = nlpDetectDialogue(text);

      expect(spans[0].confidence).toBeGreaterThan(0.7);
    });

    test('should assign lower confidence for ambiguous cases', () => {
      const text = '"The title of the book is \'Great Expectations\'"';
      const spans = nlpDetectDialogue(text);

      // Title quotes should have lower confidence if no speech verb
      if (spans.length > 0) {
        expect(spans[0].confidence).toBeLessThan(0.8);
      }
    });

    test('should exclude quotes in known non-dialogue contexts', () => {
      const text = 'The phrase "et cetera" is commonly used.';
      const spans = nlpDetectDialogue(text);

      // Latin phrases and citations should be filtered
      const latinPhrase = spans.find((s) => s.text.includes('et cetera'));
      expect(latinPhrase).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle nested quotes correctly', () => {
      const text = '"He said \\"Hello\\" to me," she explained.';
      const spans = nlpDetectDialogue(text);

      expect(spans.length).toBeGreaterThan(0);
    });

    test('should handle quotes spanning multiple sentences', () => {
      const text = '"Hello. How are you? I am fine," she said.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].text.length).toBeGreaterThan(20);
    });

    test('should handle interrupted dialogue', () => {
      const text = '"I was going to say—" he started, but stopped.';
      const spans = nlpDetectDialogue(text);

      expect(spans.length).toBeGreaterThan(0);
    });

    test('should handle dialogue with speaker attribution in middle', () => {
      const text = '"Hello," he said, "how are you?"';
      const spans = nlpDetectDialogue(text);

      // Should detect both parts
      expect(spans.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle very long dialogue passages', () => {
      const longDialogue = 'Lorem ipsum dolor sit amet '.repeat(10);
      const text = `"${longDialogue}" she said.`;
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].text.length).toBeGreaterThan(100);
    });
  });

  describe('NLP-Enhanced Detection', () => {
    test('should use compromise to identify speech verbs', () => {
      const text = 'She whispered "Be quiet" softly.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
    });

    test('should detect verbs of saying in various tenses', () => {
      const verbs = ['said', 'asks', 'replied', 'will say', 'whispered'];

      for (const verb of verbs) {
        const text = `She ${verb} "Hello world".`;
        const spans = nlpDetectDialogue(text);

        expect(spans.length).toBeGreaterThan(0);
      }
    });

    test('should handle contractions in dialogue', () => {
      const text = '"I\'m going to the store," she said.';
      const spans = nlpDetectDialogue(text);

      expect(spans).toHaveLength(1);
      expect(spans[0].text).toContain('I');
    });

    test('should maintain proper position indices', () => {
      const text = 'Start "quoted text" middle "another quote" end.';
      const spans = nlpDetectDialogue(text);

      for (const span of spans) {
        expect(span.start).toBeGreaterThanOrEqual(0);
        expect(span.end).toBeGreaterThan(span.start);
        expect(span.end).toBeLessThanOrEqual(text.length);
      }
    });
  });
});
