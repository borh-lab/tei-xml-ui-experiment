/**
 * Suggestions Protocol
 *
 * Generates smart tag suggestions based on text patterns.
 * Runs all heuristics, filters by confidence, sorts, and returns top N.
 */

import type { Selection } from '@/lib/values/Selection';
import type { Suggestion } from '@/lib/values/Suggestion';
import { runAllHeuristics } from '@/lib/heuristics/index';
import { sortByConfidence, filterByConfidence } from '@/lib/values/Suggestion';

/**
 * Options for generating suggestions
 */
export interface GenerateSuggestionsOptions {
  /** Minimum confidence threshold (default: 0.3) */
  minConfidence?: number;
  /** Maximum number of suggestions to return (default: 5) */
  maxSuggestions?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<GenerateSuggestionsOptions> = {
  minConfidence: 0.3,
  maxSuggestions: 5,
};

/**
 * Generate smart tag suggestions for a selection
 *
 * Process:
 * 1. Run all heuristics on the selection
 * 2. Filter suggestions by minimum confidence
 * 3. Sort by confidence (descending)
 * 4. Return top N suggestions
 *
 * @param selection - The selection to analyze
 * @param options - Optional configuration
 * @returns Array of suggestions sorted by confidence
 */
export function generateSuggestions(
  selection: Selection,
  options: GenerateSuggestionsOptions = {}
): Suggestion[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Run all heuristics
  const allSuggestions = runAllHeuristics(selection);

  // Step 2: Filter by minimum confidence
  const filtered = filterByConfidence(allSuggestions, opts.minConfidence);

  // Step 3: Sort by confidence (descending)
  const sorted = sortByConfidence(filtered);

  // Step 4: Return top N suggestions
  return sorted.slice(0, opts.maxSuggestions);
}
