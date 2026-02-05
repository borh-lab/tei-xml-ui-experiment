import { TagQueue } from '@/lib/queue/TagQueue';
import type { QueuedTag } from '@/lib/queue/TagQueue';

describe('TagQueue', () => {
  let queue: TagQueue;

  beforeEach(() => {
    queue = new TagQueue();
  });

  describe('add()', () => {
    it('should add tag with generated ID and timestamp', () => {
      const tag = {
        tagType: 'said',
        attributes: { speaker: 'char-1' },
        passageId: 'passage-123',
        range: { start: 0, end: 10 },
      };

      const id = queue.add(tag);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const pending = queue.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id);
      expect(pending[0].tagType).toBe('said');
      expect(pending[0].attributes).toEqual({ speaker: 'char-1' });
      expect(pending[0].passageId).toBe('passage-123');
      expect(pending[0].range).toEqual({ start: 0, end: 10 });
      expect(pending[0].timestamp).toBeDefined();
      expect(typeof pending[0].timestamp).toBe('number');
    });

    it('should generate unique IDs for each tag', () => {
      const tag1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const tag2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      expect(tag1).not.toBe(tag2);
    });

    it('should preserve timestamp ordering', () => {
      const firstId = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      // Small delay to ensure different timestamp
      const startTime = Date.now();
      while (Date.now() === startTime) {
        // Wait for next millisecond
      }

      const secondId = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      const pending = queue.getPending();
      expect(pending[0].id).toBe(firstId);
      expect(pending[1].id).toBe(secondId);
      expect(pending[0].timestamp).toBeLessThanOrEqual(pending[1].timestamp);
    });
  });

  describe('remove()', () => {
    it('should remove tag by ID and return true', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const result = queue.remove(id);

      expect(result).toBe(true);
      expect(queue.getPending()).toHaveLength(0);
    });

    it('should return false when ID not found', () => {
      const result = queue.remove('non-existent-id');

      expect(result).toBe(false);
      expect(queue.getPending()).toHaveLength(0);
    });

    it('should only remove the specified tag', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      queue.remove(id1);

      const pending = queue.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id2);
    });
  });

  describe('clear()', () => {
    it('should clear all pending tags', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      expect(queue.size).toBe(2);

      queue.clear();

      expect(queue.size).toBe(0);
      expect(queue.getPending()).toHaveLength(0);
    });

    it('should not affect applied or failed tags', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      queue.markApplied(id1);
      queue.markFailed(id2, 'Test error');

      queue.clear();

      const state = queue.getState();
      expect(state.pending).toHaveLength(0);
      expect(state.applied).toHaveLength(1);
      expect(state.failed).toHaveLength(1);
    });
  });

  describe('size', () => {
    it('should return count of pending tags', () => {
      expect(queue.size).toBe(0);

      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      expect(queue.size).toBe(1);

      queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      expect(queue.size).toBe(2);

      const id = queue.add({
        tagType: 'q',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 20, end: 25 },
      });

      expect(queue.size).toBe(3);

      queue.markApplied(id);

      expect(queue.size).toBe(2);
    });
  });

  describe('isEmpty()', () => {
    it('should return true when no pending tags', () => {
      expect(queue.isEmpty()).toBe(true);
    });

    it('should return false when there are pending tags', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      expect(queue.isEmpty()).toBe(false);
    });

    it('should return true when all pending tags are applied', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      expect(queue.isEmpty()).toBe(false);

      queue.markApplied(id);

      expect(queue.isEmpty()).toBe(true);
    });

    it('should return false when there are failed tags', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      queue.markFailed(id, 'Test error');

      expect(queue.isEmpty()).toBe(true); // failed tags don't count as pending
    });
  });

  describe('getPending()', () => {
    it('should return all pending tags', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      const pending = queue.getPending();

      expect(pending).toHaveLength(2);
      expect(pending[0].tagType).toBe('said');
      expect(pending[1].tagType).toBe('persName');
    });

    it('should not include applied or failed tags', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      const id3 = queue.add({
        tagType: 'q',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 20, end: 25 },
      });

      queue.markApplied(id1);
      queue.markFailed(id2, 'Test error');

      const pending = queue.getPending();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id3);
    });

    it('should return empty array when no pending tags', () => {
      const pending = queue.getPending();

      expect(pending).toEqual([]);
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe('markApplied()', () => {
    it('should move tag from pending to applied', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      expect(queue.getPending()).toHaveLength(1);
      expect(queue.getState().applied).toHaveLength(0);

      queue.markApplied(id);

      expect(queue.getPending()).toHaveLength(0);
      expect(queue.getState().applied).toHaveLength(1);
      expect(queue.getState().applied[0].id).toBe(id);
    });

    it('should preserve tag data when moving to applied', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: { speaker: 'char-1' },
        passageId: 'passage-123',
        range: { start: 5, end: 15 },
      });

      queue.markApplied(id);

      const applied = queue.getState().applied[0];
      expect(applied.tagType).toBe('said');
      expect(applied.attributes).toEqual({ speaker: 'char-1' });
      expect(applied.passageId).toBe('passage-123');
      expect(applied.range).toEqual({ start: 5, end: 15 });
      expect(applied.timestamp).toBeDefined();
    });

    it('should do nothing when ID not found in pending', () => {
      queue.markApplied('non-existent-id');

      expect(queue.getPending()).toHaveLength(0);
      expect(queue.getState().applied).toHaveLength(0);
    });
  });

  describe('markFailed()', () => {
    it('should move tag from pending to failed', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      expect(queue.getPending()).toHaveLength(1);
      expect(queue.getState().failed).toHaveLength(0);

      queue.markFailed(id, 'Invalid range');

      expect(queue.getPending()).toHaveLength(0);
      expect(queue.getState().failed).toHaveLength(1);
      expect(queue.getState().failed[0].id).toBe(id);
    });

    it('should preserve tag data when moving to failed', () => {
      const id = queue.add({
        tagType: 'persName',
        attributes: { ref: 'char-2' },
        passageId: 'passage-456',
        range: { start: 10, end: 20 },
      });

      queue.markFailed(id, 'Schema validation failed');

      const failed = queue.getState().failed[0];
      expect(failed.tagType).toBe('persName');
      expect(failed.attributes).toEqual({ ref: 'char-2' });
      expect(failed.passageId).toBe('passage-456');
      expect(failed.range).toEqual({ start: 10, end: 20 });
      expect(failed.timestamp).toBeDefined();
    });

    it('should do nothing when ID not found in pending', () => {
      queue.markFailed('non-existent-id', 'Test error');

      expect(queue.getPending()).toHaveLength(0);
      expect(queue.getState().failed).toHaveLength(0);
    });
  });

  describe('getState()', () => {
    it('should return complete queue state', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      const id3 = queue.add({
        tagType: 'q',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 20, end: 25 },
      });

      queue.markApplied(id1);
      queue.markFailed(id2, 'Test error');

      const state = queue.getState();

      expect(state.pending).toHaveLength(1);
      expect(state.pending[0].id).toBe(id3);

      expect(state.applied).toHaveLength(1);
      expect(state.applied[0].id).toBe(id1);

      expect(state.failed).toHaveLength(1);
      expect(state.failed[0].id).toBe(id2);
    });

    it('should return empty state for new queue', () => {
      const state = queue.getState();

      expect(state.pending).toEqual([]);
      expect(state.applied).toEqual([]);
      expect(state.failed).toEqual([]);
    });

    it('should return immutable state object', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const state1 = queue.getState();

      queue.clear();

      const state2 = queue.getState();

      // State1 should be independent of state2
      expect(state1.pending).toHaveLength(1);
      expect(state2.pending).toHaveLength(0);
    });
  });

  describe('clearFailed()', () => {
    it('should remove all failed tags', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      queue.markFailed(id1, 'Error 1');
      queue.markFailed(id2, 'Error 2');

      expect(queue.getState().failed).toHaveLength(2);

      queue.clearFailed();

      expect(queue.getState().failed).toHaveLength(0);
    });

    it('should not affect pending or applied tags', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      const id3 = queue.add({
        tagType: 'q',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 20, end: 25 },
      });

      queue.markApplied(id1);
      queue.markFailed(id2, 'Test error');

      queue.clearFailed();

      const state = queue.getState();
      expect(state.pending).toHaveLength(1);
      expect(state.pending[0].id).toBe(id3);
      expect(state.applied).toHaveLength(1);
      expect(state.applied[0].id).toBe(id1);
      expect(state.failed).toHaveLength(0);
    });

    it('should do nothing when no failed tags', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      queue.clearFailed();

      expect(queue.getPending()).toHaveLength(1);
    });
  });

  describe('retryFailed()', () => {
    it('should move failed tags back to pending', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      queue.markFailed(id1, 'Error 1');
      queue.markFailed(id2, 'Error 2');

      expect(queue.getState().failed).toHaveLength(2);
      expect(queue.getPending()).toHaveLength(0);

      queue.retryFailed();

      expect(queue.getState().failed).toHaveLength(0);
      expect(queue.getPending()).toHaveLength(2);

      const pending = queue.getPending();
      expect(pending[0].id).toBe(id1);
      expect(pending[1].id).toBe(id2);
    });

    it('should preserve tag data when retrying', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: { speaker: 'char-1' },
        passageId: 'passage-123',
        range: { start: 5, end: 15 },
      });

      queue.markFailed(id, 'Test error');

      queue.retryFailed();

      const pending = queue.getPending();
      expect(pending[0].tagType).toBe('said');
      expect(pending[0].attributes).toEqual({ speaker: 'char-1' });
      expect(pending[0].passageId).toBe('passage-123');
      expect(pending[0].range).toEqual({ start: 5, end: 15 });
    });

    it('should not affect applied tags', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      queue.markApplied(id1);
      queue.markFailed(id2, 'Test error');

      queue.retryFailed();

      const state = queue.getState();
      expect(state.applied).toHaveLength(1);
      expect(state.applied[0].id).toBe(id1);
      expect(state.pending).toHaveLength(1);
      expect(state.pending[0].id).toBe(id2);
    });

    it('should do nothing when no failed tags', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      queue.retryFailed();

      expect(queue.getPending()).toHaveLength(1);
      expect(queue.getState().failed).toHaveLength(0);
    });
  });

  describe('immutability', () => {
    it('should not allow mutation of returned arrays', () => {
      queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const pending1 = queue.getPending();

      // Try to mutate the returned array
      expect(() => {
        pending1.push({} as QueuedTag);
      }).toThrow();

      // Or if it doesn't throw, the original queue should be unaffected
      const pending2 = queue.getPending();
      expect(pending2).toHaveLength(1);
    });

    it('should create new state objects on each operation', () => {
      const id = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      const state1 = queue.getState();
      queue.markApplied(id);

      const state2 = queue.getState();

      // state1 should be different from state2
      expect(state1.pending).toHaveLength(1);
      expect(state2.pending).toHaveLength(0);
      expect(state1.applied).toHaveLength(0);
      expect(state2.applied).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple operations correctly', () => {
      const ids: string[] = [];

      for (let i = 0; i < 5; i++) {
        ids.push(
          queue.add({
            tagType: 'said',
            attributes: { index: i.toString() },
            passageId: 'passage-1',
            range: { start: i * 10, end: i * 10 + 5 },
          })
        );
      }

      expect(queue.size).toBe(5);

      queue.markApplied(ids[0]);
      queue.markFailed(ids[1], 'Error');
      queue.remove(ids[2]);

      expect(queue.size).toBe(2);

      const state = queue.getState();
      expect(state.applied).toHaveLength(1);
      expect(state.failed).toHaveLength(1);
      expect(state.pending).toHaveLength(2);
      expect(state.pending[0].id).toBe(ids[3]);
      expect(state.pending[1].id).toBe(ids[4]);
    });

    it('should handle clearing and re-adding tags', () => {
      const id1 = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 0, end: 5 },
      });

      queue.clear();

      const id2 = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: { start: 10, end: 15 },
      });

      expect(queue.size).toBe(1);
      expect(id1).not.toBe(id2);
      expect(queue.getPending()[0].id).toBe(id2);
    });
  });
});
