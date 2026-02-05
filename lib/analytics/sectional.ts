// @ts-nocheck
import type { Dialogue, Passage } from '../tei/types';
import type { SectionGroup, SectionGroupingStrategy, SectionalBreakdown } from './types';

const CHAPTER_SIZE = 10;

/**
 * Group dialogue by individual passages
 */
export const ByPassage: SectionGroupingStrategy = {
  name: 'By Passage',
  description: 'Each passage as a separate section',
  group: (dialogue: readonly Dialogue[], passages: readonly Passage[]): readonly SectionGroup[] => {
    return passages.map(passage => ({
      label: `Passage ${passage.index + 1}`,
      startIndex: passage.index,
      endIndex: passage.index,
      dialogueItems: dialogue.filter(d => d.passageId === passage.id)
    }));
  }
};

/**
 * Group passages into chapters
 */
export const ByChapter: SectionGroupingStrategy = {
  name: 'By Chapter',
  description: 'Group passages into chapters (10 passages each)',
  group: (dialogue: readonly Dialogue[], passages: readonly Passage[]): readonly SectionGroup[] => {
    const chapters = [];

    for (let i = 0; i < passages.length; i += CHAPTER_SIZE) {
      const chapterPassages = passages.slice(i, i + CHAPTER_SIZE);
      const passageIds = new Set(chapterPassages.map(p => p.id));

      chapters.push({
        label: `Chapter ${Math.floor(i / CHAPTER_SIZE) + 1}`,
        startIndex: i,
        endIndex: Math.min(i + CHAPTER_SIZE, passages.length),
        dialogueItems: dialogue.filter(d => passageIds.has(d.passageId))
      });
    }

    return chapters;
  }
};

/**
 * Group dialogue using specified strategy
 * Pure function - no side effects.
 */
export function groupDialogueBySections(
  dialogue: readonly Dialogue[],
  passages: readonly Passage[],
  strategy: SectionGroupingStrategy
): readonly SectionGroup[] {
  return strategy.group(dialogue, passages);
}

/**
 * Calculate statistics for section groups
 * Pure function - no side effects.
 */
export function calculateSectionStats(
  groups: readonly SectionGroup[]
): SectionalBreakdown {
  const totalQuotes = groups.reduce((sum, g) => sum + g.dialogueItems.length, 0);

  return {
    groups: groups.map(g => ({
      label: g.label,
      quoteCount: g.dialogueItems.length,
      percent: totalQuotes > 0 ? (g.dialogueItems.length / totalQuotes) * 100 : 0
    })),
    totalQuotes
  };
}
