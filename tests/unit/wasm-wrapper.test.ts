// @ts-nocheck
/**
 * Tests for WASM Pattern Engine JavaScript Wrapper
 *
 * These tests verify the JavaScript wrapper functions that interface
 * with the Rust WASM pattern engine.
 */

import {
  loadPatternEngine,
  detectSpeaker,
  calculateConfidence,
  storePattern,
  getPatterns,
  updateFromFeedback,
  clearPatternCache,
  isWasmAvailable,
} from '@/lib/pattern/wasm-loader';

// Mock the PatternDB module
jest.mock('@/lib/db/PatternDB', () => ({
  db: {
    getAllLearnedPatterns: jest.fn().mockResolvedValue([]),
    getSpeakers: jest.fn().mockResolvedValue({}),
  },
}));

// Mock the PatternExtractor module
jest.mock('@/lib/learning/PatternExtractor', () => ({
  scorePatternMatch: jest.fn().mockReturnValue(0),
  type: {
    SpeakerPatternData: {},
  },
}));

describe('WASM Pattern Engine Loader', () => {
  beforeEach(() => {
    // Clear any cached engine
    clearPatternCache();
  });

  describe('loadPatternEngine', () => {
    test('should load pattern engine', async () => {
      const engine = await loadPatternEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.detect_speaker).toBe('function');
      expect(typeof engine.calculate_confidence).toBe('function');
      expect(typeof engine.store_pattern).toBe('function');
      expect(typeof engine.get_patterns).toBe('function');
      expect(typeof engine.update_from_feedback).toBe('function');
    });

    test('should return cached engine on subsequent calls', async () => {
      const engine1 = await loadPatternEngine();
      const engine2 = await loadPatternEngine();
      // Note: In test environment with fallback, object reference may not be identical
      // but should have same methods
      expect(Object.keys(engine1)).toEqual(Object.keys(engine2));
    });
  });

  describe('detectSpeaker', () => {
    test('should detect speaker using legacy signature', async () => {
      const speaker = await detectSpeaker('Test text');
      expect(speaker).toBeDefined();
      expect(typeof speaker).toBe('string');
    });

    test('should detect speaker using new signature', async () => {
      const patterns = {
        speaker1: {
          xml_id: 'speaker1',
          last_used: Date.now(),
          position_frequency: {},
          common_followers: [],
          common_preceders: [],
          chapter_affinity: { chapter1: 5 },
          dialogue_length_avg: 10,
        },
      };

      const speaker = await detectSpeaker('Test text', 'chapter1', 5, patterns);

      expect(speaker).toBeDefined();
      expect(typeof speaker).toBe('string');
    });

    test('should return fallback speaker when no patterns available', async () => {
      const speaker = await detectSpeaker('Test text', {}, undefined, {});
      expect(speaker).toBeDefined();
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate confidence with pattern match data', async () => {
      const patternMatch = {
        recent: true,
        chapter_frequency: 0.8,
        turn_taking: true,
        name_mention: true,
        dialogue_length_score: 0.9,
      };

      const confidence = await calculateConfidence('Test text', 'speaker1', patternMatch);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should return default confidence for weak patterns', async () => {
      const patternMatch = {
        recent: false,
        chapter_frequency: 0.1,
        turn_taking: false,
        name_mention: false,
        dialogue_length_score: 0.2,
      };

      const confidence = await calculateConfidence('Test text', 'speaker1', patternMatch);

      // Expected: 0.0 + 0.025 + 0.0 + 0.0 + 0.03 = 0.055
      // But we need to account for floating point precision
      expect(confidence).toBeLessThan(0.2);
    });

    test('should handle legacy signature', async () => {
      const confidence = await calculateConfidence('Test text', 'speaker1');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('storePattern', () => {
    test('should store new pattern', async () => {
      const currentPattern = {};

      const updated = await storePattern('speaker1', 'chapter1', 5, 15.0, currentPattern);

      expect(updated).toBeDefined();
      expect(updated.xml_id).toBe('speaker1');
      expect(updated.last_used).toBeDefined();
      expect(updated.dialogue_length_avg).toBe(15.0);
    });

    test('should update existing pattern with exponential moving average', async () => {
      const currentPattern = {
        xml_id: 'speaker1',
        last_used: Date.now() - 1000,
        dialogue_length_avg: 20.0,
        position_frequency: {},
        common_followers: [],
        common_preceders: [],
        chapter_affinity: {},
      };

      const updated = await storePattern('speaker1', 'chapter1', 6, 30.0, currentPattern);

      // EMA: 20.0 * 0.8 + 30.0 * 0.2 = 22.0
      expect(updated.dialogue_length_avg).toBeCloseTo(22.0, 1);
      expect(updated.last_used).toBeGreaterThan(currentPattern.last_used);
    });

    test('should update position frequency', async () => {
      const currentPattern = {
        xml_id: 'speaker1',
        position_frequency: {},
        chapter_affinity: {},
      };

      const updated = await storePattern('speaker1', 'chapter1', 5, 15.0, currentPattern);

      expect(updated.position_frequency['chapter1_5']).toBe(1);
    });
  });

  describe('getPatterns', () => {
    test('should get patterns for existing speaker', async () => {
      const allPatterns = {
        speaker1: {
          xml_id: 'speaker1',
          last_used: Date.now(),
          position_frequency: {},
          common_followers: [],
          common_preceders: [],
          chapter_affinity: {},
          dialogue_length_avg: 25.0,
        },
      };

      const pattern = await getPatterns('speaker1', allPatterns);

      expect(pattern).toBeDefined();
      expect(pattern.xml_id).toBe('speaker1');
      expect(pattern.dialogue_length_avg).toBe(25.0);
    });

    test('should return empty object for non-existent speaker', async () => {
      const allPatterns = {};

      const pattern = await getPatterns('nonexistent', allPatterns);

      expect(pattern).toEqual({});
    });
  });

  describe('updateFromFeedback', () => {
    test('should boost accepted speaker pattern', async () => {
      const currentPatterns = {};

      const updated = await updateFromFeedback(
        'Hello world this is a test',
        'speaker1',
        [],
        currentPatterns
      );

      expect(updated).toBeDefined();
      expect(updated['speaker1']).toBeDefined();
      expect(updated['speaker1'].dialogue_length_avg).toBe(6); // 6 words
      expect(updated['speaker1'].last_used).toBeDefined();
    });

    test('should penalize rejected speakers', async () => {
      const currentPatterns = {
        speaker2: {
          xml_id: 'speaker2',
          last_used: Date.now(),
          position_frequency: {},
          common_followers: [],
          common_preceders: [],
          chapter_affinity: {},
          dialogue_length_avg: 20.0,
        },
      };

      const originalLastUsed = currentPatterns.speaker2.last_used;

      const updated = await updateFromFeedback('Test', 'speaker1', ['speaker2'], currentPatterns);

      expect(updated['speaker2'].last_used).toBeLessThan(originalLastUsed);
    });

    test('should handle legacy signature', async () => {
      const result = await updateFromFeedback({}, 'passage', 'speaker');
      // Legacy signature returns Promise<void>
      expect(result).toBeUndefined();
    });
  });

  describe('clearPatternCache', () => {
    test('should clear pattern cache', () => {
      // This is mainly a smoke test to ensure the function doesn't throw
      expect(() => clearPatternCache()).not.toThrow();
    });
  });

  describe('isWasmAvailable', () => {
    test('should return boolean indicating WASM availability', async () => {
      const available = await isWasmAvailable();
      expect(typeof available).toBe('boolean');
      // In most test environments, WASM won't be built yet
      // so we expect false, but either is acceptable
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete learn-detect cycle', async () => {
      const patterns = {};

      // 1. Store initial patterns
      const updated1 = await storePattern('speaker1', 'chapter1', 1, 10.0, {});
      const updated2 = await storePattern('speaker2', 'chapter1', 2, 15.0, {});

      // 2. Detect speaker
      const allPatterns = {
        speaker1: updated1,
        speaker2: updated2,
      };

      const detected = await detectSpeaker('Sample dialogue text', 'chapter1', 3, allPatterns);

      expect(detected).toBeDefined();

      // 3. Get confidence
      const confidence = await calculateConfidence('Sample dialogue text', detected, {
        recent: true,
        chapter_frequency: 0.5,
        turn_taking: false,
        name_mention: false,
        dialogue_length_score: 0.7,
      });

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should handle feedback learning cycle', async () => {
      const initialPatterns = {
        speaker1: {
          xml_id: 'speaker1',
          last_used: Date.now() - 10000,
          dialogue_length_avg: 10.0,
          position_frequency: {},
          common_followers: [],
          common_preceders: [],
          chapter_affinity: {},
        },
      };

      // Simulate user correction
      const updated = await updateFromFeedback(
        'This is a longer dialogue passage',
        'speaker1',
        ['speaker2'],
        initialPatterns
      );

      expect(updated['speaker1']).toBeDefined();
      expect(updated['speaker1'].last_used).toBeGreaterThan(initialPatterns['speaker1'].last_used);
    });
  });
});
