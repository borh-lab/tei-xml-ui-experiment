/**
 * Heuristics Index
 *
 * Exports all heuristics and provides runAllHeuristics() function
 * to run all heuristics on a selection and return all suggestions.
 */

import type { Selection } from '@/lib/values/Selection';
import type { Suggestion } from '@/lib/values/Suggestion';
import { dialoguePattern } from './dialoguePattern';
import { nameDetection } from './nameDetection';
import { quotePattern } from './quotePattern';

// Export all heuristics
export { dialoguePattern } from './dialoguePattern';
export { nameDetection } from './nameDetection';
export { quotePattern } from './quotePattern';

/**
 * Heuristic function type
 */
export type HeuristicFunction = (selection: Selection) => Suggestion | null;

/**
 * All available heuristics
 */
const ALL_HEURISTICS: HeuristicFunction[] = [
  dialoguePattern,
  nameDetection,
  quotePattern,
];

/**
 * Run all heuristics on a selection
 *
 * Returns an array of all non-null suggestions from all heuristics.
 * Heuristics that return null are filtered out.
 *
 * @param selection - The selection to analyze
 * @returns Array of suggestions from all heuristics
 */
export function runAllHeuristics(selection: Selection): Suggestion[] {
  const results: Suggestion[] = [];

  for (const heuristic of ALL_HEURISTICS) {
    try {
      const result = heuristic(selection);
      if (result !== null) {
        results.push(result);
      }
    } catch (error) {
      // Log error but continue with other heuristics
      console.error(`Error running heuristic: ${error}`);
    }
  }

  return results;
}
