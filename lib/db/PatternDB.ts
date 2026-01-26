import Dexie, { Table } from 'dexie';

export interface SpeakerPattern {
  id?: number;
  xmlId: string;
  name: string;
  lastUsed: number;
  chapterAffinity: Record<string, number>;
}

export interface PatternCorrection {
  id?: number;
  timestamp: number;
  passage: string;
  accepted: string;
  rejected: string[];
  confidence: number;
}

export class PatternDB extends Dexie {
  speakers!: Table<SpeakerPattern>;
  corrections!: Table<PatternCorrection>;

  constructor() {
    super('TEIDialogueEditorDB', 1);
  }

  async init() {
    await this.version(1).stores({
      speakers: '++xmlId, name',
      corrections: '++id, timestamp'
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
}

export const db = new PatternDB();

export async function initDB() {
  await db.init();
}
