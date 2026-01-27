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
 *
 * @see WASM_BUILD_INSTRUCTIONS.md for detailed build instructions
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
    // @ts-ignore - WASM module is optional, fallback provided below
    const module = await import('/wasm/pattern_engine.js');

    // Initialize the WASM module
    if (module.default) {
      patternEngine = await module.default();
    } else {
      throw new Error('WASM module does not have a default export');
    }

    return patternEngine;
  } catch (error) {
    console.warn('WASM pattern engine not available. Using JavaScript fallback.');
    console.warn('To build WASM, see WASM_BUILD_INSTRUCTIONS.md');
    console.warn('Quick start: cd pattern-engine && wasm-pack build --target web --out-dir ../public/wasm');

    // Return a JavaScript implementation for development
    return getJavaScriptFallback();
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
 *
 * Enhanced with learned patterns from user corrections.
 *
 * New Rust signature: detect_speaker(text: &str, chapter: &str, position: usize, all_patterns_json: &str) -> String
 * Legacy signature: detect_speaker(text: &str, patterns: &JsValue) -> String
 *
 * @param text - Text passage to analyze
 * @param chapterOrPatterns - Chapter identifier OR legacy pattern database
 * @param position - Position in chapter (optional, for new signature)
 * @param allPatterns - All patterns (optional, for new signature)
 * @returns Promise resolving to suggested speaker ID
 */
export async function detectSpeaker(
  text: string,
  chapterOrPatterns?: string | any,
  position?: number,
  allPatterns?: Record<string, any>
): Promise<string> {
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

  // Determine which signature to use
  if (typeof chapterOrPatterns === 'string' && position !== undefined && allPatterns) {
    // New signature: detect_speaker(text, chapter, position, all_patterns_json)
    try {
      const allPatternsJson = JSON.stringify(allPatterns);
      return engine.detect_speaker(text, chapterOrPatterns, position, allPatternsJson);
    } catch (error) {
      console.error('Error calling new detect_speaker signature:', error);
      return 'speaker1';
    }
  } else {
    // Legacy signature: detect_speaker(text, patterns)
    return engine.detect_speaker(text, chapterOrPatterns || {});
  }
}

/**
 * Update pattern engine based on user feedback
 *
 * New Rust signature: update_from_feedback(passage: &str, accepted_speaker: &str, rejected_speakers_json: &str, current_patterns_json: &str) -> String
 * Legacy signature: update_from_feedback(db: &JsValue, passage: &str, speaker: &str) -> Result<(), JsValue>
 *
 * @param passageOrDb - Text passage OR legacy pattern database
 * @param acceptedSpeakerOrPassage - Accepted speaker ID OR text passage
 * @param rejectedSpeakers - Array of rejected speaker IDs (for new signature)
 * @param currentPatterns - Current pattern database (for new signature)
 * @returns Promise resolving when update is complete
 */
export async function updateFromFeedback(
  passageOrDb: string | any,
  acceptedSpeakerOrPassage?: string,
  rejectedSpeakers?: string[],
  currentPatterns?: Record<string, any>
): Promise<any> {
  const engine = await loadPatternEngine();

  // Invalidate pattern cache when new feedback is learned
  learnedPatternsCache = null;
  cacheTimestamp = 0;

  // Determine which signature to use
  if (typeof passageOrDb === 'string' && acceptedSpeakerOrPassage && rejectedSpeakers && currentPatterns) {
    // New signature: update_from_feedback(passage, accepted_speaker, rejected_speakers_json, current_patterns_json)
    try {
      const rejectedJson = JSON.stringify(rejectedSpeakers);
      const currentJson = JSON.stringify(currentPatterns);
      const resultJson = engine.update_from_feedback(passageOrDb, acceptedSpeakerOrPassage, rejectedJson, currentJson);
      return JSON.parse(resultJson);
    } catch (error) {
      console.error('Error calling new update_from_feedback signature:', error);
      return currentPatterns;
    }
  } else {
    // Legacy signature: update_from_feedback(db, passage, speaker)
    return engine.update_from_feedback(passageOrDb, acceptedSpeakerOrPassage);
  }
}

/**
 * Calculate confidence score for speaker detection
 * Enhanced with learned pattern matching
 *
 * New Rust signature: calculate_confidence(text: &str, speaker: &str, patterns_json: &str) -> f64
 * Legacy signature: calculate_confidence(text: &str, speaker: &str, patterns: &JsValue) -> f64
 *
 * @param text - Text passage
 * @param speaker - Suggested speaker ID
 * @param patternMatchOrPatterns - Pattern match data OR legacy pattern database
 * @returns Promise resolving to confidence score (0-1)
 */
export async function calculateConfidence(
  text: string,
  speaker: string,
  patternMatchOrPatterns?: any
): Promise<number> {
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

  // Determine which signature to use
  if (patternMatchOrPatterns && typeof patternMatchOrPatterns === 'object' && 'recent' in patternMatchOrPatterns) {
    // New signature: calculate_confidence(text, speaker, patterns_json)
    try {
      const patternsJson = JSON.stringify(patternMatchOrPatterns);
      return engine.calculate_confidence(text, speaker, patternsJson);
    } catch (error) {
      console.error('Error calling new calculate_confidence signature:', error);
      return 0.5;
    }
  } else {
    // Legacy signature: calculate_confidence(text, speaker, patterns)
    return engine.calculate_confidence(text, speaker, patternMatchOrPatterns || {});
  }
}

/**
 * Store a learned pattern for a speaker
 *
 * Rust signature: store_pattern(speaker: &str, chapter: &str, position: usize, dialogue_length: f64, patterns_json: &str) -> String
 *
 * @param speaker - Speaker ID
 * @param chapter - Chapter identifier
 * @param position - Position in chapter
 * @param dialogueLength - Length of dialogue passage
 * @param currentPattern - Current speaker pattern (object, will be JSON-stringified)
 * @returns Promise resolving to updated pattern data
 */
export async function storePattern(
  speaker: string,
  chapter: string,
  position: number,
  dialogueLength: number,
  currentPattern: Record<string, any>
): Promise<Record<string, any>> {
  const engine = await loadPatternEngine();

  try {
    // Convert to JSON string for WASM
    const patternsJson = JSON.stringify(currentPattern);

    // Call WASM function
    const resultJson = engine.store_pattern(speaker, chapter, position, dialogueLength, patternsJson);

    // Parse result back to object
    return JSON.parse(resultJson);
  } catch (error) {
    console.error('Error in storePattern:', error);

    // Fallback to manual update
    const updated = { ...currentPattern };
    updated.xml_id = speaker;
    updated.last_used = Date.now();
    return updated;
  }
}

/**
 * Get patterns for a specific speaker
 *
 * Rust signature: get_patterns(speaker: &str, all_patterns_json: &str) -> String
 *
 * @param speaker - Speaker ID to retrieve patterns for
 * @param allPatterns - All speaker patterns (object, will be JSON-stringified)
 * @returns Promise resolving to speaker's pattern data
 */
export async function getPatterns(
  speaker: string,
  allPatterns: Record<string, any>
): Promise<Record<string, any>> {
  const engine = await loadPatternEngine();

  try {
    // Convert to JSON string for WASM
    const allJson = JSON.stringify(allPatterns);

    // Call WASM function
    const resultJson = engine.get_patterns(speaker, allJson);

    // Parse result back to object
    return JSON.parse(resultJson);
  } catch (error) {
    console.error('Error in getPatterns:', error);
    return allPatterns[speaker] || {}; // Return from input on error
  }
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
 * JavaScript fallback implementation for when WASM is not built
 *
 * This provides basic implementations of the pattern matching functions
 * in pure JavaScript. It's less performant than WASM but allows development
 * to continue without building the Rust toolchain.
 */
function getJavaScriptFallback() {
  return {
    detect_speaker: (text: string, chapterOrPatterns: string | any, position?: number, allPatternsJson?: string) => {
      try {
        // New signature
        if (typeof chapterOrPatterns === 'string' && allPatternsJson) {
          const allPatterns = JSON.parse(allPatternsJson);

          // Simple heuristic: return most recent speaker
          const speakers = Object.entries(allPatterns);
          if (speakers.length === 0) return 'speaker1';

          // Sort by last_used (most recent first)
          const sorted = speakers.sort((a, b) => {
            const patternA = a[1] as any;
            const patternB = b[1] as any;
            return (patternB.last_used || 0) - (patternA.last_used || 0);
          });

          return sorted[0][0];
        } else {
          // Legacy signature - simple mock
          return 'speaker1';
        }
      } catch {
        return 'speaker1';
      }
    },

    calculate_confidence: (text: string, speaker: string, patternMatchOrPatterns: any) => {
      try {
        let pattern = patternMatchOrPatterns;

        // If received JSON string (from new signature), parse it
        if (typeof patternMatchOrPatterns === 'string') {
          pattern = JSON.parse(patternMatchOrPatterns);
        }

        if (pattern && typeof pattern === 'object' && 'recent' in pattern) {
          // Simple confidence calculation
          let score = 0.0;

          if (pattern.recent) score += 0.3;
          score += (pattern.chapter_frequency || 0) * 0.25;
          if (pattern.turn_taking) score += 0.2;
          if (pattern.name_mention) score += 0.1;
          score += (pattern.dialogue_length_score || 0) * 0.15;

          return Math.min(score, 1.0);
        } else {
          // Legacy - default confidence
          return 0.75;
        }
      } catch {
        return 0.5;
      }
    },

    update_from_feedback: (passageOrDb: string | any, acceptedSpeakerOrPassage?: string, rejectedJson?: string, currentJson?: string) => {
      try {
        if (typeof passageOrDb === 'string' && acceptedSpeakerOrPassage && rejectedJson && currentJson) {
          // New signature
          const passage = passageOrDb;
          const acceptedSpeaker = acceptedSpeakerOrPassage;
          const rejected = JSON.parse(rejectedJson);
          let allPatterns = JSON.parse(currentJson);

          const dialogueLength = passage.split(/\s+/).length;

          // Update accepted speaker
          if (!allPatterns[acceptedSpeaker]) {
            allPatterns[acceptedSpeaker] = {
              xml_id: acceptedSpeaker,
              last_used: Date.now(),
              position_frequency: {},
              common_followers: [],
              common_preceders: [],
              chapter_affinity: {},
              dialogue_length_avg: dialogueLength
            };
          }

          allPatterns[acceptedSpeaker].last_used = Date.now();

          // Update dialogue length average
          if (allPatterns[acceptedSpeaker].dialogue_length_avg) {
            allPatterns[acceptedSpeaker].dialogue_length_avg =
              allPatterns[acceptedSpeaker].dialogue_length_avg * 0.9 + dialogueLength * 0.1;
          } else {
            allPatterns[acceptedSpeaker].dialogue_length_avg = dialogueLength;
          }

          // Penalize rejected speakers
          for (const rejectedSpeaker of rejected) {
            if (allPatterns[rejectedSpeaker]) {
              allPatterns[rejectedSpeaker].last_used -= 86400000; // Subtract 1 day
            }
          }

          return JSON.stringify(allPatterns);
        } else {
          // Legacy signature
          return Promise.resolve();
        }
      } catch (error) {
        console.error('Error in update_from_feedback fallback:', error);
        return currentJson || Promise.resolve();
      }
    },

    store_pattern: (speaker: string, chapter: string, position: number, dialogueLength: number, patternsJson: string) => {
      try {
        let pattern = JSON.parse(patternsJson);

        // Update pattern
        pattern.xml_id = speaker;
        pattern.last_used = Date.now();

        if (!pattern.position_frequency) pattern.position_frequency = {};
        const key = `${chapter}_${position}`;
        pattern.position_frequency[key] = (pattern.position_frequency[key] || 0) + 1;

        if (!pattern.chapter_affinity) pattern.chapter_affinity = {};
        pattern.chapter_affinity[chapter] = (pattern.chapter_affinity[chapter] || 0) + 1;

        // Exponential moving average for dialogue length
        if (pattern.dialogue_length_avg) {
          pattern.dialogue_length_avg = pattern.dialogue_length_avg * 0.8 + dialogueLength * 0.2;
        } else {
          pattern.dialogue_length_avg = dialogueLength;
        }

        return JSON.stringify(pattern);
      } catch (error) {
        console.error('Error in store_pattern fallback:', error);
        return patternsJson;
      }
    },

    get_patterns: (speaker: string, allPatternsJson: string) => {
      try {
        const allPatterns = JSON.parse(allPatternsJson);
        const pattern = allPatterns[speaker];
        return pattern ? JSON.stringify(pattern) : '{}';
      } catch {
        return '{}';
      }
    }
  };
}

/**
 * Check if WASM engine is available (not using fallback)
 */
export async function isWasmAvailable(): Promise<boolean> {
  try {
    // @ts-ignore - WASM module is optional
    await import('/wasm/pattern_engine.js');
    return true;
  } catch {
    return false;
  }
}
