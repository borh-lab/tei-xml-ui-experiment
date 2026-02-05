// @ts-nocheck
import { PatternDB } from '@/lib/db/PatternDB';

describe('PatternDB', () => {
  let db: PatternDB;

  beforeEach(() => {
    db = new PatternDB();
  });

  afterEach(async () => {
    await db.delete();
  });

  test('should initialize database', async () => {
    await db.init();

    const speakers = await db.getSpeakers();
    expect(speakers).toEqual({});
  });

  test('should store speaker patterns', async () => {
    await db.init();

    await db.updateSpeakerPattern('speaker1', { lastUsed: Date.now() });

    const speaker = await db.getSpeaker('speaker1');
    expect(speaker).toBeDefined();
  });
});
