/**
 * Pattern Extraction Module
 *
 * Extracts and learns patterns from user corrections and accepted dialogue.
 * Builds a knowledge base of speaker-specific patterns to improve detection accuracy.
 */

export interface ExtractedPattern {
  phrases: Map<string, number>;
  dialogueLength: number;
  position: 'beginning' | 'middle' | 'end';
  contextWords: string[];
}

export interface SpeakerPatternData {
  xmlId: string;
  commonPhrases: Map<string, number>; // phrase -> frequency
  dialogueLengthPatterns: {
    average: number;
    min: number;
    max: number;
    stdDev: number;
  };
  positionPatterns: {
    beginning: number; // frequency at section start
    middle: number;
    end: number; // frequency at section end
  };
  contextualPatterns: Map<string, string[]> // surrounding text -> phrases
}

export interface LearningContext {
  passage: string;
  speaker: string;
  position: 'beginning' | 'middle' | 'end';
  surroundingText?: {
    before?: string;
    after?: string;
  };
  sectionContext?: string; // chapter/scene identifier
}

/**
 * Extract patterns from dialogue text (simplified version for UI integration)
 * This matches the interface expected by the InlineSuggestions component
 */
export function extract(
  text: string,
  speakerId: string,
  position: 'beginning' | 'middle' | 'end'
): ExtractedPattern {
  // Extract phrases (2-4 word n-grams)
  const words = text.toLowerCase().split(/\s+/);
  const phrases = new Map<string, number>();

  for (let i = 0; i < words.length - 1; i++) {
    for (let j = i + 2; j <= Math.min(i + 4, words.length); j++) {
      const phrase = words.slice(i, j).join(' ');
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }
  }

  // Extract context words (excluding common stop words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const contextWords = words.filter(w => !stopWords.has(w));

  return {
    phrases,
    dialogueLength: words.length,
    position,
    contextWords
  };
}

/**
 * Extract patterns from an accepted dialogue passage
 */
export function extractAcceptedPattern(context: LearningContext): SpeakerPatternData {
  const phrases = extractPhrases(context.passage);
  const dialogueLength = context.passage.length;

  return {
    xmlId: context.speaker,
    commonPhrases: new Map(
      phrases.map(phrase => [phrase, 1])
    ),
    dialogueLengthPatterns: {
      average: dialogueLength,
      min: dialogueLength,
      max: dialogueLength,
      stdDev: 0
    },
    positionPatterns: {
      beginning: context.position === 'beginning' ? 1 : 0,
      middle: context.position === 'middle' ? 1 : 0,
      end: context.position === 'end' ? 1 : 0
    },
    contextualPatterns: new Map()
  };
}

/**
 * Merge new pattern data into existing speaker pattern
 */
export function mergePatterns(
  existing: SpeakerPatternData,
  newPattern: SpeakerPatternData
): SpeakerPatternData {
  // Merge common phrases
  const mergedPhrases = new Map(existing.commonPhrases);
  for (const [phrase, count] of newPattern.commonPhrases) {
    mergedPhrases.set(phrase, (mergedPhrases.get(phrase) || 0) + count);
  }

  // Update dialogue length statistics
  const oldLength = existing.dialogueLengthPatterns;
  const newLength = newPattern.dialogueLengthPatterns;
  const count = (oldLength.average / oldLength.stdDev) || 1;
  const newAverage = (oldLength.average * count + newLength.average) / (count + 1);
  const newMin = Math.min(oldLength.min, newLength.min);
  const newMax = Math.max(oldLength.max, newLength.max);

  return {
    xmlId: existing.xmlId,
    commonPhrases: mergedPhrases,
    dialogueLengthPatterns: {
      average: newAverage,
      min: newMin,
      max: newMax,
      stdDev: calculateStdDev(newAverage, newMin, newMax)
    },
    positionPatterns: {
      beginning: existing.positionPatterns.beginning + newPattern.positionPatterns.beginning,
      middle: existing.positionPatterns.middle + newPattern.positionPatterns.middle,
      end: existing.positionPatterns.end + newPattern.positionPatterns.end
    },
    contextualPatterns: existing.contextualPatterns
  };
}

/**
 * Extract significant phrases from dialogue text
 */
function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      // Add full sentence
      phrases.push(trimmed);

      // Add key phrases (3+ words)
      const words = trimmed.split(/\s+/);
      for (let i = 0; i <= words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

/**
 * Calculate standard deviation (simplified approximation)
 */
function calculateStdDev(average: number, min: number, max: number): number {
  return (max - min) / 4; // Approximation for normal distribution
}

/**
 * Determine position in section based on index and total
 */
export function determinePosition(
  index: number,
  total: number
): 'beginning' | 'middle' | 'end' {
  const third = Math.floor(total / 3);
  if (index < third) return 'beginning';
  if (index >= total - third) return 'end';
  return 'middle';
}

/**
 * Score how well a passage matches a speaker's patterns
 */
export function scorePatternMatch(
  passage: string,
  speakerPattern: SpeakerPatternData
): number {
  let score = 0;
  const phrases = extractPhrases(passage);

  // Check for phrase matches
  for (const phrase of phrases) {
    const frequency = speakerPattern.commonPhrases.get(phrase) || 0;
    score += frequency * 10;
  }

  // Check for substring matches (partial phrase matches)
  const passageLower = passage.toLowerCase();
  for (const [pattern, frequency] of speakerPattern.commonPhrases) {
    if (passageLower.includes(pattern.toLowerCase())) {
      score += frequency * 5;
    }
  }

  // Check dialogue length similarity
  const lengthDiff = Math.abs(
    passage.length - speakerPattern.dialogueLengthPatterns.average
  );
  // Only add length score if we have valid data (average > 0)
  if (speakerPattern.dialogueLengthPatterns.average > 0 &&
      lengthDiff < speakerPattern.dialogueLengthPatterns.stdDev) {
    score += 5;
  }

  return score;
}
