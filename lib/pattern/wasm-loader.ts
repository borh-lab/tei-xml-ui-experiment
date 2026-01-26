/**
 * WASM Pattern Engine Loader
 *
 * This module handles loading and interacting with the Rust WASM pattern engine.
 * The WASM module must be built first using: wasm-pack build --target web --out-dir ../public/wasm
 *
 * Build requirements:
 * - Rust toolchain with wasm32-unknown-unknown target
 * - wasm-pack: cargo install wasm-pack
 * - lld linker (usually via llvm or clang)
 */

import { db } from '@/lib/db/PatternDB';
import { scorePatternMatch, type SpeakerPatternData } from '@/lib/learning/PatternExtractor';

let patternEngine: any = null;
let learnedPatternsCache: Map<string, SpeakerPatternData> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Load the WASM pattern engine module
 * @returns Promise resolving to the loaded WASM module
 */
export async function loadPatternEngine() {
  if (patternEngine) return patternEngine;

  try {
    // Try to load the WASM module
    // Note: This will only work if the WASM has been built
    const module = await import('/wasm/pattern_engine.js');

    // Initialize the WASM module
    if (module.default) {
      patternEngine = await module.default();
    } else {
      throw new Error('WASM module does not have a default export');
    }

    return patternEngine;
  } catch (error) {
    console.warn('WASM pattern engine not available. Make sure to build it with:', error);
    console.warn('  cd pattern-engine && wasm-pack build --target web --out-dir ../public/wasm');

    // Return a mock implementation for development
    return getMockPatternEngine();
  }
}

/**
 * Load learned patterns from IndexedDB
 * @returns Promise resolving to learned patterns cache
 */
async function loadLearnedPatterns(): Promise<Map<string, SpeakerPatternData>> {
  const now = Date.now();

  // Return cached patterns if still fresh
  if (learnedPatternsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return learnedPatternsCache;
  }

  try {
    const allPatterns = await db.getAllLearnedPatterns();
    const patternsMap = new Map<string, SpeakerPatternData>();

    // Group patterns by speaker
    for (const pattern of allPatterns) {
      let speakerPattern = patternsMap.get(pattern.speaker);

      if (!speakerPattern) {
        speakerPattern = {
          xmlId: pattern.speaker,
          commonPhrases: new Map(),
          dialogueLengthPatterns: {
            average: 0,
            min: Infinity,
            max: -Infinity,
            stdDev: 0
          },
          positionPatterns: {
            beginning: 0,
            middle: 0,
            end: 0
          },
          contextualPatterns: new Map()
        };
        patternsMap.set(pattern.speaker, speakerPattern);
      }

      // Add phrase to common phrases
      speakerPattern.commonPhrases.set(pattern.pattern, pattern.frequency);
    }

    // Load speaker data for additional context
    const speakers = await db.getSpeakers();
    for (const [xmlId, speaker] of Object.entries(speakers)) {
      const speakerPattern = patternsMap.get(xmlId) || {
        xmlId,
        commonPhrases: new Map(),
        dialogueLengthPatterns: {
          average: 0,
          min: Infinity,
          max: -Infinity,
          stdDev: 0
        },
        positionPatterns: {
          beginning: 0,
          middle: 0,
          end: 0
        },
        contextualPatterns: new Map()
      };

      // Merge speaker-specific data
      if (speaker.commonPhrases) {
        for (const [phrase, count] of Object.entries(speaker.commonPhrases)) {
          speakerPattern.commonPhrases.set(phrase, count);
        }
      }

      if (speaker.dialogueLengthStats) {
        speakerPattern.dialogueLengthPatterns = speaker.dialogueLengthStats;
      }

      if (speaker.positionPatterns) {
        speakerPattern.positionPatterns = speaker.positionPatterns;
      }

      patternsMap.set(xmlId, speakerPattern);
    }

    learnedPatternsCache = patternsMap;
    cacheTimestamp = now;

    return patternsMap;
  } catch (error) {
    console.error('Failed to load learned patterns:', error);
    return new Map();
  }
}

/**
 * Detect speaker from text using pattern matching
 * Now enhanced with learned patterns from user corrections
 * @param text - Text passage to analyze
 * @param patterns - Pattern database from IndexedDB
 * @returns Promise resolving to suggested speaker ID
 */
export async function detectSpeaker(text: string, patterns: any) {
  const engine = await loadPatternEngine();

  // First, try to use learned patterns for better prediction
  const learnedPatterns = await loadLearnedPatterns();

  if (learnedPatterns.size > 0) {
    // Score each speaker's patterns against the text
    let bestSpeaker = '';
    let bestScore = -1;

    for (const [speakerId, speakerPattern] of learnedPatterns) {
      const score = scorePatternMatch(text, speakerPattern);
      if (score > bestScore) {
        bestScore = score;
        bestSpeaker = speakerId;
      }
    }

    // If we found a good pattern match, use it
    if (bestSpeaker && bestScore > 0) {
      return bestSpeaker;
    }
  }

  // Fall back to WASM engine or mock
  return engine.detect_speaker(text, patterns);
}

/**
 * Update pattern engine based on user feedback
 * @param db - Pattern database state
 * @param passage - Text passage
 * @param speaker - Accepted speaker ID
 * @returns Promise resolving when update is complete
 */
export async function updateFromFeedback(db: any, passage: string, speaker: string) {
  const engine = await loadPatternEngine();

  // Invalidate pattern cache when new feedback is learned
  learnedPatternsCache = null;
  cacheTimestamp = 0;

  return engine.update_from_feedback(db, passage, speaker);
}

/**
 * Calculate confidence score for speaker detection
 * Enhanced with learned pattern matching
 * @param text - Text passage
 * @param speaker - Suggested speaker ID
 * @param patterns - Pattern database
 * @returns Promise resolving to confidence score (0-1)
 */
export async function calculateConfidence(text: string, speaker: string, patterns: any) {
  const engine = await loadPatternEngine();

  // Try to calculate confidence based on learned patterns
  const learnedPatterns = await loadLearnedPatterns();
  const speakerPattern = learnedPatterns.get(speaker);

  if (speakerPattern) {
    const patternScore = scorePatternMatch(text, speakerPattern);

    // Normalize score to 0-1 range (with some cap)
    // A score of 50+ indicates strong pattern match
    const normalizedScore = Math.min(patternScore / 50, 1.0);

    return normalizedScore;
  }

  // Fall back to WASM engine or mock
  return engine.calculate_confidence(text, speaker, patterns);
}

/**
 * Clear the learned patterns cache
 * Call this when new patterns are added or updated
 */
export function clearPatternCache() {
  learnedPatternsCache = null;
  cacheTimestamp = 0;
}

/**
 * Mock pattern engine for development when WASM is not built
 */
function getMockPatternEngine() {
  return {
    detect_speaker: (_text: string, _patterns: any) => {
      return Promise.resolve('speaker1');
    },
    update_from_feedback: (_db: any, _passage: string, _speaker: string) => {
      return Promise.resolve();
    },
    calculate_confidence: (_text: string, _speaker: string, _patterns: any) => {
      return Promise.resolve(0.75);
    }
  };
}

/**
 * Check if WASM engine is available (not using mock)
 */
export async function isWasmAvailable(): Promise<boolean> {
  try {
    await import('/wasm/pattern_engine.js');
    return true;
  } catch {
    return false;
  }
}
