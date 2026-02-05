/**
 * useSuggestions Hook
 *
 * React hook for generating smart tag suggestions based on selection.
 * Calls generateSuggestions protocol with memoization.
 */

import { useMemo } from 'react';
import type { Selection } from '@/lib/values/Selection';
import type { Suggestion } from '@/lib/values/Suggestion';
import { generateSuggestions } from '@/lib/protocols/suggestions';

/**
 * Hook options for generating suggestions
 */
export interface UseSuggestionsOptions {
  /** Minimum confidence threshold (default: 0.3) */
  minConfidence?: number;
  /** Maximum number of suggestions to return (default: 5) */
  maxSuggestions?: number;
}

/**
 * Generate smart tag suggestions for a selection
 *
 * This hook is memoized and will only re-compute when the selection
 * or options change. It leverages the memoization in generateSuggestions
 * for additional performance.
 *
 * @param selection - The selection to analyze (null for no selection)
 * @param options - Optional configuration
 * @returns Array of suggestions sorted by confidence
 */
export function useSuggestions(
  selection: Selection | null,
  options: UseSuggestionsOptions = {}
): Suggestion[] {
  const { minConfidence, maxSuggestions } = options;

  return useMemo(() => {
    // Return empty array for no selection
    if (!selection) {
      return [];
    }

    // Generate suggestions (memoized in protocol)
    return generateSuggestions(selection, {
      minConfidence,
      maxSuggestions,
    });
  }, [selection, minConfidence, maxSuggestions]);
}
