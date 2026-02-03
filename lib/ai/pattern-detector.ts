/**
 * Pattern Detection Engine
 *
 * Pure functions for detecting speakers in dialogue using regex patterns.
 * Designed to be fast and work entirely in TypeScript.
 */

import type { TEIDocument } from '@/lib/tei/types';
import type {
  DetectionResult,
  DialogueDetection,
  SpeakerPattern,
  TextRange,
} from './types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Pure function: Detect speaker from dialogue text using patterns
 *
 * Uses regex patterns for common dialogue attribution patterns:
 * - "Hello," she said. → speaker = "she"
 * - John replied, "..." → speaker = "John"
 * - "What?" asked Mary. → speaker = "Mary"
 *
 * @param dialogue - The dialogue text to analyze
 * @param characters - Known characters to match against
 * @param patterns - Speaker attribution patterns
 * @returns Array of detected speakers with confidence scores (sorted by confidence)
 */
export function detectSpeaker(
  dialogue: string,
  characters: readonly Character[],
  patterns: readonly SpeakerPattern[]
): DetectionResult[] {
  const results: DetectionResult[] = [];

  // Check each pattern
  for (const pattern of patterns) {
    for (const regex of pattern.patterns) {
      try {
        const match = dialogue.match(new RegExp(regex, 'i'));
        if (match) {
          // Try to match extracted name to a character
          const extractedName = match[1]?.toLowerCase();
          const character = extractedName
            ? characters.find((c) => c.name.toLowerCase() === extractedName)
            : null;

          results.push({
            speaker: character?.id || pattern.name,
            confidence: pattern.confidence,
            reason: `Pattern match: "${regex}"`,
          });
        }
      } catch (e) {
        // Invalid regex pattern, skip
        console.warn(`Invalid regex pattern: ${regex}`, e);
      }
    }
  }

  // Sort by confidence (highest first) and remove duplicates
  const uniqueResults = removeDuplicateSpeakers(results);
  uniqueResults.sort((a, b) => b.confidence - a.confidence);

  // Return top 3 matches
  return uniqueResults.slice(0, 3);
}

/**
 * Pure function: Detect all dialogue in document
 *
 * Scans document for:
 * 1. Existing said/q tags (extracts speaker attribution)
 * 2. Untagged dialogue (text in quotes)
 *
 * @param doc - The TEI document to scan
 * @param patterns - Speaker attribution patterns
 * @returns Array of dialogue detections with speaker attributions
 */
export function detectDialogueInDocument(
  doc: TEIDocument,
  patterns: readonly SpeakerPattern[]
): readonly DialogueDetection[] {
  const detections: DialogueDetection[] = [];

  for (const passage of doc.state.passages) {
    // Find existing dialogue tags
    const dialogueTags = passage.tags.filter(
      (t) => t.type === 'said' || t.type === 'q'
    );

    // For each existing tag, detect speaker attribution
    for (const tag of dialogueTags) {
      const text = extractTextFromRange(passage.content, tag.range);
      const speakers = detectSpeaker(text, doc.state.characters, patterns);

      if (speakers.length > 0) {
        detections.push({
          passageId: passage.id,
          range: tag.range,
          text,
          detectedSpeakers: speakers,
        });
      }
    }

    // Also detect untagged dialogue (heuristic: text in quotes)
    const untaggedQuotes = findUntaggedDialogue(passage.content);
    for (const quote of untaggedQuotes) {
      // Skip if this quote overlaps with an existing tag
      const overlaps = dialogueTags.some((tag) =>
        rangesOverlap(quote.range, tag.range)
      );
      if (overlaps) continue;

      const speakers = detectSpeaker(quote.text, doc.state.characters, patterns);
      if (speakers.length > 0) {
        detections.push({
          passageId: passage.id,
          range: quote.range,
          text: quote.text,
          detectedSpeakers: speakers,
        });
      }
    }
  }

  return detections;
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Extract text from a passage content using a text range
 */
function extractTextFromRange(content: string, range: TextRange): string {
  return content.substring(range.start, range.end);
}

/**
 * Find untreated dialogue (text in quotes not yet tagged)
 */
interface Quote {
  range: TextRange;
  text: string;
}

function findUntaggedDialogue(content: string): Quote[] {
  // Find text between quotation marks
  const quoteRegex = /"([^"]+)"/g;
  const quotes: Quote[] = [];
  let match;

  while ((match = quoteRegex.exec(content)) !== null) {
    quotes.push({
      range: { start: match.index, end: match.index + match[0].length },
      text: match[1],
    });
  }

  return quotes;
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(a: TextRange, b: TextRange): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Remove duplicate speaker detections (same speaker, keep highest confidence)
 */
function removeDuplicateSpeakers(results: DetectionResult[]): DetectionResult[] {
  const seen = new Set<string>();
  const unique: DetectionResult[] = [];

  for (const result of results) {
    if (!seen.has(result.speaker)) {
      seen.add(result.speaker);
      unique.push(result);
    }
  }

  return unique;
}
