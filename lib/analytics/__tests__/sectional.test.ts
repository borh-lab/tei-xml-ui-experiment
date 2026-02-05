// @ts-nocheck
import { ByPassage, ByChapter, groupDialogueBySections, calculateSectionStats } from '../sectional';

describe('ByPassage strategy', () => {
  it('should group dialogue by passage', () => {
    const dialogue = [
      { id: 'd1', passageId: 'passage-1', content: 'Quote 1', speaker: null, range: { start: 0, end: 6 } },
      { id: 'd2', passageId: 'passage-2', content: 'Quote 2', speaker: null, range: { start: 0, end: 6 } }
    ] as const;

    const passages = [
      { id: 'passage-1', index: 0, content: 'Text 1', tags: [] },
      { id: 'passage-2', index: 1, content: 'Text 2', tags: [] }
    ] as const;

    const groups = ByPassage.group(dialogue, passages);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Passage 1');
    expect(groups[0].dialogueItems).toHaveLength(1);
    expect(groups[1].label).toBe('Passage 2');
  });
});

describe('ByChapter strategy', () => {
  it('should group passages into chapters', () => {
    const dialogue = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      passageId: `passage-${i}`,
      content: `Quote ${i}`,
      speaker: null,
      range: { start: 0, end: 6 }
    })) as const;

    const passages = Array.from({ length: 25 }, (_, i) => ({
      id: `passage-${i}`,
      index: i,
      content: `Text ${i}`,
      tags: []
    })) as const;

    const groups = ByChapter.group(dialogue, passages);

    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe('Chapter 1');
    expect(groups[0].dialogueItems).toHaveLength(10);
    expect(groups[2].dialogueItems).toHaveLength(5);
  });
});

describe('calculateSectionStats', () => {
  it('should calculate statistics for section groups', () => {
    const groups = [
      { label: 'Chapter 1', startIndex: 0, endIndex: 10, dialogueItems: Array(15) },
      { label: 'Chapter 2', startIndex: 10, endIndex: 20, dialogueItems: Array(10) }
    ] as const;

    const stats = calculateSectionStats(groups);

    expect(stats.totalQuotes).toBe(25);
    expect(stats.groups[0].percent).toBe(60);
    expect(stats.groups[1].percent).toBe(40);
  });
});
