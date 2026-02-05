// @ts-nocheck
// lib/ai/nlp-provider.ts

import nlp from 'compromise';
import { DialogueSpan } from './providers';

/**
 * Speech verbs that indicate dialogue
 * Includes various tenses and forms
 */
const SPEECH_VERBS = new Set([
  'say',
  'says',
  'said',
  'saying',
  'ask',
  'asks',
  'asked',
  'asking',
  'reply',
  'replies',
  'replied',
  'replying',
  'answer',
  'answers',
  'answered',
  'answering',
  'whisper',
  'whispers',
  'whispered',
  'whispering',
  'shout',
  'shouts',
  'shouted',
  'shouting',
  'murmur',
  'murmurs',
  'murmured',
  'murmuring',
  'exclaim',
  'exclaims',
  'exclaimed',
  'exclaiming',
  'declare',
  'declares',
  'declared',
  'declaring',
  'remark',
  'remarks',
  'remarked',
  'remarking',
  'respond',
  'responds',
  'responded',
  'responding',
  'interrupt',
  'interrupts',
  'interrupted',
  'interrupting',
  'continue',
  'continues',
  'continued',
  'continuing',
  'add',
  'adds',
  'added',
  'adding',
  'note',
  'notes',
  'noted',
  'noting',
  'observe',
  'observes',
  'observed',
  'observing',
  'comment',
  'comments',
  'commented',
  'commenting',
  'tell',
  'tells',
  'told',
  'telling',
  'state',
  'states',
  'stated',
  'stating',
  'mention',
  'mentions',
  'mentioned',
  'mentioning',
  'cry',
  'cries',
  'cried',
  'crying',
  'call',
  'calls',
  'called',
  'calling',
  'scream',
  'screams',
  'screamed',
  'screaming',
  'yell',
  'yells',
  'yelled',
  'yelling',
  'snap',
  'snaps',
  'snapped',
  'snapping',
  'mutter',
  'mutters',
  'muttered',
  'muttering',
  'mumble',
  'mumbles',
  'mumbled',
  'mumbling',
  'grunt',
  'grunts',
  'grunted',
  'grunting',
  'growl',
  'growls',
  'growled',
  'growling',
]);

/**
 * Phrases and patterns that indicate non-dialogue quotes
 */
const NON_DIALOGUE_PATTERNS = new Set([
  'et cetera',
  'etc.',
  'ie',
  'i.e.',
  'eg',
  'e.g.',
  'chapter',
  'title',
  'section',
  'phrase',
  'word',
  'letter',
  'translation',
  'definition',
  'meaning',
  'so-called',
  'quote',
  'quotation',
]);

/**
 * Check if text contains any non-dialogue patterns
 */
function hasNonDialoguePattern(text: string): boolean {
  const lower = text.toLowerCase();
  for (const pattern of NON_DIALOGUE_PATTERNS) {
    if (lower.includes(pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract text around a quote to analyze for speech verbs
 */
function extractContext(
  text: string,
  quoteIndex: number,
  quoteLength: number,
  windowSize: number = 50
): string {
  const start = Math.max(0, quoteIndex - windowSize);
  const end = Math.min(text.length, quoteIndex + quoteLength + windowSize);
  return text.substring(start, end);
}

/**
 * Check if context contains speech verbs using NLP
 */
function hasSpeechVerbInContext(context: string): boolean {
  const doc = nlp(context);

  // Get verbs in the text
  const verbs = doc.verbs().out('array') as string[];

  for (const verb of verbs) {
    // Normalize verb to infinitive form
    const normalized = verb.toLowerCase().trim();
    if (SPEECH_VERBS.has(normalized)) {
      return true;
    }
  }

  // Also check the raw text for speech verbs (catches cases NLP might miss)
  const contextLower = context.toLowerCase();
  for (const speechVerb of SPEECH_VERBS) {
    if (contextLower.includes(speechVerb)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate confidence score based on context
 */
function calculateConfidence(
  text: string,
  fullText: string,
  quoteIndex: number,
  quoteLength: number
): number {
  let confidence = 0.5; // Base confidence

  const context = extractContext(fullText, quoteIndex, quoteLength, 60);
  const contextLower = context.toLowerCase();

  // Boost 1: Speech verb nearby
  if (hasSpeechVerbInContext(context)) {
    confidence += 0.25;
  }

  // Boost 2: Question or exclamation in quote
  if (text.includes('?') || text.includes('!')) {
    confidence += 0.1;
  }

  // Boost 3: First-person pronouns (common in dialogue)
  const firstPersonPronouns = [' i ', " i'", ' we ', " we'", ' my ', ' me '];
  if (firstPersonPronouns.some((p) => ` ${text.toLowerCase()} `.includes(p))) {
    confidence += 0.1;
  }

  // Boost 4: Second-person pronouns (addressing someone)
  const secondPersonPronouns = [' you ', ' your '];
  if (secondPersonPronouns.some((p) => ` ${text.toLowerCase()} `.includes(p))) {
    confidence += 0.05;
  }

  // Penalty 1: Non-dialogue patterns
  if (hasNonDialoguePattern(text)) {
    confidence -= 0.3;
  }

  // Penalty 2: Very long quotes (might be block quotes, not dialogue)
  if (text.length > 200) {
    confidence -= 0.1;
  }

  // Penalty 3: Citations or references
  if (
    contextLower.includes('chapter') ||
    contextLower.includes('page') ||
    contextLower.includes('written by') ||
    contextLower.includes('author')
  ) {
    confidence -= 0.2;
  }

  // Clamp confidence between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Detect dialogue passages using NLP-enhanced pattern matching
 *
 * Uses compromise library to identify speech verbs and context patterns
 * that indicate dialogue vs non-dialogue quotes.
 *
 * @param text - The text to analyze for dialogue
 * @returns Array of dialogue spans with confidence scores
 */
export function nlpDetectDialogue(text: string): DialogueSpan[] {
  // Handle empty or whitespace-only text
  if (!text || text.trim().length === 0) {
    return [];
  }

  const spans: DialogueSpan[] = [];

  // Pattern 1: Double-quoted dialogue (most common)
  const doubleQuoteRegex = /"([^"]+)"/g;
  let match;

  while ((match = doubleQuoteRegex.exec(text)) !== null) {
    const quoteText = match[1];
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    // Calculate confidence with NLP analysis
    const confidence = calculateConfidence(quoteText, text, startIndex, match[0].length);

    // Only include if confidence is above threshold
    if (confidence >= 0.3) {
      spans.push({
        start: startIndex,
        end: endIndex,
        text: quoteText,
        confidence,
      });
    }
  }

  // Pattern 2: Single-quoted dialogue (less common, more ambiguous)
  const singleQuoteRegex = /'([^']+)'/g;

  while ((match = singleQuoteRegex.exec(text)) !== null) {
    const quoteText = match[1];
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    const context = extractContext(text, startIndex, match[0].length, 50);

    // Only include single quotes if speech verb is present nearby
    if (hasSpeechVerbInContext(context)) {
      const confidence = calculateConfidence(quoteText, text, startIndex, match[0].length);

      if (confidence >= 0.3) {
        spans.push({
          start: startIndex,
          end: endIndex,
          text: quoteText,
          confidence,
        });
      }
    }
  }

  // Pattern 3: Em-dash dialogue (common in older literature)
  const dashRegex = /—([^—]+)—/g;

  while ((match = dashRegex.exec(text)) !== null) {
    const quoteText = match[1].trim();
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    // Em-dash dialogue is almost always speech in literature
    const confidence = calculateConfidence(quoteText, text, startIndex, match[0].length) + 0.1;

    spans.push({
      start: startIndex,
      end: endIndex,
      text: quoteText,
      confidence: Math.min(1, confidence),
    });
  }

  // Sort spans by start position and remove duplicates
  spans.sort((a, b) => a.start - b.start);

  // Remove overlapping spans (keep higher confidence)
  const filteredSpans: DialogueSpan[] = [];
  for (const span of spans) {
    const overlaps = filteredSpans.filter(
      (s) =>
        (span.start >= s.start && span.start < s.end) ||
        (span.end > s.start && span.end <= s.end) ||
        (span.start <= s.start && span.end >= s.end)
    );

    if (overlaps.length === 0) {
      filteredSpans.push(span);
    } else {
      // Replace if this span has higher confidence
      const minOverlap = overlaps.reduce(
        (min, s) => (s.confidence < min ? s.confidence : min),
        overlaps[0].confidence
      );
      if (span.confidence > minOverlap) {
        const idx = filteredSpans.findIndex((s) => s.confidence === minOverlap);
        if (idx !== -1) {
          filteredSpans.splice(idx, 1, span);
        }
      }
    }
  }

  return filteredSpans;
}
