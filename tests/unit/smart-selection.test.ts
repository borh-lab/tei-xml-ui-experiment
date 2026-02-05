/**
 * Smart Selection (Parinfer-like) Tests
 *
 * Test automatic selection adjustment to maintain valid XML structure.
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectTagBoundaries,
  findNearestBoundary,
  wouldSplitTag,
  snapToTagBoundaries,
  validateSelection,
  smartSelectionAdjust,
} from '@/lib/selection/SmartSelection';
import type { Passage, Tag } from '@/lib/tei/types';

describe('SmartSelection - Parinfer-like Selection Adjustment', () => {
  describe('detectTagBoundaries', () => {
    it('should detect boundaries for simple tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world, this is a test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 5 },
            attributes: {},
          },
          {
            id: 'tag-2',
            type: 'said',
            range: { start: 13, end: 22 },
            attributes: {},
          },
        ],
      };

      const boundaries = detectTagBoundaries(passage);

      expect(boundaries).toHaveLength(4); // 2 open + 2 close
      expect(boundaries[0]).toMatchObject({
        position: 0,
        type: 'open',
        tagName: 'persName',
      });
      expect(boundaries[1]).toMatchObject({
        position: 5,
        type: 'close',
        tagName: 'persName',
      });
      expect(boundaries[2]).toMatchObject({
        position: 13,
        type: 'open',
        tagName: 'said',
      });
      expect(boundaries[3]).toMatchObject({
        position: 22,
        type: 'close',
        tagName: 'said',
      });
    });

    it('should handle passage with no tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world',
        tags: [],
      };

      const boundaries = detectTagBoundaries(passage);
      expect(boundaries).toHaveLength(0);
    });
  });

  describe('wouldSplitTag', () => {
    it('should detect selection that splits a tag', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 }, // "Hello world"
            attributes: {},
          },
        ],
      };

      const boundaries = detectTagBoundaries(passage);

      // Selection from 3 to 15 (splits "lo world te")
      expect(wouldSplitTag(boundaries, { start: 3, end: 15 })).toBe(true);
    });

    it('should allow selection that matches tag boundaries', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 },
            attributes: {},
          },
        ],
      };

      const boundaries = detectTagBoundaries(passage);

      // Selection exactly matches tag
      expect(wouldSplitTag(boundaries, { start: 0, end: 11 })).toBe(false);

      // Selection inside tag
      expect(wouldSplitTag(boundaries, { start: 2, end: 9 })).toBe(false);

      // Selection outside tag
      expect(wouldSplitTag(boundaries, { start: 12, end: 16 })).toBe(false);
    });
  });

  describe('snapToTagBoundaries', () => {
    it('should snap selection to avoid splitting tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 },
            attributes: {},
          },
        ],
      };

      // Selection from 3 to 15 (would split tag)
      const result = snapToTagBoundaries(passage, { start: 3, end: 15 });

      expect(result.adjustedRange).not.toEqual({ start: 3, end: 15 });
      expect(result.reason).toContain('expand');
    });

    it('should leave valid selections unchanged', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 5 },
            attributes: {},
          },
        ],
      };

      // Valid selection outside tag
      const result = snapToTagBoundaries(passage, { start: 6, end: 11 });

      expect(result.adjustedRange).toEqual({ start: 6, end: 11 });
      expect(result.reason).toBe('Selection is valid');
    });

    it('should snap to nearest boundary when close and would avoid split', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 5, end: 11 },
            attributes: {},
          },
        ],
      };

      // Selection that extends beyond tag (would split it)
      const result = snapToTagBoundaries(passage, { start: 7, end: 14 });

      expect(result.adjustedRange.start).toBe(5); // Snapped to avoid split
      expect(result.reason).toContain('expanded');
    });
  });

  describe('validateSelection', () => {
    it('should reject selection that splits tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 },
            attributes: {},
          },
        ],
      };

      const result = validateSelection(passage, { start: 3, end: 15 }, 'said');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('split');
      expect(result.adjustment).toBeDefined();
    });

    it('should reject selection with existing same-type tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'said',
            range: { start: 0, end: 5 },
            attributes: {},
          },
        ],
      };

      const result = validateSelection(passage, { start: 0, end: 5 }, 'said');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('already contains');
    });

    it('should accept valid selections', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [],
      };

      const result = validateSelection(passage, { start: 0, end: 5 }, 'persName');

      expect(result.valid).toBe(true);
    });
  });

  describe('smartSelectionAdjust', () => {
    it('should adjust selection that would split tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 },
            attributes: {},
          },
        ],
      };

      const result = smartSelectionAdjust(passage, { start: 3, end: 15 }, 'said');

      expect(result.adjustedRange).not.toEqual({ start: 3, end: 15 });
      expect(result.reason).toBeDefined();
    });

    it('should snap to nearby boundaries for cleaner markup', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 5, end: 11 },
            attributes: {},
          },
        ],
      };

      // Selection very close to tag boundary
      const result = smartSelectionAdjust(passage, { start: 7, end: 11 });

      expect(result.adjustedRange.start).toBe(5); // Snapped
      expect(result.snappedTo?.start).toBeDefined();
    });

    it('should leave clean selections unchanged', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [],
      };

      const result = smartSelectionAdjust(passage, { start: 0, end: 5 });

      expect(result.adjustedRange).toEqual({ start: 0, end: 5 });
      expect(result.reason).toBe('Selection is valid');
    });
  });
});
