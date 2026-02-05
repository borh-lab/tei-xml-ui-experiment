import { createSuggestion, sortByConfidence, topSuggestions } from '@/lib/values/Suggestion';

describe('Suggestion value', () => {
  it('should create suggestion', () => {
    const s = createSuggestion('said', 0.85, 'Detected dialogue');
    expect(s.confidence).toBe(0.85);
    expect(s.tagType).toBe('said');
    expect(s.reason).toBe('Detected dialogue');
  });

  it('should reject invalid confidence', () => {
    expect(() => createSuggestion('said', 1.5, 'test')).toThrow();
    expect(() => createSuggestion('said', -0.1, 'test')).toThrow();
  });

  it('should accept valid confidence bounds', () => {
    const s1 = createSuggestion('said', 0, 'test');
    expect(s1.confidence).toBe(0);
    const s2 = createSuggestion('said', 1, 'test');
    expect(s2.confidence).toBe(1);
  });

  it('should sort by confidence', () => {
    const suggestions = [
      createSuggestion('said', 0.5, 'low'),
      createSuggestion('q', 0.9, 'high'),
      createSuggestion('persName', 0.7, 'medium'),
    ];
    const sorted = sortByConfidence(suggestions);
    expect(sorted[0].confidence).toBe(0.9);
    expect(sorted[1].confidence).toBe(0.7);
    expect(sorted[2].confidence).toBe(0.5);
  });

  it('should not mutate original array when sorting', () => {
    const suggestions = [
      createSuggestion('said', 0.5, 'low'),
      createSuggestion('q', 0.9, 'high'),
    ];
    const originalFirst = suggestions[0];
    sortByConfidence(suggestions);
    expect(suggestions[0]).toBe(originalFirst);
  });

  it('should get top suggestions', () => {
    const suggestions = [
      createSuggestion('said', 0.5, 'low'),
      createSuggestion('q', 0.9, 'high'),
      createSuggestion('persName', 0.7, 'medium'),
      createSuggestion('stageDirection', 0.6, 'med-low'),
    ];
    const top2 = topSuggestions(suggestions, 2);
    expect(top2).toHaveLength(2);
    expect(top2[0].confidence).toBe(0.9);
    expect(top2[1].confidence).toBe(0.7);
  });

  it('should include optional requiredAttrs', () => {
    const s = createSuggestion('said', 0.85, 'Detected dialogue', { who: 'char-1' });
    expect(s.requiredAttrs).toEqual({ who: 'char-1' });
  });
});
