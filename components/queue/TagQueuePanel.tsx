'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Trash2, Loader2 } from 'lucide-react';
import type { TagQueueState, QueuedTag } from '@/lib/queue/TagQueue';
import './TagQueuePanel.css';

export interface TagQueuePanelProps {
  queue: TagQueueState;
  onApplyAll: () => Promise<void>;
  onRemoveTag: (id: string) => void;
  onClearAll: () => void;
  isApplying?: boolean;
}

export function TagQueuePanel({
  queue,
  onApplyAll,
  onRemoveTag,
  onClearAll,
  isApplying = false,
}: TagQueuePanelProps) {
  const pendingCount = queue.pending.length;
  const isEmpty = pendingCount === 0;

  const handleApplyAll = async () => {
    if (!isEmpty && !isApplying) {
      await onApplyAll();
    }
  };

  const formatAttributes = (attributes: Record<string, string>): string => {
    return Object.entries(attributes)
      .map(([key, value]) => `@${key}=${value}`)
      .join(' ');
  };

  const formatRange = (range: { start: number; end: number }): string => {
    return `${range.start}-${range.end}`;
  };

  return (
    <div className="tag-queue-panel">
      {/* Header */}
      <div className="tag-queue-panel__header">
        <div className="tag-queue-panel__title">
          <h3>Tag Queue</h3>
          <span className="tag-queue-panel__count">
            {pendingCount} pending tag{pendingCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="tag-queue-panel__actions">
          {!isEmpty && (
            <Button
              size="xs"
              variant="ghost"
              onClick={onClearAll}
              className="tag-queue-panel__clear-btn"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Apply All Button */}
      {!isEmpty && (
        <div className="tag-queue-panel__apply-section">
          <Button
            size="sm"
            variant="default"
            onClick={handleApplyAll}
            disabled={isApplying || isEmpty}
            className="tag-queue-panel__apply-btn"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply All (${pendingCount})`
            )}
          </Button>
        </div>
      )}

      {/* Tag List */}
      <div className="tag-queue-panel__body">
        {isEmpty ? (
          <div className="tag-queue-panel__empty">
            <p className="tag-queue-panel__empty-text">No pending tags</p>
            <p className="tag-queue-panel__empty-hint">
              Tags will appear here when you queue them for batch application
            </p>
          </div>
        ) : (
          <div className="tag-queue-panel__list">
            {queue.pending.map((tag: QueuedTag) => (
              <div key={tag.id} className="tag-queue-item">
                <div className="tag-queue-item__main">
                  <div className="tag-queue-item__type">{tag.tagType}</div>
                  <div className="tag-queue-item__attrs">
                    {formatAttributes(tag.attributes)}
                  </div>
                </div>
                <div className="tag-queue-item__meta">
                  <span className="tag-queue-item__passage">{tag.passageId}</span>
                  <span className="tag-queue-item__range">
                    {formatRange(tag.range)}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveTag(tag.id)}
                  className="tag-queue-item__remove"
                  aria-label={`Remove tag ${tag.id}`}
                  title="Remove this tag"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
