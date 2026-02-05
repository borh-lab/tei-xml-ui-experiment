/**
 * Tests for quotePattern heuristic
 */

import { quotePattern } from '@/lib/heuristics/quotePattern';
import type { Selection } from '@/lib/values/Selection';

describe('quotePattern', () => {
  it('should detect text in double quotes', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: '"Hello, world!"',
      context: 'She said, "Hello, world!"',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('q');
    expect(result?.confidence).toBeGreaterThan(0.7);
    expect(result?.reason).toContain('quotes');
  });

  it('should detect text in single quotes', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 15 },
      text: "'Hello!'",
      context: "He said, 'Hello!'",
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('q');
    expect(result?.confidence).toBeGreaterThan(0.6);
  });

  it('should detect question marks', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 10 },
      text: 'What?',
      context: 'He asked, "What?"',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('q');
    expect(result?.confidence).toBeGreaterThan(0.4);
    expect(result?.reason).toContain('question');
  });

  it('should detect exclamation marks', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 10 },
      text: 'Stop!',
      context: 'She shouted, "Stop!"',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('q');
    expect(result?.confidence).toBeGreaterThan(0.4);
  });

  it('should give higher confidence for quotes + punctuation', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 15 },
      text: '"Really?"',
      context: 'She asked, "Really?"',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThan(0.8);
  });

  it('should return null for plain text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'The quick brown fox.',
      context: 'The quick brown fox.',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).toBeNull();
  });

  it('should return null for empty text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 0 },
      text: '',
      context: '',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).toBeNull();
  });

  it('should detect partial quotes', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 20 },
      text: 'He said "hello"',
      context: 'He said "hello" to her.',
      timestamp: Date.now()
    };

    const result = quotePattern(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('q');
  });
});
