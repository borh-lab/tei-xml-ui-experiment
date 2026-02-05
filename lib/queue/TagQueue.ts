/**
 * Tag Queue State Management
 *
 * Provides a queue-based system for batch tag application.
 * Users can queue multiple tags before applying them all at once.
 * Uses value-oriented design with immutable state updates.
 */

import type { TextRange } from '@/lib/tei/types';

/**
 * Queued tag waiting to be applied
 */
export interface QueuedTag {
  readonly id: string; /** Unique identifier for this queued tag */
  readonly tagType: string; /** e.g., 'said', 'persName', 'q' */
  readonly attributes: Record<string, string>; /** Tag attributes */
  readonly passageId: string; /** Passage where tag will be applied */
  readonly range: TextRange; /** Selection range */
  readonly timestamp: number; /** When queued (for ordering) */
}

/**
 * Complete tag queue state
 */
export interface TagQueueState {
  readonly pending: QueuedTag[]; /** Tags waiting to be applied */
  readonly applied: QueuedTag[]; /** Tags successfully applied */
  readonly failed: QueuedTag[]; /** Tags that failed to apply */
}

/**
 * Tag Queue Manager
 *
 * Manages a queue of tags waiting to be applied to the document.
 * Uses immutable state - all operations return new state objects.
 */
export class TagQueue {
  private pending: QueuedTag[] = [];
  private applied: QueuedTag[] = [];
  private failed: QueuedTag[] = [];

  /**
   * Add a tag to the queue
   * @param tag - Tag data (without id and timestamp)
   * @returns Generated unique ID for the queued tag
   */
  add(tag: Omit<QueuedTag, 'id' | 'timestamp'>): string {
    const id = this.generateId();
    const timestamp = Date.now();

    const queuedTag: QueuedTag = {
      ...tag,
      id,
      timestamp,
      attributes: { ...tag.attributes }, // Shallow copy for immutability
      range: { ...tag.range }, // Copy range for immutability
    };

    // Create new array (immutable)
    this.pending = [...this.pending, queuedTag];

    return id;
  }

  /**
   * Remove a tag from the queue by ID
   * @param id - Tag ID to remove
   * @returns true if removed, false if not found
   */
  remove(id: string): boolean {
    const index = this.pending.findIndex((tag) => tag.id === id);

    if (index === -1) {
      return false;
    }

    // Create new array without the removed tag (immutable)
    this.pending = [...this.pending.slice(0, index), ...this.pending.slice(index + 1)];

    return true;
  }

  /**
   * Clear all pending tags
   * Does not affect applied or failed tags
   */
  clear(): void {
    this.pending = [];
  }

  /**
   * Get the number of pending tags
   */
  get size(): number {
    return this.pending.length;
  }

  /**
   * Check if queue is empty (no pending tags)
   */
  isEmpty(): boolean {
    return this.pending.length === 0;
  }

  /**
   * Get all queued tags (immutable copy)
   */
  getPending(): readonly QueuedTag[] {
    // Return frozen array to prevent external mutation
    return Object.freeze([...this.pending]);
  }

  /**
   * Move a tag from pending to applied
   * @param id - Tag ID to mark as applied
   */
  markApplied(id: string): void {
    const index = this.pending.findIndex((tag) => tag.id === id);

    if (index === -1) {
      return;
    }

    const tag = this.pending[index];

    // Move from pending to applied (immutable)
    this.pending = [...this.pending.slice(0, index), ...this.pending.slice(index + 1)];

    this.applied = [...this.applied, tag];
  }

  /**
   * Move a tag from pending to failed
   * @param id - Tag ID to mark as failed
   */
  markFailed(id: string): void {
    const index = this.pending.findIndex((tag) => tag.id === id);

    if (index === -1) {
      return;
    }

    const tag = this.pending[index];

    // Move from pending to failed (immutable)
    this.pending = [...this.pending.slice(0, index), ...this.pending.slice(index + 1)];

    this.failed = [...this.failed, tag];
  }

  /**
   * Get current queue state (immutable snapshot)
   */
  getState(): TagQueueState {
    return {
      pending: [...this.pending],
      applied: [...this.applied],
      failed: [...this.failed],
    };
  }

  /**
   * Clear failed tags
   * Does not affect pending or applied tags
   */
  clearFailed(): void {
    this.failed = [];
  }

  /**
   * Re-queue failed tags (move from failed to pending)
   * Maintains original order and timestamps
   */
  retryFailed(): void {
    if (this.failed.length === 0) {
      return;
    }

    // Move all failed tags back to pending
    this.pending = [...this.pending, ...this.failed];
    this.failed = [];
  }

  /**
   * Generate unique ID for queued tag
   * Uses timestamp + random string for uniqueness
   * @private
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `queued-${timestamp}-${random}`;
  }
}
