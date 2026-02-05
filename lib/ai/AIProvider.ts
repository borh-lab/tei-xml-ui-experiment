/**
 * AI Provider Protocol
 *
 * Defines the contract for speaker attribution detection.
 * Different implementations can provide different strategies:
 * - Pattern-based (regex)
 * - ML models
 * - External APIs
 */

import type { DetectionResult, SpeakerPattern, SpeakerCorrection } from './types';
import type { Character } from '@/lib/tei/types';

/**
 * Protocol: AI detection interface
 *
 * This defines the contract for speaker attribution.
 */
export interface AIDetector {
  /**
   * Detect speaker for dialogue text
   * @param dialogue - The dialogue text
   * @param characters - Known characters to choose from
   * @param patterns - Pattern database for speaker attribution
   * @returns Array of detected speakers with confidence scores
   */
  detectSpeaker(
    dialogue: string,
    characters: readonly Character[],
    patterns: readonly SpeakerPattern[]
  ): readonly DetectionResult[];

  /**
   * Batch detect speakers for multiple dialogues
   * @param dialogues - Array of dialogue texts with metadata
   * @param characters - Known characters to choose from
   * @param patterns - Pattern database for speaker attribution
   * @returns Detection results for each dialogue
   */
  batchDetect(
    dialogues: readonly { dialogue: string; metadata?: Record<string, unknown> }[],
    characters: readonly Character[],
    patterns: readonly SpeakerPattern[]
  ): readonly DetectionResult[][];

  /**
   * Learn from corrections (update patterns based on user feedback)
   * @param corrections - Array of { dialogue, correctSpeaker, previousDetection }
   * @param currentPatterns - Current pattern database
   * @returns Updated pattern database
   */
  learnFromCorrections(
    corrections: readonly SpeakerCorrection[],
    currentPatterns: readonly SpeakerPattern[]
  ): readonly SpeakerPattern[];
}

/**
 * TypeScript implementation of AIDetector (regex-based)
 *
 * This implementation uses regex pattern matching for speaker attribution.
 * It's designed to be fast and work entirely in TypeScript without external dependencies.
 */
export class PatternBasedDetector implements AIDetector {
  detectSpeaker(
    dialogue: string,
    characters: readonly Character[],
    patterns: readonly SpeakerPattern[]
  ): readonly DetectionResult[] {
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

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    // Return top 3 matches
    return results.slice(0, 3);
  }

  batchDetect(
    dialogues: readonly { dialogue: string; metadata?: Record<string, unknown> }[],
    characters: readonly Character[],
    patterns: readonly SpeakerPattern[]
  ): readonly DetectionResult[][] {
    return dialogues.map(({ dialogue }) => this.detectSpeaker(dialogue, characters, patterns)) as unknown as readonly DetectionResult[][];
  }

  learnFromCorrections(
    _corrections: readonly SpeakerCorrection[],
    currentPatterns: readonly SpeakerPattern[]
  ): readonly SpeakerPattern[] {
    // TODO: Implement pattern learning from corrections
    // For now, return current patterns unchanged
    // This could be extended to:
    // 1. Extract patterns from corrected examples
    // 2. Adjust confidence scores based on accuracy
    // 3. Create new patterns for recurring attribution patterns
    return [...currentPatterns];
  }
}
