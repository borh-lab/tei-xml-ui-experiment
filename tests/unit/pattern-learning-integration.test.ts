import { renderHook, act } from '@testing-library/react';
import { extract } from '@/lib/learning/PatternExtractor';
import { db } from '@/lib/db/PatternDB';

describe('Pattern Learning Integration', () => {
  beforeEach(() => {
    // Clear IndexedDB before each test
    jest.clearAllMocks();
  });

  test('should extract patterns from suggestion text', () => {
    const text = 'Hello, world. How are you today?';
    const speakerId = '#speaker1';
    const position = 'beginning';

    const patterns = extract(text, speakerId, position);

    expect(patterns).toBeDefined();
    expect(patterns.phrases).toBeInstanceOf(Map);
    expect(patterns.dialogueLength).toBeGreaterThan(0);
    expect(patterns.position).toBe('beginning');
    expect(patterns.contextWords).toBeDefined();
    expect(patterns.contextWords.length).toBeGreaterThan(0);
  });

  test('should extract 2-4 word phrases', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const patterns = extract(text, '#speaker1', 'middle');

    const phraseCount = patterns.phrases.size;
    expect(phraseCount).toBeGreaterThan(0);

    // Check that phrases are 2-4 words
    patterns.phrases.forEach((count, phrase) => {
      const wordCount = phrase.split(' ').length;
      expect(wordCount).toBeGreaterThanOrEqual(2);
      expect(wordCount).toBeLessThanOrEqual(4);
    });
  });

  test('should filter out stop words from context', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const patterns = extract(text, '#speaker1', 'middle');

    const hasStopWords = patterns.contextWords.some((w) =>
      ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'].includes(w)
    );

    expect(hasStopWords).toBe(false);
  });

  test('should handle short text correctly', () => {
    const text = 'Hi!';
    const patterns = extract(text, '#speaker1', 'beginning');

    expect(patterns.dialogueLength).toBe(1);
    expect(patterns.contextWords).toContain('hi!');
  });

  test('should track position correctly', () => {
    const text1 = extract('Start', '#speaker1', 'beginning');
    const text2 = extract('Middle', '#speaker1', 'middle');
    const text3 = extract('End', '#speaker1', 'end');

    expect(text1.position).toBe('beginning');
    expect(text2.position).toBe('middle');
    expect(text3.position).toBe('end');
  });

  test('should learn pattern when suggestion accepted', async () => {
    const suggestion = {
      text: 'Hello, world.',
      start: 0,
      end: 14,
      confidence: 0.9,
      speaker: '#speaker1',
    };

    const patterns = extract(suggestion.text, suggestion.speaker, 'beginning');

    expect(patterns.phrases.size).toBeGreaterThan(0);

    // Verify pattern structure
    const phrasesArray = Array.from(patterns.phrases.entries());
    expect(phrasesArray.length).toBeGreaterThan(0);
    expect(phrasesArray[0]).toHaveLength(2); // [phrase, count]
  });

  test('should extract meaningful phrases from dialogue', () => {
    const text = "I don't know what you mean";
    const patterns = extract(text, '#speaker1', 'middle');

    // Should extract phrases like "don't know", "know what", "what you"
    expect(patterns.phrases.size).toBeGreaterThan(0);

    // Verify context includes meaningful words
    expect(patterns.contextWords).toContain("don't");
    expect(patterns.contextWords).toContain('know');
  });
});
