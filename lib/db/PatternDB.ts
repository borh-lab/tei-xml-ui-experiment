import Dexie, { Table } from 'dexie';
import { ExtractedPattern } from '@/lib/learning/PatternExtractor';

export interface SpeakerPattern {
  id?: number;
  xmlId: string;
  name: string;
  lastUsed: number;
  chapterAffinity: Record<string, number>;
  commonPhrases?: Record<string, number>; // phrase -> frequency
  dialogueLengthStats?: {
    average: number;
    min: number;
    max: number;
    stdDev: number;
  };
  positionPatterns?: {
    beginning: number;
    middle: number;
    end: number;
  };
}

export interface PatternCorrection {
  id?: number;
  timestamp: number;
  passage: string;
  accepted: string;
  rejected: string[];
  confidence: number;
  position?: 'beginning' | 'middle' | 'end';
  surroundingText?: {
    before?: string;
    after?: string;
  };
}

export interface LearnedPattern {
  id?: number;
  speaker: string;
  pattern: string;
  frequency: number;
  lastSeen: number;
}

export class PatternDB extends Dexie {
  speakers!: Table<SpeakerPattern>;
  corrections!: Table<PatternCorrection>;
  learnedPatterns!: Table<LearnedPattern>;

  constructor() {
    super('TEIDialogueEditorDB', 1);
  }

  async init() {
    await this.version(1).stores({
      speakers: '++xmlId, name',
      corrections: '++id, timestamp',
      learnedPatterns: '++id, speaker, pattern, [speaker+pattern], lastSeen'
    });
    await this.open();
  }

  async getSpeakers(): Promise<Record<string, SpeakerPattern>> {
    const allSpeakers = await this.speakers.toArray();
    return Object.fromEntries(
      allSpeakers.map(speaker => [speaker.xmlId, speaker])
    );
  }

  async getSpeaker(xmlId: string): Promise<SpeakerPattern | undefined> {
    return await this.speakers.where('xmlId').equals(xmlId).first();
  }

  async updateSpeakerPattern(
    xmlId: string,
    updates: Partial<SpeakerPattern>
  ): Promise<void> {
    const existing = await this.getSpeaker(xmlId);
    if (existing) {
      await this.speakers.update(existing.id!, updates);
    } else {
      await this.speakers.add({
        xmlId,
        name: xmlId,
        lastUsed: Date.now(),
        chapterAffinity: {},
        ...updates
      });
    }
  }

  /**
   * Log a correction for pattern learning
   */
  async logCorrection(
    passage: string,
    accepted: string,
    rejected: string[],
    confidence: number,
    position?: 'beginning' | 'middle' | 'end',
    surroundingText?: { before?: string; after?: string }
  ): Promise<void> {
    await this.corrections.add({
      timestamp: Date.now(),
      passage,
      accepted,
      rejected,
      confidence,
      position,
      surroundingText
    });
  }

  /**
   * Store a learned pattern for a speaker
   */
  async storeLearnedPattern(
    speaker: string,
    pattern: string | ExtractedPattern,
    frequency: number = 1
  ): Promise<void> {
    // If pattern is an ExtractedPattern object, store all phrases
    if (typeof pattern === 'object' && 'phrases' in pattern) {
      // Store each phrase in the pattern
      for (const [phrase, count] of pattern.phrases.entries()) {
        await this.storeLearnedPattern(speaker, phrase, count);
      }
      return;
    }

    // Original logic for string patterns
    const existing = await this.learnedPatterns
      .where('[speaker+pattern]')
      .equals([speaker, pattern])
      .first();

    if (existing) {
      await this.learnedPatterns.update(existing.id!, {
        frequency: existing.frequency + frequency,
        lastSeen: Date.now()
      });
    } else {
      await this.learnedPatterns.add({
        speaker,
        pattern,
        frequency,
        lastSeen: Date.now()
      });
    }
  }

  /**
   * Get learned patterns for a specific speaker
   */
  async getLearnedPatterns(speaker: string): Promise<LearnedPattern[]> {
    return await this.learnedPatterns
      .where('speaker')
      .equals(speaker)
      .toArray();
  }

  /**
   * Get all learned patterns (for prediction)
   */
  async getAllLearnedPatterns(): Promise<LearnedPattern[]> {
    return await this.learnedPatterns.toArray();
  }

  /**
   * Get recent corrections for learning
   */
  async getRecentCorrections(limit: number = 100): Promise<PatternCorrection[]> {
    return await this.corrections
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  }
}

export const db = new PatternDB();

export async function initDB() {
  await db.init();
}
