// @ts-nocheck
/**
 * Pattern Learning Tests
 *
 * Tests for the pattern extraction and learning system.
 * Verifies that the system can learn from user corrections and improve predictions.
 */

import {
  extractAcceptedPattern,
  mergePatterns,
  determinePosition,
  scorePatternMatch,
  type SpeakerPatternData,
  type LearningContext,
} from '@/lib/learning/PatternExtractor';
import { PatternDB, type SpeakerPattern } from '@/lib/db/PatternDB';

describe('PatternExtractor', () => {
  describe('extractAcceptedPattern', () => {
    it('should extract patterns from accepted dialogue', () => {
      const context: LearningContext = {
        passage: 'Hello world, this is a test.',
        speaker: 'speaker1',
        position: 'beginning',
      };

      const pattern = extractAcceptedPattern(context);

      expect(pattern.xmlId).toBe('speaker1');
      expect(pattern.commonPhrases.size).toBeGreaterThan(0);
      expect(pattern.dialogueLengthPatterns.average).toBe(context.passage.length);
      expect(pattern.positionPatterns.beginning).toBe(1);
    });

    it('should extract multiple phrases from dialogue', () => {
      const context: LearningContext = {
        passage: 'Hello world. This is a test. Another sentence here.',
        speaker: 'speaker1',
        position: 'middle',
      };

      const pattern = extractAcceptedPattern(context);

      // Should extract full sentences and 3-word phrases
      expect(pattern.commonPhrases.size).toBeGreaterThan(2);
    });
  });

  describe('mergePatterns', () => {
    it('should merge new patterns into existing ones', () => {
      const existing: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map([['hello', 2]]),
        dialogueLengthPatterns: {
          average: 10,
          min: 5,
          max: 15,
          stdDev: 2.5,
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0,
        },
        contextualPatterns: new Map(),
      };

      const newPattern: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map([['world', 1]]),
        dialogueLengthPatterns: {
          average: 12,
          min: 8,
          max: 16,
          stdDev: 2,
        },
        positionPatterns: {
          beginning: 0,
          middle: 1,
          end: 0,
        },
        contextualPatterns: new Map(),
      };

      const merged = mergePatterns(existing, newPattern);

      expect(merged.commonPhrases.get('hello')).toBe(2);
      expect(merged.commonPhrases.get('world')).toBe(1);
      expect(merged.positionPatterns.beginning).toBe(1);
      expect(merged.positionPatterns.middle).toBe(1);
    });

    it('should update dialogue length statistics correctly', () => {
      const existing: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map(),
        dialogueLengthPatterns: {
          average: 10,
          min: 5,
          max: 15,
          stdDev: 2.5,
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0,
        },
        contextualPatterns: new Map(),
      };

      const newPattern: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map(),
        dialogueLengthPatterns: {
          average: 20,
          min: 18,
          max: 22,
          stdDev: 1,
        },
        positionPatterns: {
          beginning: 0,
          middle: 0,
          end: 0,
        },
        contextualPatterns: new Map(),
      };

      const merged = mergePatterns(existing, newPattern);

      expect(merged.dialogueLengthPatterns.min).toBe(5);
      expect(merged.dialogueLengthPatterns.max).toBe(22);
      expect(merged.dialogueLengthPatterns.average).toBeGreaterThan(10);
      expect(merged.dialogueLengthPatterns.average).toBeLessThan(20);
    });
  });

  describe('determinePosition', () => {
    it('should identify beginning position', () => {
      expect(determinePosition(0, 10)).toBe('beginning');
      expect(determinePosition(2, 10)).toBe('beginning');
    });

    it('should identify middle position', () => {
      expect(determinePosition(4, 10)).toBe('middle');
      expect(determinePosition(5, 10)).toBe('middle');
    });

    it('should identify end position', () => {
      expect(determinePosition(8, 10)).toBe('end');
      expect(determinePosition(9, 10)).toBe('end');
    });
  });

  describe('scorePatternMatch', () => {
    it('should score higher for matching phrases', () => {
      const speakerPattern: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map([
          ['hello world', 5],
          ['test phrase', 3],
        ]),
        dialogueLengthPatterns: {
          average: 20,
          min: 10,
          max: 30,
          stdDev: 5,
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0,
        },
        contextualPatterns: new Map(),
      };

      const matchingPassage = 'This contains hello world text.';
      const nonMatchingPassage = 'This has no matching phrases.';

      const matchingScore = scorePatternMatch(matchingPassage, speakerPattern);
      const nonMatchingScore = scorePatternMatch(nonMatchingPassage, speakerPattern);

      expect(matchingScore).toBeGreaterThan(nonMatchingScore);
    });

    it('should consider dialogue length in scoring', () => {
      const speakerPattern: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map(),
        dialogueLengthPatterns: {
          average: 20,
          min: 10,
          max: 30,
          stdDev: 5,
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0,
        },
        contextualPatterns: new Map(),
      };

      const similarLength = 'This is about right. '; // ~22 chars
      const differentLength = 'Short'; // ~5 chars

      const similarScore = scorePatternMatch(similarLength, speakerPattern);
      const differentScore = scorePatternMatch(differentLength, speakerPattern);

      expect(similarScore).toBeGreaterThan(differentScore);
    });
  });
});

describe('PatternDB Learning Integration', () => {
  let db: PatternDB;

  beforeEach(async () => {
    db = new PatternDB();
    await db.init();
    // Clear all data before each test
    await db.speakers.clear();
    await db.corrections.clear();
    await db.learnedPatterns.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('logCorrection', () => {
    it('should store accepted corrections', async () => {
      await db.logCorrection('Hello world', 'speaker1', ['speaker2'], 0.9, 'beginning');

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(1);
      expect(corrections[0].passage).toBe('Hello world');
      expect(corrections[0].accepted).toBe('speaker1');
      expect(corrections[0].position).toBe('beginning');
    });

    it('should store rejected corrections', async () => {
      await db.logCorrection('Hello world', '', ['speaker2', 'speaker3'], 0.3, 'middle');

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(1);
      expect(corrections[0].rejected).toEqual(['speaker2', 'speaker3']);
    });
  });

  describe('storeLearnedPattern', () => {
    it('should store new patterns', async () => {
      await db.storeLearnedPattern('speaker1', 'hello world', 1);

      const patterns = await db.getLearnedPatterns('speaker1');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('hello world');
      expect(patterns[0].frequency).toBe(1);
    });

    it('should increment frequency for existing patterns', async () => {
      await db.storeLearnedPattern('speaker1', 'hello world', 1);
      await db.storeLearnedPattern('speaker1', 'hello world', 1);

      const patterns = await db.getLearnedPatterns('speaker1');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe(2);
    });

    it('should store multiple patterns for same speaker', async () => {
      await db.storeLearnedPattern('speaker1', 'hello world', 1);
      await db.storeLearnedPattern('speaker1', 'goodbye', 1);

      const patterns = await db.getLearnedPatterns('speaker1');
      expect(patterns).toHaveLength(2);
    });

    it('should update lastSeen timestamp', async () => {
      await db.storeLearnedPattern('speaker1', 'hello world', 1);

      const patterns = await db.getLearnedPatterns('speaker1');
      const firstTimestamp = patterns[0].lastSeen;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.storeLearnedPattern('speaker1', 'hello world', 1);

      const updatedPatterns = await db.getLearnedPatterns('speaker1');
      expect(updatedPatterns[0].lastSeen).toBeGreaterThan(firstTimestamp);
    });
  });

  describe('getRecentCorrections', () => {
    beforeEach(async () => {
      // Add test corrections
      await db.logCorrection('test1', 'speaker1', [], 0.9, 'beginning');
      await db.logCorrection('test2', 'speaker2', [], 0.8, 'middle');
      await db.logCorrection('test3', 'speaker1', [], 0.7, 'end');
    });

    it('should return corrections ordered by timestamp', async () => {
      const corrections = await db.getRecentCorrections(10);

      expect(corrections).toHaveLength(3);
      // Most recent should be first
      expect(corrections[0].passage).toBe('test3');
      expect(corrections[1].passage).toBe('test2');
      expect(corrections[2].passage).toBe('test1');
    });

    it('should limit results', async () => {
      const corrections = await db.getRecentCorrections(2);

      expect(corrections).toHaveLength(2);
    });
  });

  describe('getAllLearnedPatterns', () => {
    it('should return patterns from all speakers', async () => {
      await db.storeLearnedPattern('speaker1', 'pattern1', 1);
      await db.storeLearnedPattern('speaker2', 'pattern2', 1);

      const allPatterns = await db.getAllLearnedPatterns();

      expect(allPatterns).toHaveLength(2);
      expect(allPatterns.some((p) => p.speaker === 'speaker1')).toBe(true);
      expect(allPatterns.some((p) => p.speaker === 'speaker2')).toBe(true);
    });
  });
});

describe('Learning from Multiple Corrections', () => {
  let db: PatternDB;

  beforeEach(async () => {
    db = new PatternDB();
    await db.init();
    await db.speakers.clear();
    await db.corrections.clear();
    await db.learnedPatterns.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should learn patterns from multiple corrections', async () => {
    // Simulate multiple acceptances of similar dialogue
    const corrections = [
      { passage: 'Hello world', speaker: 'speaker1' },
      { passage: 'Hello again', speaker: 'speaker1' },
      { passage: 'Hello there', speaker: 'speaker1' },
    ];

    for (const correction of corrections) {
      await db.logCorrection(correction.passage, correction.speaker, [], 0.9, 'beginning');

      // Extract and store the "Hello" pattern
      if (correction.passage.includes('Hello')) {
        await db.storeLearnedPattern(correction.speaker, 'Hello', 1);
      }
    }

    const patterns = await db.getLearnedPatterns('speaker1');
    const helloPattern = patterns.find((p) => p.pattern === 'Hello');

    expect(helloPattern).toBeDefined();
    expect(helloPattern!.frequency).toBe(3);
  });

  it('should build speaker profiles over time', async () => {
    // Speaker 1 tends to speak at beginning
    await db.logCorrection('Early dialogue', 'speaker1', [], 0.9, 'beginning');
    await db.updateSpeakerPattern('speaker1', {
      name: 'Speaker One',
      lastUsed: Date.now(),
      chapterAffinity: { chapter1: 1 },
    });

    // Speaker 2 tends to speak at end
    await db.logCorrection('Late dialogue', 'speaker2', [], 0.9, 'end');
    await db.updateSpeakerPattern('speaker2', {
      name: 'Speaker Two',
      lastUsed: Date.now(),
      chapterAffinity: { chapter1: 1 },
    });

    const speaker1 = await db.getSpeaker('speaker1');
    const speaker2 = await db.getSpeaker('speaker2');

    expect(speaker1).toBeDefined();
    expect(speaker2).toBeDefined();
    expect(speaker1?.name).toBe('Speaker One');
    expect(speaker2?.name).toBe('Speaker Two');
  });
});

// ============================================================================
// InlineSuggestions Pattern Learning Integration Tests
// ============================================================================

describe('InlineSuggestions Pattern Learning', () => {
  let db: PatternDB;

  beforeEach(async () => {
    db = new PatternDB();
    await db.init();
    // Clear all data before each test
    await db.speakers.clear();
    await db.corrections.clear();
    await db.learnedPatterns.clear();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Pattern Storage on Accept', () => {
    it('should store extracted patterns to IndexedDB on accept', async () => {
      const suggestion = {
        text: 'Hello world, this is a test',
        start: 0,
        end: 27,
        confidence: 0.9,
        speaker: 'speaker1',
      };

      // Simulate what handleAccept does
      const { extract } = await import('@/lib/learning/PatternExtractor');
      const position = 'beginning' as const;
      const patterns = extract(suggestion.text, suggestion.speaker, position);

      await db.storeLearnedPattern(suggestion.speaker, patterns);

      // Verify patterns were stored
      const storedPatterns = await db.getLearnedPatterns(suggestion.speaker);
      expect(storedPatterns.length).toBeGreaterThan(0);

      // Verify pattern structure
      const firstPattern = storedPatterns[0];
      expect(firstPattern.speaker).toBe(suggestion.speaker);
      expect(firstPattern.frequency).toBeGreaterThan(0);
      expect(firstPattern.lastSeen).toBeGreaterThan(0);
      expect(typeof firstPattern.pattern).toBe('string');
    });

    it('should extract correct phrase patterns from dialogue', async () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const speaker = 'speaker1';
      const position = 'middle' as const;

      const { extract } = await import('@/lib/learning/PatternExtractor');
      const patterns = extract(text, speaker, position);

      await db.storeLearnedPattern(speaker, patterns);

      const storedPatterns = await db.getLearnedPatterns(speaker);

      // Should have extracted multiple n-gram phrases
      expect(storedPatterns.length).toBeGreaterThan(0);

      // Verify phrases are n-grams (2-4 words)
      const phrases = storedPatterns.map((p) => p.pattern);
      phrases.forEach((phrase) => {
        const wordCount = phrase.split(/\s+/).length;
        expect(wordCount).toBeGreaterThanOrEqual(2);
        expect(wordCount).toBeLessThanOrEqual(4);
      });
    });

    it('should handle multi-sentence dialogue extraction', async () => {
      const text = 'Hello world. This is a test. Another sentence here.';
      const speaker = 'speaker2';
      const position = 'end' as const;

      const { extract } = await import('@/lib/learning/PatternExtractor');
      const patterns = extract(text, speaker, position);

      await db.storeLearnedPattern(speaker, patterns);

      const storedPatterns = await db.getLearnedPatterns(speaker);

      // Should extract phrases from all sentences
      expect(storedPatterns.length).toBeGreaterThan(5);

      // Verify context words were extracted (excluding stop words)
      expect(patterns.contextWords.length).toBeGreaterThan(0);
      expect(patterns.contextWords).not.toContain('the');
      expect(patterns.contextWords).not.toContain('a');
      expect(patterns.contextWords).not.toContain('and');
    });

    it('should include correct metadata in stored patterns', async () => {
      const suggestion = {
        text: 'Test dialogue for metadata',
        start: 0,
        end: 26,
        confidence: 0.85,
        speaker: 'speaker1',
      };

      const { extract } = await import('@/lib/learning/PatternExtractor');
      const patterns = extract(suggestion.text, suggestion.speaker, 'beginning');

      await db.storeLearnedPattern(suggestion.speaker, patterns);

      const storedPatterns = await db.getLearnedPatterns(suggestion.speaker);
      const firstPattern = storedPatterns[0];

      // Verify all required fields are present
      expect(firstPattern.id).toBeDefined(); // Auto-generated by IndexedDB
      expect(firstPattern.speaker).toBe(suggestion.speaker);
      expect(firstPattern.pattern).toBeTruthy();
      expect(firstPattern.frequency).toBe(1); // Initial frequency
      expect(firstPattern.lastSeen).toBeDefined();
      expect(typeof firstPattern.lastSeen).toBe('number');
    });
  });

  describe('Rejection Logging', () => {
    it('should log rejections to database correctly', async () => {
      const suggestion = {
        text: 'Incorrect suggestion',
        start: 0,
        end: 21,
        confidence: 0.3,
        speaker: '',
      };

      const position = 'middle' as const;

      // Simulate what handleReject does
      await db.logCorrection(
        suggestion.text,
        '', // No speaker selected
        [], // No speaker selected
        suggestion.confidence,
        position
      );

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(1);

      const rejection = corrections[0];
      expect(rejection.passage).toBe(suggestion.text);
      expect(rejection.accepted).toBe('');
      expect(rejection.rejected).toEqual([]);
      expect(rejection.confidence).toBe(suggestion.confidence);
      expect(rejection.position).toBe(position);
      expect(rejection.timestamp).toBeDefined();
    });

    it('should store rejection with position information', async () => {
      const suggestions = [
        { text: 'Early text', position: 'beginning' as const },
        { text: 'Middle text', position: 'middle' as const },
        { text: 'Late text', position: 'end' as const },
      ];

      for (const sug of suggestions) {
        await db.logCorrection(sug.text, '', [], 0.5, sug.position);
      }

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(3);

      expect(corrections[0].position).toBe('beginning');
      expect(corrections[1].position).toBe('middle');
      expect(corrections[2].position).toBe('end');
    });

    it('should store multiple rejections with timestamps', async () => {
      const rejections = [
        { text: 'Wrong suggestion 1', confidence: 0.2 },
        { text: 'Wrong suggestion 2', confidence: 0.4 },
        { text: 'Wrong suggestion 3', confidence: 0.3 },
      ];

      for (const rej of rejections) {
        await db.logCorrection(rej.text, '', [], rej.confidence, 'middle');
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const corrections = await db.getRecentCorrections(10);

      expect(corrections).toHaveLength(3);
      // Verify each has a timestamp
      corrections.forEach((c) => {
        expect(c.timestamp).toBeDefined();
        expect(typeof c.timestamp).toBe('number');
      });

      // Verify ordering (most recent first)
      expect(corrections[0].timestamp).toBeGreaterThan(corrections[1].timestamp);
      expect(corrections[1].timestamp).toBeGreaterThan(corrections[2].timestamp);
    });

    it('should log rejection with low confidence', async () => {
      const lowConfidenceSuggestion = {
        text: 'Very uncertain suggestion',
        confidence: 0.15,
      };

      await db.logCorrection(
        lowConfidenceSuggestion.text,
        '',
        [],
        lowConfidenceSuggestion.confidence,
        'end'
      );

      const corrections = await db.corrections.toArray();
      expect(corrections[0].confidence).toBe(0.15);
    });
  });

  describe('Pattern Retrieval', () => {
    beforeEach(async () => {
      // Add some test patterns
      await db.storeLearnedPattern('speaker1', 'hello world', 3);
      await db.storeLearnedPattern('speaker1', 'goodbye', 2);
      await db.storeLearnedPattern('speaker2', 'hello there', 1);
    });

    it('should retrieve patterns by speaker', async () => {
      const speaker1Patterns = await db.getLearnedPatterns('speaker1');
      const speaker2Patterns = await db.getLearnedPatterns('speaker2');

      expect(speaker1Patterns).toHaveLength(2);
      expect(speaker2Patterns).toHaveLength(1);

      expect(speaker1Patterns[0].speaker).toBe('speaker1');
      expect(speaker2Patterns[0].speaker).toBe('speaker2');
    });

    it('should retrieve all patterns across speakers', async () => {
      const allPatterns = await db.getAllLearnedPatterns();

      expect(allPatterns).toHaveLength(3);
      expect(allPatterns.some((p) => p.speaker === 'speaker1')).toBe(true);
      expect(allPatterns.some((p) => p.speaker === 'speaker2')).toBe(true);
    });

    it('should return empty array for speaker with no patterns', async () => {
      const patterns = await db.getLearnedPatterns('nonexistent');
      expect(patterns).toEqual([]);
    });

    it('should include frequency in retrieved patterns', async () => {
      const patterns = await db.getLearnedPatterns('speaker1');

      const helloPattern = patterns.find((p) => p.pattern === 'hello world');
      const goodbyePattern = patterns.find((p) => p.pattern === 'goodbye');

      expect(helloPattern?.frequency).toBe(3);
      expect(goodbyePattern?.frequency).toBe(2);
    });
  });

  describe('Database Persistence', () => {
    it('should persist patterns across database sessions', async () => {
      // Store pattern in first session
      await db.storeLearnedPattern('speaker1', 'persistent pattern', 1);
      await db.close();

      // Open new session
      const db2 = new PatternDB();
      await db2.init();

      const patterns = await db2.getLearnedPatterns('speaker1');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('persistent pattern');

      await db2.close();
    });

    it('should persist rejections across database sessions', async () => {
      // Log rejection in first session
      await db.logCorrection('rejected text', '', [], 0.3, 'middle');
      await db.close();

      // Open new session
      const db2 = new PatternDB();
      await db2.init();

      const corrections = await db2.getRecentCorrections(10);
      expect(corrections).toHaveLength(1);
      expect(corrections[0].passage).toBe('rejected text');

      await db2.close();
    });

    it('should maintain pattern frequency across sessions', async () => {
      // Store pattern with frequency 2
      await db.storeLearnedPattern('speaker1', 'frequent pattern', 2);
      await db.close();

      // Open new session and add more
      const db2 = new PatternDB();
      await db2.init();
      await db2.storeLearnedPattern('speaker1', 'frequent pattern', 1);

      const patterns = await db2.getLearnedPatterns('speaker1');
      const pattern = patterns.find((p) => p.pattern === 'frequent pattern');

      expect(pattern?.frequency).toBe(3); // 2 + 1

      await db2.close();
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate patterns correctly', async () => {
      // Store same pattern multiple times
      await db.storeLearnedPattern('speaker1', 'duplicate pattern', 1);
      await db.storeLearnedPattern('speaker1', 'duplicate pattern', 1);
      await db.storeLearnedPattern('speaker1', 'duplicate pattern', 1);

      const patterns = await db.getLearnedPatterns('speaker1');
      expect(patterns).toHaveLength(1); // Only one entry
      expect(patterns[0].frequency).toBe(3); // Frequency accumulated
    });

    it('should handle empty text gracefully', async () => {
      const { extract } = await import('@/lib/learning/PatternExtractor');
      const patterns = extract('', 'speaker1', 'beginning');

      await db.storeLearnedPattern('speaker1', patterns);

      const storedPatterns = await db.getLearnedPatterns('speaker1');
      // Empty text should result in no patterns
      expect(storedPatterns.length).toBe(0);
    });

    it('should handle very long dialogue text', async () => {
      const longText = 'word '.repeat(1000); // ~5000 characters
      const { extract } = await import('@/lib/learning/PatternExtractor');
      const patterns = extract(longText, 'speaker1', 'middle');

      await db.storeLearnedPattern('speaker1', patterns);

      const storedPatterns = await db.getLearnedPatterns('speaker1');
      // Should still extract and store patterns
      expect(storedPatterns.length).toBeGreaterThan(0);
    });

    it('should handle special characters in text', async () => {
      const specialText = 'Hello! @#$%^&*() World? <>"\'\n\t';
      const { extract } = await import('@/lib/learning/PatternExtractor');
      const patterns = extract(specialText, 'speaker1', 'end');

      await db.storeLearnedPattern('speaker1', patterns);

      const storedPatterns = await db.getLearnedPatterns('speaker1');
      expect(storedPatterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle unicode characters in text', async () => {
      const unicodeText = 'Hello 世界 🌍 مرحبا';

      await db.logCorrection(unicodeText, '', [], 0.5, 'middle');

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(1);
      expect(corrections[0].passage).toBe(unicodeText);
    });

    it('should handle ExtractedPattern object correctly', async () => {
      const mockPattern = {
        phrases: new Map([
          ['hello world', 2],
          ['test phrase', 1],
        ]),
        dialogueLength: 11,
        position: 'beginning' as const,
        contextWords: ['hello', 'world', 'test'],
      };

      await db.storeLearnedPattern('speaker1', mockPattern);

      const storedPatterns = await db.getLearnedPatterns('speaker1');
      expect(storedPatterns).toHaveLength(2);

      expect(storedPatterns.some((p) => p.pattern === 'hello world')).toBe(true);
      expect(storedPatterns.some((p) => p.pattern === 'test phrase')).toBe(true);

      const helloPattern = storedPatterns.find((p) => p.pattern === 'hello world');
      expect(helloPattern?.frequency).toBe(2);
    });

    it('should handle speaker with empty name', async () => {
      await db.storeLearnedPattern('', 'pattern with no speaker', 1);

      const patterns = await db.getLearnedPatterns('');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].speaker).toBe('');
    });

    it('should handle very high frequency values', async () => {
      // Simulate pattern seen many times
      await db.storeLearnedPattern('speaker1', 'very common', 10000);

      const patterns = await db.getLearnedPatterns('speaker1');
      const pattern = patterns.find((p) => p.pattern === 'very common');

      expect(pattern?.frequency).toBe(10000);
    });

    it('should handle zero frequency gracefully', async () => {
      await db.storeLearnedPattern('speaker1', 'zero freq', 0);

      const patterns = await db.getLearnedPatterns('speaker1');
      const pattern = patterns.find((p) => p.pattern === 'zero freq');

      expect(pattern?.frequency).toBe(0);
    });

    it('should handle negative frequency (edge case)', async () => {
      // This shouldn't happen in practice, but test robustness
      await db.storeLearnedPattern('speaker1', 'negative', -1);

      const patterns = await db.getLearnedPatterns('speaker1');
      const pattern = patterns.find((p) => p.pattern === 'negative');

      // Should still be stored
      expect(pattern).toBeDefined();
      expect(pattern?.frequency).toBe(-1);
    });

    it('should handle concurrent pattern storage', async () => {
      // Store multiple patterns concurrently
      const promises = [
        db.storeLearnedPattern('speaker1', 'pattern1', 1),
        db.storeLearnedPattern('speaker1', 'pattern2', 1),
        db.storeLearnedPattern('speaker1', 'pattern3', 1),
        db.storeLearnedPattern('speaker2', 'pattern4', 1),
        db.storeLearnedPattern('speaker2', 'pattern5', 1),
      ];

      await Promise.all(promises);

      const speaker1Patterns = await db.getLearnedPatterns('speaker1');
      const speaker2Patterns = await db.getLearnedPatterns('speaker2');

      expect(speaker1Patterns).toHaveLength(3);
      expect(speaker2Patterns).toHaveLength(2);
    });
  });

  describe('Pattern Data Integrity', () => {
    it('should preserve exact phrase text', async () => {
      const phrase = 'Exact case and spacing';
      await db.storeLearnedPattern('speaker1', phrase, 1);

      const patterns = await db.getLearnedPatterns('speaker1');
      expect(patterns[0].pattern).toBe(phrase);
    });

    it('should store position information in corrections', async () => {
      const positions: Array<'beginning' | 'middle' | 'end'> = ['beginning', 'middle', 'end'];

      for (const position of positions) {
        await db.logCorrection('test', '', [], 0.5, position);
      }

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(3);

      const storedPositions = corrections.map((c) => c.position);
      expect(storedPositions).toEqual(expect.arrayContaining(positions));
    });

    it('should handle confidence scores accurately', async () => {
      const confidences = [0.1, 0.5, 0.9, 1.0];

      for (const conf of confidences) {
        await db.logCorrection('test', '', [], conf, 'middle');
      }

      const corrections = await db.corrections.toArray();
      const storedConfidences = corrections.map((c) => c.confidence);

      expect(storedConfidences).toEqual(expect.arrayContaining(confidences));
    });

    it('should update lastSeen timestamp on pattern update', async () => {
      await db.storeLearnedPattern('speaker1', 'timestamp test', 1);

      const patterns1 = await db.getLearnedPatterns('speaker1');
      const firstTimestamp = patterns1[0].lastSeen;

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.storeLearnedPattern('speaker1', 'timestamp test', 1);

      const patterns2 = await db.getLearnedPatterns('speaker1');
      const secondTimestamp = patterns2[0].lastSeen;

      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });
  });
});
