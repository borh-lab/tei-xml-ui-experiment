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
  type LearningContext
} from '@/lib/learning/PatternExtractor';
import { PatternDB, type SpeakerPattern } from '@/lib/db/PatternDB';

describe('PatternExtractor', () => {
  describe('extractAcceptedPattern', () => {
    it('should extract patterns from accepted dialogue', () => {
      const context: LearningContext = {
        passage: 'Hello world, this is a test.',
        speaker: 'speaker1',
        position: 'beginning'
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
        position: 'middle'
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
          stdDev: 2.5
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0
        },
        contextualPatterns: new Map()
      };

      const newPattern: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map([['world', 1]]),
        dialogueLengthPatterns: {
          average: 12,
          min: 8,
          max: 16,
          stdDev: 2
        },
        positionPatterns: {
          beginning: 0,
          middle: 1,
          end: 0
        },
        contextualPatterns: new Map()
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
          stdDev: 2.5
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0
        },
        contextualPatterns: new Map()
      };

      const newPattern: SpeakerPatternData = {
        xmlId: 'speaker1',
        commonPhrases: new Map(),
        dialogueLengthPatterns: {
          average: 20,
          min: 18,
          max: 22,
          stdDev: 1
        },
        positionPatterns: {
          beginning: 0,
          middle: 0,
          end: 0
        },
        contextualPatterns: new Map()
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
        commonPhrases: new Map([['hello world', 5], ['test phrase', 3]]),
        dialogueLengthPatterns: {
          average: 20,
          min: 10,
          max: 30,
          stdDev: 5
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0
        },
        contextualPatterns: new Map()
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
          stdDev: 5
        },
        positionPatterns: {
          beginning: 1,
          middle: 0,
          end: 0
        },
        contextualPatterns: new Map()
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
      await db.logCorrection(
        'Hello world',
        'speaker1',
        ['speaker2'],
        0.9,
        'beginning'
      );

      const corrections = await db.corrections.toArray();
      expect(corrections).toHaveLength(1);
      expect(corrections[0].passage).toBe('Hello world');
      expect(corrections[0].accepted).toBe('speaker1');
      expect(corrections[0].position).toBe('beginning');
    });

    it('should store rejected corrections', async () => {
      await db.logCorrection(
        'Hello world',
        '',
        ['speaker2', 'speaker3'],
        0.3,
        'middle'
      );

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
      await new Promise(resolve => setTimeout(resolve, 10));

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
      expect(allPatterns.some(p => p.speaker === 'speaker1')).toBe(true);
      expect(allPatterns.some(p => p.speaker === 'speaker2')).toBe(true);
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
      { passage: 'Hello there', speaker: 'speaker1' }
    ];

    for (const correction of corrections) {
      await db.logCorrection(
        correction.passage,
        correction.speaker,
        [],
        0.9,
        'beginning'
      );

      // Extract and store the "Hello" pattern
      if (correction.passage.includes('Hello')) {
        await db.storeLearnedPattern(correction.speaker, 'Hello', 1);
      }
    }

    const patterns = await db.getLearnedPatterns('speaker1');
    const helloPattern = patterns.find(p => p.pattern === 'Hello');

    expect(helloPattern).toBeDefined();
    expect(helloPattern!.frequency).toBe(3);
  });

  it('should build speaker profiles over time', async () => {
    // Speaker 1 tends to speak at beginning
    await db.logCorrection('Early dialogue', 'speaker1', [], 0.9, 'beginning');
    await db.updateSpeakerPattern('speaker1', {
      name: 'Speaker One',
      lastUsed: Date.now(),
      chapterAffinity: { chapter1: 1 }
    });

    // Speaker 2 tends to speak at end
    await db.logCorrection('Late dialogue', 'speaker2', [], 0.9, 'end');
    await db.updateSpeakerPattern('speaker2', {
      name: 'Speaker Two',
      lastUsed: Date.now(),
      chapterAffinity: { chapter1: 1 }
    });

    const speaker1 = await db.getSpeaker('speaker1');
    const speaker2 = await db.getSpeaker('speaker2');

    expect(speaker1).toBeDefined();
    expect(speaker2).toBeDefined();
    expect(speaker1?.name).toBe('Speaker One');
    expect(speaker2?.name).toBe('Speaker Two');
  });
});
