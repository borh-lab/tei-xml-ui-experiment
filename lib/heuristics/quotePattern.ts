/**
 * Quote Pattern Heuristic
 *
 * Detects quoted text and questions/exclamations:
 * - Text in double quotes: "text"
 * - Text in single quotes: 'text'
 * - Question marks: ?
 * - Exclamation marks: !
 * - Returns Suggestion for <q> tag
 */

import type { Selection } from '@/lib/values/Selection';
import { createSuggestion } from '@/lib/values/Suggestion';

/**
 * Detect quoted text and questions/exclamations in selection
 *
 * Returns null if no quote pattern detected
 * Returns Suggestion with confidence score if pattern detected
 */
export function quotePattern(selection: Selection) {
  const { text } = selection;

  // Empty text check
  if (!text || text.trim().length === 0) {
    return null;
  }

  let confidence = 0;
  const reasons: string[] = [];

  // Check for double quotes (highest confidence)
  const doubleQuoteMatch = text.match(/"([^"]*)"/);
  if (doubleQuoteMatch) {
    confidence += 0.7;
    reasons.push('contains double quotes');
  }

  // Check for single quotes (high confidence)
  const singleQuoteMatch = text.match(/'([^']*)'/);
  if (singleQuoteMatch) {
    confidence += 0.6;
    reasons.push('contains single quotes');
  }

  // Check for question marks (medium confidence)
  if (text.includes('?')) {
    confidence += 0.5;
    reasons.push('contains question mark');
  }

  // Check for exclamation marks (medium confidence)
  if (text.includes('!')) {
    confidence += 0.5;
    reasons.push('contains exclamation mark');
  }

  // Bonus for quotes with punctuation
  if ((doubleQuoteMatch || singleQuoteMatch) && (text.includes('?') || text.includes('!'))) {
    confidence += 0.15;
    reasons.push('quotes with punctuation');
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  // Minimum threshold for quote detection
  if (confidence < 0.4) {
    return null;
  }

  return createSuggestion(
    'q',
    confidence,
    `Quote detected: ${reasons.join(', ')}`
  );
}
