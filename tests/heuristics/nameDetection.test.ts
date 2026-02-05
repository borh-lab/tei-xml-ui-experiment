/**
 * Tests for nameDetection heuristic
 */

import { nameDetection } from '@/lib/heuristics/nameDetection';
import type { Selection } from '@/lib/values/Selection';

describe('nameDetection', () => {
  it('should detect capitalized names', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 10 },
      text: 'John Smith',
      context: 'John Smith walked into the room.',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('persName');
    expect(result?.confidence).toBeGreaterThan(0.5);
    expect(result?.reason).toContain('capitalized');
  });

  it('should detect single capitalized name', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 4 },
      text: 'Mary',
      context: 'Mary smiled at him.',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('persName');
    expect(result?.confidence).toBeGreaterThan(0.4);
  });

  it('should return null for common words', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 4 },
      text: 'The',
      context: 'The quick brown fox.',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).toBeNull();
  });

  it('should return null for lowercase text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 10 },
      text: 'john smith',
      context: 'john smith walked here.',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).toBeNull();
  });

  it('should detect names with apostrophes', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 10 },
      text: "O'Connor",
      context: "O'Connor entered the room.",
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('persName');
  });

  it('should detect hyphenated names', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 13 },
      text: 'Mary-Jane Smith',
      context: 'Mary-Jane Smith arrived.',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).not.toBeNull();
    expect(result?.tagType).toBe('persName');
  });

  it('should give higher confidence for multi-word names', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 15 },
      text: 'Dr. John Smith',
      context: 'Dr. John Smith arrived.',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThan(0.7);
  });

  it('should handle empty text', () => {
    const selection: Selection = {
      passageId: 'passage-1',
      range: { start: 0, end: 0 },
      text: '',
      context: '',
      timestamp: Date.now()
    };

    const result = nameDetection(selection);

    expect(result).toBeNull();
  });
});
