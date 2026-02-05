export interface Suggestion {
  readonly tagType: string;
  readonly confidence: number;
  readonly reason: string;
  readonly requiredAttrs?: Record<string, string>;
}

export function createSuggestion(
  tagType: string,
  confidence: number,
  reason: string,
  requiredAttrs?: Record<string, string>
): Suggestion {
  if (confidence < 0 || confidence > 1) {
    throw new Error(`Confidence must be between 0 and 1, got ${confidence}`);
  }
  return { tagType, confidence, reason, requiredAttrs };
}

export function sortByConfidence(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort((a, b) => b.confidence - a.confidence);
}

export function filterByConfidence(suggestions: Suggestion[], minConfidence: number): Suggestion[] {
  return suggestions.filter(s => s.confidence >= minConfidence);
}

export function topSuggestions(suggestions: Suggestion[], n: number): Suggestion[] {
  return sortByConfidence(suggestions).slice(0, n);
}
