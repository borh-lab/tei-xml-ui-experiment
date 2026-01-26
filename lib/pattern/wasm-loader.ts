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

let patternEngine: any = null;

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
 * Detect speaker from text using pattern matching
 * @param text - Text passage to analyze
 * @param patterns - Pattern database from IndexedDB
 * @returns Promise resolving to suggested speaker ID
 */
export async function detectSpeaker(text: string, patterns: any) {
  const engine = await loadPatternEngine();
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
  return engine.update_from_feedback(db, passage, speaker);
}

/**
 * Calculate confidence score for speaker detection
 * @param text - Text passage
 * @param speaker - Suggested speaker ID
 * @param patterns - Pattern database
 * @returns Promise resolving to confidence score (0-1)
 */
export async function calculateConfidence(text: string, speaker: string, patterns: any) {
  const engine = await loadPatternEngine();
  return engine.calculate_confidence(text, speaker, patterns);
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
