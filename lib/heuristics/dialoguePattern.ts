/**
 * Dialogue Pattern Heuristic
 *
 * Detects dialogue patterns in text:
 * - Quotes: "text"
 * - Speech verbs: said, asked, replied, whispered, shouted, etc.
 * - Returns high confidence for <said> tag
 */

import type { Selection } from '@/lib/values/Selection';
import { createSuggestion } from '@/lib/values/Suggestion';

// Speech verbs that indicate dialogue
const SPEECH_VERBS = [
  'said', 'asked', 'replied', 'whispered', 'shouted', 'exclaimed',
  'muttered', 'murmured', 'cried', 'called', 'remarked', 'observed',
  'continued', 'added', 'noted', 'pointed out', 'explained', 'described'
];

/**
 * Detect dialogue patterns in selection
 *
 * Returns null if no dialogue pattern detected
 * Returns Suggestion with confidence score if dialogue detected
 */
export function dialoguePattern(selection: Selection) {
  const { text } = selection;

  // Empty text check
  if (!text || text.trim().length === 0) {
    return null;
  }

  let confidence = 0;
  const reasons: string[] = [];

  // Check for quotes (high confidence)
  const hasQuotes = /["'].*["']/.test(text);
  if (hasQuotes) {
    confidence += 0.5;
    reasons.push('contains quotes');
  }

  // Check for speech verbs (medium confidence)
  const lowerText = text.toLowerCase();
  const foundSpeechVerbs = SPEECH_VERBS.filter(verb => lowerText.includes(verb));

  if (foundSpeechVerbs.length > 0) {
    confidence += 0.55 + (foundSpeechVerbs.length * 0.1);
    reasons.push(`contains speech verb(s): ${foundSpeechVerbs.join(', ')}`);
  }

  // Check for question marks (low confidence indicator)
  if (text.includes('?')) {
    confidence += 0.1;
    reasons.push('contains question');
  }

  // Check for exclamation marks (low confidence indicator)
  if (text.includes('!')) {
    confidence += 0.1;
    reasons.push('contains exclamation');
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  // Minimum threshold for dialogue detection
  if (confidence < 0.3) {
    return null;
  }

  return createSuggestion(
    'said',
    confidence,
    `Dialogue detected: ${reasons.join(', ')}`
  );
}
