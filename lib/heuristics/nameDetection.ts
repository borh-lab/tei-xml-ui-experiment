/**
 * Name Detection Heuristic
 *
 * Detects person names in text:
 * - Capitalized words (not at start of sentence)
 * - Multi-word names
 * - Titles: Dr., Mr., Mrs., Ms., Prof., etc.
 * - Returns Suggestion for <persName> tag
 */

import type { Selection } from '@/lib/values/Selection';
import { createSuggestion } from '@/lib/values/Suggestion';

// Common words to exclude from name detection
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'that', 'this', 'these', 'those', 'there', 'here', 'when', 'where',
  'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'if', 'then',
  'so', 'because', 'although', 'though', 'while', 'since', 'until',
  'before', 'after', 'during', 'through', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'than', 'too',
  'very', 'just', 'also', 'now', 'well', 'way', 'its', 'it', 'his',
  'her', 'their', 'my', 'your', 'our', 'him', 'them', 'he', 'she', 'they',
  'we', 'you', 'i', 'me', 'us'
]);

// Common name titles
const NAME_TITLES = [
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev', 'fr', 'sr',
  'hon', 'pres', 'gov', 'sen', 'rep', 'gen', 'col', 'maj', 'capt',
  'lt', 'sgt', 'corp', 'private', 'sir', 'lady', 'lord', 'dame'
];

/**
 * Check if a word is capitalized (starts with uppercase, rest lowercase)
 */
function isCapitalizedWord(word: string): boolean {
  if (word.length === 0) return false;
  const firstChar = word[0];
  const rest = word.slice(1);
  return firstChar === firstChar.toUpperCase() &&
         rest === rest.toLowerCase() &&
         !COMMON_WORDS.has(word.toLowerCase());
}

/**
 * Check if text contains a name title
 */
function hasNameTitle(text: string): boolean {
  const lowerText = text.toLowerCase();
  return NAME_TITLES.some(title => {
    const pattern = new RegExp(`\\b${title}\\.`);
    return pattern.test(lowerText);
  });
}

/**
 * Count capitalized words in text
 */
function countCapitalizedWords(text: string): number {
  const words = text.split(/\s+/);
  return words.filter(word => isCapitalizedWord(word)).length;
}

/**
 * Detect person names in selection
 *
 * Returns null if no name detected
 * Returns Suggestion with confidence score if name detected
 */
export function nameDetection(selection: Selection) {
  const { text } = selection;

  // Empty text check
  if (!text || text.trim().length === 0) {
    return null;
  }

  let confidence = 0;
  const reasons: string[] = [];

  // Check for name titles (high confidence)
  if (hasNameTitle(text)) {
    confidence += 0.4;
    reasons.push('contains name title');
  }

  // Count capitalized words
  const capitalizedCount = countCapitalizedWords(text);

  if (capitalizedCount > 0) {
    // Base confidence for capitalized words
    confidence += 0.3 + (capitalizedCount * 0.15);
    reasons.push(`contains ${capitalizedCount} capitalized word(s)`);

    // Extra confidence for multi-word names
    if (capitalizedCount >= 2) {
      confidence += 0.2;
      reasons.push('appears to be multi-word name');
    }
  }

  // Check for name patterns (apostrophes, hyphens) - even with single capitalized word
  const hasNamePattern = /[A-Z][a-z]*[-'][A-Z]/.test(text);
  if (hasNamePattern) {
    confidence += 0.35;
    reasons.push('contains name pattern (apostrophe/hyphen)');
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  // Minimum threshold for name detection
  if (confidence < 0.3) {
    return null;
  }

  return createSuggestion(
    'persName',
    confidence,
    `Name detected: ${reasons.join(', ')}`
  );
}
